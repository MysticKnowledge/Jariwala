import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface ExcelRow {
  bill_no: string;
  bill_datetime: string;
  sku_code: string;
  product_name: string;
  size?: string;
  color?: string;
  quantity: number;
  selling_price?: number;
  location_code: string;
}

// =====================================================
// PARSE EXCEL FILE
// =====================================================

function parseExcelFile(buffer: ArrayBuffer): ExcelRow[] {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    const rows = rawData.map((row: any) => {
      const keys = Object.keys(row);
      const getKey = (possibleNames: string[]) => {
        return keys.find(k =>
          possibleNames.some(name => k.toLowerCase().trim() === name.toLowerCase())
        );
      };

      const billNoKey = getKey(['Bill No', 'BillNo', 'Invoice No']);
      const dateKey = getKey(['Bill Datetime', 'BillDatetime', 'Date']);
      const skuKey = getKey(['SKU Code', 'SKUCode', 'SKU']);
      const productNameKey = getKey(['Product Name', 'ProductName', 'Name']);
      const sizeKey = getKey(['Size']);
      const colorKey = getKey(['Color', 'Colour']);
      const qtyKey = getKey(['Quantity', 'Qty']);
      const priceKey = getKey(['Selling Price', 'SellingPrice', 'Price']);
      const locationKey = getKey(['Location Code', 'LocationCode', 'Location']);

      return {
        bill_no: billNoKey ? row[billNoKey]?.toString() : '',
        bill_datetime: dateKey ? row[dateKey]?.toString() : '',
        sku_code: skuKey ? row[skuKey]?.toString() : '',
        product_name: productNameKey ? row[productNameKey]?.toString() : '',
        size: sizeKey ? row[sizeKey]?.toString() : undefined,
        color: colorKey ? row[colorKey]?.toString() : undefined,
        quantity: qtyKey ? parseFloat(row[qtyKey]) : 0,
        selling_price: priceKey ? parseFloat(row[priceKey]) : undefined,
        location_code: locationKey ? row[locationKey]?.toString() : '',
      };
    });

    return rows;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return [];
  }
}

// =====================================================
// BULK IMPORT HANDLER
// =====================================================

async function handleBulkImport(request: Request): Promise<Response> {
  try {
    console.log('=== BULK IMPORT STARTED ===');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const operation = formData.get('operation') as string;
    const userId = formData.get('userId') as string || 'system';

    console.log('Operation:', operation);
    console.log('File name:', file?.name);

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const buffer = await file.arrayBuffer();
    const rows = parseExcelFile(buffer);
    console.log('Parsed rows:', rows.length);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ===== PHASE 1: PREVIEW & VALIDATE =====
    if (operation === 'preview') {
      console.log('=== PREVIEW PHASE ===');

      const validationErrors: any[] = [];
      const validRows: ExcelRow[] = [];

      rows.forEach((row, index) => {
        const errors: string[] = [];
        if (!row.sku_code) errors.push('Missing SKU Code');
        if (!row.product_name) errors.push('Missing Product Name');
        if (!row.bill_no) errors.push('Missing Bill No');
        if (!row.bill_datetime) errors.push('Missing Bill Date/Time');
        if (!row.location_code) errors.push('Missing Location Code');
        if (row.quantity <= 0) errors.push('Invalid Quantity');

        if (errors.length > 0) {
          validationErrors.push({ row: index + 2, errors });
        } else {
          validRows.push(row);
        }
      });

      console.log('Valid rows:', validRows.length);
      console.log('Invalid rows:', validationErrors.length);

      // Auto-create master data
      const uniqueSkus = [...new Set(validRows.map(r => r.sku_code))];
      const uniqueLocations = [...new Set(validRows.map(r => r.location_code))];

      console.log('Unique SKU codes:', uniqueSkus.length);
      console.log('Unique locations:', uniqueLocations.length);

      // Create locations
      const locationsToCreate = uniqueLocations.map(code => ({
        location_code: code,
        location_name: code,
        location_type: 'RETAIL_STORE'
      }));

      const { error: locationError } = await supabase
        .from('locations')
        .upsert(locationsToCreate, { onConflict: 'location_code', ignoreDuplicates: true });

      if (locationError) {
        console.error('Location creation error:', locationError);
        return new Response(
          JSON.stringify({
            error: 'Failed to create locations',
            details: locationError.message
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Create products and variants in ULTRA-CONSERVATIVE batches
      const PRODUCT_BATCH_SIZE = 100; // EXTREMELY conservative: 100 instead of 250
      let totalProductsCreated = 0;
      let totalVariantsCreated = 0;

      for (let i = 0; i < uniqueSkus.length; i += PRODUCT_BATCH_SIZE) {
        const skuBatch = uniqueSkus.slice(i, i + PRODUCT_BATCH_SIZE);
        const batchNum = Math.floor(i / PRODUCT_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(uniqueSkus.length / PRODUCT_BATCH_SIZE);

        console.log(`Creating product batch ${batchNum}/${totalBatches} (${skuBatch.length} products)`);

        const productsToCreate = skuBatch.map(sku => {
          const sampleRow = validRows.find(r => r.sku_code === sku)!;
          return {
            product_code: sku.split('-')[0] || sku,
            product_name: sampleRow.product_name,
            category: 'BULK_IMPORT',
            hsn_code: '0000'
          };
        });

        const { data: createdProducts, error: productError } = await supabase
          .from('products')
          .upsert(productsToCreate, { onConflict: 'product_code', ignoreDuplicates: false })
          .select('id, product_code');

        if (productError) {
          console.error('Product creation error:', productError);
          return new Response(
            JSON.stringify({
              error: 'Failed to create products',
              details: productError.message,
              batch: batchNum
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        totalProductsCreated += createdProducts?.length || 0;
        console.log(`Batch ${batchNum} products created:`, createdProducts?.length);

        // ⚡ CRITICAL: LONG delay between products and variants (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));

        const productMap = new Map((createdProducts || []).map((p: any) => [p.product_code, p.id]));

        const variantsToCreate = skuBatch.map(sku => {
          const sampleRow = validRows.find(r => r.sku_code === sku)!;
          const productCode = sku.split('-')[0] || sku;
          const productId = productMap.get(productCode);

          return {
            product_id: productId,
            sku_code: sku,
            size: sampleRow.size || 'OS',
            color: sampleRow.color || 'Default',
            mrp: sampleRow.selling_price || 0,
            cost_price: sampleRow.selling_price || 0,
            selling_price: sampleRow.selling_price || 0
          };
        }).filter(v => v.product_id);

        console.log(`Creating ${variantsToCreate.length} variants for batch ${batchNum}...`);

        const { data: createdVariants, error: variantError } = await supabase
          .from('product_variants')
          .upsert(variantsToCreate, { onConflict: 'sku_code', ignoreDuplicates: false })
          .select('id');

        if (variantError) {
          console.error('Variant creation error:', variantError);
          return new Response(
            JSON.stringify({
              error: 'Failed to create variants',
              details: variantError.message,
              batch: batchNum
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          totalVariantsCreated += createdVariants?.length || 0;
          console.log(`Batch ${batchNum} variants created:`, createdVariants?.length);
        }

        // ⚡ CRITICAL: LONG delay between batches (500ms for worker recycling)
        if (i + PRODUCT_BATCH_SIZE < uniqueSkus.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('Total products created:', totalProductsCreated);
      console.log('Total variants created:', totalVariantsCreated);
      console.log('=== PREVIEW COMPLETE ===');

      return new Response(
        JSON.stringify({
          success: true,
          preview: {
            totalRows: rows.length,
            validRows: validRows.length,
            invalidRows: validationErrors.length,
            validationErrors,
            autoCreated: {
              products: totalProductsCreated,
              variants: totalVariantsCreated,
              locations: uniqueLocations.length
            }
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ===== PHASE 2: IMPORT EVENTS =====
    if (operation === 'import') {
      console.log('=== IMPORT PHASE ===');

      const validRows = rows.filter(row =>
        row.sku_code && row.product_name && row.bill_no &&
        row.bill_datetime && row.location_code && row.quantity > 0
      );

      console.log('Creating events for', validRows.length, 'rows');

      // Get variant and location IDs
      const skuCodes = [...new Set(validRows.map(r => r.sku_code))];
      const locationCodes = [...new Set(validRows.map(r => r.location_code))];

      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, sku_code')
        .in('sku_code', skuCodes);

      const { data: locations } = await supabase
        .from('locations')
        .select('id, location_code')
        .in('location_code', locationCodes);

      const variantMap = new Map((variants || []).map((v: any) => [v.sku_code, v.id]));
      const locationMap = new Map((locations || []).map((l: any) => [l.location_code, l.id]));

      // ⚡ ULTRA-CONSERVATIVE batch size: 100 (for VERY large datasets)
      const BATCH_SIZE = 100;
      const totalBatches = Math.ceil(validRows.length / BATCH_SIZE);
      const eventIds: string[] = [];
      const errors: any[] = [];

      console.log(`Processing ${validRows.length} events in ${totalBatches} batches of ${BATCH_SIZE}`);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, validRows.length);
        const batchRows = validRows.slice(start, end);

        console.log(`Batch ${batchIndex + 1}/${totalBatches}: Processing rows ${start}-${end - 1}`);

        const events = batchRows.map((row, idx) => {
          const variantId = variantMap.get(row.sku_code);
          const locationId = locationMap.get(row.location_code);

          if (!variantId || !locationId) {
            errors.push({
              row: start + idx + 2,
              error: `Missing variant or location ID`,
              data: row
            });
            return null;
          }

          return {
            event_type: 'SALE',
            variant_id: variantId,
            quantity: -Math.abs(row.quantity),
            from_location_id: locationId,
            to_location_id: null,
            reference_number: row.bill_no,
            unit_selling_price: row.selling_price,
            total_amount: row.selling_price ? row.selling_price * row.quantity : null,
            client_timestamp: row.bill_datetime,
            created_by: userId,
            notes: 'BULK_IMPORT'
          };
        }).filter(e => e !== null);

        const { data, error } = await supabase
          .from('event_ledger')
          .insert(events)
          .select('event_id');

        if (error) {
          console.error(`Batch ${batchIndex + 1} error:`, error);
          errors.push({
            batch: batchIndex + 1,
            error: error.message,
            rowsAffected: batchRows.length
          });
        } else {
          const batchEventIds = (data || []).map((e: any) => e.event_id);
          eventIds.push(...batchEventIds);
          console.log(`Batch ${batchIndex + 1} success: ${batchEventIds.length} events created`);
        }

        // ⚡ CRITICAL: Delay between batches for worker recycling
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay (increased for large datasets)
        }
      }

      console.log('Events created:', eventIds.length);
      console.log('=== IMPORT COMPLETE ===');

      return new Response(
        JSON.stringify({
          success: true,
          result: {
            eventsCreated: eventIds.length,
            errors: errors.length,
            errorDetails: errors
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid operation' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Bulk import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// =====================================================
// ROUTES
// =====================================================

app.get("/make-server-c45d1eeb/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/make-server-c45d1eeb/bulk-import", async (c) => {
  const request = c.req.raw;
  return await handleBulkImport(request);
});

// =====================================================
// START SERVER
// =====================================================

Deno.serve(app.fetch);
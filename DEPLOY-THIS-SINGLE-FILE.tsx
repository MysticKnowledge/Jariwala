// =====================================================
// BULK IMPORT HANDLER (FIXED - BATCH SIZE 500)
// =====================================================

async function handleBulkImport(request: Request): Promise<Response> {
  try {
    console.log('=== BULK IMPORT STARTED ===');
    console.log('Request method:', request.method);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));

    const formData = await request.formData();
    console.log('FormData received');

    const file = formData.get('file') as File;
    const operation = formData.get('operation') as string;
    const userId = formData.get('userId') as string || 'system';

    console.log('Operation:', operation);
    console.log('User ID:', userId);
    console.log('File name:', file?.name);
    console.log('File size:', file?.size);

    if (!file) {
      console.error('No file provided');
      return new Response(JSON.stringify({ error: 'No file provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Reading file buffer...');
    const buffer = await file.arrayBuffer();
    console.log('Buffer size:', buffer.byteLength);

    console.log('Parsing Excel file...');
    const rows = parseExcelFile(buffer);
    console.log('Parsed rows:', rows.length);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    console.log('Supabase client created');

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
      console.log('Creating locations...');
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
          { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      console.log('Locations created/updated');

      // Create products and variants in batches
      // ⚡ CRITICAL: Reduced batch size to avoid 546 worker limit
      // Even more conservative: 250 instead of 500
      const PRODUCT_BATCH_SIZE = 250; // Reduced from 500 to 250
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
            { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        totalProductsCreated += createdProducts?.length || 0;
        console.log(`Batch ${batchNum} products created:`, createdProducts?.length);

        // ⚡ CRITICAL: Delay between products and variants
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay

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
            { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        } else {
          totalVariantsCreated += createdVariants?.length || 0;
          console.log(`Batch ${batchNum} variants created:`, createdVariants?.length);
        }

        // ⚡ CRITICAL: Delay between batches to allow worker pool to recycle
        if (i + PRODUCT_BATCH_SIZE < uniqueSkus.length) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
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

      // ⚡ CRITICAL FIX: Batch size reduced to 250 to avoid 546 worker limit
      const BATCH_SIZE = 250; // Reduced from 500 to 250
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

        // ⚡ CRITICAL: Delay between batches to allow worker pool to recycle
        // This prevents the 546 worker limit error
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
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
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Bulk import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

// =====================================================
// STREAMING BULK IMPORT (WITH PROGRESS)
// =====================================================

async function handleStreamingBulkImport(request: Request): Promise<Response> {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
    }
  });

  const sendProgress = (data: any) => {
    const json = JSON.stringify(data) + '\n';
    controller.enqueue(encoder.encode(json));
  };

  // Process in background
  (async () => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const userId = formData.get('userId') as string || 'system';

      if (!file) {
        sendProgress({ type: 'error', message: 'No file provided' });
        controller.close();
        return;
      }

      sendProgress({ type: 'progress', stage: 'parse', current: 0, total: 100, percentage: 0, message: 'Parsing file...' });

      const buffer = await file.arrayBuffer();
      const rows = parseExcelFile(buffer);

      sendProgress({ type: 'progress', stage: 'parse', current: 100, total: 100, percentage: 100, message: `Parsed ${rows.length} rows` });

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const validRows = rows.filter(row =>
        row.sku_code && row.product_name && row.bill_no &&
        row.bill_datetime && row.location_code && row.quantity > 0
      );

      // Get variant and location IDs
      sendProgress({ type: 'progress', stage: 'lookup', current: 0, total: 100, percentage: 0, message: 'Looking up IDs...' });

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

      sendProgress({ type: 'progress', stage: 'lookup', current: 100, total: 100, percentage: 100, message: 'IDs loaded' });

      // ⚡ CRITICAL FIX: Batch size 250 with delays
      const BATCH_SIZE = 250;
      const totalBatches = Math.ceil(validRows.length / BATCH_SIZE);
      const eventIds: string[] = [];
      const errors: any[] = [];

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, validRows.length);
        const batchRows = validRows.slice(start, end);

        sendProgress({
          type: 'progress',
          stage: 'import',
          current: start,
          total: validRows.length,
          percentage: Math.round((start / validRows.length) * 100),
          message: `Batch ${batchIndex + 1}/${totalBatches}...`
        });

        const events = batchRows.map((row, idx) => {
          const variantId = variantMap.get(row.sku_code);
          const locationId = locationMap.get(row.location_code);

          if (!variantId || !locationId) {
            errors.push({ row: start + idx + 2, error: 'Missing IDs', data: row });
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
          errors.push({ batch: batchIndex + 1, error: error.message });
        } else {
          eventIds.push(...(data || []).map((e: any) => e.event_id));
        }

        sendProgress({
          type: 'progress',
          stage: 'import',
          current: end,
          total: validRows.length,
          percentage: Math.round((end / validRows.length) * 100),
          message: `Imported ${end}/${validRows.length}`
        });

        // ⚡ CRITICAL: Delay for worker recycling
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      sendProgress({
        type: 'complete',
        result: {
          eventsCreated: eventIds.length,
          errors: errors.length,
          errorDetails: errors
        }
      });

      controller.close();

    } catch (error: any) {
      sendProgress({ type: 'error', message: error.message });
      controller.close();
    }
  })();

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
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

app.post("/make-server-c45d1eeb/bulk-import-stream", async (c) => {
  const request = c.req.raw;
  return await handleStreamingBulkImport(request);
});

// =====================================================
// START SERVER
// =====================================================

Deno.serve(app.fetch);
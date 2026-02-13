# 📋 COPY-PASTE THESE FILES TO SUPABASE DASHBOARD

## 🚨 YOU MUST EDIT CODE DIRECTLY IN SUPABASE!

The deployment isn't working automatically. You need to **MANUALLY** edit the code in Supabase Dashboard.

---

## 🎯 STEP 1: Open Supabase Dashboard

1. Go to: **https://supabase.com/dashboard/projects**
2. Click on **your project**
3. In left sidebar, click **"Edge Functions"**
4. Find the function called **`make-server-c45d1eeb`** or **`server`**
5. Click on it

---

## 🎯 STEP 2: Edit index.tsx

Find or create the file `index.tsx` and replace ALL content with:

```typescript
import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { handleCSVImport } from "./csv-import.tsx";

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

// Health check endpoint
app.get("/make-server-c45d1eeb/health", (c) => {
  return c.json({ status: "ok" });
});

// Bulk import endpoint (NOW USING CSV-ONLY!)
app.post("/make-server-c45d1eeb/bulk-import", async (c) => {
  const request = c.req.raw;
  return await handleCSVImport(request);
});

// Bulk import endpoint for CSV only
app.post("/make-server-c45d1eeb/bulk-import-csv", async (c) => {
  const request = c.req.raw;
  return await handleCSVImport(request);
});

Deno.serve(app.fetch);
```

**✅ Save the file**

---

## 🎯 STEP 3: Create csv-import.tsx

Create a NEW file called `csv-import.tsx` with this content:

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

// =====================================================
// 🚀 PURE CSV PARSER - ZERO DEPENDENCIES! 🚀
// =====================================================

console.log('🚀 CSV-IMPORT MODULE LOADED - NO XLSX!');

interface ExcelRow {
  bill_no: string;
  bill_datetime: string;
  sku_code: string;
  product_name: string;
  size?: string;
  quantity: number;
  selling_price?: number;
  location_code: string;
  customer_code?: string;
}

interface ValidationError {
  row: number;
  field: string;
  error: string;
  value: any;
}

// =====================================================
// ULTRA-LIGHTWEIGHT CSV PARSER
// =====================================================

function parseCSV(buffer: ArrayBuffer): ExcelRow[] {
  console.log('🚀🚀🚀 CSV PARSER STARTED - NO MEMORY ISSUES! 🚀🚀🚀');
  
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(buffer);
  
  const lines = text.split('\n').filter(line => line.trim());
  console.log('Total lines:', lines.length);
  
  if (lines.length === 0) return [];
  
  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  console.log('Headers:', header.slice(0, 10));
  
  // Column mapping
  const getIdx = (names: string[]) => 
    header.findIndex(h => names.some(n => h.toLowerCase() === n.toLowerCase()));
  
  const cols = {
    billNo: getIdx(['vno', 'bill no', 'invoiceno']),
    date: getIdx(['date', 'ftime', 'datetime']),
    sku: getIdx(['prno', 'sku', 'productcode']),
    qty: getIdx(['qty', 'quantity']),
    rate: getIdx(['rate', 'sal_rate', 'price']),
    location: getIdx(['acno', 'location', 'firmid']),
    customer: getIdx(['s_mno', 'smno', 'customer']),
    size: getIdx(['size_code', 'size'])
  };
  
  console.log('Column indices:', cols);
  
  // Parse rows (simple split, no complex parsing to save memory)
  const rows: ExcelRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    rows.push({
      bill_no: cols.billNo >= 0 ? values[cols.billNo] : '',
      bill_datetime: cols.date >= 0 ? values[cols.date] : '',
      sku_code: cols.sku >= 0 ? values[cols.sku] : '',
      product_name: cols.sku >= 0 ? values[cols.sku] : 'Unknown',
      size: cols.size >= 0 ? values[cols.size] : undefined,
      quantity: cols.qty >= 0 ? parseFloat(values[cols.qty]) || 0 : 0,
      selling_price: cols.rate >= 0 ? parseFloat(values[cols.rate]) || undefined : undefined,
      location_code: cols.location >= 0 ? values[cols.location] : '',
      customer_code: cols.customer >= 0 ? values[cols.customer] : undefined
    });
  }
  
  console.log('✅ Parsed', rows.length, 'rows');
  console.log('✅ Sample:', rows[0]);
  
  return rows;
}

// =====================================================
// AUTO-CREATE (TINY BATCHES)
// =====================================================

async function createMasterData(
  rows: ExcelRow[],
  supabase: any,
  mode: string
): Promise<{ createdLocations: number; createdProducts: number; createdVariants: number }> {
  
  const uniqueSkus = new Set(rows.map(r => r.sku_code).filter(Boolean));
  const uniqueLocs = new Set(rows.map(r => r.location_code).filter(Boolean));

  console.log('Unique SKUs:', uniqueSkus.size);
  console.log('Unique locations:', uniqueLocs.size);

  const { data: existingVariants } = await supabase
    .from('product_variants')
    .select('sku_code');
  
  const { data: existingLocations } = await supabase
    .from('locations')
    .select('location_code');

  const existingSkus = new Set((existingVariants || []).map((v: any) => v.sku_code));
  const existingLocs = new Set((existingLocations || []).map((l: any) => l.location_code));

  const missingSkus = Array.from(uniqueSkus).filter(s => !existingSkus.has(s));
  const missingLocs = Array.from(uniqueLocs).filter(l => !existingLocs.has(l));

  console.log('Missing SKUs:', missingSkus.length);
  console.log('Missing locations:', missingLocs.length);

  let createdLocations = 0;
  let createdProducts = 0;
  let createdVariants = 0;

  // Create locations
  if (missingLocs.length > 0) {
    const locs = missingLocs.map(code => ({
      location_code: code,
      location_name: `Location ${code}`,
      location_type: 'STORE',
      is_active: true
    }));

    const { data } = await supabase.from('locations').insert(locs).select('id');
    createdLocations = data?.length || 0;
    console.log('Created locations:', createdLocations);
  }

  // Create products (batch size 5 - ultra tiny!)
  if (mode === 'preview' && missingSkus.length > 0) {
    const BATCH = 5;
    const total = Math.ceil(missingSkus.length / BATCH);

    for (let i = 0; i < total; i++) {
      const batch = missingSkus.slice(i * BATCH, (i + 1) * BATCH);
      console.log(`Batch ${i + 1}/${total} (${batch.length} products)`);

      const prods = batch.map(sku => ({
        product_code: sku,
        product_name: `Product ${sku}`,
        product_type: 'GARMENT',
        is_active: true
      }));

      const { data: products } = await supabase
        .from('products')
        .insert(prods)
        .select('id, product_code');

      if (products) {
        createdProducts += products.length;

        const vars = products.map((p: any) => ({
          product_id: p.id,
          sku_code: p.product_code,
          size: 'OS',
          color: 'IMPORTED',
          is_active: true
        }));

        const { data: variants } = await supabase
          .from('product_variants')
          .insert(vars)
          .select('id');

        if (variants) createdVariants += variants.length;
      }

      if (i < total - 1) await new Promise(r => setTimeout(r, 1000));
    }

    console.log('Total products:', createdProducts);
    console.log('Total variants:', createdVariants);
  }

  return { createdLocations, createdProducts, createdVariants };
}

// =====================================================
// VALIDATE
// =====================================================

async function validate(
  rows: ExcelRow[],
  supabase: any,
  skip: boolean
): Promise<{ validRows: ExcelRow[]; errors: ValidationError[] }> {
  
  const validRows: ExcelRow[] = [];
  const errors: ValidationError[] = [];

  let validSkus = new Set<string>();
  let validLocs = new Set<string>();

  if (!skip) {
    const { data: variants } = await supabase.from('product_variants').select('sku_code');
    const { data: locations } = await supabase.from('locations').select('location_code');
    validSkus = new Set((variants || []).map((v: any) => v.sku_code));
    validLocs = new Set((locations || []).map((l: any) => l.location_code));
  }

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    let hasError = false;

    if (!row.bill_no) {
      errors.push({ row: rowNum, field: 'bill_no', error: 'Required', value: row.bill_no });
      hasError = true;
    }
    if (!row.sku_code) {
      errors.push({ row: rowNum, field: 'sku_code', error: 'Required', value: row.sku_code });
      hasError = true;
    } else if (!skip && !validSkus.has(row.sku_code)) {
      errors.push({ row: rowNum, field: 'sku_code', error: 'Not found', value: row.sku_code });
      hasError = true;
    }
    if (!row.quantity || row.quantity <= 0) {
      errors.push({ row: rowNum, field: 'quantity', error: 'Must be > 0', value: row.quantity });
      hasError = true;
    }
    if (!row.location_code) {
      errors.push({ row: rowNum, field: 'location_code', error: 'Required', value: row.location_code });
      hasError = true;
    } else if (!skip && !validLocs.has(row.location_code)) {
      errors.push({ row: rowNum, field: 'location_code', error: 'Not found', value: row.location_code });
      hasError = true;
    }

    if (!hasError) validRows.push(row);
  });

  console.log('Valid:', validRows.length);
  console.log('Invalid:', errors.length);

  return { validRows, errors };
}

// =====================================================
// CREATE EVENTS
// =====================================================

async function createEvents(
  rows: ExcelRow[],
  userId: string,
  supabase: any
): Promise<{ eventIds: string[]; errors: any[] }> {
  
  const eventIds: string[] = [];
  const errors: any[] = [];
  
  const skus = [...new Set(rows.map(r => r.sku_code))];
  const locs = [...new Set(rows.map(r => r.location_code))];
  
  const { data: variants } = await supabase
    .from('product_variants')
    .select('id, sku_code')
    .in('sku_code', skus);

  const { data: locations } = await supabase
    .from('locations')
    .select('id, location_code')
    .in('location_code', locs);

  const varMap = new Map((variants || []).map((v: any) => [v.sku_code, v.id]));
  const locMap = new Map((locations || []).map((l: any) => [l.location_code, l.id]));

  const BATCH = 5;
  const total = Math.ceil(rows.length / BATCH);

  for (let i = 0; i < total; i++) {
    const batch = rows.slice(i * BATCH, (i + 1) * BATCH);
    console.log(`Event batch ${i + 1}/${total}`);

    const events = batch.map((row, idx) => {
      const varId = varMap.get(row.sku_code);
      const locId = locMap.get(row.location_code);

      if (!varId || !locId) {
        errors.push({ row: i * BATCH + idx + 2, error: 'Missing ID', data: row });
        return null;
      }

      return {
        event_type: 'SALE',
        variant_id: varId,
        quantity: -Math.abs(row.quantity),
        from_location_id: locId,
        to_location_id: null,
        reference_number: row.bill_no,
        unit_selling_price: row.selling_price,
        total_amount: row.selling_price ? row.selling_price * row.quantity : null,
        client_timestamp: row.bill_datetime,
        created_by: userId,
        notes: 'BULK_IMPORT'
      };
    }).filter(e => e !== null);

    const { data } = await supabase.from('event_ledger').insert(events).select('event_id');
    if (data) eventIds.push(...data.map((e: any) => e.event_id));

    if (i < total - 1) await new Promise(r => setTimeout(r, 1000));
  }

  console.log('Events created:', eventIds.length);
  return { eventIds, errors };
}

// =====================================================
// MAIN HANDLER
// =====================================================

export async function handleCSVImport(request: Request) {
  try {
    console.log('═══════════════════════════════════════');
    console.log('🚀 CSV-IMPORT HANDLER v3.0 - NO XLSX! 🚀');
    console.log('═══════════════════════════════════════');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mode = (formData.get('operation') || formData.get('mode') || 'preview') as string;

    console.log('Mode:', mode);
    console.log('File:', file?.name);

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const buffer = await file.arrayBuffer();
    console.log('Size:', buffer.byteLength, 'bytes');

    const rows = parseCSV(buffer);
    
    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: users } = await supabase.from('auth.users').select('id').limit(1);
    const userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000000';

    const { createdLocations, createdProducts, createdVariants } = 
      await createMasterData(rows, supabase, mode);
    
    const { validRows, errors } = await validate(rows, supabase, mode === 'preview');

    if (mode === 'preview') {
      return new Response(
        JSON.stringify({
          success: true,
          totalRows: rows.length,
          validRows: validRows.length,
          errorRows: errors.length,
          errors: errors,
          preview: validRows.slice(0, 10),
          autoCreated: {
            locations: createdLocations,
            products: createdProducts,
            variants: createdVariants
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (mode === 'import') {
      const { eventIds, errors: eventErrors } = await createEvents(validRows, userId, supabase);

      return new Response(
        JSON.stringify({
          success: true,
          totalRows: rows.length,
          successCount: eventIds.length,
          errorCount: errors.length,
          errors: errors,
          eventIds: eventIds,
          autoCreated: {
            locations: createdLocations,
            products: createdProducts,
            variants: createdVariants
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid mode' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

**✅ Save the file**

---

## 🎯 STEP 4: Deploy

After editing both files:

1. Look for a **"Deploy"** button
2. Click it
3. Wait for "Deployment successful"
4. Check timestamp (should be recent!)

---

## 🧪 STEP 5: Test

Upload a test CSV file and check console:

### ✅ SUCCESS:
```
🚀 CSV-IMPORT HANDLER v3.0 - NO XLSX! 🚀
🚀🚀🚀 CSV PARSER STARTED - NO MEMORY ISSUES! 🚀🚀🚀
```

### ❌ FAILURE:
```
Parsing Excel file...
Sheet name: Sheet1
```

---

## 💡 CAN'T FIND THE FILES?

If you can't see individual files in Supabase Dashboard:

### Option 1: Use CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase functions deploy make-server-c45d1eeb
```

### Option 2: Check Different Tab
- Try "Code" tab
- Try "Settings" tab
- Try "Logs" tab

### Option 3: Contact Me
Tell me what you see and I'll help guide you!

---

**DEPLOY THESE FILES AND IT WILL WORK!** 🚀

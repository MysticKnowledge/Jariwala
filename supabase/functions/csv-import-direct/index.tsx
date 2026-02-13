import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// =====================================================
// PURE CSV PARSER - NO XLSX!
// =====================================================

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

function parseCSV(buffer: ArrayBuffer): ExcelRow[] {
  console.log('🔥🔥🔥 BRAND NEW CSV PARSER - NO XLSX! 🔥🔥🔥');
  
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(buffer);
  const lines = text.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) return [];
  
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const getIdx = (names: string[]) => 
    header.findIndex(h => names.some(n => h.toLowerCase() === n.toLowerCase()));
  
  const cols = {
    billNo: getIdx(['vno', 'bill no', 'invoiceno']),
    date: getIdx(['date', 'ftime', 'datetime']),
    sku: getIdx(['prno', 'sku', 'productcode']),
    qty: getIdx(['qty', 'quantity']),
    rate: getIdx(['rate', 'sal_rate', 'price']),
    location: getIdx(['acno', 'location', 'firmid']),
  };
  
  const rows: ExcelRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    rows.push({
      bill_no: cols.billNo >= 0 ? values[cols.billNo] : '',
      bill_datetime: cols.date >= 0 ? values[cols.date] : '',
      sku_code: cols.sku >= 0 ? values[cols.sku] : '',
      product_name: 'Unknown',
      quantity: cols.qty >= 0 ? parseFloat(values[cols.qty]) || 0 : 0,
      selling_price: cols.rate >= 0 ? parseFloat(values[cols.rate]) || undefined : undefined,
      location_code: cols.location >= 0 ? values[cols.location] : '',
    });
  }
  
  console.log('✅ Parsed', rows.length, 'rows instantly!');
  return rows;
}

app.post("/csv-import-direct", async (c) => {
  try {
    console.log('═══════════════════════════════════════');
    console.log('🔥 NEW FUNCTION - CSV ONLY! 🔥');
    console.log('═══════════════════════════════════════');

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const mode = (formData.get('operation') || 'preview') as string;

    if (!file) {
      return c.json({ success: false, error: 'No file' }, 400);
    }

    const buffer = await file.arrayBuffer();
    console.log('File size:', buffer.byteLength, 'bytes');

    const rows = parseCSV(buffer);
    
    if (!rows || rows.length === 0) {
      return c.json({ success: false, error: 'No data parsed' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Preview mode - just return sample
    if (mode === 'preview') {
      return c.json({
        success: true,
        totalRows: rows.length,
        preview: rows.slice(0, 20),
        message: `Successfully parsed ${rows.length} rows! Ready to import.`
      });
    }

    return c.json({
      success: true,
      message: 'CSV parsed successfully',
      totalRows: rows.length
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

Deno.serve(app.fetch);

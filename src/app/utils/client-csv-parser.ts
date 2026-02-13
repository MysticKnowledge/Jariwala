// =====================================================
// CLIENT-SIDE CSV PARSER & IMPORTER
// Bypasses Edge Functions - works entirely in browser!
// =====================================================

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export interface ExcelRow {
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

export interface ValidationError {
  row: number;
  field: string;
  error: string;
  value: any;
}

export interface PreviewResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ValidationError[];
  preview: ExcelRow[];
  autoCreated?: {
    locations: number;
    products: number;
    variants: number;
  };
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: any[];
  eventIds: string[];
}

// =====================================================
// PURE CLIENT-SIDE CSV PARSER
// =====================================================

export function parseCSV(file: File): Promise<ExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log('🔥🔥🔥 CLIENT-SIDE CSV PARSER - NO SERVER! 🔥🔥🔥');
        
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          resolve([]);
          return;
        }
        
        // Parse header
        const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        console.log('Headers:', header.slice(0, 10));
        
        // Column mapping
        const getIdx = (names: string[]) => 
          header.findIndex(h => names.some(n => h.toLowerCase() === n.toLowerCase()));
        
        const cols = {
          billNo: getIdx(['vno', 'bill no', 'invoiceno', 'bill_no']),
          date: getIdx(['date', 'ftime', 'datetime', 'bill_datetime']),
          sku: getIdx(['prno', 'sku', 'productcode', 'sku_code']),
          qty: getIdx(['qty', 'quantity']),
          rate: getIdx(['rate', 'sal_rate', 'price', 'selling_price']),
          location: getIdx(['acno', 'location', 'firmid', 'location_code']),
          customer: getIdx(['s_mno', 'smno', 'customer', 'customer_code']),
          size: getIdx(['size_code', 'size'])
        };
        
        console.log('Column indices:', cols);
        
        // Parse rows
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
        
        resolve(rows);
      } catch (error) {
        console.error('Parse error:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// =====================================================
// AUTO-CREATE MASTER DATA
// =====================================================

export async function createMasterData(
  rows: ExcelRow[]
): Promise<{ createdLocations: number; createdProducts: number; createdVariants: number }> {
  
  const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
  );
  
  const uniqueSkus = new Set(rows.map(r => r.sku_code).filter(Boolean));
  const uniqueLocs = new Set(rows.map(r => r.location_code).filter(Boolean));

  console.log('Unique SKUs:', uniqueSkus.size);
  console.log('Unique locations:', uniqueLocs.size);

  // Get existing data (fetch ALL - no default 1000 limit!)
  const { data: existingVariants } = await supabase
    .from('product_variants')
    .select('sku_code')
    .limit(100000);  // Fetch up to 100K!
  
  const { data: existingLocations } = await supabase
    .from('locations')
    .select('location_code')
    .limit(10000);  // Fetch up to 10K!

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

    // Use upsert to avoid 409 conflicts!
    const { data, error } = await supabase
      .from('locations')
      .upsert(locs, { 
        onConflict: 'location_code',
        ignoreDuplicates: true 
      })
      .select('id');
    
    if (!error && data) {
      createdLocations = data.length;
      console.log('Created locations:', createdLocations);
    } else if (error) {
      console.warn('Location insert warning (might already exist):', error);
    }
  }

  // Create products in batches
  if (missingSkus.length > 0) {
    const BATCH = 200; // Frontend can handle much bigger batches!
    const total = Math.ceil(missingSkus.length / BATCH);

    for (let i = 0; i < total; i++) {
      const batch = missingSkus.slice(i * BATCH, (i + 1) * BATCH);
      console.log(`Creating batch ${i + 1}/${total} (${batch.length} products)`);

      const prods = batch.map(sku => ({
        product_code: sku,
        product_name: `Product ${sku}`,
        product_type: 'GARMENT',
        is_active: true
      }));

      // Step 1: Upsert products (don't rely on returned data!)
      await supabase
        .from('products')
        .upsert(prods, { 
          onConflict: 'product_code',
          ignoreDuplicates: true 
        });

      // Step 2: FETCH all products to get IDs (both new and existing!)
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, product_code')
        .in('product_code', batch);

      if (fetchError) {
        console.error('Failed to fetch products:', fetchError);
        continue;
      }

      if (!products || products.length === 0) {
        console.warn('No products found after upsert!');
        continue;
      }

      console.log(`✅ Got ${products.length} products (${batch.length} requested)`);
      createdProducts += products.length;

      // Step 3: Create variants for ALL products
      const vars = products.map((p: any) => ({
        product_id: p.id,
        sku_code: p.product_code,
        size: 'OS',
        color: 'IMPORTED',
        is_active: true
      }));

      console.log(`🔹 Upserting ${vars.length} variants...`);

      const { error: varError } = await supabase
        .from('product_variants')
        .upsert(vars, { 
          onConflict: 'sku_code',
          ignoreDuplicates: false  // Don't ignore - update them!
        });

      if (varError) {
        console.error('❌ Variant upsert error:', varError);
        console.error('❌ Failed batch:', batch.slice(0, 5)); // Show first 5 SKUs
      } else {
        // VERIFY: Fetch back the variants to confirm they exist!
        const { data: verifyVariants, error: verifyError } = await supabase
          .from('product_variants')
          .select('sku_code')
          .in('sku_code', batch);
        
        if (verifyError) {
          console.error('❌ Verification failed:', verifyError);
        } else {
          console.log(`✅ Verified ${verifyVariants?.length || 0} variants exist in DB`);
          createdVariants += verifyVariants?.length || 0;
        }
      }

      // No delay needed - frontend can handle rapid requests!
    }

    console.log('🎉 Total products processed:', createdProducts);
    console.log('🎉 Total variants upserted:', createdVariants);
  }

  return { createdLocations, createdProducts, createdVariants };
}

// =====================================================
// VALIDATE ROWS
// =====================================================

export async function validateRows(
  rows: ExcelRow[]
): Promise<{ validRows: ExcelRow[]; errors: ValidationError[] }> {
  
  const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
  );
  
  const validRows: ExcelRow[] = [];
  const errors: ValidationError[] = [];

  // Get valid SKUs and locations - FETCH ALL using pagination!
  console.log('🔍 Fetching all variants (may take a few seconds)...');
  
  const allVariants: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: varPage, error } = await supabase
      .from('product_variants')
      .select('sku_code')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('Error fetching variants:', error);
      break;
    }
    
    if (!varPage || varPage.length === 0) break;
    
    allVariants.push(...varPage);
    console.log(`📦 Fetched page ${page + 1}: ${varPage.length} variants (total: ${allVariants.length})`);
    
    if (varPage.length < pageSize) break; // Last page
    page++;
  }
  
  const { data: locations } = await supabase
    .from('locations')
    .select('location_code')
    .limit(10000);  // Locations won't exceed 10K
  
  const validSkus = new Set(allVariants.map((v: any) => v.sku_code));
  const validLocs = new Set((locations || []).map((l: any) => l.location_code));

  console.log('🔍 Validation: Found', validSkus.size, 'valid SKUs');
  console.log('🔍 Validation: Found', validLocs.size, 'valid locations');

  // DEBUG: Show sample of valid SKUs
  const sampleValidSkus = Array.from(validSkus).slice(0, 10);
  console.log('🔍 Sample valid SKUs:', sampleValidSkus);

  // DEBUG: Check first few CSV SKUs
  const firstCsvSkus = rows.slice(0, 10).map(r => r.sku_code);
  console.log('🔍 First CSV SKUs:', firstCsvSkus);
  console.log('🔍 Are they in validSkus?', firstCsvSkus.map(s => validSkus.has(s)));

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
    } else if (!validSkus.has(row.sku_code)) {
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
    } else if (!validLocs.has(row.location_code)) {
      errors.push({ row: rowNum, field: 'location_code', error: 'Not found', value: row.location_code });
      hasError = true;
    }

    if (!hasError) validRows.push(row);
  });

  console.log('Valid rows:', validRows.length);
  console.log('Invalid rows:', errors.length);

  return { validRows, errors };
}

// =====================================================
// CREATE EVENTS (CLIENT-SIDE)
// =====================================================

export async function createEvents(
  rows: ExcelRow[],
  onProgress?: (current: number, total: number) => void
): Promise<{ eventIds: string[]; errors: any[] }> {
  
  const supabase = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey
  );
  
  const eventIds: string[] = [];
  const errors: any[] = [];
  
  // Get variant and location IDs - FETCH ALL VARIANTS!
  const locs = [...new Set(rows.map(r => r.location_code))];
  
  console.log(`🔍 Fetching ALL variants using pagination...`);
  
  // Fetch ALL variants using pagination (no .in() filter!)
  const allVariants: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: varPage, error } = await supabase
      .from('product_variants')
      .select('id, sku_code')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('Error fetching variants:', error);
      break;
    }
    
    if (!varPage || varPage.length === 0) break;
    
    allVariants.push(...varPage);
    console.log(`📦 Fetched page ${page + 1}: ${varPage.length} variants (total: ${allVariants.length})`);
    
    if (varPage.length < pageSize) break; // Last page
    page++;
  }

  const { data: locations } = await supabase
    .from('locations')
    .select('id, location_code')
    .in('location_code', locs)
    .limit(10000);  // Locations won't exceed 10K

  const varMap = new Map(allVariants.map((v: any) => [v.sku_code, v.id]));
  const locMap = new Map((locations || []).map((l: any) => [l.location_code, l.id]));
  
  console.log(`✅ Mapped ${varMap.size} variants and ${locMap.size} locations`);
  
  // Get current user ID (or use default)
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000000';

  // Insert in batches (100 rows at a time - frontend can handle it!)
  const BATCH = 100;
  const total = Math.ceil(rows.length / BATCH);
  
  console.log(`🚀 Starting event insertion: ${rows.length} rows in ${total} batches`);

  for (let i = 0; i < total; i++) {
    const batch = rows.slice(i * BATCH, (i + 1) * BATCH);
    console.log(`📦 Batch ${i + 1}/${total}: Preparing ${batch.length} events...`);

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
        notes: 'BULK_IMPORT_CLIENT'
      };
    }).filter(e => e !== null);

    console.log(`📤 Batch ${i + 1}/${total}: Inserting ${events.length} events into database...`);
    
    // Add retry logic with timeout
    let retries = 3;
    let success = false;
    let lastError = null;
    
    while (retries > 0 && !success) {
      try {
        // Create an abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const { data, error } = await supabase
          .from('event_ledger')
          .insert(events)
          .select('event_id')
          .abortSignal(controller.signal);
        
        clearTimeout(timeoutId);
        
        if (error) {
          throw error;
        }
        
        if (data) {
          eventIds.push(...data.map((e: any) => e.event_id));
          console.log(`✅ Batch ${i + 1}/${total}: Successfully inserted ${data.length} events (Total: ${eventIds.length})`);
          success = true;
        }
      } catch (error: any) {
        lastError = error;
        retries--;
        
        if (error.name === 'AbortError') {
          console.error(`⏱️ Batch ${i + 1}/${total}: Timeout after 30 seconds (${retries} retries left)`);
        } else {
          console.error(`❌ Batch ${i + 1}/${total}: Insert error (${retries} retries left):`, error.message || error);
        }
        
        if (retries > 0) {
          console.log(`🔄 Retrying batch ${i + 1} in 2 seconds...`);
          await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds before retry
        } else {
          console.error(`💥 Batch ${i + 1}/${total}: All retries failed!`);
          errors.push({ 
            batch: i + 1, 
            error: lastError?.message || 'Insert failed after 3 retries',
            details: lastError 
          });
        }
      }
    }

    // Report progress
    if (onProgress) {
      onProgress((i + 1) * BATCH, rows.length);
    }

    // Small delay between batches (only if successful and not last batch)
    if (success && i < total - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('✅ Event insertion complete!');
  console.log(`📊 Events created: ${eventIds.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  
  return { eventIds, errors };
}

// =====================================================
// MAIN PREVIEW FUNCTION
// =====================================================

export async function previewCSV(file: File): Promise<PreviewResult> {
  try {
    console.log('🔥 CLIENT-SIDE PREVIEW STARTED');
    
    // Parse CSV
    const rows = await parseCSV(file);
    
    if (!rows || rows.length === 0) {
      return {
        success: false,
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        errors: [],
        preview: []
      };
    }

    // Auto-create missing master data
    const autoCreated = await createMasterData(rows);
    
    // Validate
    const { validRows, errors } = await validateRows(rows);

    return {
      success: true,
      totalRows: rows.length,
      validRows: validRows.length,
      errorRows: errors.length,
      errors: errors,
      preview: validRows.slice(0, 10),
      autoCreated
    };
  } catch (error) {
    console.error('Preview error:', error);
    throw error;
  }
}

// =====================================================
// MAIN IMPORT FUNCTION
// =====================================================

export async function importCSV(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  try {
    console.log('🔥 CLIENT-SIDE IMPORT STARTED');
    
    // Parse CSV
    const rows = await parseCSV(file);
    
    if (!rows || rows.length === 0) {
      throw new Error('No data to import');
    }

    // Auto-create missing master data
    await createMasterData(rows);
    
    // Validate
    const { validRows, errors } = await validateRows(rows);

    if (validRows.length === 0) {
      throw new Error('No valid rows to import');
    }

    // Create events
    const { eventIds, errors: eventErrors } = await createEvents(validRows, onProgress);

    return {
      success: true,
      totalRows: rows.length,
      successCount: eventIds.length,
      errorCount: errors.length + eventErrors.length,
      errors: [...errors, ...eventErrors],
      eventIds
    };
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
}
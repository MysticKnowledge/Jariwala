import React, { useState } from 'react';
import { Panel } from '@/app/components/Panel';
import { Upload, AlertCircle, CheckCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface PRMASTRow {
  PRNO: string;
  PRNAME: string;
  SIZE_CODE: string;
  COMPANY: string;
  Pattern: string;
  coloCode: string;
  CO_CODE: string;
  PRC_RATE: string;
  SAL_RATE: string;
  DPT_NO: string;
  ename: string;
  SALE_FLAG: string;
  hsncode: string;
  gstRate: string;
  Ftime: string;
}

interface ImportStats {
  totalRows: number;
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  errors: string[];
  startTime: number;
  endTime?: number;
}

export function LegacyPRMASTImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: '' });

  const normalizeString = (str: string | undefined | null): string => {
    if (!str) return '';
    return str.trim().replace(/\s+/g, '_').toUpperCase();
  };

  const parseCSV = (text: string): PRMASTRow[] => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows: PRMASTRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      rows.push(row as PRMASTRow);
    }

    return rows;
  };

  const generateSKU = (prno: string, size: string, color: string): string => {
    const cleanPRNO = normalizeString(prno);
    const cleanSize = normalizeString(size);
    const cleanColor = normalizeString(color);
    return `${cleanPRNO}-${cleanSize}-${cleanColor}`;
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    const startTime = Date.now();
    const importStats: ImportStats = {
      totalRows: 0,
      productsCreated: 0,
      productsUpdated: 0,
      variantsCreated: 0,
      variantsUpdated: 0,
      errors: [],
      startTime,
    };

    try {
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      // Read and parse CSV
      setProgress({ current: 0, total: 100, stage: 'Reading CSV file...' });
      const text = await file.text();
      const rows = parseCSV(text);
      importStats.totalRows = rows.length;

      console.log(`📊 Parsed ${rows.length} rows from CSV`);
      setProgress({ current: 10, total: 100, stage: `Parsed ${rows.length.toLocaleString()} rows` });

      // Group by PRNO to create products
      setProgress({ current: 15, total: 100, stage: 'Grouping products...' });
      const productMap = new Map<string, {
        product_code: string;
        product_name: string;
        description: string | null;
        product_type: string;
        base_cost_price: number;
        base_selling_price: number;
        mrp: number;
        tax_rate: number;
        hsn_code: string | null;
        is_active: boolean;
      }>();

      rows.forEach((row) => {
        if (!productMap.has(row.PRNO)) {
          productMap.set(row.PRNO, {
            product_code: row.PRNO,
            product_name: row.PRNAME || 'Unknown',
            description: null,
            product_type: 'GARMENT', // Changed from 'STANDARD' to 'GARMENT'
            base_cost_price: parseFloat(row.PRC_RATE) || 0,
            base_selling_price: parseFloat(row.SAL_RATE) || 0,
            mrp: parseFloat(row.SAL_RATE) || 0,
            tax_rate: parseFloat(row.gstRate) || 0,
            hsn_code: row.hsncode || null,
            is_active: row.SALE_FLAG !== '1', // SALE_FLAG=1 means inactive
          });
        }
      });

      console.log(`📦 Found ${productMap.size} unique products (by PRNO)`);

      // Step 1: UPSERT products in batches
      setProgress({ current: 20, total: 100, stage: `Upserting ${productMap.size} products...` });
      const products = Array.from(productMap.values());
      const productBatchSize = 100;
      const parallelBatches = 10; // Process 10 batches in parallel
      const productIdMap = new Map<string, string>(); // PRNO → product_id

      for (let i = 0; i < products.length; i += productBatchSize * parallelBatches) {
        const batchPromises = [];
        
        for (let j = 0; j < parallelBatches; j++) {
          const startIdx = i + (j * productBatchSize);
          if (startIdx >= products.length) break;
          
          const batch = products.slice(startIdx, startIdx + productBatchSize);
          
          batchPromises.push(
            supabase
              .from('products')
              .upsert(batch, {
                onConflict: 'product_code',
                ignoreDuplicates: false,
              })
              .select('id, product_code')
          );
        }

        const results = await Promise.all(batchPromises);
        
        results.forEach((result, idx) => {
          const { data, error } = result;
          if (error) {
            console.error('Product upsert error:', error);
            importStats.errors.push(`Product batch ${i + (idx * productBatchSize)}: ${error.message}`);
          } else {
            data?.forEach((p: any) => {
              productIdMap.set(p.product_code, p.id);
            });
            importStats.productsCreated += data?.length || 0;
          }
        });

        const progressPercent = 20 + Math.floor((i / products.length) * 20);
        setProgress({ 
          current: progressPercent, 
          total: 100, 
          stage: `Products: ${Math.min(i + (productBatchSize * parallelBatches), products.length)}/${products.length}` 
        });
      }

      console.log(`✅ Upserted ${importStats.productsCreated} products`);

      // Step 2: Create variants with UPSERT for collision handling
      setProgress({ current: 40, total: 100, stage: 'Creating variants...' });
      const variantBatchSize = 100;
      const variantParallelBatches = 10; // Process 10 batches in parallel
      let variantsProcessed = 0;

      for (let i = 0; i < rows.length; i += variantBatchSize * variantParallelBatches) {
        const batchPromises = [];
        
        for (let j = 0; j < variantParallelBatches; j++) {
          const startIdx = i + (j * variantBatchSize);
          if (startIdx >= rows.length) break;
          
          const batch = rows.slice(startIdx, startIdx + variantBatchSize);
          const variants = batch.map((row) => {
            const productId = productIdMap.get(row.PRNO);
            if (!productId) {
              importStats.errors.push(`Missing product_id for PRNO: ${row.PRNO}`);
              return null;
            }

            const sku = generateSKU(row.PRNO, row.SIZE_CODE, row.coloCode);

            return {
              sku_code: sku,
              product_id: productId,
              size: row.SIZE_CODE || null,
              color: row.coloCode || null,
              cost_price: parseFloat(row.PRC_RATE) || 0,
              selling_price: parseFloat(row.SAL_RATE) || 0,
              mrp: parseFloat(row.SAL_RATE) || 0,
              is_active: row.SALE_FLAG !== '1',
            };
          }).filter(v => v !== null);

          if (variants.length > 0) {
            batchPromises.push(
              supabase
                .from('product_variants')
                .upsert(variants, {
                  onConflict: 'sku_code',
                  ignoreDuplicates: false,
                })
            );
          }
        }

        const results = await Promise.all(batchPromises);
        
        results.forEach((result, idx) => {
          const { error } = result;
          if (error) {
            console.error('Variant upsert error:', error);
            importStats.errors.push(`Variant batch ${i + (idx * variantBatchSize)}: ${error.message}`);
          } else {
            importStats.variantsCreated += variantBatchSize;
          }
        });

        variantsProcessed = Math.min(i + (variantBatchSize * variantParallelBatches), rows.length);
        const progressPercent = 40 + Math.floor((variantsProcessed / rows.length) * 55);
        setProgress({ 
          current: progressPercent, 
          total: 100, 
          stage: `Variants: ${variantsProcessed.toLocaleString()}/${rows.length.toLocaleString()}` 
        });
      }

      console.log(`✅ Upserted ${importStats.variantsCreated} variants`);

      // Done!
      importStats.endTime = Date.now();
      setProgress({ current: 100, total: 100, stage: 'Import complete!' });
      setStats(importStats);

    } catch (error: any) {
      console.error('Import failed:', error);
      importStats.errors.push(`Fatal error: ${error.message}`);
      setStats(importStats);
    } finally {
      setImporting(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 
      ? `${minutes}m ${remainingSeconds}s` 
      : `${remainingSeconds}s`;
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="m-0">Legacy PRMAST Importer</h2>
          <div className="text-[0.75rem] text-[var(--muted-foreground)]">
            (400k+ rows supported)
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-[var(--background)]">
        <div className="max-w-4xl mx-auto">
          
          {/* Instructions */}
          <Panel glass className="p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">📋 Import Instructions</h3>
            <div className="space-y-3 text-[0.875rem]">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Expected Format:</strong> CSV file with PRNO, PRNAME, SIZE_CODE, COMPANY, Pattern, coloCode, PRC_RATE, SAL_RATE, gstRate, hsncode, DPT_NO, ename, SALE_FLAG, Ftime
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Grouping:</strong> Products grouped by PRNO, variants created for each row
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                <div>
                  <strong>SKU Generation:</strong> PRNO-SIZE_CODE-coloCode (e.g., 1-20-ORANGE_L)
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--warning)] mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Collision Handling:</strong> Existing SKUs will be REPLACED with new data
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--warning)] mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Performance:</strong> 400k rows will take 5-15 minutes depending on server load
                </div>
              </div>
            </div>
          </Panel>

          {/* File Upload */}
          <Panel glass className="p-6 mb-6">
            <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="prmast-upload"
                disabled={importing}
              />
              <label 
                htmlFor="prmast-upload" 
                className="cursor-pointer block"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)]" />
                <div className="text-lg font-semibold mb-2">
                  {file ? file.name : 'Choose PRMAST CSV file'}
                </div>
                <div className="text-[0.875rem] text-[var(--muted-foreground)]">
                  {file 
                    ? `${(file.size / 1024 / 1024).toFixed(2)} MB • Click to change`
                    : 'Click to browse or drag and drop'
                  }
                </div>
              </label>
            </div>

            {file && !importing && (
              <button
                onClick={handleImport}
                className="w-full mt-4 h-10 px-4 bg-[var(--primary)] text-white rounded-[4px] font-semibold hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Start Import
              </button>
            )}
          </Panel>

          {/* Progress */}
          {importing && (
            <Panel glass className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
                <div className="font-semibold">Importing...</div>
              </div>
              
              <div className="mb-2 text-[0.875rem] text-[var(--muted-foreground)]">
                {progress.stage}
              </div>
              
              <div className="w-full bg-[var(--muted)] rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-[var(--primary)] transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              
              <div className="mt-2 text-[0.75rem] text-[var(--muted-foreground)] text-right">
                {Math.floor((progress.current / progress.total) * 100)}%
              </div>
            </Panel>
          )}

          {/* Results */}
          {stats && !importing && (
            <Panel glass className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-[var(--success)]" />
                <h3 className="text-lg font-semibold m-0">Import Complete!</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-[var(--background-alt)] rounded-lg">
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Total Rows</div>
                  <div className="text-2xl font-bold">{stats.totalRows.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-[var(--background-alt)] rounded-lg">
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Duration</div>
                  <div className="text-2xl font-bold">
                    {stats.endTime && formatDuration(stats.endTime - stats.startTime)}
                  </div>
                </div>
                <div className="p-4 bg-[var(--background-alt)] rounded-lg">
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Products</div>
                  <div className="text-2xl font-bold text-[var(--primary)]">
                    {stats.productsCreated.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-[var(--background-alt)] rounded-lg">
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Variants</div>
                  <div className="text-2xl font-bold text-[var(--success)]">
                    {stats.variantsCreated.toLocaleString()}
                  </div>
                </div>
              </div>

              {stats.errors.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-[var(--warning)]" />
                    <div className="font-semibold">Errors ({stats.errors.length})</div>
                  </div>
                  <div className="max-h-48 overflow-auto bg-[var(--background-alt)] rounded-lg p-3 text-[0.75rem] font-mono">
                    {stats.errors.slice(0, 50).map((err, i) => (
                      <div key={i} className="text-[var(--destructive)] mb-1">
                        {err}
                      </div>
                    ))}
                    {stats.errors.length > 50 && (
                      <div className="text-[var(--muted-foreground)] mt-2">
                        ... and {stats.errors.length - 50} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setStats(null);
                  setFile(null);
                }}
                className="w-full mt-6 h-10 px-4 bg-[var(--primary)] text-white rounded-[4px] font-semibold hover:opacity-90"
              >
                Import Another File
              </button>
            </Panel>
          )}

        </div>
      </div>
    </div>
  );
}
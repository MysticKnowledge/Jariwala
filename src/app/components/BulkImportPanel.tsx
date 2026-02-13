// =====================================================
// BULK IMPORT PANEL
// Component for importing old sales from Excel
// =====================================================

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download, Database } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import * as ClientCSV from '../utils/client-csv-parser';

interface ValidationError {
  row: number;
  field: string;
  error: string;
  value: any;
}

interface AutoCreatedData {
  locations: number;
  products: number;
  variants: number;
}

interface WillCreateData {
  locations: number;
  products: number;
  variants: number;
}

interface PreviewResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ValidationError[];
  preview: any[];
  autoCreated?: AutoCreatedData;
  willCreate?: WillCreateData;
}

interface ImportResult {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ValidationError[];
  eventIds?: string[];
  autoCreated?: AutoCreatedData;
}

export function BulkImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewResult(null);
      setImportResult(null);
      setStep('upload');
    }
  };

  // Preview Excel data (CLIENT-SIDE - NO SERVER!)
  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    try {
      console.log('🔥🔥🔥 USING CLIENT-SIDE PREVIEW - NO SERVER NEEDED! 🔥🔥🔥');
      
      // Use client-side CSV parser - no server deployment needed!
      const result = await ClientCSV.previewCSV(file);
      
      console.log('✅ Preview complete!', result);
      
      if (result.success) {
        setPreviewResult(result);
        setStep('preview');
      } else {
        alert('Failed to preview file. Please check the format.');
      }
    } catch (error) {
      console.error('Preview error:', error);
      
      // Check if it's a database error
      if (error.message && error.message.includes('relation')) {
        alert(
          '❌ DATABASE TABLES NOT CREATED!\n\n' +
          'The database tables don\'t exist yet in your Supabase database.\n\n' +
          '📋 TO FIX THIS:\n' +
          '1. Open Supabase Dashboard → SQL Editor\n' +
          '2. Run these migration scripts IN ORDER:\n' +
          '   • /database/01-create-tables.sql\n' +
          '   • /database/02-create-views.sql\n' +
          '   • /database/03-seed-data.sql\n\n' +
          '3. Refresh this page and try again\n\n' +
          '📖 See /🚨-DATABASE-NOT-CREATED.md for detailed instructions'
        );
      } else {
        alert(`Failed to preview file: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Import data (CLIENT-SIDE - NO SERVER!)
  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setStep('importing');
    setStartTime(Date.now());
    try {
      console.log('🔥🔥🔥 USING CLIENT-SIDE IMPORT - NO SERVER NEEDED! 🔥🔥🔥');
      
      // Use client-side import with progress tracking
      const result = await ClientCSV.importCSV(file, (current, total) => {
        const percentage = Math.round((current / total) * 100);
        setImportProgress({ current, total, percentage });
        
        // Estimate remaining time
        if (startTime) {
          const elapsed = Date.now() - startTime;
          const rate = current / elapsed; // rows per ms
          const remaining = total - current;
          const estimatedMs = remaining / rate;
          setEstimatedTime(Math.round(estimatedMs / 1000));
        }
      });

      console.log('✅ Import complete!', result);

      if (result.success) {
        setImportResult(result);
        setStep('complete');
      } else {
        alert('Import failed. Please check errors.');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`Failed to import data: ${error.message || 'Unknown error'}`);
      setStep('preview'); // Go back to preview on error
    } finally {
      setLoading(false);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const csv = `bill_no,bill_datetime,sku_code,quantity,selling_price,location_code,customer_code
24561,2025-04-02 14:32,JKT-BLK-L,1,1499,STORE_MAIN,CUST001
24562,2025-04-02 15:15,SHIRT-WHT-M,2,899,STORE_MAIN,
24563,2025-04-03 10:20,JEANS-BLU-32,1,2199,STORE_MAIN,CUST002`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setPreviewResult(null);
    setImportResult(null);
    setStep('upload');
  };

  return (
    <div className="p-6 bg-white/10 backdrop-blur-md rounded-lg border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Database className="w-6 h-6" />
            📊 Bulk Import - Old Sales Data
          </h2>
          <p className="text-white/70 text-sm">
            Import historical sales from CSV/Excel (Two-Phase Process: Preview creates products, Import creates events)
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 
                     text-blue-300 rounded-lg transition-colors border border-blue-400/30"
        >
          <Download className="w-4 h-4" />
          Download Template
        </button>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium mb-1 text-[#000000]">
                  Click to upload or drag and drop
                </p>
                <p className="text-white/60 text-sm text-[#00000099]">
                  Excel (.xlsx, .xls) or CSV files
                </p>
              </div>
            </label>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/20">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-white/60 text-sm">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={handlePreview}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg 
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Validating...' : 'Preview & Validate'}
              </button>
            </div>
          )}

          {/* Column Structure */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/20">
            <h3 className="text-white font-semibold mb-3 text-[#000000]">
              📋 Required Column Structure
            </h3>
            <p className="text-white/60 text-xs mb-3 text-[#00000099]">
              ✨ Headers are auto-normalized! "Bill No", "bill_no", "BILL_NO" all work!
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">*</span>
                  <span className="text-white font-semibold">bill_no</span>
                </div>
                <span className="text-white/50 text-xs pl-5">
                  Also: Bill No, VNO, Invoice No, Voucher No
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">*</span>
                  <span className="text-white font-semibold">bill_datetime</span>
                </div>
                <span className="text-white/50 text-xs pl-5">
                  Also: DATE, Bill Date, Invoice Date
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">*</span>
                  <span className="text-white font-semibold">sku_code</span>
                </div>
                <span className="text-white/50 text-xs pl-5">
                  Also: PRNO, SKU, Product Code, Item Code
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">*</span>
                  <span className="text-white font-semibold">quantity</span>
                </div>
                <span className="text-white/50 text-xs pl-5">
                  Also: QTY, Qty, Units
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-white/50">-</span>
                  <span className="text-white font-semibold">selling_price</span>
                </div>
                <span className="text-white/50 text-xs pl-5">
                  Also: RATE, SAL_AMT, Price, Amount
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">*</span>
                  <span className="text-white font-semibold">location_code</span>
                </div>
                <span className="text-white/50 text-xs pl-5">
                  Also: ACNO, Location, Store Code
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-white/50">-</span>
                  <span className="text-white font-semibold">customer_code</span>
                </div>
                <span className="text-white/50 text-xs pl-5">
                  Also: Customer, Party Code
                </span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-500/10 rounded border border-blue-400/30">
              <p className="text-blue-300 text-xs">
                💡 <strong>Tip:</strong> Headers are automatically normalized. 
                "Bill No" → bill_no, "VNO" → bill_no, "PRNO" → sku_code, etc.
              </p>
            </div>
            <div className="mt-3 p-3 bg-green-500/10 rounded border border-green-400/30">
              <p className="text-green-300 text-xs">
                ✅ <strong>Tally/QuickBooks Ready:</strong> Your export columns VNO, DATE, PRNO, QTY, RATE, ACNO are automatically mapped!
              </p>
            </div>
            <p className="text-white/50 text-xs mt-3 text-[#00000080]">
              <span className="text-red-400">*</span> = Required field
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && previewResult && (
        <div className="space-y-4">
          {/* Auto-Created Data Alert */}
          {previewResult.autoCreated && (
            previewResult.autoCreated.locations > 0 || 
            previewResult.autoCreated.products > 0 || 
            previewResult.autoCreated.variants > 0
          ) && (
            <div className="p-4 bg-green-500/20 rounded-lg border border-green-400/30">
              <h3 className="text-green-300 font-semibold mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                ✨ Auto-Created Master Data
              </h3>
              <p className="text-green-200 text-sm mb-3">
                Missing SKU codes and locations were automatically created for you!
              </p>
              <div className="grid grid-cols-3 gap-3">
                {previewResult.autoCreated.locations > 0 && (
                  <div className="p-3 bg-white/10 rounded">
                    <p className="text-green-300 text-xs">Locations</p>
                    <p className="text-2xl font-bold text-white">
                      {previewResult.autoCreated.locations}
                    </p>
                  </div>
                )}
                {previewResult.autoCreated.products > 0 && (
                  <div className="p-3 bg-white/10 rounded">
                    <p className="text-green-300 text-xs">Products</p>
                    <p className="text-2xl font-bold text-white">
                      {previewResult.autoCreated.products}
                    </p>
                  </div>
                )}
                {previewResult.autoCreated.variants > 0 && (
                  <div className="p-3 bg-white/10 rounded">
                    <p className="text-green-300 text-xs">SKU Variants</p>
                    <p className="text-2xl font-bold text-white">
                      {previewResult.autoCreated.variants}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-green-200 text-xs mt-3">
                💡 You can update names and details of auto-created items later in Master Data management.
              </p>
            </div>
          )}

          {/* Will-Create Data Alert */}
          {previewResult.willCreate && (
            previewResult.willCreate.locations > 0 || 
            previewResult.willCreate.products > 0 || 
            previewResult.willCreate.variants > 0
          ) && (
            <div className="p-4 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
              <h3 className="text-yellow-300 font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                ✨ Will Create Master Data
              </h3>
              <p className="text-yellow-200 text-sm mb-3">
                Missing SKU codes and locations will be created during import!
              </p>
              <div className="grid grid-cols-3 gap-3">
                {previewResult.willCreate.locations > 0 && (
                  <div className="p-3 bg-white/10 rounded">
                    <p className="text-yellow-300 text-xs">Locations</p>
                    <p className="text-2xl font-bold text-white">
                      {previewResult.willCreate.locations}
                    </p>
                  </div>
                )}
                {previewResult.willCreate.products > 0 && (
                  <div className="p-3 bg-white/10 rounded">
                    <p className="text-yellow-300 text-xs">Products</p>
                    <p className="text-2xl font-bold text-white">
                      {previewResult.willCreate.products}
                    </p>
                  </div>
                )}
                {previewResult.willCreate.variants > 0 && (
                  <div className="p-3 bg-white/10 rounded">
                    <p className="text-yellow-300 text-xs">SKU Variants</p>
                    <p className="text-2xl font-bold text-white">
                      {previewResult.willCreate.variants}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-yellow-200 text-xs mt-3">
                💡 You can update names and details of created items later in Master Data management.
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
              <p className="text-blue-300 text-sm mb-1">Total Rows</p>
              <p className="text-2xl font-bold text-white">
                {previewResult.totalRows}
              </p>
            </div>
            <div className="p-4 bg-green-500/20 rounded-lg border border-green-400/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <p className="text-green-300 text-sm">Valid Rows</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {previewResult.validRows}
              </p>
            </div>
            <div className="p-4 bg-red-500/20 rounded-lg border border-red-400/30">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-300 text-sm">Errors</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {previewResult.errorRows}
              </p>
            </div>
          </div>

          {/* Errors */}
          {previewResult.errors.length > 0 && (
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-400/30 max-h-64 overflow-auto">
              <h3 className="text-red-300 font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Validation Errors ({previewResult.errors.length})
              </h3>
              <div className="space-y-2">
                {previewResult.errors.slice(0, 10).map((error, idx) => (
                  <div key={idx} className="text-sm text-white/80 p-2 bg-white/5 rounded">
                    <span className="text-red-400">Row {error.row}:</span>{' '}
                    <span className="text-white/60">{error.field}</span> - {error.error}
                    {error.value && (
                      <span className="text-yellow-300 ml-2">
                        (Value: {JSON.stringify(error.value)})
                      </span>
                    )}
                  </div>
                ))}
                {previewResult.errors.length > 10 && (
                  <p className="text-white/50 text-xs">
                    ... and {previewResult.errors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preview Data */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/20">
            <h3 className="text-white font-semibold mb-3">
              Preview (First 10 valid rows)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-white/70 p-2">Bill No</th>
                    <th className="text-left text-white/70 p-2">Date</th>
                    <th className="text-left text-white/70 p-2">SKU</th>
                    <th className="text-right text-white/70 p-2">Qty</th>
                    <th className="text-right text-white/70 p-2">Price</th>
                    <th className="text-left text-white/70 p-2">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.preview.map((row, idx) => (
                    <tr key={idx} className="border-b border-white/10">
                      <td className="text-white p-2">{row.bill_no}</td>
                      <td className="text-white/80 p-2 text-xs">
                        {new Date(row.bill_datetime).toLocaleString()}
                      </td>
                      <td className="text-white/80 p-2">{row.sku_code}</td>
                      <td className="text-white text-right p-2">{row.quantity}</td>
                      <td className="text-white text-right p-2">
                        ₹{row.selling_price || '-'}
                      </td>
                      <td className="text-white/80 p-2">{row.location_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg 
                         transition-colors border border-white/20"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || previewResult.validRows === 0}
              className="px-8 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                         font-semibold"
            >
              {loading ? 'Importing...' : `Import ${previewResult.validRows} Records`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === 'importing' && (
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-400/30">
            <h3 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              ✨ Importing Data
            </h3>
            <p className="text-blue-200 text-sm mb-3">
              Your data is being imported. Please wait...
            </p>
            <div className="w-full bg-white/10 rounded-full h-2.5 mb-4">
              <div
                className="bg-blue-500 h-2.5 rounded-full"
                style={{ width: `${importProgress.percentage}%` }}
              ></div>
            </div>
            <p className="text-blue-200 text-xs mt-3">
              {importProgress.current} / {importProgress.total} records processed
            </p>
            {estimatedTime && (
              <p className="text-blue-200 text-xs mt-1">
                Estimated time remaining: {estimatedTime} seconds
              </p>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && importResult && (
        <div className="space-y-4">
          {/* Success Message */}
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Import Complete!
            </h3>
            <p className="text-white/70">
              Successfully imported {importResult.successCount} sales records
            </p>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-500/20 rounded-lg border border-blue-400/30 text-center">
              <p className="text-blue-300 text-sm mb-1">Total Rows</p>
              <p className="text-2xl font-bold text-white">
                {importResult.totalRows}
              </p>
            </div>
            <div className="p-4 bg-green-500/20 rounded-lg border border-green-400/30 text-center">
              <p className="text-green-300 text-sm mb-1">Imported</p>
              <p className="text-2xl font-bold text-white">
                {importResult.successCount}
              </p>
            </div>
            <div className="p-4 bg-red-500/20 rounded-lg border border-red-400/30 text-center">
              <p className="text-red-300 text-sm mb-1">Skipped</p>
              <p className="text-2xl font-bold text-white">
                {importResult.errorCount}
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="p-4 bg-white/5 rounded-lg border border-white/20">
            <h3 className="text-white font-semibold mb-3">✅ Next Steps:</h3>
            <ul className="space-y-2 text-white/80 text-sm">
              <li>• Refresh stock views to see updated inventory</li>
              <li>• Check sales reports for imported data</li>
              <li>• Verify event ledger entries</li>
              <li>• All events are tagged with "BULK_IMPORT"</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center">
            <button
              onClick={handleReset}
              className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg 
                         transition-colors font-semibold"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
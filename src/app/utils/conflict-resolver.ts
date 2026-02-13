/**
 * ⚔️ CONFLICT RESOLUTION SYSTEM
 * 
 * Detects and resolves conflicts when local changes clash with remote changes.
 * Supports: Keep Local, Keep Remote, Merge strategies.
 */

import type { Mutation } from './mutation-queue';

export interface Conflict {
  mutation: Mutation;
  localData: Record<string, any>;
  remoteData: Record<string, any>;
  table: string;
  recordId: string;
  fields: ConflictField[];
}

export interface ConflictField {
  field: string;
  localValue: any;
  remoteValue: any;
  isDifferent: boolean;
}

export type ConflictResolution = 'keep-local' | 'keep-remote' | 'merge';

/**
 * Detect conflicts by comparing local and remote data
 */
export function detectConflicts(
  localData: Record<string, any>,
  remoteData: Record<string, any>
): ConflictField[] {
  const fields: ConflictField[] = [];
  const allKeys = new Set([...Object.keys(localData), ...Object.keys(remoteData)]);
  
  // Ignore system fields
  const ignoreFields = ['id', 'created_at', 'updated_at', 'deleted_at'];
  
  for (const key of allKeys) {
    if (ignoreFields.includes(key)) continue;
    
    const localValue = localData[key];
    const remoteValue = remoteData[key];
    const isDifferent = !isEqual(localValue, remoteValue);
    
    fields.push({
      field: key,
      localValue,
      remoteValue,
      isDifferent,
    });
  }
  
  return fields.filter(f => f.isDifferent);
}

/**
 * Deep equality check
 */
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!isEqual(a[key], b[key])) return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Resolve a conflict using the specified strategy
 */
export function resolveConflict(
  conflict: Conflict,
  resolution: ConflictResolution,
  customMerge?: Record<string, any>
): Record<string, any> {
  switch (resolution) {
    case 'keep-local':
      console.log('✅ Keeping local changes');
      return conflict.localData;
      
    case 'keep-remote':
      console.log('✅ Keeping remote changes');
      return conflict.remoteData;
      
    case 'merge':
      console.log('✅ Merging changes');
      return customMerge || autoMerge(conflict);
  }
}

/**
 * Auto-merge strategy: Keep newer values based on updated_at
 */
function autoMerge(conflict: Conflict): Record<string, any> {
  const merged = { ...conflict.remoteData };
  
  const localTimestamp = new Date(conflict.localData.updated_at || 0).getTime();
  const remoteTimestamp = new Date(conflict.remoteData.updated_at || 0).getTime();
  
  // If local is newer, prefer local values for conflicting fields
  if (localTimestamp > remoteTimestamp) {
    conflict.fields.forEach(field => {
      if (field.isDifferent) {
        merged[field.field] = field.localValue;
      }
    });
  }
  
  return merged;
}

/**
 * Format conflict for display
 */
export function formatConflictSummary(conflict: Conflict): string {
  const conflictCount = conflict.fields.filter(f => f.isDifferent).length;
  return `${conflictCount} field${conflictCount === 1 ? '' : 's'} changed: ${
    conflict.fields
      .filter(f => f.isDifferent)
      .map(f => f.field)
      .join(', ')
  }`;
}

/**
 * Get human-readable field names
 */
export function getFieldLabel(fieldName: string): string {
  const labels: Record<string, string> = {
    product_name: 'Product Name',
    product_code: 'Product Code',
    category_id: 'Category',
    brand_id: 'Brand',
    base_price: 'Base Price',
    selling_price: 'Selling Price',
    mrp: 'MRP',
    sku_code: 'SKU',
    size: 'Size',
    color: 'Color',
    barcode: 'Barcode',
    quantity: 'Quantity',
    is_active: 'Active Status',
    location_name: 'Location Name',
    location_code: 'Location Code',
    customer_name: 'Customer Name',
    customer_phone: 'Customer Phone',
    total_amount: 'Total Amount',
  };
  
  return labels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format value for display
 */
export function formatValue(value: any): string {
  if (value == null) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/**
 * Check if conflict can be auto-resolved
 */
export function canAutoResolve(conflict: Conflict): boolean {
  // Auto-resolve if only one field changed
  const changedFields = conflict.fields.filter(f => f.isDifferent);
  if (changedFields.length === 1) return true;
  
  // Auto-resolve if local has updated_at timestamp
  if (conflict.localData.updated_at && conflict.remoteData.updated_at) {
    return true;
  }
  
  return false;
}

/**
 * Get suggested resolution
 */
export function getSuggestedResolution(conflict: Conflict): ConflictResolution {
  const localTimestamp = new Date(conflict.localData.updated_at || 0).getTime();
  const remoteTimestamp = new Date(conflict.remoteData.updated_at || 0).getTime();
  
  // Prefer newer data
  if (localTimestamp > remoteTimestamp) return 'keep-local';
  if (remoteTimestamp > localTimestamp) return 'keep-remote';
  
  // Default to merge
  return 'merge';
}

/**
 * 🛒 REAL POS SERVICE
 * 
 * Handles all POS operations with real database transactions.
 * Saves sales, updates inventory via event_ledger, generates invoices.
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export interface POSProduct {
  id: string;
  product_code: string;
  product_name: string;
  brand?: string;
  category?: string;
  barcode: string;
  size: string;
  color: string;
  mrp: number;
  selling_price: number;
  cost_price: number;
  available_stock: number;
}

export interface POSCartItem {
  variant_id: string;
  product_code: string;
  product_name: string;
  size: string;
  color: string;
  barcode: string;
  quantity: number;
  rate: number;
  mrp: number;
  discount_percent: number;
  discount_amount: number;
  amount: number;
}

export interface POSSaleRequest {
  location_id: string;
  customer_name?: string;
  customer_phone?: string;
  items: POSCartItem[];
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  payment_method: 'CASH' | 'CARD' | 'UPI' | 'CREDIT';
  payment_reference?: string;
  notes?: string;
}

export interface POSSaleResponse {
  sale_id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
}

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

/**
 * Search products by barcode, product code, or name
 */
export async function searchProducts(query: string): Promise<POSProduct[]> {
  try {
    console.log('🔍 Searching for:', query);
    
    // Search in products table by product_code or product_name
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        product_code,
        product_name,
        product_variants!inner (
          id,
          size,
          color,
          barcode,
          mrp,
          selling_price,
          cost_price,
          is_active
        )
      `)
      .or(`product_code.ilike.%${query}%,product_name.ilike.%${query}%`)
      .eq('is_active', true)
      .eq('product_variants.is_active', true)
      .limit(20);
    
    if (error) {
      console.error('Search products error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Try alternative search by barcode in variants
      console.log('🔄 Trying alternative search by barcode...');
      const { data: altData, error: altError } = await supabase
        .from('product_variants')
        .select(`
          id,
          size,
          color,
          barcode,
          mrp,
          selling_price,
          cost_price,
          is_active,
          products!inner (
            id,
            product_code,
            product_name,
            is_active
          )
        `)
        .ilike('barcode', `%${query}%`)
        .eq('is_active', true)
        .eq('products.is_active', true)
        .limit(20);
      
      if (altError) {
        console.error('Alternative search error:', altError);
        console.error('Alternative error details:', JSON.stringify(altError, null, 2));
        return [];
      }
      
      if (!altData) {
        console.log('❌ No data from alternative search');
        return [];
      }
      
      console.log(`✅ Found ${altData.length} results from barcode search`);
      
      // Transform alternative search results
      const products: POSProduct[] = [];
      for (const variant of altData) {
        const product = (variant as any).products;
        
        // Get stock for variant
        const { data: stockData } = await supabase.rpc('get_variant_stock', {
          p_variant_id: variant.id
        });
        
        products.push({
          id: variant.id,
          product_code: product.product_code,
          product_name: product.product_name,
          barcode: variant.barcode,
          size: variant.size,
          color: variant.color,
          mrp: variant.mrp,
          selling_price: variant.selling_price,
          cost_price: variant.cost_price,
          available_stock: stockData || 0,
        });
      }
      
      const productsWithStock = products.filter(p => p.available_stock > 0);
      console.log(`✅ Returning ${productsWithStock.length} products with stock`);
      return productsWithStock;
    }
    
    if (!data || data.length === 0) {
      console.log('❌ No data found');
      return [];
    }
    
    console.log(`✅ Found ${data.length} products from main search`);
    
    // Transform search results
    const products: POSProduct[] = [];
    for (const product of data) {
      const variants = (product as any).product_variants;
      if (!Array.isArray(variants)) continue;
      
      for (const variant of variants) {
        // Get stock for variant
        const { data: stockData } = await supabase.rpc('get_variant_stock', {
          p_variant_id: variant.id
        });
        
        products.push({
          id: variant.id,
          product_code: (product as any).product_code,
          product_name: (product as any).product_name,
          barcode: variant.barcode,
          size: variant.size,
          color: variant.color,
          mrp: variant.mrp,
          selling_price: variant.selling_price,
          cost_price: variant.cost_price,
          available_stock: stockData || 0,
        });
      }
    }
    
    const productsWithStock = products.filter(p => p.available_stock > 0);
    console.log(`✅ Returning ${productsWithStock.length} products with stock`);
    return productsWithStock;
  } catch (error) {
    console.error('Search products exception:', error);
    return [];
  }
}

/**
 * Get product by barcode
 */
export async function getProductByBarcode(barcode: string): Promise<POSProduct | null> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select(`
        id,
        size,
        color,
        barcode,
        mrp,
        selling_price,
        cost_price,
        products!inner (
          product_code,
          product_name
        )
      `)
      .eq('barcode', barcode)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Get current stock from event_ledger aggregation
    const { data: stockData } = await supabase.rpc('get_variant_stock', {
      p_variant_id: data.id
    });
    
    const product = data.products as any;
    
    return {
      id: data.id,
      product_code: product.product_code,
      product_name: product.product_name,
      barcode: data.barcode,
      size: data.size,
      color: data.color,
      mrp: data.mrp,
      selling_price: data.selling_price,
      cost_price: data.cost_price,
      available_stock: stockData || 0,
    };
  } catch (error) {
    console.error('Get product by barcode error:', error);
    return null;
  }
}

/**
 * Get all available products for dropdown/search
 */
export async function getAvailableProducts(location_id?: string): Promise<POSProduct[]> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select(`
        id,
        size,
        color,
        barcode,
        mrp,
        selling_price,
        cost_price,
        products!inner (
          product_code,
          product_name
        )
      `)
      .eq('is_active', true)
      .limit(100);
    
    if (error) {
      console.error('Get available products error:', error);
      return [];
    }
    
    // Get stock for all variants
    const productsWithStock = await Promise.all(
      (data || []).map(async (variant) => {
        const { data: stockData } = await supabase.rpc('get_variant_stock', {
          p_variant_id: variant.id
        });
        
        const product = variant.products as any;
        
        return {
          id: variant.id,
          product_code: product.product_code,
          product_name: product.product_name,
          barcode: variant.barcode,
          size: variant.size,
          color: variant.color,
          mrp: variant.mrp,
          selling_price: variant.selling_price,
          cost_price: variant.cost_price,
          available_stock: stockData || 0,
        };
      })
    );
    
    return productsWithStock.filter(p => p.available_stock > 0);
  } catch (error) {
    console.error('Get available products exception:', error);
    return [];
  }
}

/**
 * Generate next invoice number
 */
async function generateInvoiceNumber(location_id: string): Promise<string> {
  try {
    // Get last invoice number for this location
    const { data, error } = await supabase
      .from('sales')
      .select('invoice_number')
      .eq('location_id', location_id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    let nextNumber = 1;
    
    if (data && data.length > 0) {
      const lastInvoice = data[0].invoice_number;
      // Extract number from format: LOC-YYYYMMDD-0001
      const parts = lastInvoice.split('-');
      if (parts.length === 3) {
        const lastNum = parseInt(parts[2]);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
    }
    
    // Format: LOC-YYYYMMDD-0001
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const locationCode = location_id.substring(0, 3).toUpperCase();
    const invoiceNumber = `${locationCode}-${dateStr}-${String(nextNumber).padStart(4, '0')}`;
    
    return invoiceNumber;
  } catch (error) {
    console.error('Generate invoice number error:', error);
    // Fallback
    const timestamp = Date.now();
    return `INV-${timestamp}`;
  }
}

/**
 * Complete a sale transaction
 */
export async function completeSale(
  saleRequest: POSSaleRequest,
  userId: string
): Promise<POSSaleResponse | { error: string }> {
  try {
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(saleRequest.location_id);
    
    // Insert sale record
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        invoice_number: invoiceNumber,
        location_id: saleRequest.location_id,
        sale_date: new Date().toISOString(),
        customer_name: saleRequest.customer_name,
        customer_phone: saleRequest.customer_phone,
        subtotal: saleRequest.subtotal,
        discount_percent: saleRequest.discount_percent,
        discount_amount: saleRequest.discount_amount,
        total_amount: saleRequest.total_amount,
        payment_method: saleRequest.payment_method,
        payment_reference: saleRequest.payment_reference,
        notes: saleRequest.notes,
        created_by: userId,
        sale_status: 'COMPLETED',
      })
      .select()
      .single();
    
    if (saleError) {
      console.error('Sale insert error:', saleError);
      return { error: 'Failed to create sale record' };
    }
    
    // Insert sale items
    const saleItems = saleRequest.items.map(item => ({
      sale_id: saleData.id,
      variant_id: item.variant_id,
      product_code: item.product_code,
      product_name: item.product_name,
      size: item.size,
      color: item.color,
      barcode: item.barcode,
      quantity: item.quantity,
      rate: item.rate,
      mrp: item.mrp,
      discount_percent: item.discount_percent,
      discount_amount: item.discount_amount,
      amount: item.amount,
    }));
    
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);
    
    if (itemsError) {
      console.error('Sale items insert error:', itemsError);
      // Rollback sale
      await supabase.from('sales').delete().eq('id', saleData.id);
      return { error: 'Failed to create sale items' };
    }
    
    // Create event_ledger entries for inventory reduction
    const ledgerEntries = saleRequest.items.map(item => ({
      event_type: 'SALE',
      variant_id: item.variant_id,
      location_id: saleRequest.location_id,
      quantity: -item.quantity, // Negative for stock reduction
      reference_type: 'SALE',
      reference_id: saleData.id,
      notes: `Sale ${invoiceNumber}`,
      created_by: userId,
    }));
    
    const { error: ledgerError } = await supabase
      .from('event_ledger')
      .insert(ledgerEntries);
    
    if (ledgerError) {
      console.error('Event ledger insert error:', ledgerError);
      // Continue anyway - sale is already recorded
    }
    
    // Create audit log
    await supabase.from('audit_log').insert({
      user_id: userId,
      action: 'SALE_COMPLETED',
      table_name: 'sales',
      record_id: saleData.id,
      details: {
        invoice_number: invoiceNumber,
        total_amount: saleRequest.total_amount,
        items_count: saleRequest.items.length,
      },
    });
    
    return {
      sale_id: saleData.id,
      invoice_number: invoiceNumber,
      sale_date: saleData.sale_date,
      total_amount: saleData.total_amount,
    };
    
  } catch (error) {
    console.error('Complete sale exception:', error);
    return { error: 'An error occurred while completing the sale' };
  }
}

/**
 * Get held bills (parked sales)
 */
export async function getHeldBills(location_id: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (*)
      `)
      .eq('location_id', location_id)
      .eq('sale_status', 'HOLD')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get held bills error:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Get held bills exception:', error);
    return [];
  }
}

/**
 * Hold/park a sale for later
 */
export async function holdSale(
  saleRequest: Omit<POSSaleRequest, 'payment_method'>,
  userId: string
): Promise<{ sale_id: string } | { error: string }> {
  try {
    const invoiceNumber = `HOLD-${Date.now()}`;
    
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        invoice_number: invoiceNumber,
        location_id: saleRequest.location_id,
        sale_date: new Date().toISOString(),
        customer_name: saleRequest.customer_name,
        customer_phone: saleRequest.customer_phone,
        subtotal: saleRequest.subtotal,
        discount_percent: saleRequest.discount_percent,
        discount_amount: saleRequest.discount_amount,
        total_amount: saleRequest.total_amount,
        notes: saleRequest.notes,
        created_by: userId,
        sale_status: 'HOLD',
      })
      .select()
      .single();
    
    if (saleError) {
      return { error: 'Failed to hold sale' };
    }
    
    const saleItems = saleRequest.items.map(item => ({
      sale_id: saleData.id,
      variant_id: item.variant_id,
      product_code: item.product_code,
      product_name: item.product_name,
      size: item.size,
      color: item.color,
      barcode: item.barcode,
      quantity: item.quantity,
      rate: item.rate,
      mrp: item.mrp,
      discount_percent: item.discount_percent,
      discount_amount: item.discount_amount,
      amount: item.amount,
    }));
    
    await supabase.from('sale_items').insert(saleItems);
    
    return { sale_id: saleData.id };
  } catch (error) {
    console.error('Hold sale exception:', error);
    return { error: 'An error occurred while holding the sale' };
  }
}

/**
 * Resume a held sale
 */
export async function resumeHeldSale(saleId: string): Promise<POSCartItem[] | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId);
    
    if (error) {
      return { error: 'Failed to load held sale' };
    }
    
    return data.map(item => ({
      variant_id: item.variant_id,
      product_code: item.product_code,
      product_name: item.product_name,
      size: item.size,
      color: item.color,
      barcode: item.barcode,
      quantity: item.quantity,
      rate: item.rate,
      mrp: item.mrp,
      discount_percent: item.discount_percent || 0,
      discount_amount: item.discount_amount || 0,
      amount: item.amount,
    }));
  } catch (error) {
    console.error('Resume held sale exception:', error);
    return { error: 'An error occurred' };
  }
}

/**
 * Delete a held sale
 */
export async function deleteHeldSale(saleId: string): Promise<{ success: boolean }> {
  try {
    // Delete sale items first (foreign key constraint)
    await supabase.from('sale_items').delete().eq('sale_id', saleId);
    
    // Delete sale
    const { error } = await supabase.from('sales').delete().eq('id', saleId);
    
    if (error) {
      return { success: false };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Delete held sale exception:', error);
    return { success: false };
  }
}
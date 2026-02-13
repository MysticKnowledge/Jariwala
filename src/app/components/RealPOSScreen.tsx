/**
 * 🛒 REAL POS SCREEN
 * 
 * Connected to real database - saves actual sales transactions!
 * Features: Barcode scanning, real inventory, payment processing, invoice generation.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Panel } from '@/app/components/Panel';
import { DataTable, Column } from '@/app/components/DataTable';
import { TextInput } from '@/app/components/FormField';
import { Badge } from '@/app/components/Badge';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Save,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  CheckCircle,
  X,
  CreditCard,
  Smartphone,
  DollarSign,
  FileText,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import {
  getProductByBarcode,
  searchProducts,
  completeSale,
  holdSale,
  getHeldBills,
  resumeHeldSale,
  deleteHeldSale,
  type POSProduct,
  type POSCartItem,
} from '@/app/utils/pos-service';
import { getCurrentSession } from '@/app/utils/auth';

interface RealPOSScreenProps {
  locationId: string;
  locationName: string;
  onClose?: () => void;
}

export function RealPOSScreen({ locationId, locationName, onClose }: RealPOSScreenProps) {
  // Cart state
  const [cartItems, setCartItems] = useState<POSCartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  
  // Product search state
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<POSProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null);
  
  // UI state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showHoldBills, setShowHoldBills] = useState(false);
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'CREDIT'>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
    
    // Network status listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate bill totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = (subtotal * discount) / 100;
  const totalAmount = subtotal - discountAmount;

  // Handle barcode scan/input
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    setLoading(true);
    const product = await getProductByBarcode(barcodeInput.trim());
    
    if (product) {
      if (product.available_stock <= 0) {
        alert(`${product.product_name} is out of stock!`);
        setLoading(false);
        setBarcodeInput('');
        return;
      }
      
      // Add directly to cart
      addItemToCart(product, 1);
      setBarcodeInput('');
    } else {
      alert('Product not found! Please check the barcode.');
    }
    
    setLoading(false);
    barcodeInputRef.current?.focus();
  };

  // Search products
  const handleSearch = async (query: string) => {
    setSearchTerm(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    const results = await searchProducts(query);
    setSearchResults(results);
  };

  // Add item to cart
  const addItemToCart = (product: POSProduct, quantity: number) => {
    // Check if product already in cart
    const existingIndex = cartItems.findIndex(
      item => item.variant_id === product.id
    );
    
    if (existingIndex >= 0) {
      // Update quantity
      const newCartItems = [...cartItems];
      const newQty = newCartItems[existingIndex].quantity + quantity;
      
      if (newQty > product.available_stock) {
        alert(`Only ${product.available_stock} units available!`);
        return;
      }
      
      newCartItems[existingIndex].quantity = newQty;
      newCartItems[existingIndex].amount = newCartItems[existingIndex].rate * newQty;
      setCartItems(newCartItems);
    } else {
      // Add new item
      if (quantity > product.available_stock) {
        alert(`Only ${product.available_stock} units available!`);
        return;
      }
      
      const newItem: POSCartItem = {
        variant_id: product.id,
        product_code: product.product_code,
        product_name: product.product_name,
        size: product.size,
        color: product.color,
        barcode: product.barcode,
        quantity: quantity,
        rate: product.selling_price,
        mrp: product.mrp,
        discount_percent: 0,
        discount_amount: 0,
        amount: product.selling_price * quantity,
      };
      
      setCartItems([...cartItems, newItem]);
    }
    
    setSearchTerm('');
    setSearchResults([]);
    barcodeInputRef.current?.focus();
  };

  // Remove item from cart
  const removeItem = (variantId: string) => {
    setCartItems(cartItems.filter(item => item.variant_id !== variantId));
  };

  // Update item quantity
  const updateQuantity = (variantId: string, newQty: number) => {
    if (newQty < 1) {
      removeItem(variantId);
      return;
    }
    
    setCartItems(
      cartItems.map(item =>
        item.variant_id === variantId
          ? { ...item, quantity: newQty, amount: item.rate * newQty }
          : item
      )
    );
  };

  // Complete sale
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      alert('Cart is empty! Please add items first.');
      return;
    }
    
    if (!isOnline) {
      alert('You are offline! Please connect to complete the sale.');
      return;
    }
    
    setShowPaymentDialog(true);
  };

  const handlePaymentConfirm = async () => {
    setLoading(true);
    
    try {
      const session = await getCurrentSession();
      if (!session) {
        alert('Session expired. Please login again.');
        setLoading(false);
        return;
      }
      
      const result = await completeSale(
        {
          location_id: locationId,
          customer_name: customerName.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          items: cartItems,
          subtotal: subtotal,
          discount_percent: discount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
        },
        session.user.id
      );
      
      if ('error' in result) {
        alert(`Error: ${result.error}`);
        setLoading(false);
        return;
      }
      
      // Success!
      alert(`Sale completed!\n\nInvoice: ${result.invoice_number}\nAmount: ₹${result.total_amount.toFixed(2)}`);
      
      // Reset
      setCartItems([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setShowPaymentDialog(false);
      setPaymentMethod('CASH');
      
      barcodeInputRef.current?.focus();
      
    } catch (error) {
      console.error('Sale error:', error);
      alert('An error occurred while completing the sale');
    }
    
    setLoading(false);
  };

  // Hold bill
  const handleHoldBill = async () => {
    if (cartItems.length === 0) return;
    
    setLoading(true);
    
    try {
      const session = await getCurrentSession();
      if (!session) {
        alert('Session expired. Please login again.');
        setLoading(false);
        return;
      }
      
      const result = await holdSale(
        {
          location_id: locationId,
          customer_name: customerName.trim() || undefined,
          customer_phone: customerPhone.trim() || undefined,
          items: cartItems,
          subtotal: subtotal,
          discount_percent: discount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
        },
        session.user.id
      );
      
      if ('error' in result) {
        alert(`Error: ${result.error}`);
        setLoading(false);
        return;
      }
      
      alert('Bill saved to hold list!');
      
      // Reset
      setCartItems([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      
      barcodeInputRef.current?.focus();
      
    } catch (error) {
      console.error('Hold bill error:', error);
      alert('An error occurred while holding the bill');
    }
    
    setLoading(false);
  };

  // Load held bills
  const loadHeldBills = async () => {
    setLoading(true);
    const bills = await getHeldBills(locationId);
    setHeldBills(bills);
    setShowHoldBills(true);
    setLoading(false);
  };

  // Resume held bill
  const handleResumeHeldBill = async (saleId: string) => {
    setLoading(true);
    
    const result = await resumeHeldSale(saleId);
    
    if ('error' in result) {
      alert(`Error: ${result.error}`);
      setLoading(false);
      return;
    }
    
    setCartItems(result);
    setShowHoldBills(false);
    
    // Delete the held sale
    await deleteHeldSale(saleId);
    
    setLoading(false);
    barcodeInputRef.current?.focus();
  };

  // Cart table columns
  const cartColumns: Column<POSCartItem>[] = [
    { 
      key: 'product_name', 
      header: 'Product Name',
      sortable: false,
    },
    {
      key: 'size',
      header: 'Size',
      width: '80px',
      sortable: false,
    },
    {
      key: 'color',
      header: 'Color',
      width: '100px',
      sortable: false,
    },
    {
      key: 'quantity',
      header: 'Qty',
      width: '120px',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateQuantity(row.variant_id, row.quantity - 1)}
            className="w-6 h-6 flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--secondary)] rounded-[2px]"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-8 text-center font-semibold">{value}</span>
          <button
            onClick={() => updateQuantity(row.variant_id, row.quantity + 1)}
            className="w-6 h-6 flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--secondary)] rounded-[2px]"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      width: '100px',
      sortable: false,
      render: (value) => `₹${value.toFixed(2)}`,
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '120px',
      sortable: false,
      render: (value) => (
        <span className="font-semibold text-[var(--primary)]">
          ₹{value.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'variant_id',
      header: '',
      width: '60px',
      sortable: false,
      render: (value, row) => (
        <button
          onClick={() => removeItem(row.variant_id)}
          className="p-1.5 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 rounded-[2px]"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      {/* Top Bar */}
      <div className="h-14 px-4 bg-[var(--primary)] text-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6" />
          <div>
            <div className="font-semibold">Point of Sale</div>
            <div className="text-xs opacity-90">{locationName}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Online/Offline Indicator */}
          {isOnline ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-[2px]">
              <Wifi className="w-4 h-4" />
              <span className="text-xs">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 bg-[var(--destructive)] rounded-[2px]">
              <WifiOff className="w-4 h-4" />
              <span className="text-xs">Offline</span>
            </div>
          )}
          
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-[2px] text-sm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Product Search & Cart */}
        <div className="flex-1 flex flex-col">
          {/* Barcode Scanner */}
          <div className="p-4 border-b border-[var(--border)] bg-white">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" />
                <TextInput
                  ref={barcodeInputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <button
                type="submit"
                className="px-6 bg-[var(--primary)] text-white rounded-[4px] hover:bg-[var(--primary-hover)] flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Add</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Product Search */}
          <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <TextInput
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by product name or code..."
                className="pl-10"
              />
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-60 overflow-y-auto bg-white border border-[var(--border)] rounded-[4px]">
                {searchResults.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addItemToCart(product, 1)}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--secondary)] border-b border-[var(--border)] last:border-b-0"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{product.product_name}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {product.size} • {product.color} • {product.barcode}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-[var(--primary)]">₹{product.selling_price}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">Stock: {product.available_stock}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-hidden">
            <DataTable
              data={cartItems}
              columns={cartColumns}
              emptyMessage="Cart is empty. Scan or search products to add items."
            />
          </div>
        </div>

        {/* Right: Bill Summary & Actions */}
        <div className="w-96 border-l border-[var(--border)] bg-white flex flex-col">
          {/* Customer Info */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="font-semibold mb-3">Customer Info (Optional)</div>
            <div className="space-y-2">
              <TextInput
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
              />
              <TextInput
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>

          {/* Bill Summary */}
          <div className="flex-1 p-4 space-y-3">
            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span>Discount (%):</span>
              <TextInput
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="w-20"
                min="0"
                max="100"
              />
              <span className="text-[var(--destructive)]">
                -₹{discountAmount.toFixed(2)}
              </span>
            </div>
            
            <div className="pt-3 border-t-2 border-[var(--border)] flex justify-between text-2xl font-bold">
              <span>Total:</span>
              <span className="text-[var(--primary)]">₹{totalAmount.toFixed(2)}</span>
            </div>
            
            <div className="text-xs text-[var(--muted-foreground)]">
              {cartItems.length} item{cartItems.length === 1 ? '' : 's'} in cart
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-[var(--border)] space-y-2">
            <button
              onClick={handleCompleteSale}
              disabled={cartItems.length === 0 || !isOnline || loading}
              className={cn(
                'w-full h-12 px-4 rounded-[4px] font-semibold text-white flex items-center justify-center gap-2',
                'bg-[var(--success)] hover:bg-[var(--success)]/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <CheckCircle className="w-5 h-5" />
              Complete Sale
            </button>
            
            <button
              onClick={handleHoldBill}
              disabled={cartItems.length === 0 || loading}
              className="w-full h-10 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Hold Bill
            </button>
            
            <button
              onClick={loadHeldBills}
              disabled={loading}
              className="w-full h-10 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              View Held Bills
            </button>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Complete Payment</h3>
            
            <div className="mb-6">
              <div className="text-3xl font-bold text-[var(--primary)] text-center py-4 bg-[var(--muted)] rounded-lg">
                ₹{totalAmount.toFixed(2)}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className={cn(
                    'p-3 border-2 rounded-lg flex items-center justify-center gap-2',
                    paymentMethod === 'CASH' 
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                      : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                  )}
                >
                  <DollarSign className="w-5 h-5" />
                  <span>Cash</span>
                </button>
                
                <button
                  onClick={() => setPaymentMethod('CARD')}
                  className={cn(
                    'p-3 border-2 rounded-lg flex items-center justify-center gap-2',
                    paymentMethod === 'CARD' 
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                      : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                  )}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Card</span>
                </button>
                
                <button
                  onClick={() => setPaymentMethod('UPI')}
                  className={cn(
                    'p-3 border-2 rounded-lg flex items-center justify-center gap-2',
                    paymentMethod === 'UPI' 
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                      : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                  )}
                >
                  <Smartphone className="w-5 h-5" />
                  <span>UPI</span>
                </button>
                
                <button
                  onClick={() => setPaymentMethod('CREDIT')}
                  className={cn(
                    'p-3 border-2 rounded-lg flex items-center justify-center gap-2',
                    paymentMethod === 'CREDIT' 
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                      : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                  )}
                >
                  <FileText className="w-5 h-5" />
                  <span>Credit</span>
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentDialog(false)}
                disabled={loading}
                className="flex-1 h-10 px-4 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentConfirm}
                disabled={loading}
                className="flex-1 h-10 px-4 rounded-lg bg-[var(--success)] text-white hover:bg-[var(--success)]/90 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Dialog */}
      {showHoldBills && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-xl font-bold">Held Bills</h3>
              <button onClick={() => setShowHoldBills(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {heldBills.length === 0 ? (
                <div className="text-center py-12 text-[var(--muted-foreground)]">
                  No held bills found
                </div>
              ) : (
                <div className="space-y-3">
                  {heldBills.map(bill => (
                    <div key={bill.id} className="border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--secondary)] cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">{bill.invoice_number}</div>
                          <div className="text-sm text-[var(--muted-foreground)]">
                            {new Date(bill.created_at).toLocaleString()}
                          </div>
                          {bill.customer_name && (
                            <div className="text-sm">Customer: {bill.customer_name}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-[var(--primary)]">
                            ₹{bill.total_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleResumeHeldBill(bill.id)}
                          className="flex-1 h-8 px-3 rounded bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-sm"
                        >
                          Resume
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this held bill?')) {
                              await deleteHeldSale(bill.id);
                              loadHeldBills();
                            }
                          }}
                          className="h-8 px-3 rounded border border-[var(--destructive)] text-[var(--destructive)] hover:bg-[var(--destructive)]/10 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

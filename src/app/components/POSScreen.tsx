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
  ArrowLeftRight,
  CheckCircle,
  X,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface BillItem {
  id: string;
  productName: string;
  size: string;
  quantity: number;
  rate: number;
  amount: number;
  barcode?: string;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  sizes: string[];
  rate: number;
  stock: number;
}

// Mock product data
const mockProducts: Product[] = [
  { id: '1', name: 'Cotton T-Shirt', barcode: '8901234567890', sizes: ['S', 'M', 'L', 'XL'], rate: 499, stock: 45 },
  { id: '2', name: 'Denim Jeans', barcode: '8901234567891', sizes: ['28', '30', '32', '34', '36'], rate: 1299, stock: 32 },
  { id: '3', name: 'Formal Shirt', barcode: '8901234567892', sizes: ['38', '40', '42', '44'], rate: 899, stock: 28 },
  { id: '4', name: 'Casual Trouser', barcode: '8901234567893', sizes: ['30', '32', '34', '36'], rate: 799, stock: 35 },
  { id: '5', name: 'Sports Shorts', barcode: '8901234567894', sizes: ['S', 'M', 'L', 'XL'], rate: 399, stock: 50 },
  { id: '6', name: 'Polo T-Shirt', barcode: '8901234567895', sizes: ['S', 'M', 'L', 'XL', 'XXL'], rate: 599, stock: 40 },
  { id: '7', name: 'Winter Jacket', barcode: '8901234567896', sizes: ['M', 'L', 'XL'], rate: 2499, stock: 15 },
  { id: '8', name: 'Cotton Kurta', barcode: '8901234567897', sizes: ['38', '40', '42', '44', '46'], rate: 699, stock: 38 },
];

interface POSScreenProps {
  storeName: string;
  onClose?: () => void;
}

export function POSScreen({ storeName, onClose }: POSScreenProps) {
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [showHoldBills, setShowHoldBills] = useState(false);
  const [isExchangeMode, setIsExchangeMode] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Calculate bill totals
  const subtotal = billItems.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = (subtotal * discount) / 100;
  const totalAmount = subtotal - discountAmount;

  // Filter products based on search
  const filteredProducts = searchTerm
    ? mockProducts.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm)
      )
    : [];

  // Handle barcode scan/input
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = mockProducts.find((p) => p.barcode === barcodeInput);
    if (product) {
      setSelectedProduct(product);
      setSelectedSize(product.sizes[0]);
      setBarcodeInput('');
      // Auto-add if only one size
      if (product.sizes.length === 1) {
        addItemToBill(product, product.sizes[0], 1);
        setSelectedProduct(null);
      }
    }
  };

  // Add item to bill
  const addItemToBill = (product: Product, size: string, qty: number) => {
    const newItem: BillItem = {
      id: `${Date.now()}-${Math.random()}`,
      productName: product.name,
      size: size,
      quantity: qty,
      rate: product.rate,
      amount: product.rate * qty,
      barcode: product.barcode,
    };
    setBillItems([...billItems, newItem]);
    setSelectedProduct(null);
    setSelectedSize('');
    setQuantity(1);
    barcodeInputRef.current?.focus();
  };

  // Remove item from bill
  const removeItem = (id: string) => {
    setBillItems(billItems.filter((item) => item.id !== id));
  };

  // Update item quantity
  const updateQuantity = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setBillItems(
      billItems.map((item) =>
        item.id === id
          ? { ...item, quantity: newQty, amount: item.rate * newQty }
          : item
      )
    );
  };

  // Complete sale
  const completeSale = () => {
    if (billItems.length === 0) return;
    
    const confirmed = window.confirm(
      `Complete sale for ₹${totalAmount.toFixed(2)}?`
    );
    
    if (confirmed) {
      console.log('Sale completed:', { billItems, totalAmount, discount });
      // Reset
      setBillItems([]);
      setDiscount(0);
      setIsExchangeMode(false);
      alert('Sale completed successfully!');
      barcodeInputRef.current?.focus();
    }
  };

  // Hold bill
  const holdBill = () => {
    if (billItems.length === 0) return;
    console.log('Bill held:', billItems);
    alert('Bill saved to hold list');
    setBillItems([]);
    setDiscount(0);
  };

  // Bill items table columns
  const billColumns: Column<BillItem>[] = [
    { 
      key: 'productName', 
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
      key: 'quantity',
      header: 'Qty',
      width: '100px',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateQuantity(row.id, row.quantity - 1)}
            className="w-6 h-6 flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--secondary)] rounded-[2px]"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-10 text-center tabular-nums">{value}</span>
          <button
            onClick={() => updateQuantity(row.id, row.quantity + 1)}
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
      render: (value) => <span className="tabular-nums">₹{value}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '120px',
      sortable: false,
      render: (value) => <span className="tabular-nums font-medium">₹{value}</span>,
    },
    {
      key: 'id',
      header: 'Action',
      width: '70px',
      sortable: false,
      render: (value) => (
        <button
          onClick={() => removeItem(value)}
          className="w-7 h-7 flex items-center justify-center bg-[var(--destructive)] text-white hover:opacity-90 rounded-[2px]"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // F2 - Focus barcode
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
      // F3 - Focus search
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F9 - Complete sale
      if (e.key === 'F9') {
        e.preventDefault();
        completeSale();
      }
      // F10 - Hold bill
      if (e.key === 'F10') {
        e.preventDefault();
        holdBill();
      }
      // Esc - Close POS
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [billItems, totalAmount, onClose]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-4">
          {onClose && (
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--secondary)] rounded-[4px]"
              title="Close POS (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="m-0">Point of Sale - {storeName}</h2>
          </div>
          {isExchangeMode && (
            <Badge variant="info">
              <ArrowLeftRight className="w-3 h-3 mr-1" />
              Exchange Mode
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[0.875rem]">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-[var(--success)]" />
                <span className="text-[var(--success)] font-medium">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-[var(--warning)]" />
                <span className="text-[var(--warning)] font-medium">Offline Mode</span>
              </>
            )}
          </div>
          <div className="text-[0.875rem] text-[var(--muted-foreground)]">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Product Search */}
        <div className="w-80 border-r border-[var(--border)] bg-[var(--background-alt)] p-4 space-y-4 overflow-auto">
          {/* Barcode Input */}
          <Panel title="Barcode Scanner" glass>
            <form onSubmit={handleBarcodeSubmit} className="space-y-3">
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <TextInput
                  ref={barcodeInputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan or enter barcode (F2)"
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
              <div className="text-[0.625rem] text-[var(--muted-foreground)]">
                Press F2 to focus • Enter to add
              </div>
            </form>
          </Panel>

          {/* Product Search */}
          <Panel title="Product Search" glass>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <TextInput
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products (F3)"
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
              
              {searchTerm && (
                <div className="max-h-80 overflow-auto space-y-1">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setSelectedSize(product.sizes[0]);
                        setSearchTerm('');
                      }}
                      className="w-full p-2 bg-white hover:bg-[var(--secondary)] border border-[var(--border)] rounded-[2px] text-left transition-colors"
                    >
                      <div className="font-medium text-[0.875rem]">{product.name}</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        ₹{product.rate} • Stock: {product.stock}
                      </div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="text-center py-4 text-[0.875rem] text-[var(--muted-foreground)]">
                      No products found
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>

          {/* Selected Product */}
          {selectedProduct && (
            <Panel title="Add to Bill" glass>
              <div className="space-y-3">
                <div>
                  <div className="font-medium mb-1">{selectedProduct.name}</div>
                  <div className="text-[0.875rem] text-[var(--muted-foreground)]">
                    Rate: ₹{selectedProduct.rate}
                  </div>
                </div>

                <div>
                  <label className="block text-[0.75rem] mb-1.5">Select Size</label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]"
                  >
                    {selectedProduct.sizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[0.75rem] mb-1.5">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--secondary)] rounded-[4px]"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 h-9 px-3 bg-white border border-[var(--border)] rounded-[4px] text-center tabular-nums"
                      min="1"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-9 h-9 flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--secondary)] rounded-[4px]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => addItemToBill(selectedProduct, selectedSize, quantity)}
                    className="flex-1 h-9 px-4 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] font-medium"
                  >
                    Add to Bill
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setSelectedSize('');
                      setQuantity(1);
                    }}
                    className="w-9 h-9 flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--secondary)] rounded-[4px]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={() => setIsExchangeMode(!isExchangeMode)}
              className={cn(
                'w-full h-9 px-4 rounded-[4px] border font-medium transition-colors flex items-center justify-center gap-2',
                isExchangeMode
                  ? 'bg-[var(--primary)] text-white border-transparent'
                  : 'bg-white text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--secondary)]'
              )}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {isExchangeMode ? 'Exchange Mode ON' : 'Exchange Mode'}
            </button>
            
            <button
              onClick={holdBill}
              disabled={billItems.length === 0}
              className="w-full h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--secondary)] disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Hold Bill (F10)
            </button>
          </div>
        </div>

        {/* Center Panel - Bill Items */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="flex-1 overflow-auto p-4">
            {billItems.length > 0 ? (
              <DataTable data={billItems} columns={billColumns} zebra={true} hover={false} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <ShoppingCart className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-20" />
                  <h3 className="text-[var(--muted-foreground)] mb-2">No items in bill</h3>
                  <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                    Scan barcode or search products to add items
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="h-8 px-4 bg-[var(--muted)] border-t border-[var(--border)] flex items-center gap-6 text-[0.75rem] text-[var(--muted-foreground)]">
            <span><kbd className="px-1.5 py-0.5 bg-white rounded-[2px] text-[0.625rem]">F2</kbd> Barcode</span>
            <span><kbd className="px-1.5 py-0.5 bg-white rounded-[2px] text-[0.625rem]">F3</kbd> Search</span>
            <span><kbd className="px-1.5 py-0.5 bg-white rounded-[2px] text-[0.625rem]">F9</kbd> Complete Sale</span>
            <span><kbd className="px-1.5 py-0.5 bg-white rounded-[2px] text-[0.625rem]">F10</kbd> Hold Bill</span>
          </div>
        </div>

        {/* Right Panel - Bill Summary */}
        <div className="w-80 border-l border-[var(--border)] bg-[var(--background-alt)] p-4 space-y-4">
          <Panel title="Bill Summary" glass>
            <div className="space-y-3">
              <div className="flex justify-between text-[0.875rem]">
                <span className="text-[var(--muted-foreground)]">Items:</span>
                <span className="font-medium tabular-nums">{billItems.length}</span>
              </div>

              <div className="flex justify-between text-[0.875rem]">
                <span className="text-[var(--muted-foreground)]">Total Qty:</span>
                <span className="font-medium tabular-nums">
                  {billItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>

              <div className="pt-3 border-t border-[var(--border-light)]">
                <div className="flex justify-between mb-2">
                  <span className="text-[var(--muted-foreground)]">Subtotal:</span>
                  <span className="font-semibold tabular-nums">₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="mb-2">
                  <label className="block text-[0.75rem] text-[var(--muted-foreground)] mb-1.5">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    className="w-full h-9 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] tabular-nums"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-[0.875rem] mb-2">
                    <span className="text-[var(--muted-foreground)]">Discount ({discount}%):</span>
                    <span className="text-[var(--destructive)] tabular-nums">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {isExchangeMode && (
                  <div className="mb-2">
                    <label className="block text-[0.75rem] text-[var(--muted-foreground)] mb-1.5">
                      Exchange Amount
                    </label>
                    <input
                      type="number"
                      defaultValue={0}
                      className="w-full h-9 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] tabular-nums"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t-2 border-[var(--border-strong)]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-[var(--primary)] tabular-nums">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={completeSale}
                  disabled={billItems.length === 0}
                  className={cn(
                    'w-full h-12 px-4 rounded-[4px] font-semibold transition-colors flex items-center justify-center gap-2',
                    'bg-[var(--success)] text-white hover:opacity-90',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    '[box-shadow:var(--shadow-md)]'
                  )}
                >
                  <CheckCircle className="w-5 h-5" />
                  Complete Sale (F9)
                </button>
              </div>
            </div>
          </Panel>

          {/* Payment Methods Quick Access */}
          <Panel title="Payment Method" glass>
            <div className="grid grid-cols-2 gap-2">
              <button className="h-10 px-3 bg-white hover:bg-[var(--secondary)] border border-[var(--border)] rounded-[4px] text-[0.875rem] font-medium">
                Cash
              </button>
              <button className="h-10 px-3 bg-white hover:bg-[var(--secondary)] border border-[var(--border)] rounded-[4px] text-[0.875rem] font-medium">
                Card
              </button>
              <button className="h-10 px-3 bg-white hover:bg-[var(--secondary)] border border-[var(--border)] rounded-[4px] text-[0.875rem] font-medium">
                UPI
              </button>
              <button className="h-10 px-3 bg-white hover:bg-[var(--secondary)] border border-[var(--border)] rounded-[4px] text-[0.875rem] font-medium">
                Split
              </button>
            </div>
          </Panel>

          {/* Customer Info */}
          <Panel title="Customer Details" glass>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Mobile Number"
                className="w-full h-9 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]"
              />
              <input
                type="text"
                placeholder="Customer Name"
                className="w-full h-9 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]"
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
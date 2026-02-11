import React, { useState } from 'react';
import { Panel } from '@/app/components/Panel';
import { DataTable, Column } from '@/app/components/DataTable';
import { TextInput } from '@/app/components/FormField';
import { Badge } from '@/app/components/Badge';
import {
  ArrowLeftRight,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  X,
  RefreshCw,
  FileText,
  ShoppingBag,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface BillItem {
  id: string;
  productName: string;
  size: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Bill {
  billNo: string;
  date: string;
  customerName: string;
  customerMobile: string;
  items: BillItem[];
  totalAmount: number;
}

interface Product {
  id: string;
  name: string;
  barcode: string;
  sizes: string[];
  rate: number;
  stock: number;
}

// Mock bill data
const mockBills: Record<string, Bill> = {
  'BILL-2026-001': {
    billNo: 'BILL-2026-001',
    date: '2026-01-28',
    customerName: 'Rajesh Kumar',
    customerMobile: '9876543210',
    items: [
      { id: '1', productName: 'Cotton T-Shirt', size: 'L', quantity: 2, rate: 499, amount: 998 },
      { id: '2', productName: 'Denim Jeans', size: '32', quantity: 1, rate: 1299, amount: 1299 },
    ],
    totalAmount: 2297,
  },
  'BILL-2026-002': {
    billNo: 'BILL-2026-002',
    date: '2026-01-29',
    customerName: 'Priya Shah',
    customerMobile: '9876543211',
    items: [
      { id: '3', productName: 'Formal Shirt', size: '40', quantity: 1, rate: 899, amount: 899 },
      { id: '4', productName: 'Casual Trouser', size: '34', quantity: 1, rate: 799, amount: 799 },
    ],
    totalAmount: 1698,
  },
};

// Mock products for exchange
const mockProducts: Product[] = [
  { id: '1', name: 'Cotton T-Shirt', barcode: '8901234567890', sizes: ['S', 'M', 'L', 'XL'], rate: 499, stock: 45 },
  { id: '2', name: 'Denim Jeans', barcode: '8901234567891', sizes: ['28', '30', '32', '34', '36'], rate: 1299, stock: 32 },
  { id: '3', name: 'Formal Shirt', barcode: '8901234567892', sizes: ['38', '40', '42', '44'], rate: 899, stock: 28 },
  { id: '4', name: 'Casual Trouser', barcode: '8901234567893', sizes: ['30', '32', '34', '36'], rate: 799, stock: 35 },
  { id: '5', name: 'Polo T-Shirt', barcode: '8901234567895', sizes: ['S', 'M', 'L', 'XL', 'XXL'], rate: 599, stock: 40 },
  { id: '6', name: 'Winter Jacket', barcode: '8901234567896', sizes: ['M', 'L', 'XL'], rate: 2499, stock: 15 },
];

type ExchangeStep = 'search' | 'selectReturn' | 'selectNew' | 'confirm';

interface ReturnItem extends BillItem {
  selected: boolean;
}

interface NewItem {
  product: Product;
  size: string;
  quantity: number;
}

export function ExchangeScreen() {
  const [currentStep, setCurrentStep] = useState<ExchangeStep>('search');
  const [billNumber, setBillNumber] = useState('');
  const [originalBill, setOriginalBill] = useState<Bill | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [newItems, setNewItems] = useState<NewItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  // Search for bill
  const searchBill = () => {
    setError('');
    const bill = mockBills[billNumber.toUpperCase()];
    if (bill) {
      setOriginalBill(bill);
      setReturnItems(bill.items.map(item => ({ ...item, selected: false })));
      setCurrentStep('selectReturn');
    } else {
      setError('Bill not found. Please check the bill number and try again.');
    }
  };

  // Toggle return item selection
  const toggleReturnItem = (id: string) => {
    setReturnItems(returnItems.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  // Proceed to select new items
  const proceedToSelectNew = () => {
    const hasSelectedItems = returnItems.some(item => item.selected);
    if (!hasSelectedItems) {
      setError('Please select at least one item to return');
      return;
    }
    setError('');
    setCurrentStep('selectNew');
  };

  // Filter products
  const filteredProducts = searchTerm
    ? mockProducts.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm)
      )
    : mockProducts;

  // Add new item
  const addNewItem = () => {
    if (!selectedProduct || !selectedSize) {
      setError('Please select product and size');
      return;
    }
    setError('');
    setNewItems([
      ...newItems,
      {
        product: selectedProduct,
        size: selectedSize,
        quantity: quantity,
      },
    ]);
    setSelectedProduct(null);
    setSelectedSize('');
    setQuantity(1);
    setSearchTerm('');
  };

  // Remove new item
  const removeNewItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  // Calculate totals
  const returnTotal = returnItems
    .filter(item => item.selected)
    .reduce((sum, item) => sum + item.amount, 0);

  const newTotal = newItems.reduce(
    (sum, item) => sum + item.product.rate * item.quantity,
    0
  );

  const difference = newTotal - returnTotal;

  // Proceed to confirmation
  const proceedToConfirm = () => {
    if (newItems.length === 0) {
      setError('Please select at least one new item');
      return;
    }
    setError('');
    setCurrentStep('confirm');
  };

  // Complete exchange
  const completeExchange = () => {
    console.log('Exchange completed:', {
      originalBill,
      returnItems: returnItems.filter(item => item.selected),
      newItems,
      difference,
    });
    
    alert('Exchange completed successfully!');
    resetExchange();
  };

  // Reset exchange
  const resetExchange = () => {
    setBillNumber('');
    setOriginalBill(null);
    setReturnItems([]);
    setNewItems([]);
    setSearchTerm('');
    setSelectedProduct(null);
    setSelectedSize('');
    setQuantity(1);
    setError('');
    setCurrentStep('search');
  };

  // Return items columns
  const returnColumns: Column<ReturnItem>[] = [
    {
      key: 'id',
      header: 'Select',
      width: '80px',
      render: (value, row) => (
        <input
          type="checkbox"
          checked={row.selected}
          onChange={() => toggleReturnItem(value)}
          className="w-4 h-4 accent-[var(--primary)]"
        />
      ),
    },
    { key: 'productName', header: 'Product Name' },
    { key: 'size', header: 'Size', width: '80px' },
    {
      key: 'quantity',
      header: 'Qty',
      width: '60px',
      render: (value) => <span className="tabular-nums">{value}</span>,
    },
    {
      key: 'rate',
      header: 'Rate',
      width: '100px',
      render: (value) => <span className="tabular-nums">₹{value}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '120px',
      render: (value) => <span className="tabular-nums font-medium">₹{value}</span>,
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="m-0">Exchange Management</h2>
          {originalBill && (
            <Badge variant="info">Bill: {originalBill.billNo}</Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep !== 'search' && (
            <button
              onClick={resetExchange}
              className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              New Exchange
            </button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="h-16 px-6 bg-[var(--background-alt)] border-b border-[var(--border)] flex items-center justify-center">
        <div className="flex items-center gap-4 max-w-3xl w-full">
          <StepIndicator
            number={1}
            label="Search Bill"
            active={currentStep === 'search'}
            completed={currentStep !== 'search'}
          />
          <StepConnector completed={currentStep !== 'search'} />
          <StepIndicator
            number={2}
            label="Select Returns"
            active={currentStep === 'selectReturn'}
            completed={currentStep === 'selectNew' || currentStep === 'confirm'}
          />
          <StepConnector completed={currentStep === 'selectNew' || currentStep === 'confirm'} />
          <StepIndicator
            number={3}
            label="Select New Items"
            active={currentStep === 'selectNew'}
            completed={currentStep === 'confirm'}
          />
          <StepConnector completed={currentStep === 'confirm'} />
          <StepIndicator
            number={4}
            label="Confirm"
            active={currentStep === 'confirm'}
            completed={false}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-[var(--destructive)]/10 border border-[var(--destructive)] rounded-[4px] flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--destructive)]" />
              <span className="text-[var(--destructive)] font-medium">{error}</span>
            </div>
          )}

          {/* Step 1: Search Bill */}
          {currentStep === 'search' && (
            <div className="space-y-6">
              <Panel title="Search Original Bill" glass>
                <div className="max-w-xl mx-auto space-y-4">
                  <div>
                    <label className="block text-[0.875rem] font-medium mb-2">
                      Enter Bill Number
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <TextInput
                          value={billNumber}
                          onChange={(e) => setBillNumber(e.target.value.toUpperCase())}
                          placeholder="e.g., BILL-2026-001"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              searchBill();
                            }
                          }}
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={searchBill}
                        disabled={!billNumber}
                        className="h-10 px-6 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        Search
                      </button>
                    </div>
                  </div>

                  <div className="text-[0.75rem] text-[var(--muted-foreground)] pt-2">
                    <strong>Exchange Policy:</strong> Items can be exchanged within 7 days of
                    purchase with original bill. Product must be in unused condition with tags
                    intact.
                  </div>

                  {/* Demo Bills */}
                  <div className="pt-4 border-t border-[var(--border-light)]">
                    <div className="text-[0.75rem] font-medium mb-2 text-[var(--muted-foreground)]">
                      Demo Bill Numbers:
                    </div>
                    <div className="flex gap-2">
                      {Object.keys(mockBills).map((billNo) => (
                        <button
                          key={billNo}
                          onClick={() => {
                            setBillNumber(billNo);
                            setTimeout(searchBill, 100);
                          }}
                          className="px-3 py-1.5 bg-[var(--secondary)] hover:bg-[var(--muted)] rounded-[4px] text-[0.75rem] font-mono"
                        >
                          {billNo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {/* Step 2: Select Return Items */}
          {currentStep === 'selectReturn' && originalBill && (
            <div className="space-y-6">
              <Panel title="Original Bill Details" glass>
                <div className="grid grid-cols-2 gap-6 mb-4 pb-4 border-b border-[var(--border-light)]">
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                      Bill Number
                    </div>
                    <div className="font-semibold">{originalBill.billNo}</div>
                  </div>
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                      Bill Date
                    </div>
                    <div className="font-semibold">
                      {new Date(originalBill.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                      Customer Name
                    </div>
                    <div className="font-semibold">{originalBill.customerName}</div>
                  </div>
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                      Mobile Number
                    </div>
                    <div className="font-semibold">{originalBill.customerMobile}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-[0.875rem] font-medium mb-3">
                    Select Items to Return:
                  </div>
                  <DataTable data={returnItems} columns={returnColumns} zebra={false} hover={true} />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-light)]">
                  <div>
                    <span className="text-[var(--muted-foreground)]">Selected items value:</span>
                    <span className="ml-2 text-xl font-semibold text-[var(--primary)] tabular-nums">
                      ₹{returnTotal.toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={proceedToSelectNew}
                    className="h-10 px-6 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] font-medium flex items-center gap-2"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </Panel>
            </div>
          )}

          {/* Step 3: Select New Items */}
          {currentStep === 'selectNew' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-6">
                <Panel title="Search Products" glass>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <TextInput
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search products..."
                        className="pl-10"
                      />
                    </div>

                    {searchTerm && (
                      <div className="max-h-64 overflow-auto space-y-1">
                        {filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => {
                              setSelectedProduct(product);
                              setSelectedSize(product.sizes[0]);
                              setSearchTerm('');
                            }}
                            className="w-full p-3 bg-white hover:bg-[var(--secondary)] border border-[var(--border)] rounded-[4px] text-left transition-colors"
                          >
                            <div className="font-medium text-[0.875rem]">{product.name}</div>
                            <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                              ₹{product.rate} • Stock: {product.stock}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Panel>

                {selectedProduct && (
                  <Panel title="Add New Item" glass>
                    <div className="space-y-4">
                      <div>
                        <div className="font-medium mb-1">{selectedProduct.name}</div>
                        <div className="text-[0.875rem] text-[var(--muted-foreground)]">
                          Rate: ₹{selectedProduct.rate}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[0.75rem] font-medium mb-1.5">Size</label>
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
                        <label className="block text-[0.75rem] font-medium mb-1.5">Quantity</label>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full h-9 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] tabular-nums"
                          min="1"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={addNewItem}
                          className="flex-1 h-9 px-4 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] font-medium"
                        >
                          Add Item
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
              </div>

              <div className="space-y-6">
                <Panel title="New Items" glass>
                  {newItems.length > 0 ? (
                    <div className="space-y-2">
                      {newItems.map((item, index) => (
                        <div
                          key={index}
                          className="p-3 bg-[var(--background-alt)] rounded-[4px] flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-[0.875rem]">
                              {item.product.name}
                            </div>
                            <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                              Size: {item.size} • Qty: {item.quantity} • ₹
                              {item.product.rate * item.quantity}
                            </div>
                          </div>
                          <button
                            onClick={() => removeNewItem(index)}
                            className="w-7 h-7 flex items-center justify-center bg-[var(--destructive)] text-white hover:opacity-90 rounded-[4px]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <div className="pt-4 mt-4 border-t border-[var(--border-light)]">
                        <div className="flex justify-between mb-2">
                          <span className="text-[var(--muted-foreground)]">Return Value:</span>
                          <span className="font-semibold tabular-nums">₹{returnTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-[var(--muted-foreground)]">New Items Value:</span>
                          <span className="font-semibold tabular-nums">₹{newTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-[var(--border-light)]">
                          <span className="font-semibold">
                            {difference >= 0 ? 'Amount to Pay:' : 'Refund Amount:'}
                          </span>
                          <span
                            className={cn(
                              'text-xl font-bold tabular-nums',
                              difference >= 0 ? 'text-[var(--destructive)]' : 'text-[var(--success)]'
                            )}
                          >
                            ₹{Math.abs(difference).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={proceedToConfirm}
                        className="w-full h-10 px-4 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] font-medium flex items-center justify-center gap-2"
                      >
                        Proceed to Confirmation
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[var(--muted-foreground)]">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <div className="text-[0.875rem]">No new items added yet</div>
                    </div>
                  )}
                </Panel>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 'confirm' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <Panel title="Exchange Summary" glass>
                <div className="space-y-6">
                  {/* Return Items */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-[var(--primary)]" />
                      <h3 className="text-[0.875rem] font-semibold">Return Items</h3>
                    </div>
                    <div className="space-y-2">
                      {returnItems
                        .filter((item) => item.selected)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-[var(--destructive)]/5 border border-[var(--destructive)]/20 rounded-[4px]"
                          >
                            <div className="flex justify-between">
                              <span className="font-medium">{item.productName}</span>
                              <span className="tabular-nums">₹{item.amount}</span>
                            </div>
                            <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                              Size: {item.size} • Qty: {item.quantity}
                            </div>
                          </div>
                        ))}
                      <div className="flex justify-between pt-2 font-semibold">
                        <span>Total Return Value:</span>
                        <span className="tabular-nums">₹{returnTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* New Items */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ShoppingBag className="w-4 h-4 text-[var(--success)]" />
                      <h3 className="text-[0.875rem] font-semibold">New Items</h3>
                    </div>
                    <div className="space-y-2">
                      {newItems.map((item, index) => (
                        <div
                          key={index}
                          className="p-3 bg-[var(--success)]/5 border border-[var(--success)]/20 rounded-[4px]"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">{item.product.name}</span>
                            <span className="tabular-nums">
                              ₹{item.product.rate * item.quantity}
                            </span>
                          </div>
                          <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                            Size: {item.size} • Qty: {item.quantity}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 font-semibold">
                        <span>Total New Items Value:</span>
                        <span className="tabular-nums">₹{newTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Difference */}
                  <div className="p-4 bg-[var(--primary)]/5 border-2 border-[var(--primary)] rounded-[4px]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[var(--primary)]" />
                        <span className="font-semibold text-lg">
                          {difference >= 0 ? 'Amount to Collect:' : 'Refund Amount:'}
                        </span>
                      </div>
                      <span
                        className={cn(
                          'text-3xl font-bold tabular-nums',
                          difference >= 0 ? 'text-[var(--destructive)]' : 'text-[var(--success)]'
                        )}
                      >
                        ₹{Math.abs(difference).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setCurrentStep('selectNew')}
                      className="flex-1 h-11 px-6 bg-white border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-[4px] font-medium"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={completeExchange}
                      className="flex-1 h-11 px-6 bg-[var(--success)] text-white hover:opacity-90 rounded-[4px] font-medium flex items-center justify-center gap-2 [box-shadow:var(--shadow-md)]"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Complete Exchange
                    </button>
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Indicator Component
interface StepIndicatorProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

function StepIndicator({ number, label, active, completed }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors',
          completed && 'bg-[var(--success)] text-white',
          active && !completed && 'bg-[var(--primary)] text-white',
          !active && !completed && 'bg-[var(--muted)] text-[var(--muted-foreground)]'
        )}
      >
        {completed ? <CheckCircle className="w-5 h-5" /> : number}
      </div>
      <div
        className={cn(
          'text-[0.75rem] font-medium whitespace-nowrap',
          active ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'
        )}
      >
        {label}
      </div>
    </div>
  );
}

// Step Connector Component
interface StepConnectorProps {
  completed: boolean;
}

function StepConnector({ completed }: StepConnectorProps) {
  return (
    <div className="flex-1 h-0.5 bg-[var(--border)] relative">
      <div
        className={cn(
          'absolute inset-0 bg-[var(--success)] transition-all',
          completed ? 'w-full' : 'w-0'
        )}
      />
    </div>
  );
}

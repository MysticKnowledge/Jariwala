import React, { useState, useRef } from 'react';
import { Panel } from '@/app/components/Panel';
import { FormField, TextInput } from '@/app/components/FormField';
import { DataTable, Column } from '@/app/components/DataTable';
import { Badge } from '@/app/components/Badge';
import {
  PackagePlus,
  Save,
  Printer,
  Plus,
  Trash2,
  FileText,
  Calendar,
  User,
  Package,
  X,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface InwardItem {
  id: string;
  product: string;
  productCode: string;
  size: string;
  quantity: number;
  costPrice: number;
  amount: number;
}

interface Supplier {
  id: string;
  name: string;
  code: string;
  gst: string;
  contact: string;
}

// Mock suppliers
const mockSuppliers: Supplier[] = [
  { id: '1', name: 'Fashion Fabrics Pvt Ltd', code: 'SUP001', gst: '27AABCT1234C1Z5', contact: '9876543210' },
  { id: '2', name: 'TextileMart Industries', code: 'SUP002', gst: '27AABCT5678D1Z5', contact: '9876543211' },
  { id: '3', name: 'Global Garments Co.', code: 'SUP003', gst: '27AABCT9012E1Z5', contact: '9876543212' },
  { id: '4', name: 'Premium Textiles Ltd', code: 'SUP004', gst: '27AABCT3456F1Z5', contact: '9876543213' },
];

// Mock products
const mockProducts = [
  { code: 'PRD001', name: 'Cotton T-Shirt', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
  { code: 'PRD002', name: 'Denim Jeans', sizes: ['28', '30', '32', '34', '36', '38'] },
  { code: 'PRD003', name: 'Formal Shirt', sizes: ['38', '40', '42', '44', '46'] },
  { code: 'PRD004', name: 'Casual Trouser', sizes: ['30', '32', '34', '36', '38'] },
  { code: 'PRD005', name: 'Polo T-Shirt', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
];

export function GodownInwardEntry() {
  const [entryNumber, setEntryNumber] = useState('GWI-2026-0001');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [transportDetails, setTransportDetails] = useState('');
  const [remarks, setRemarks] = useState('');

  const [items, setItems] = useState<InwardItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);

  // New item form fields
  const [newProductSearch, setNewProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<typeof mockProducts[0] | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);

  const supplierInputRef = useRef<HTMLInputElement>(null);

  // Filter suppliers
  const filteredSuppliers = supplierSearch
    ? mockSuppliers.filter((s) =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.code.toLowerCase().includes(supplierSearch.toLowerCase())
      )
    : [];

  // Filter products
  const filteredProducts = newProductSearch
    ? mockProducts.filter((p) =>
        p.name.toLowerCase().includes(newProductSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(newProductSearch.toLowerCase())
      )
    : [];

  // Calculate totals
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  // Add item to inward entry
  const addItem = () => {
    if (!selectedProduct || !selectedSize || quantity <= 0 || costPrice <= 0) {
      alert('Please fill all item details');
      return;
    }

    const newItem: InwardItem = {
      id: `${Date.now()}-${Math.random()}`,
      product: selectedProduct.name,
      productCode: selectedProduct.code,
      size: selectedSize,
      quantity: quantity,
      costPrice: costPrice,
      amount: quantity * costPrice,
    };

    setItems([...items, newItem]);
    
    // Reset form
    setNewProductSearch('');
    setSelectedProduct(null);
    setSelectedSize('');
    setQuantity(0);
    setCostPrice(0);
    setShowAddItem(false);
  };

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Save inward entry
  const saveInward = () => {
    if (!selectedSupplier) {
      alert('Please select a supplier');
      return;
    }
    if (!invoiceNumber) {
      alert('Please enter invoice number');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    console.log('Saving inward entry:', {
      entryNumber,
      entryDate,
      supplier: selectedSupplier,
      invoiceNumber,
      invoiceDate,
      transportDetails,
      remarks,
      items,
      totalQuantity,
      totalAmount,
    });

    alert('Inward entry saved successfully!');
    resetForm();
  };

  // Print reference
  const printReference = () => {
    console.log('Printing reference...');
    alert('Reference document will be printed');
  };

  // Reset form
  const resetForm = () => {
    setEntryNumber(`GWI-2026-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`);
    setEntryDate(new Date().toISOString().split('T')[0]);
    setSupplierSearch('');
    setSelectedSupplier(null);
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setTransportDetails('');
    setRemarks('');
    setItems([]);
    setShowAddItem(false);
  };

  // Items table columns
  const itemColumns: Column<InwardItem>[] = [
    {
      key: 'productCode',
      header: 'Product Code',
      width: '120px',
      render: (value) => <span className="font-mono text-[0.875rem]">{value}</span>,
    },
    {
      key: 'product',
      header: 'Product Name',
    },
    {
      key: 'size',
      header: 'Size',
      width: '80px',
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      width: '100px',
      render: (value) => <span className="tabular-nums font-medium">{value}</span>,
    },
    {
      key: 'costPrice',
      header: 'Cost Price',
      width: '120px',
      render: (value) => <span className="tabular-nums">₹{value.toFixed(2)}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '140px',
      render: (value) => <span className="tabular-nums font-semibold">₹{value.toFixed(2)}</span>,
    },
    {
      key: 'id',
      header: 'Action',
      width: '80px',
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

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <PackagePlus className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="m-0">Godown Inward Entry</h2>
          <Badge variant="info">{entryNumber}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetForm}
            className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-[var(--background)]">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Entry Details */}
          <Panel title="Entry Details" glass>
            <div className="grid grid-cols-2 gap-6">
              <FormField label="Entry Number" required>
                <TextInput
                  value={entryNumber}
                  onChange={(e) => setEntryNumber(e.target.value)}
                  disabled
                  className="bg-[var(--muted)] font-mono"
                />
              </FormField>

              <FormField label="Entry Date" required>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <TextInput
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </FormField>
            </div>
          </Panel>

          {/* Supplier Details */}
          <Panel title="Supplier Details" glass>
            <div className="space-y-4">
              <FormField label="Supplier" required>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] z-10" />
                  <TextInput
                    ref={supplierInputRef}
                    value={selectedSupplier ? selectedSupplier.name : supplierSearch}
                    onChange={(e) => {
                      setSupplierSearch(e.target.value);
                      setSelectedSupplier(null);
                    }}
                    placeholder="Search supplier by name or code..."
                    className="pl-10"
                    disabled={!!selectedSupplier}
                  />
                  {selectedSupplier && (
                    <button
                      onClick={() => {
                        setSelectedSupplier(null);
                        setSupplierSearch('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--secondary)] rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {supplierSearch && !selectedSupplier && filteredSuppliers.length > 0 && (
                  <div className="mt-2 bg-white border border-[var(--border)] rounded-[4px] max-h-48 overflow-auto [box-shadow:var(--shadow-md)]">
                    {filteredSuppliers.map((supplier) => (
                      <button
                        key={supplier.id}
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setSupplierSearch('');
                        }}
                        className="w-full p-3 text-left hover:bg-[var(--secondary)] border-b border-[var(--border-light)] last:border-b-0"
                      >
                        <div className="font-medium text-[0.875rem]">{supplier.name}</div>
                        <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                          Code: {supplier.code} • GST: {supplier.gst} • {supplier.contact}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </FormField>

              {selectedSupplier && (
                <div className="p-3 bg-[var(--muted)] rounded-[4px] grid grid-cols-3 gap-4 text-[0.875rem]">
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Supplier Code</div>
                    <div className="font-mono font-medium">{selectedSupplier.code}</div>
                  </div>
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">GST Number</div>
                    <div className="font-mono font-medium">{selectedSupplier.gst}</div>
                  </div>
                  <div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Contact</div>
                    <div className="font-medium">{selectedSupplier.contact}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <FormField label="Supplier Invoice Number" required>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <TextInput
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                      placeholder="e.g., INV-2026-001"
                      className="pl-10 uppercase"
                    />
                  </div>
                </FormField>

                <FormField label="Invoice Date" required>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <TextInput
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </FormField>
              </div>

              <FormField label="Transport Details">
                <TextInput
                  value={transportDetails}
                  onChange={(e) => setTransportDetails(e.target.value)}
                  placeholder="Vehicle number, driver name, LR number, etc."
                />
              </FormField>
            </div>
          </Panel>

          {/* Items Section */}
          <Panel
            title="Inward Items"
            glass
            headerAction={
              <button
                onClick={() => setShowAddItem(true)}
                className="h-8 px-4 rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] text-[0.875rem] font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            }
          >
            {/* Add Item Form */}
            {showAddItem && (
              <div className="mb-4 p-4 bg-[var(--background-alt)] border border-[var(--border)] rounded-[4px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Add New Item</h3>
                  <button
                    onClick={() => {
                      setShowAddItem(false);
                      setNewProductSearch('');
                      setSelectedProduct(null);
                      setSelectedSize('');
                      setQuantity(0);
                      setCostPrice(0);
                    }}
                    className="w-6 h-6 flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--secondary)] rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[0.75rem] font-medium mb-1.5">Product</label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] z-10" />
                      <TextInput
                        value={selectedProduct ? selectedProduct.name : newProductSearch}
                        onChange={(e) => {
                          setNewProductSearch(e.target.value);
                          setSelectedProduct(null);
                        }}
                        placeholder="Search product..."
                        className="pl-10"
                        disabled={!!selectedProduct}
                      />
                      {selectedProduct && (
                        <button
                          onClick={() => {
                            setSelectedProduct(null);
                            setNewProductSearch('');
                            setSelectedSize('');
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center bg-[var(--muted)] hover:bg-[var(--secondary)] rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {newProductSearch && !selectedProduct && filteredProducts.length > 0 && (
                      <div className="mt-2 bg-white border border-[var(--border)] rounded-[4px] max-h-48 overflow-auto [box-shadow:var(--shadow-md)] absolute z-20">
                        {filteredProducts.map((product) => (
                          <button
                            key={product.code}
                            onClick={() => {
                              setSelectedProduct(product);
                              setNewProductSearch('');
                              setSelectedSize(product.sizes[0]);
                            }}
                            className="w-full p-2 text-left hover:bg-[var(--secondary)] border-b border-[var(--border-light)] last:border-b-0"
                          >
                            <div className="font-medium text-[0.875rem]">{product.name}</div>
                            <div className="text-[0.75rem] text-[var(--muted-foreground)] font-mono">
                              {product.code}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[0.75rem] font-medium mb-1.5">Size</label>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]"
                      disabled={!selectedProduct}
                    >
                      <option value="">Select</option>
                      {selectedProduct?.sizes.map((size) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[0.75rem] font-medium mb-1.5">Quantity</label>
                    <TextInput
                      type="number"
                      value={quantity || ''}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="1"
                      className="tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.75rem] font-medium mb-1.5">Cost Price</label>
                    <TextInput
                      type="number"
                      value={costPrice || ''}
                      onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.75rem] font-medium mb-1.5">Amount</label>
                    <div className="h-10 px-3 bg-[var(--muted)] border border-[var(--border)] rounded-[4px] flex items-center text-[0.875rem] font-semibold tabular-nums">
                      ₹{(quantity * costPrice).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={addItem}
                    className="h-9 px-6 rounded-[4px] bg-[var(--success)] text-white hover:opacity-90 text-[0.875rem] font-medium flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Add to Entry
                  </button>
                </div>
              </div>
            )}

            {/* Items Table */}
            {items.length > 0 ? (
              <DataTable data={items} columns={itemColumns} zebra={true} hover={false} />
            ) : (
              <div className="text-center py-8 text-[var(--muted-foreground)]">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <div className="text-[0.875rem]">No items added yet</div>
                <div className="text-[0.75rem]">Click "Add Item" to start adding products</div>
              </div>
            )}
          </Panel>

          {/* Summary Section */}
          {items.length > 0 && (
            <Panel title="Summary" glass>
              <div className="grid grid-cols-3 gap-6">
                <div className="p-4 bg-[var(--background-alt)] rounded-[4px]">
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Total Items</div>
                  <div className="text-2xl font-bold tabular-nums">{items.length}</div>
                </div>

                <div className="p-4 bg-[var(--background-alt)] rounded-[4px]">
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Total Quantity</div>
                  <div className="text-2xl font-bold tabular-nums">{totalQuantity}</div>
                </div>

                <div className="p-4 bg-[var(--primary)]/10 border-2 border-[var(--primary)] rounded-[4px]">
                  <div className="text-[0.75rem] text-[var(--primary)] mb-1 font-semibold">Total Amount</div>
                  <div className="text-2xl font-bold text-[var(--primary)] tabular-nums">
                    ₹{totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <FormField label="Remarks">
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter any additional notes or remarks..."
                    className="w-full h-20 px-3 py-2 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] resize-none"
                  />
                </FormField>
              </div>
            </Panel>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pb-6">
            <button
              onClick={resetForm}
              className="h-11 px-6 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[var(--foreground)] font-medium"
            >
              Cancel
            </button>
            <button
              onClick={printReference}
              disabled={items.length === 0}
              className="h-11 px-6 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[var(--foreground)] font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Print Reference
            </button>
            <button
              onClick={saveInward}
              disabled={items.length === 0 || !selectedSupplier || !invoiceNumber}
              className="h-11 px-8 rounded-[4px] bg-[var(--success)] text-white hover:opacity-90 font-semibold flex items-center gap-2 [box-shadow:var(--shadow-md)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              Save Inward Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

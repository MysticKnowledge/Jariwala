import React, { useState, useMemo } from 'react';
import { Panel } from '@/app/components/Panel';
import { Badge } from '@/app/components/Badge';
import {
  Grid3x3,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface SizeStock {
  [size: string]: number;
}

interface ProductMatrix {
  id: string;
  productName: string;
  brand: string;
  category: string;
  sku: string;
  sizeStock: SizeStock;
}

// All possible sizes in order
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46'];

// Mock data
const mockMatrixData: ProductMatrix[] = [
  {
    id: '1',
    productName: 'Premium Cotton T-Shirt',
    brand: 'UrbanStyle',
    category: 'T-Shirts',
    sku: 'US-CTS-001',
    sizeStock: { 'S': 15, 'M': 28, 'L': 22, 'XL': 18, 'XXL': 8 },
  },
  {
    id: '2',
    productName: 'Classic Polo Shirt',
    brand: 'UrbanStyle',
    category: 'T-Shirts',
    sku: 'US-POL-002',
    sizeStock: { 'S': 12, 'M': 24, 'L': 19, 'XL': 15, 'XXL': 6 },
  },
  {
    id: '3',
    productName: 'V-Neck Casual Tee',
    brand: 'UrbanStyle',
    category: 'T-Shirts',
    sku: 'US-VNK-003',
    sizeStock: { 'XS': 8, 'S': 18, 'M': 32, 'L': 25, 'XL': 12 },
  },
  {
    id: '4',
    productName: 'Slim Fit Denim Jeans',
    brand: 'DenimCo',
    category: 'Jeans',
    sku: 'DC-SFJ-001',
    sizeStock: { '28': 8, '30': 12, '32': 24, '34': 18, '36': 10, '38': 6 },
  },
  {
    id: '5',
    productName: 'Regular Fit Denim',
    brand: 'DenimCo',
    category: 'Jeans',
    sku: 'DC-RFJ-002',
    sizeStock: { '28': 5, '30': 15, '32': 28, '34': 22, '36': 14, '38': 8 },
  },
  {
    id: '6',
    productName: 'Stretchable Jeans',
    brand: 'DenimCo',
    category: 'Jeans',
    sku: 'DC-STJ-003',
    sizeStock: { '28': 10, '30': 18, '32': 32, '34': 25, '36': 16, '38': 9 },
  },
  {
    id: '7',
    productName: 'Formal White Shirt',
    brand: 'ExecutiveWear',
    category: 'Formal Shirts',
    sku: 'EW-FWS-001',
    sizeStock: { '38': 12, '40': 22, '42': 18, '44': 14, '46': 6 },
  },
  {
    id: '8',
    productName: 'Formal Blue Shirt',
    brand: 'ExecutiveWear',
    category: 'Formal Shirts',
    sku: 'EW-FBS-002',
    sizeStock: { '38': 10, '40': 20, '42': 16, '44': 12, '46': 5 },
  },
  {
    id: '9',
    productName: 'Striped Formal Shirt',
    brand: 'ExecutiveWear',
    category: 'Formal Shirts',
    sku: 'EW-SFS-003',
    sizeStock: { '38': 8, '40': 18, '42': 15, '44': 10, '46': 4 },
  },
  {
    id: '10',
    productName: 'Casual Chinos',
    brand: 'CasualFit',
    category: 'Trousers',
    sku: 'CF-CCH-001',
    sizeStock: { '28': 6, '30': 14, '32': 22, '34': 18, '36': 12, '38': 7 },
  },
  {
    id: '11',
    productName: 'Formal Trousers',
    brand: 'CasualFit',
    category: 'Trousers',
    sku: 'CF-FTR-002',
    sizeStock: { '28': 8, '30': 16, '32': 24, '34': 20, '36': 14, '38': 8 },
  },
  {
    id: '12',
    productName: 'Sports Shorts',
    brand: 'ActiveWear',
    category: 'Shorts',
    sku: 'AW-SPS-001',
    sizeStock: { 'S': 20, 'M': 35, 'L': 28, 'XL': 15, 'XXL': 10 },
  },
  {
    id: '13',
    productName: 'Cargo Shorts',
    brand: 'ActiveWear',
    category: 'Shorts',
    sku: 'AW-CGS-002',
    sizeStock: { 'S': 15, 'M': 28, 'L': 22, 'XL': 12, 'XXL': 8 },
  },
  {
    id: '14',
    productName: 'Winter Jacket',
    brand: 'WinterWear',
    category: 'Outerwear',
    sku: 'WW-WJK-001',
    sizeStock: { 'M': 8, 'L': 12, 'XL': 10, 'XXL': 6 },
  },
  {
    id: '15',
    productName: 'Hooded Sweatshirt',
    brand: 'WinterWear',
    category: 'Outerwear',
    sku: 'WW-HSW-002',
    sizeStock: { 'S': 10, 'M': 18, 'L': 22, 'XL': 16, 'XXL': 8 },
  },
];

const locations = ['Main Store', 'Pune Branch', 'Central Godown', 'Ahmedabad Branch'];
const categories = ['All Categories', 'T-Shirts', 'Jeans', 'Formal Shirts', 'Trousers', 'Shorts', 'Outerwear'];
const brands = ['All Brands', 'UrbanStyle', 'DenimCo', 'ExecutiveWear', 'CasualFit', 'ActiveWear', 'WinterWear'];

export function SizeMatrixView() {
  const [selectedLocation, setSelectedLocation] = useState('Main Store');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightLowStock, setHighlightLowStock] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Filter data
  const filteredData = useMemo(() => {
    return mockMatrixData.filter((product) => {
      const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
      const matchesBrand = selectedBrand === 'All Brands' || product.brand === selectedBrand;
      const matchesSearch = searchTerm === '' ||
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesBrand && matchesSearch;
    });
  }, [selectedCategory, selectedBrand, searchTerm]);

  // Get active sizes from filtered data
  const activeSizes = useMemo(() => {
    const sizesSet = new Set<string>();
    filteredData.forEach((product) => {
      Object.keys(product.sizeStock).forEach((size) => sizesSet.add(size));
    });
    // Return in predefined order
    return ALL_SIZES.filter((size) => sizesSet.has(size));
  }, [filteredData]);

  // Calculate totals
  const totals = useMemo(() => {
    const sizeTotal: SizeStock = {};
    let grandTotal = 0;

    filteredData.forEach((product) => {
      Object.entries(product.sizeStock).forEach(([size, qty]) => {
        sizeTotal[size] = (sizeTotal[size] || 0) + qty;
        grandTotal += qty;
      });
    });

    return { sizeTotal, grandTotal };
  }, [filteredData]);

  // Group by brand/category
  const groupedData = useMemo(() => {
    const groups: { [key: string]: ProductMatrix[] } = {};
    filteredData.forEach((product) => {
      const key = selectedCategory === 'All Categories' ? product.brand : product.category;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(product);
    });
    return groups;
  }, [filteredData, selectedCategory]);

  const getCellColor = (qty: number | undefined) => {
    if (!qty) return 'bg-gray-100 text-gray-400';
    if (highlightLowStock && qty < lowStockThreshold) {
      if (qty === 0) return 'bg-[var(--destructive)] text-white font-bold';
      if (qty <= 5) return 'bg-red-100 text-red-900 font-semibold';
      return 'bg-yellow-50 text-yellow-900';
    }
    return 'bg-white text-[var(--foreground)]';
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <Grid3x3 className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="m-0">Size Matrix View</h2>
          <Badge variant="info">{selectedLocation}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-4 py-3 bg-[var(--background-alt)] border-b border-[var(--border)]">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2 text-[0.875rem] font-medium">
            <Filter className="w-4 h-4 text-[var(--primary)]" />
            Filters:
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[0.75rem] text-[var(--muted-foreground)]">Location:</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="h-8 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] min-w-[140px]"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[0.75rem] text-[var(--muted-foreground)]">Category:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] min-w-[140px]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[0.75rem] text-[var(--muted-foreground)]">Brand:</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="h-8 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] min-w-[140px]"
            >
              {brands.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full h-8 pl-10 pr-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]"
              />
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-4 text-[0.75rem]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={highlightLowStock}
              onChange={(e) => setHighlightLowStock(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span>Highlight low stock (below {lowStockThreshold})</span>
          </label>
          <input
            type="number"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 10)}
            className="w-16 h-7 px-2 bg-white border border-[var(--border)] rounded-[4px] text-center tabular-nums"
            min="1"
          />
        </div>
      </div>

      {/* Summary Bar */}
      <div className="h-10 px-4 bg-white border-b border-[var(--border)] flex items-center gap-6 text-[0.875rem]">
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted-foreground)]">Products:</span>
          <span className="font-semibold tabular-nums">{filteredData.length}</span>
        </div>
        <div className="w-px h-6 bg-[var(--border)]" />
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted-foreground)]">Total Stock:</span>
          <span className="font-semibold tabular-nums">{totals.grandTotal}</span>
        </div>
        <div className="w-px h-6 bg-[var(--border)]" />
        <div className="flex items-center gap-2">
          <span className="text-[var(--muted-foreground)]">Active Sizes:</span>
          <span className="font-semibold tabular-nums">{activeSizes.length}</span>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="flex-1 overflow-auto bg-[var(--background)]">
        <div className="inline-block min-w-full p-4">
          <div className="bg-white border-2 border-[var(--border)] rounded-[4px] overflow-hidden [box-shadow:var(--shadow-md)]">
            <table className="w-full border-collapse text-[0.875rem]">
              <thead>
                {/* Size Header Row */}
                <tr className="bg-[var(--primary)] text-white">
                  <th className="border-r-2 border-white px-3 py-3 text-left font-bold sticky left-0 bg-[var(--primary)] z-20 min-w-[280px]">
                    PRODUCT / SKU
                  </th>
                  {activeSizes.map((size) => (
                    <th
                      key={size}
                      className="border-r border-white px-3 py-3 text-center font-bold min-w-[70px]"
                    >
                      {size}
                    </th>
                  ))}
                  <th className="border-l-2 border-white px-3 py-3 text-center font-bold bg-[var(--primary-hover)] min-w-[90px]">
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedData).map(([groupName, products], groupIndex) => (
                  <React.Fragment key={groupName}>
                    {/* Group Header */}
                    <tr className="bg-[var(--muted)]">
                      <td
                        colSpan={activeSizes.length + 2}
                        className="px-3 py-2 font-bold text-[var(--foreground)] border-t-2 border-[var(--border)]"
                      >
                        {groupName}
                      </td>
                    </tr>

                    {/* Products in Group */}
                    {products.map((product, index) => {
                      const rowTotal = Object.values(product.sizeStock).reduce((sum, qty) => sum + qty, 0);
                      const isEvenRow = index % 2 === 0;

                      return (
                        <tr
                          key={product.id}
                          className={cn(
                            'border-t border-[var(--border)]',
                            isEvenRow ? 'bg-gray-50' : 'bg-white'
                          )}
                        >
                          {/* Product Name */}
                          <td className="border-r-2 border-[var(--border)] px-3 py-2.5 sticky left-0 z-10 bg-inherit">
                            <div className="font-medium">{product.productName}</div>
                            <div className="text-[0.75rem] text-[var(--muted-foreground)] font-mono">
                              {product.sku}
                            </div>
                          </td>

                          {/* Size Cells */}
                          {activeSizes.map((size) => {
                            const qty = product.sizeStock[size];
                            return (
                              <td
                                key={size}
                                className={cn(
                                  'border-r border-[var(--border)] px-3 py-2.5 text-center font-semibold tabular-nums',
                                  getCellColor(qty)
                                )}
                              >
                                {qty || '-'}
                              </td>
                            );
                          })}

                          {/* Row Total */}
                          <td className="border-l-2 border-[var(--border)] px-3 py-2.5 text-center font-bold bg-[var(--muted)] tabular-nums">
                            {rowTotal}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Group Subtotal */}
                    {selectedCategory === 'All Categories' && (
                      <tr className="bg-[var(--secondary)] font-semibold border-t-2 border-[var(--border)]">
                        <td className="px-3 py-2 sticky left-0 bg-[var(--secondary)] z-10 border-r-2 border-[var(--border)]">
                          {groupName} Subtotal
                        </td>
                        {activeSizes.map((size) => {
                          const subtotal = products.reduce((sum, p) => sum + (p.sizeStock[size] || 0), 0);
                          return (
                            <td
                              key={size}
                              className="border-r border-[var(--border)] px-3 py-2 text-center tabular-nums"
                            >
                              {subtotal || '-'}
                            </td>
                          );
                        })}
                        <td className="border-l-2 border-[var(--border)] px-3 py-2 text-center font-bold tabular-nums">
                          {products.reduce((sum, p) => sum + Object.values(p.sizeStock).reduce((s, q) => s + q, 0), 0)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

                {/* Grand Total Row */}
                <tr className="bg-[var(--primary)] text-white font-bold border-t-4 border-[var(--primary)]">
                  <td className="px-3 py-3 sticky left-0 bg-[var(--primary)] z-10 border-r-2 border-white text-lg">
                    GRAND TOTAL
                  </td>
                  {activeSizes.map((size) => (
                    <td
                      key={size}
                      className="border-r border-white px-3 py-3 text-center text-lg tabular-nums"
                    >
                      {totals.sizeTotal[size] || '-'}
                    </td>
                  ))}
                  <td className="border-l-2 border-white px-3 py-3 text-center text-lg bg-[var(--primary-hover)] tabular-nums">
                    {totals.grandTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-12 mt-4">
              <Grid3x3 className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-20" />
              <h3 className="text-[var(--muted-foreground)] mb-2">No products found</h3>
              <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend Bar */}
      <div className="h-10 px-4 bg-[var(--muted)] border-t border-[var(--border)] flex items-center gap-6 text-[0.75rem]">
        <span className="text-[var(--muted-foreground)] font-medium">Color Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-[var(--destructive)] rounded-[2px]" />
          <span>Out of Stock (0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-red-100 border border-red-300 rounded-[2px]" />
          <span>Critical (1-5)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-yellow-50 border border-yellow-300 rounded-[2px]" />
          <span>Low Stock (6-{lowStockThreshold})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-white border border-[var(--border)] rounded-[2px]" />
          <span>Normal Stock</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-gray-100 rounded-[2px]" />
          <span>Size Not Available</span>
        </div>
      </div>
    </div>
  );
}

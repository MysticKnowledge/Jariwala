import React, { useState, useMemo } from 'react';
import { Panel } from '@/app/components/Panel';
import { Badge } from '@/app/components/Badge';
import {
  Package,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Search,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface StockLevel {
  quantity: number;
  reorderLevel: number;
  maxLevel: number;
  lastUpdated: string;
}

interface ProductStock {
  productId: string;
  productName: string;
  category: string;
  sku: string;
  sizes: {
    [size: string]: {
      [location: string]: StockLevel;
    };
  };
}

// Mock inventory data
const mockInventory: ProductStock[] = [
  {
    productId: '1',
    productName: 'Cotton T-Shirt',
    category: 'Apparel',
    sku: 'CTS-001',
    sizes: {
      'S': {
        'Main Store': { quantity: 15, reorderLevel: 10, maxLevel: 50, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 8, reorderLevel: 10, maxLevel: 30, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 45, reorderLevel: 20, maxLevel: 100, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 25, reorderLevel: 15, maxLevel: 50, lastUpdated: '2026-01-30' },
      },
      'M': {
        'Main Store': { quantity: 22, reorderLevel: 10, maxLevel: 50, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 12, reorderLevel: 10, maxLevel: 30, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 68, reorderLevel: 20, maxLevel: 100, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 18, reorderLevel: 15, maxLevel: 50, lastUpdated: '2026-01-30' },
      },
      'L': {
        'Main Store': { quantity: 5, reorderLevel: 10, maxLevel: 50, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 3, reorderLevel: 10, maxLevel: 30, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 32, reorderLevel: 20, maxLevel: 100, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 8, reorderLevel: 15, maxLevel: 50, lastUpdated: '2026-01-30' },
      },
      'XL': {
        'Main Store': { quantity: 18, reorderLevel: 10, maxLevel: 50, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 14, reorderLevel: 10, maxLevel: 30, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 54, reorderLevel: 20, maxLevel: 100, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 22, reorderLevel: 15, maxLevel: 50, lastUpdated: '2026-01-30' },
      },
    },
  },
  {
    productId: '2',
    productName: 'Denim Jeans',
    category: 'Apparel',
    sku: 'DJ-001',
    sizes: {
      '28': {
        'Main Store': { quantity: 12, reorderLevel: 8, maxLevel: 40, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 6, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 28, reorderLevel: 15, maxLevel: 80, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 15, reorderLevel: 10, maxLevel: 40, lastUpdated: '2026-01-30' },
      },
      '30': {
        'Main Store': { quantity: 8, reorderLevel: 8, maxLevel: 40, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 4, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 35, reorderLevel: 15, maxLevel: 80, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 12, reorderLevel: 10, maxLevel: 40, lastUpdated: '2026-01-30' },
      },
      '32': {
        'Main Store': { quantity: 22, reorderLevel: 8, maxLevel: 40, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 18, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 62, reorderLevel: 15, maxLevel: 80, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 28, reorderLevel: 10, maxLevel: 40, lastUpdated: '2026-01-30' },
      },
      '34': {
        'Main Store': { quantity: 15, reorderLevel: 8, maxLevel: 40, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 11, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 48, reorderLevel: 15, maxLevel: 80, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 19, reorderLevel: 10, maxLevel: 40, lastUpdated: '2026-01-30' },
      },
      '36': {
        'Main Store': { quantity: 9, reorderLevel: 8, maxLevel: 40, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 7, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 24, reorderLevel: 15, maxLevel: 80, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 11, reorderLevel: 10, maxLevel: 40, lastUpdated: '2026-01-30' },
      },
    },
  },
  {
    productId: '3',
    productName: 'Formal Shirt',
    category: 'Apparel',
    sku: 'FS-001',
    sizes: {
      '38': {
        'Main Store': { quantity: 8, reorderLevel: 8, maxLevel: 35, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 5, reorderLevel: 8, maxLevel: 20, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 18, reorderLevel: 12, maxLevel: 70, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 12, reorderLevel: 10, maxLevel: 35, lastUpdated: '2026-01-30' },
      },
      '40': {
        'Main Store': { quantity: 14, reorderLevel: 8, maxLevel: 35, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 9, reorderLevel: 8, maxLevel: 20, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 32, reorderLevel: 12, maxLevel: 70, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 18, reorderLevel: 10, maxLevel: 35, lastUpdated: '2026-01-30' },
      },
      '42': {
        'Main Store': { quantity: 11, reorderLevel: 8, maxLevel: 35, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 7, reorderLevel: 8, maxLevel: 20, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 25, reorderLevel: 12, maxLevel: 70, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 15, reorderLevel: 10, maxLevel: 35, lastUpdated: '2026-01-30' },
      },
      '44': {
        'Main Store': { quantity: 6, reorderLevel: 8, maxLevel: 35, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 3, reorderLevel: 8, maxLevel: 20, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 14, reorderLevel: 12, maxLevel: 70, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 8, reorderLevel: 10, maxLevel: 35, lastUpdated: '2026-01-30' },
      },
    },
  },
  {
    productId: '4',
    productName: 'Casual Trouser',
    category: 'Apparel',
    sku: 'CT-001',
    sizes: {
      '30': {
        'Main Store': { quantity: 10, reorderLevel: 8, maxLevel: 40, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 7, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 28, reorderLevel: 15, maxLevel: 75, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 14, reorderLevel: 10, maxLevel: 38, lastUpdated: '2026-01-30' },
      },
      '32': {
        'Main Store': { quantity: 16, reorderLevel: 8, maxLevel: 40, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 12, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 42, reorderLevel: 15, maxLevel: 75, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 22, reorderLevel: 10, maxLevel: 38, lastUpdated: '2026-01-30' },
      },
      '34': {
        'Main Store': { quantity: 12, reorderLevel: 8, maxLevel: 40, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 8, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 35, reorderLevel: 15, maxLevel: 75, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 18, reorderLevel: 10, maxLevel: 38, lastUpdated: '2026-01-30' },
      },
      '36': {
        'Main Store': { quantity: 8, reorderLevel: 8, maxLevel: 40, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 5, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 22, reorderLevel: 15, maxLevel: 75, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 11, reorderLevel: 10, maxLevel: 38, lastUpdated: '2026-01-30' },
      },
    },
  },
  {
    productId: '5',
    productName: 'Winter Jacket',
    category: 'Apparel',
    sku: 'WJ-001',
    sizes: {
      'M': {
        'Main Store': { quantity: 2, reorderLevel: 5, maxLevel: 20, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 1, reorderLevel: 5, maxLevel: 15, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 8, reorderLevel: 10, maxLevel: 50, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 5, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
      },
      'L': {
        'Main Store': { quantity: 4, reorderLevel: 5, maxLevel: 20, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 2, reorderLevel: 5, maxLevel: 15, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 12, reorderLevel: 10, maxLevel: 50, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 7, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
      },
      'XL': {
        'Main Store': { quantity: 3, reorderLevel: 5, maxLevel: 20, lastUpdated: '2026-01-30' },
        'Pune Branch': { quantity: 2, reorderLevel: 5, maxLevel: 15, lastUpdated: '2026-01-30' },
        'Central Godown': { quantity: 10, reorderLevel: 10, maxLevel: 50, lastUpdated: '2026-01-29' },
        'Amazon FBA': { quantity: 6, reorderLevel: 8, maxLevel: 25, lastUpdated: '2026-01-30' },
      },
    },
  },
];

const locations = ['All Locations', 'Main Store', 'Pune Branch', 'Central Godown', 'Amazon FBA'];
const categories = ['All Categories', 'Apparel', 'Accessories', 'Footwear'];

type StockStatus = 'critical' | 'low' | 'healthy' | 'dead';

function getStockStatus(stock: StockLevel): StockStatus {
  const { quantity, reorderLevel, maxLevel } = stock;
  
  if (quantity === 0) return 'critical';
  if (quantity < reorderLevel) return 'low';
  if (quantity > maxLevel * 1.5) return 'dead'; // Dead stock: 150% over max
  return 'healthy';
}

export function InventoryOverview() {
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return mockInventory.filter((product) => {
      const matchesCategory = selectedCategory === 'All Categories' || product.category === selectedCategory;
      const matchesSearch = searchTerm === '' || 
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  // Get all unique sizes across filtered products
  const allSizes = useMemo(() => {
    const sizesSet = new Set<string>();
    filteredInventory.forEach((product) => {
      Object.keys(product.sizes).forEach((size) => sizesSet.add(size));
    });
    return Array.from(sizesSet);
  }, [filteredInventory]);

  // Get locations to display
  const displayLocations = selectedLocation === 'All Locations' 
    ? locations.filter(l => l !== 'All Locations')
    : [selectedLocation];

  // Calculate summary statistics
  const calculateStats = () => {
    let totalItems = 0;
    let lowStockCount = 0;
    let criticalStockCount = 0;
    let deadStockCount = 0;

    filteredInventory.forEach((product) => {
      Object.values(product.sizes).forEach((sizeData) => {
        displayLocations.forEach((location) => {
          if (sizeData[location]) {
            const stock = sizeData[location];
            totalItems += stock.quantity;
            const status = getStockStatus(stock);
            if (status === 'critical') criticalStockCount++;
            else if (status === 'low') lowStockCount++;
            else if (status === 'dead') deadStockCount++;
          }
        });
      });
    });

    return { totalItems, lowStockCount, criticalStockCount, deadStockCount };
  };

  const stats = calculateStats();

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="m-0">Inventory Overview</h2>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="h-16 px-4 bg-[var(--background-alt)] border-b border-[var(--border)] flex items-center gap-4">
        <div className="flex items-center gap-2 text-[0.875rem] font-medium">
          <Filter className="w-4 h-4 text-[var(--primary)]" />
          Filters:
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[0.75rem] text-[var(--muted-foreground)]">Location:</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="h-9 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] min-w-[160px]"
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
            className="h-9 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] min-w-[160px]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
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
              className="w-full h-9 pl-10 pr-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center gap-6">
        <div className="flex items-center gap-2 text-[0.875rem]">
          <span className="text-[var(--muted-foreground)]">Total Items:</span>
          <span className="font-semibold tabular-nums">{stats.totalItems}</span>
        </div>
        <div className="w-px h-6 bg-[var(--border)]" />
        <div className="flex items-center gap-2 text-[0.875rem]">
          <AlertCircle className="w-4 h-4 text-[var(--destructive)]" />
          <span className="text-[var(--muted-foreground)]">Critical:</span>
          <span className="font-semibold text-[var(--destructive)] tabular-nums">{stats.criticalStockCount}</span>
        </div>
        <div className="flex items-center gap-2 text-[0.875rem]">
          <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
          <span className="text-[var(--muted-foreground)]">Low Stock:</span>
          <span className="font-semibold text-[var(--warning)] tabular-nums">{stats.lowStockCount}</span>
        </div>
        <div className="flex items-center gap-2 text-[0.875rem]">
          <CheckCircle className="w-4 h-4 text-[var(--success)]" />
          <span className="text-[var(--muted-foreground)]">Healthy:</span>
          <span className="font-semibold text-[var(--success)] tabular-nums">
            {filteredInventory.length * allSizes.length * displayLocations.length - stats.criticalStockCount - stats.lowStockCount - stats.deadStockCount}
          </span>
        </div>
        {stats.deadStockCount > 0 && (
          <>
            <div className="w-px h-6 bg-[var(--border)]" />
            <div className="flex items-center gap-2 text-[0.875rem]">
              <Package className="w-4 h-4 text-[var(--muted-foreground)]" />
              <span className="text-[var(--muted-foreground)]">Dead Stock:</span>
              <span className="font-semibold tabular-nums">{stats.deadStockCount}</span>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="h-10 px-4 bg-[var(--muted)] border-b border-[var(--border)] flex items-center gap-6 text-[0.75rem]">
        <span className="text-[var(--muted-foreground)] font-medium">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-[var(--destructive)] rounded-[2px]" />
          <span>Critical (Out of stock or &lt; reorder level)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-[var(--warning)] rounded-[2px]" />
          <span>Low Stock (&lt; reorder level)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-[var(--success)] rounded-[2px]" />
          <span>Healthy (Optimal stock)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-[var(--muted-foreground)] rounded-[2px]" />
          <span>Dead Stock (Excess inventory)</span>
        </div>
      </div>

      {/* Main Content - Matrix Table */}
      <div className="flex-1 overflow-auto p-4 bg-[var(--background)]">
        <div className="inline-block min-w-full">
          {filteredInventory.map((product) => (
            <div key={product.productId} className="mb-4">
              <Panel glass className="overflow-hidden">
                {/* Product Header */}
                <div className="bg-[var(--background-alt)] px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{product.productName}</div>
                    <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                      SKU: {product.sku} • Category: {product.category}
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedProduct(expandedProduct === product.productId ? null : product.productId)}
                    className="text-[0.75rem] text-[var(--primary)] hover:underline"
                  >
                    {expandedProduct === product.productId ? 'Show Summary' : 'Show Details'}
                  </button>
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[0.875rem]">
                    <thead>
                      <tr className="bg-[var(--muted)]">
                        <th className="border border-[var(--border)] px-3 py-2 text-left font-semibold sticky left-0 bg-[var(--muted)] z-10">
                          Size / Location
                        </th>
                        {displayLocations.map((location) => (
                          <th
                            key={location}
                            className="border border-[var(--border)] px-3 py-2 text-center font-semibold min-w-[120px]"
                          >
                            {location}
                          </th>
                        ))}
                        <th className="border border-[var(--border)] px-3 py-2 text-center font-semibold bg-[var(--muted)] min-w-[100px]">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(product.sizes).map((size) => {
                        const sizeData = product.sizes[size];
                        const rowTotal = displayLocations.reduce((sum, loc) => 
                          sum + (sizeData[loc]?.quantity || 0), 0
                        );

                        return (
                          <tr key={size} className="hover:bg-[var(--secondary)]">
                            <td className="border border-[var(--border)] px-3 py-2 font-medium sticky left-0 bg-white z-10">
                              {size}
                            </td>
                            {displayLocations.map((location) => {
                              const stock = sizeData[location];
                              if (!stock) {
                                return (
                                  <td
                                    key={location}
                                    className="border border-[var(--border)] px-3 py-2 text-center bg-gray-50"
                                  >
                                    <span className="text-[var(--muted-foreground)]">-</span>
                                  </td>
                                );
                              }

                              const status = getStockStatus(stock);
                              const bgColor = {
                                critical: 'bg-[var(--destructive)]',
                                low: 'bg-[var(--warning)]',
                                healthy: 'bg-[var(--success)]',
                                dead: 'bg-[var(--muted-foreground)]',
                              }[status];

                              return (
                                <td
                                  key={location}
                                  className={cn(
                                    'border border-[var(--border)] px-3 py-2 text-center',
                                    bgColor,
                                    'text-white font-semibold tabular-nums'
                                  )}
                                  title={expandedProduct === product.productId 
                                    ? `Qty: ${stock.quantity} | Reorder: ${stock.reorderLevel} | Max: ${stock.maxLevel}`
                                    : undefined
                                  }
                                >
                                  {expandedProduct === product.productId ? (
                                    <div className="text-[0.75rem]">
                                      <div className="font-bold text-base">{stock.quantity}</div>
                                      <div className="opacity-90">
                                        Min: {stock.reorderLevel} | Max: {stock.maxLevel}
                                      </div>
                                    </div>
                                  ) : (
                                    stock.quantity
                                  )}
                                </td>
                              );
                            })}
                            <td className="border border-[var(--border)] px-3 py-2 text-center bg-[var(--muted)] font-bold tabular-nums">
                              {rowTotal}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total Row */}
                      <tr className="bg-[var(--muted)] font-semibold">
                        <td className="border border-[var(--border)] px-3 py-2 sticky left-0 bg-[var(--muted)] z-10">
                          Total
                        </td>
                        {displayLocations.map((location) => {
                          const locationTotal = Object.values(product.sizes).reduce(
                            (sum, sizeData) => sum + (sizeData[location]?.quantity || 0),
                            0
                          );
                          return (
                            <td
                              key={location}
                              className="border border-[var(--border)] px-3 py-2 text-center tabular-nums"
                            >
                              {locationTotal}
                            </td>
                          );
                        })}
                        <td className="border border-[var(--border)] px-3 py-2 text-center bg-[var(--primary)] text-white font-bold tabular-nums">
                          {Object.values(product.sizes).reduce((sum, sizeData) => {
                            return sum + displayLocations.reduce((locSum, loc) => 
                              locSum + (sizeData[loc]?.quantity || 0), 0
                            );
                          }, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          ))}

          {filteredInventory.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-20" />
              <h3 className="text-[var(--muted-foreground)] mb-2">No products found</h3>
              <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

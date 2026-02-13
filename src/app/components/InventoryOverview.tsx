import React, { useState, useMemo, useEffect } from 'react';
import { Panel } from '@/app/components/Panel';
import {
  Package,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Warehouse,
  HardDrive,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { fetchDeltaChanges, mergeDeltaChanges, formatSyncStats } from '@/app/utils/delta-sync';
import { queueMutation, syncMutations, getMutationStats, clearSyncedMutations } from '@/app/utils/mutation-queue';
import { detectConflicts, resolveConflict, type Conflict, type ConflictResolution } from '@/app/utils/conflict-resolver';
import { RealtimeSyncManager, type SyncStatus as SyncStatusType } from '@/app/utils/realtime-sync';
import { SyncStatus } from '@/app/components/SyncStatus';
import { ConflictDialog } from '@/app/components/ConflictDialog';

// IndexedDB wrapper functions (inline to avoid import issues)
const DB_NAME = 'RetailInventoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'inventory_cache';

interface CacheData {
  products: any[];
  variants: any[];
  locations: any[];
  events: any[];
  timestamp: number;
  lastSyncTimestamp?: string; // ISO timestamp of last successful sync
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log('✅ Created IndexedDB object store');
      }
    };
  });
}

async function saveToCache(key: string, data: CacheData): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`✅ Saved ${data.products.length.toLocaleString()} records to IndexedDB`);
        resolve();
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('❌ Failed to save to IndexedDB:', error);
    throw error;
  }
}

async function loadFromCache(key: string): Promise<CacheData | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const data = request.result as CacheData | undefined;
        if (data) {
          console.log(`✅ Loaded ${data.products.length.toLocaleString()} records from IndexedDB cache`);
          resolve(data);
        } else {
          console.log('ℹ️ No cache found in IndexedDB');
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('❌ Failed to load from IndexedDB:', error);
    return null;
  }
}

async function getStorageEstimate(): Promise<{ usage: number; quota: number; percentage: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;
    console.log(`📊 Storage: ${(usage / 1024 / 1024).toFixed(2)} MB / ${(quota / 1024 / 1024).toFixed(2)} MB (${percentage.toFixed(1)}% used)`);
    return { usage, quota, percentage };
  }
  return { usage: 0, quota: 0, percentage: 0 };
}

interface StockData {
  variant_id: string;
  product_id: string;
  sku_code: string;
  product_name: string;
  size: string | null;
  color: string | null;
  location_id: string;
  location_code: string;
  location_name: string;
  location_type: string;
  current_quantity: number;
  stock_status: string;
}

interface ProductStock {
  productId: string;
  productName: string;
  category: string;
  sku: string;
  sizes: {
    [size: string]: {
      [location: string]: {
        quantity: number;
        status: string;
      };
    };
  };
}

function mapStockStatus(status: string): 'critical' | 'low' | 'healthy' | 'dead' {
  switch (status) {
    case 'OUT_OF_STOCK':
      return 'critical';
    case 'LOW_STOCK':
      return 'low';
    case 'DEAD_STOCK':
      return 'dead';
    default:
      return 'healthy';
  }
}

export function InventoryOverview() {
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [locations, setLocations] = useState<string[]>(['All Locations']);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100); // Show 100 products per page
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, phase: '' });
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>({ status: 'idle', message: '' });
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [resolution, setResolution] = useState<ConflictResolution | null>(null);

  // Fetch data from Supabase with progressive loading and IndexedDB caching (1GB+ capacity!)
  const fetchStockData = async (forceRefresh = false) => {
    setLoading(true);
    
    try {
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      // Check IndexedDB first (unless force refresh) - 1GB+ storage! 🚀
      if (!forceRefresh) {
        const cached = await loadFromCache('inventory_data');
        if (cached) {
          const age = Date.now() - cached.timestamp;
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (age < maxAge) {
            console.log(`✅ Using cached data (${Math.round(age / 1000 / 60)} min old)`);
            console.log(`📦 Cached: ${cached.products.length.toLocaleString()} products, ${cached.variants.length.toLocaleString()} variants, ${cached.events.length.toLocaleString()} events`);
            
            // Rebuild stock matrix from cached raw data
            setLoadingProgress({ current: 0, total: 0, phase: 'Rebuilding from cache...' });
            
            const productMap = new Map(cached.products.map(p => [p.id, p]));
            
            // Recalculate stock from events
            const stockMap = new Map<string, number>();
            cached.events?.forEach((event: any) => {
              const variantId = event.variant_id;
              const qty = event.quantity || 0;

              if (event.from_location_id) {
                const key = `${variantId}-${event.from_location_id}`;
                stockMap.set(key, (stockMap.get(key) || 0) - qty);
              }

              if (event.to_location_id) {
                const key = `${variantId}-${event.to_location_id}`;
                stockMap.set(key, (stockMap.get(key) || 0) + qty);
              }
            });
            
            // Rebuild stock data
            const rebuiltStockData: StockData[] = [];
            cached.variants.forEach((variant: any) => {
              cached.locations.forEach((location: any) => {
                const key = `${variant.id}-${location.id}`;
                const quantity = stockMap.get(key) || 0;

                rebuiltStockData.push({
                  variant_id: variant.id,
                  product_id: variant.product_id,
                  sku_code: variant.sku_code,
                  product_name: productMap.get(variant.product_id)?.product_name || 'Unknown',
                  size: variant.size,
                  color: variant.color,
                  location_id: location.id,
                  location_code: location.location_code,
                  location_name: location.location_name,
                  location_type: location.location_type,
                  current_quantity: quantity,
                  stock_status: quantity <= 0 ? 'OUT_OF_STOCK' : 'HEALTHY',
                });
              });
            });
            
            console.log(`✅ Rebuilt ${rebuiltStockData.length.toLocaleString()} stock records from cache`);
            setStockData(rebuiltStockData);
            
            const uniqueLocations = ['All Locations', ...(cached.locations?.map((l: any) => l.location_name) || [])];
            setLocations(uniqueLocations);
            
            setLoading(false);
            getStorageEstimate();
            return;
          } else {
            console.log('🔄 Cache expired, fetching fresh data...');
          }
        } else {
          console.log('ℹ️ No cache found, fetching from database...');
        }
      } else {
        console.log('🔄 Force refresh requested, bypassing cache...');
        
        // 🚀 DELTA SYNC: Only fetch changes since last sync!
        const cached = await loadFromCache('inventory_data');
        if (cached && cached.lastSyncTimestamp) {
          console.log(`🔄 Delta sync: Fetching changes since ${cached.lastSyncTimestamp}...`);
          setLoadingProgress({ current: 0, total: 0, phase: 'Syncing changes...' });
          
          try {
            const deltaChanges = await fetchDeltaChanges(
              `https://${projectId}.supabase.co`,
              publicAnonKey,
              cached.lastSyncTimestamp
            );
            
            const mergeResult = mergeDeltaChanges(
              {
                products: cached.products,
                variants: cached.variants,
                locations: cached.locations,
                events: cached.events
              },
              deltaChanges
            );
            
            // Rebuild stock matrix from merged data
            setLoadingProgress({ current: 0, total: 0, phase: 'Rebuilding stock matrix...' });
            
            const productMap = new Map(mergeResult.products.map(p => [p.id, p]));
            
            // Recalculate stock from events
            const stockMap = new Map<string, number>();
            mergeResult.events?.forEach((event: any) => {
              const variantId = event.variant_id;
              const qty = event.quantity || 0;

              if (event.from_location_id) {
                const key = `${variantId}-${event.from_location_id}`;
                stockMap.set(key, (stockMap.get(key) || 0) - qty);
              }

              if (event.to_location_id) {
                const key = `${variantId}-${event.to_location_id}`;
                stockMap.set(key, (stockMap.get(key) || 0) + qty);
              }
            });
            
            // Rebuild stock data
            const rebuiltStockData: StockData[] = [];
            mergeResult.variants.forEach((variant: any) => {
              mergeResult.locations.forEach((location: any) => {
                const key = `${variant.id}-${location.id}`;
                const quantity = stockMap.get(key) || 0;

                rebuiltStockData.push({
                  variant_id: variant.id,
                  product_id: variant.product_id,
                  sku_code: variant.sku_code,
                  product_name: productMap.get(variant.product_id)?.product_name || 'Unknown',
                  size: variant.size,
                  color: variant.color,
                  location_id: location.id,
                  location_code: location.location_code,
                  location_name: location.location_name,
                  location_type: location.location_type,
                  current_quantity: quantity,
                  stock_status: quantity <= 0 ? 'OUT_OF_STOCK' : 'HEALTHY',
                });
              });
            });
            
            console.log(`✅ Rebuilt ${rebuiltStockData.length.toLocaleString()} stock records after delta sync`);
            setStockData(rebuiltStockData);
            
            const uniqueLocations = ['All Locations', ...(mergeResult.locations?.map((l: any) => l.location_name) || [])];
            setLocations(uniqueLocations);
            
            // Save updated cache
            await saveToCache('inventory_data', {
              products: mergeResult.products,
              variants: mergeResult.variants,
              locations: mergeResult.locations,
              events: mergeResult.events,
              timestamp: Date.now(),
              lastSyncTimestamp: new Date().toISOString()
            });
            
            // Show sync stats
            const statsMessage = formatSyncStats(mergeResult.stats);
            console.log(`📊 ${statsMessage}`);
            alert(statsMessage); // TODO: Replace with toast notification
            
            setLoading(false);
            getStorageEstimate();
            return;
          } catch (error) {
            console.error('❌ Delta sync failed, falling back to full sync:', error);
            // Fall through to full sync below
          }
        } else {
          console.log('ℹ️ No previous sync found, performing initial full sync...');
        }
      }

      console.log('🚀 Starting progressive data load with 10K batches...');

      // First, get the total count of products to set expectations
      const { count: totalProductCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      console.log(`📊 Total products in database: ${totalProductCount?.toLocaleString() || 'unknown'}`);

      // Step 1: Fetch ALL products using pagination (10K at a time!)
      const allProducts: any[] = [];
      let productsPage = 0;
      const pageSize = 1000; // Supabase hard limit is 1000 rows per request
      
      setLoadingProgress({ current: 0, total: totalProductCount || 0, phase: 'Fetching products...' });
      
      while (true) {
        const from = productsPage * pageSize;
        const to = from + pageSize - 1;
        
        console.log(`📥 Fetching products batch ${productsPage + 1}: rows ${from}-${to}...`);
        
        const { data: productsBatch, error: productsError } = await supabase
          .from('products')
          .select('id, product_name, category_id')
          .range(from, to)
          .limit(pageSize); // Override Supabase's default 1000 limit!

        if (productsError) {
          console.error('❌ Error fetching products batch:', productsError);
          throw productsError;
        }

        console.log(`  ✅ Received ${productsBatch?.length || 0} products`);

        if (!productsBatch || productsBatch.length === 0) {
          console.log('  ℹ️ No more products, ending pagination');
          break;
        }
        
        allProducts.push(...productsBatch);
        console.log(`  ✓ Batch ${productsPage + 1}: +${productsBatch.length.toLocaleString()} products (total: ${allProducts.length.toLocaleString()} / ${totalProductCount?.toLocaleString() || '?'})`);
        setLoadingProgress({ current: allProducts.length, total: totalProductCount || 0, phase: 'Loading products...' });
        
        // Check if we've loaded all products based on count
        if (totalProductCount && allProducts.length >= totalProductCount) {
          console.log('  ✅ All products loaded (reached total count)');
          break;
        }
        
        // Also check if this was a partial batch (safety check)
        if (productsBatch.length < pageSize) {
          console.log(`  ℹ️ Last batch (partial): got ${productsBatch.length} < ${pageSize}`);
          break; // Last page
        }
        
        productsPage++;
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      console.log(`✅ Fetched ${allProducts.length.toLocaleString()} products total`);

      // Create product lookup map
      const productMap = new Map(allProducts?.map(p => [p.id, p]) || []);

      // Step 2: Fetch ALL product variants using pagination (10K at a time!)
      const allVariants: any[] = [];
      let variantsPage = 0;
      
      setLoadingProgress({ current: 0, total: 0, phase: 'Fetching variants...' });
      
      while (true) {
        const { data: variantsBatch, error: variantsError } = await supabase
          .from('product_variants')
          .select('id, sku_code, size, color, product_id')
          .range(variantsPage * pageSize, (variantsPage + 1) * pageSize - 1)
          .limit(pageSize); // Override Supabase's default 1000 limit!

        if (variantsError) {
          console.error('❌ Error fetching variants:', variantsError);
          throw variantsError;
        }

        if (!variantsBatch || variantsBatch.length === 0) break;
        
        allVariants.push(...variantsBatch);
        console.log(`  ✓ Batch ${variantsPage + 1}: +${variantsBatch.length.toLocaleString()} variants (total: ${allVariants.length.toLocaleString()})`);
        setLoadingProgress({ current: allVariants.length, total: 0, phase: 'Loading variants...' });
        
        if (variantsBatch.length < pageSize) break; // Last page
        variantsPage++;
      }

      console.log(`✅ Fetched ${allVariants.length.toLocaleString()} product variants total`);

      // Step 3: Fetch all locations
      setLoadingProgress({ current: 0, total: 0, phase: 'Fetching locations...' });
      const { data: locationsData } = await supabase
        .from('locations')
        .select('id, location_code, location_name, location_type');

      console.log(`📍 Fetched ${locationsData?.length || 0} locations`);

      // Step 4: Fetch events to calculate stock (limited sample for performance)
      setLoadingProgress({ current: 0, total: 0, phase: 'Calculating stock...' });
      const { data: events } = await supabase
        .from('event_ledger')
        .select(`
          variant_id,
          from_location_id,
          to_location_id,
          quantity
        `)
        .limit(100000); // Increased to 100K events

      console.log(`📝 Fetched ${events?.length || 0} events for stock calculation`);

      // Step 5: Calculate stock by variant + location
      const stockMap = new Map<string, number>();

      events?.forEach((event: any) => {
        const variantId = event.variant_id;
        const qty = event.quantity || 0;

        // Deduct from source location
        if (event.from_location_id) {
          const key = `${variantId}-${event.from_location_id}`;
          stockMap.set(key, (stockMap.get(key) || 0) - qty);
        }

        // Add to destination location
        if (event.to_location_id) {
          const key = `${variantId}-${event.to_location_id}`;
          stockMap.set(key, (stockMap.get(key) || 0) + qty);
        }
      });

      // Step 6: Transform to StockData format - PROGRESSIVE DISPLAY! 🚀
      const allStockData: StockData[] = [];
      const batchDisplaySize = 10000; // Display every 10K records
      let processedCount = 0;
      
      setLoadingProgress({ current: 0, total: allVariants.length * (locationsData?.length || 1), phase: 'Building stock matrix...' });
      
      for (let i = 0; i < allVariants.length; i++) {
        const variant = allVariants[i];
        
        locationsData?.forEach((location: any) => {
          const key = `${variant.id}-${location.id}`;
          const quantity = stockMap.get(key) || 0;

          allStockData.push({
            variant_id: variant.id,
            product_id: variant.product_id,
            sku_code: variant.sku_code,
            product_name: productMap.get(variant.product_id)?.product_name || 'Unknown',
            size: variant.size,
            color: variant.color,
            location_id: location.id,
            location_code: location.location_code,
            location_name: location.location_name,
            location_type: location.location_type,
            current_quantity: quantity,
            stock_status: quantity <= 0 ? 'OUT_OF_STOCK' : 'HEALTHY',
          });

          processedCount++;
        });

        // 🔥 PROGRESSIVE DISPLAY: Update UI every 10K records!
        if ((i + 1) % (batchDisplaySize / (locationsData?.length || 1)) === 0 || i === allVariants.length - 1) {
          setStockData([...allStockData]); // Update display immediately!
          setLoadingProgress({ 
            current: processedCount, 
            total: allVariants.length * (locationsData?.length || 1), 
            phase: 'Building stock matrix...' 
          });
          
          // Allow UI to update
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      console.log(`✅ Created ${allStockData.length.toLocaleString()} stock records`);
      console.log(` Total unique products: ${new Set(allVariants?.map(v => v.product_id)).size.toLocaleString()}`);
      
      setStockData(allStockData);

      // Extract unique locations
      const uniqueLocations = ['All Locations', ...(locationsData?.map(l => l.location_name) || [])];
      setLocations(uniqueLocations);

      // 💾 SAVE TO INDEXEDDB FOR INSTANT LOADING NEXT TIME!
      console.log('💾 Saving RAW DATA to IndexedDB (products + variants + locations + events)...');
      try {
        await saveToCache('inventory_data', {
          products: allProducts,
          variants: allVariants,
          locations: locationsData || [],
          events: events || [],
          timestamp: Date.now(),
          lastSyncTimestamp: new Date().toISOString()
        });
        console.log('✅ Cached successfully! Next load will be instant.');
        getStorageEstimate();
      } catch (e) {
        console.warn('⚠️ IndexedDB save failed:', e);
      }

    } catch (error) {
      console.error('Failed to fetch stock data:', error);
    } finally {
      setLoading(false);
      setLoadingProgress({ current: 0, total: 0, phase: '' });
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  // Transform stock data into product structure
  const productInventory = useMemo(() => {
    const productMap = new Map<string, ProductStock>();

    stockData.forEach((item) => {
      const productId = item.product_id;
      const size = item.size || 'OS'; // One Size if null
      const location = item.location_name;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          productId: item.product_id,
          productName: item.product_name,
          category: 'GARMENT',
          sku: item.sku_code,
          sizes: {},
        });
      }

      const product = productMap.get(productId)!;

      if (!product.sizes[size]) {
        product.sizes[size] = {};
      }

      product.sizes[size][location] = {
        quantity: item.current_quantity,
        status: item.stock_status,
      };
    });

    return Array.from(productMap.values());
  }, [stockData]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return productInventory.filter((product) => {
      const matchesSearch = searchTerm === '' ||
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [productInventory, searchTerm]);

  // Get all unique sizes across filtered products
  const allSizes = useMemo(() => {
    const sizesSet = new Set<string>();
    filteredInventory.forEach((product) => {
      Object.keys(product.sizes).forEach((size) => sizesSet.add(size));
    });
    return Array.from(sizesSet).sort();
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

    filteredInventory.forEach((product) => {
      Object.values(product.sizes).forEach((sizeData) => {
        displayLocations.forEach((location) => {
          if (sizeData[location]) {
            const stock = sizeData[location];
            totalItems += stock.quantity;
            const status = mapStockStatus(stock.status);
            if (status === 'critical') criticalStockCount++;
            else if (status === 'low') lowStockCount++;
          }
        });
      });
    });

    return { totalItems, lowStockCount, criticalStockCount };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[var(--primary)] mx-auto mb-4 animate-spin" />
          <h3 className="text-[var(--muted-foreground)] mb-2">
            {loadingProgress.phase || 'Loading Inventory...'}
          </h3>
          {loadingProgress.total > 0 && (
            <div className="mb-2">
              <div className="w-64 h-2 bg-[var(--muted)] rounded-full overflow-hidden mx-auto">
                <div 
                  className="h-full bg-[var(--primary)] transition-all duration-300"
                  style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-[0.75rem] text-[var(--muted-foreground)] mt-2">
                {loadingProgress.current.toLocaleString()} / {loadingProgress.total.toLocaleString()}
              </p>
            </div>
          )}
          <p className="text-[0.875rem] text-[var(--muted-foreground)]">
            {loadingProgress.current > 0 
              ? `Processing ${loadingProgress.current.toLocaleString()} records...`
              : 'Fetching real-time stock data from database'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="m-0">Inventory Overview</h2>
          <div className="px-2 py-0.5 bg-[var(--primary)] text-white text-[0.625rem] rounded-full font-semibold">
            PRMAST DATA
          </div>
          <div className="text-[0.75rem] text-[var(--muted-foreground)]">
            ({productInventory.length.toLocaleString()} products, {allSizes.length} sizes)
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchStockData(true)}
            className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Big Stats Overview */}
      <div className="px-4 py-3 bg-gradient-to-r from-[var(--primary)]/5 to-[var(--primary)]/10 border-b border-[var(--border)]">
        <div className="grid grid-cols-4 gap-4">
          <Panel glass className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[0.75rem] text-[var(--muted-foreground)] font-medium uppercase">Total Products</div>
              <TrendingUp className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--primary)] tabular-nums">
              {productInventory.length.toLocaleString()}
            </div>
            <div className="text-[0.65rem] text-[var(--muted-foreground)] mt-1">
              Legacy PRMAST import
            </div>
          </Panel>

          <Panel glass className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[0.75rem] text-[var(--muted-foreground)] font-medium uppercase">Total Variants</div>
              <Package className="w-4 h-4 text-[var(--success)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--success)] tabular-nums">
              {stockData.length.toLocaleString()}
            </div>
            <div className="text-[0.65rem] text-[var(--muted-foreground)] mt-1">
              Size × Color combinations
            </div>
          </Panel>

          <Panel glass className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[0.75rem] text-[var(--muted-foreground)] font-medium uppercase">Unique Sizes</div>
              <AlertCircle className="w-4 h-4 text-[var(--warning)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--warning)] tabular-nums">
              {allSizes.length}
            </div>
            <div className="text-[0.65rem] text-[var(--muted-foreground)] mt-1">
              {allSizes.slice(0, 3).join(', ')}{allSizes.length > 3 ? '...' : ''}
            </div>
          </Panel>

          <Panel glass className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[0.75rem] text-[var(--muted-foreground)] font-medium uppercase">Locations</div>
              <Warehouse className="w-4 h-4 text-[var(--destructive)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--destructive)] tabular-nums">
              {locations.length - 1}
            </div>
            <div className="text-[0.65rem] text-[var(--muted-foreground)] mt-1">
              {locations.filter(l => l !== 'All Locations').slice(0, 2).join(', ')}
            </div>
          </Panel>
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

        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by SKU or product name..."
              className="w-full h-9 pl-10 pr-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem]"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center gap-6">
        <div className="flex items-center gap-2 text-[0.875rem]">
          <span className="text-[var(--muted-foreground)]">Total Items:</span>
          <span className="font-semibold tabular-nums">{stats.totalItems.toLocaleString()}</span>
        </div>
        <div className="w-px h-6 bg-[var(--border)]" />
        <div className="flex items-center gap-2 text-[0.875rem]">
          <AlertCircle className="w-4 h-4 text-[var(--destructive)]" />
          <span className="text-[var(--muted-foreground)]">Out of Stock:</span>
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
            {filteredInventory.length - stats.criticalStockCount - stats.lowStockCount}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="h-10 px-4 bg-[var(--muted)] border-b border-[var(--border)] flex items-center gap-6 text-[0.75rem]">
        <span className="text-[var(--muted-foreground)] font-medium">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-[var(--destructive)] rounded-[2px]" />
          <span>OUT_OF_STOCK (Negative/Zero)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-[var(--success)] rounded-[2px]" />
          <span>HEALTHY (In Stock)</span>
        </div>
      </div>

      {/* Main Content - Matrix Table */}
      <div className="flex-1 overflow-auto p-4 bg-[var(--background)]">
        <div className="inline-block min-w-full">
          {filteredInventory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((product) => (
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

                              const status = mapStockStatus(stock.status);
                              const bgColor = status === 'critical' 
                                ? 'bg-[var(--destructive)]' 
                                : 'bg-[var(--success)]';

                              return (
                                <td
                                  key={location}
                                  className={cn(
                                    'border border-[var(--border)] px-3 py-2 text-center',
                                    bgColor,
                                    'text-white font-semibold tabular-nums'
                                  )}
                                  title={`Qty: ${stock.quantity} | Status: ${stock.status}`}
                                >
                                  {stock.quantity}
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

          {filteredInventory.length > itemsPerPage && (
            <div className="text-center py-4 text-[0.875rem] text-[var(--muted-foreground)]">
              Showing {currentPage * itemsPerPage > filteredInventory.length ? filteredInventory.length : currentPage * itemsPerPage} of {filteredInventory.length} total. Use search to find specific items.
            </div>
          )}

          {filteredInventory.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-20" />
              <h3 className="text-[var(--muted-foreground)] mb-2">No products found</h3>
              <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                Try adjusting your search terms or import some inventory data
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
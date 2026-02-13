/**
 * 🚀 COMPLETE OFFLINE-FIRST EXAMPLE
 * 
 * This is a working example showing all three features:
 * 1. Offline mutations (edit while offline)
 * 2. Conflict resolution (handle simultaneous changes)
 * 3. Real-time sync (automatic background syncing)
 * 
 * Copy this pattern to implement offline-first in any component!
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Import offline-first utilities
import { queueMutation, syncMutations, getMutationStats, clearSyncedMutations } from '@/app/utils/mutation-queue';
import { detectConflicts, resolveConflict, type Conflict, type ConflictResolution } from '@/app/utils/conflict-resolver';
import { RealtimeSyncManager, type SyncStatus as SyncStatusType } from '@/app/utils/realtime-sync';
import { fetchDeltaChanges, mergeDeltaChanges } from '@/app/utils/delta-sync';

// Import UI components
import { SyncStatus } from '@/app/components/SyncStatus';
import { ConflictDialog } from '@/app/components/ConflictDialog';
import { Save, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface Product {
  id: string;
  product_name: string;
  base_price: number;
  updated_at: string;
}

export function OfflineFirstExample() {
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>('offline');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [realtimeManager, setRealtimeManager] = useState<RealtimeSyncManager | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize: Load data and setup real-time sync
  useEffect(() => {
    loadProducts();
    setupRealtimeSync();
    updatePendingCount();
    
    return () => {
      realtimeManager?.destroy();
    };
  }, []);

  // Load products from Supabase
  const loadProducts = async () => {
    try {
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
      
      const { data, error } = await supabase
        .from('products')
        .select('id, product_name, base_price, updated_at')
        .limit(10); // Just show first 10 for demo
      
      if (error) throw error;
      
      setProducts(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load products:', error);
      setLoading(false);
    }
  };

  // Setup real-time sync
  const setupRealtimeSync = () => {
    const manager = new RealtimeSyncManager({
      supabaseUrl: `https://${projectId}.supabase.co`,
      supabaseKey: publicAnonKey,
      tables: ['products'],
      autoSync: true,
      syncInterval: 30000, // Auto-sync every 30 seconds
      
      onStatusChange: (status) => {
        console.log('📊 Sync status:', status);
        setSyncStatus(status);
      },
      
      onDataChange: async (table, payload) => {
        console.log('📡 Real-time change detected:', payload);
        
        // Trigger sync when change detected
        await handleSync();
      },
      
      onError: (error) => {
        console.error('❌ Sync error:', error);
        setSyncStatus('error');
      }
    });
    
    manager.start();
    setRealtimeManager(manager);
  };

  // Update pending mutation count
  const updatePendingCount = async () => {
    const stats = await getMutationStats();
    setPendingCount(stats.pending + stats.failed);
  };

  // Handle sync (push + pull)
  const handleSync = async () => {
    if (!navigator.onLine) {
      console.warn('⚠️ Offline - changes will sync when back online');
      return;
    }
    
    setSyncStatus('syncing');
    
    try {
      // STEP 1: Push pending mutations to server
      console.log('🔄 Pushing pending mutations...');
      const pushResult = await syncMutations(
        `https://${projectId}.supabase.co`,
        publicAnonKey,
        (current, total) => {
          console.log(`  Syncing ${current}/${total} mutations...`);
        }
      );
      
      console.log(`✅ Pushed: ${pushResult.synced} synced, ${pushResult.failed} failed`);
      
      // STEP 2: Handle conflicts
      if (pushResult.conflicts.length > 0) {
        console.warn(`⚠️ ${pushResult.conflicts.length} conflicts detected`);
        
        // Convert to Conflict format
        const formattedConflicts: Conflict[] = pushResult.conflicts.map(c => {
          const fields = detectConflicts(c.mutation.data, c.remoteData);
          return {
            mutation: c.mutation,
            localData: c.mutation.data,
            remoteData: c.remoteData,
            table: c.mutation.table,
            recordId: c.mutation.recordId || '',
            fields
          };
        });
        
        setConflicts(formattedConflicts);
        setSyncStatus('online');
        return; // Wait for user to resolve conflicts
      }
      
      // STEP 3: Pull latest changes (delta sync)
      console.log('🔄 Pulling latest changes...');
      const lastSyncTimestamp = localStorage.getItem('lastSyncTimestamp') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const deltaChanges = await fetchDeltaChanges(
        `https://${projectId}.supabase.co`,
        publicAnonKey,
        lastSyncTimestamp
      );
      
      // Update products list with changes
      if (deltaChanges.products && deltaChanges.products.length > 0) {
        console.log(`📥 Received ${deltaChanges.products.length} product changes`);
        
        setProducts(prevProducts => {
          const updatedProducts = [...prevProducts];
          
          deltaChanges.products.forEach(change => {
            const index = updatedProducts.findIndex(p => p.id === change.id);
            if (change.deleted_at) {
              // Remove deleted products
              if (index !== -1) {
                updatedProducts.splice(index, 1);
              }
            } else if (index !== -1) {
              // Update existing
              updatedProducts[index] = { ...updatedProducts[index], ...change };
            } else {
              // Add new
              updatedProducts.push(change as Product);
            }
          });
          
          return updatedProducts;
        });
      }
      
      // STEP 4: Update sync timestamp
      const newSyncTime = new Date();
      localStorage.setItem('lastSyncTimestamp', newSyncTime.toISOString());
      setLastSyncTime(newSyncTime);
      
      // STEP 5: Cleanup synced mutations
      await clearSyncedMutations();
      
      // Update pending count
      await updatePendingCount();
      
      setSyncStatus('online');
      console.log('✅ Sync complete!');
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      setSyncStatus('error');
    }
  };

  // Edit product (offline-safe!)
  const handleStartEdit = (product: Product) => {
    setEditingId(product.id);
    setEditValue(product.product_name);
  };

  const handleSaveEdit = async (productId: string) => {
    if (!editValue.trim()) return;
    
    try {
      // Queue the mutation (works offline!)
      await queueMutation({
        type: 'UPDATE',
        table: 'products',
        recordId: productId,
        data: {
          id: productId,
          product_name: editValue,
          updated_at: new Date().toISOString()
        }
      });
      
      // Optimistic update (update UI immediately)
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.id === productId
            ? { ...p, product_name: editValue, updated_at: new Date().toISOString() }
            : p
        )
      );
      
      setEditingId(null);
      
      // Update pending count
      await updatePendingCount();
      
      // Try to sync if online
      if (navigator.onLine) {
        console.log('🌐 Online - syncing immediately...');
        await handleSync();
      } else {
        console.log('📴 Offline - queued for later sync');
      }
      
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save change. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Resolve conflict
  const handleResolveConflict = async (index: number, resolution: ConflictResolution, mergedData?: Record<string, any>) => {
    const conflict = conflicts[index];
    
    try {
      // Apply resolution
      const resolvedData = resolveConflict(conflict, resolution, mergedData);
      
      // Push to server
      const response = await fetch(`https://${projectId}.supabase.co/rest/v1/${conflict.table}?id=eq.${conflict.recordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${publicAnonKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(resolvedData)
      });
      
      if (!response.ok) throw new Error('Failed to save resolution');
      
      console.log('✅ Conflict resolved:', resolution);
      
      // Remove from conflicts list
      setConflicts(conflicts.filter((_, i) => i !== index));
      
      // Refresh products
      await loadProducts();
      
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      alert('Failed to resolve conflict. Please try again.');
    }
  };

  const handleResolveAllConflicts = async (resolution: ConflictResolution) => {
    for (let i = 0; i < conflicts.length; i++) {
      await handleResolveConflict(i, resolution);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading products...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header with Sync Status */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">🚀 Offline-First Example</h1>
          <p className="text-[0.875rem] text-[var(--muted-foreground)]">
            Edit products while offline. Changes sync automatically when back online!
          </p>
        </div>
        
        <SyncStatus 
          status={syncStatus}
          pendingCount={pendingCount}
          lastSyncTime={lastSyncTime}
          onSyncNow={handleSync}
        />
      </div>

      {/* Network Status Banner */}
      <div className={`mb-6 p-4 rounded-lg border ${
        navigator.onLine 
          ? 'bg-[var(--success)]/10 border-[var(--success)]/20' 
          : 'bg-[var(--warning)]/10 border-[var(--warning)]/20'
      }`}>
        <div className="flex items-center gap-2">
          {navigator.onLine ? (
            <>
              <Wifi className="w-5 h-5 text-[var(--success)]" />
              <span className="font-semibold text-[var(--success)]">Online</span>
              <span className="text-[0.875rem] text-[var(--muted-foreground)]">
                - Changes sync immediately
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-[var(--warning)]" />
              <span className="font-semibold text-[var(--warning)]">Offline</span>
              <span className="text-[0.875rem] text-[var(--muted-foreground)]">
                - {pendingCount} change{pendingCount === 1 ? '' : 's'} pending sync
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleSync}
          disabled={!navigator.onLine || syncStatus === 'syncing'}
          className="h-9 px-4 rounded-[4px] bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
          {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
        </button>
        
        <button
          onClick={() => {
            // Simulate going offline
            console.log('🧪 Test: Go offline in DevTools → Network tab');
            alert('To test offline mode:\n1. Open DevTools (F12)\n2. Go to Network tab\n3. Select "Offline" throttling\n4. Edit a product\n5. Go back online\n6. Click "Sync Now"');
          }}
          className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)]"
        >
          Test Offline Mode
        </button>
      </div>

      {/* Products List */}
      <div className="bg-white border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)] font-semibold">
          Products ({products.length})
        </div>
        
        <div className="divide-y divide-[var(--border)]">
          {products.map(product => (
            <div key={product.id} className="px-4 py-3 hover:bg-[var(--secondary)] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {editingId === product.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 h-9 px-3 border border-[var(--border)] rounded-[4px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(product.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <button
                        onClick={() => handleSaveEdit(product.id)}
                        className="h-9 px-4 rounded-[4px] bg-[var(--success)] text-white hover:bg-[var(--success)]/90"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold">{product.product_name}</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        Price: ₹{product.base_price?.toLocaleString() || 0} • Updated: {new Date(product.updated_at).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </div>
                
                {editingId !== product.id && (
                  <button
                    onClick={() => handleStartEdit(product)}
                    className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem]"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conflict Resolution Dialog */}
      {conflicts.length > 0 && (
        <ConflictDialog
          conflicts={conflicts}
          onResolve={handleResolveConflict}
          onResolveAll={handleResolveAllConflicts}
          onClose={() => setConflicts([])}
        />
      )}

      {/* Instructions */}
      <div className="mt-8 p-6 bg-[var(--muted)] rounded-lg">
        <h3 className="font-semibold mb-3">🧪 How to Test:</h3>
        <ol className="space-y-2 text-[0.875rem] text-[var(--muted-foreground)]">
          <li><strong>1. Offline Editing:</strong> Go offline (DevTools → Network → Offline), edit a product, go back online, click "Sync Now"</li>
          <li><strong>2. Conflict Resolution:</strong> Edit a product offline, then update same product in Supabase, sync → conflict dialog appears</li>
          <li><strong>3. Real-time Sync:</strong> Update a product in Supabase SQL Editor → app auto-syncs within 30 seconds</li>
          <li><strong>4. Pending Changes:</strong> Make multiple edits offline → see pending count in sync status badge</li>
        </ol>
      </div>
    </div>
  );
}

/**
 * 🔄 OFFLINE MUTATION QUEUE
 * 
 * Tracks all changes made while offline and syncs them when back online.
 * Supports: INSERT, UPDATE, DELETE operations with retry logic.
 */

export interface Mutation {
  id: string;
  timestamp: number;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  recordId?: string; // For UPDATE/DELETE
  data: Record<string, any>;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  error?: string;
}

const DB_NAME = 'RetailInventoryDB';
const MUTATION_STORE = 'mutation_queue';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Bump version to add new store
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create mutation queue store if it doesn't exist
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        const store = db.createObjectStore(MUTATION_STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('✅ Created mutation_queue store');
      }
      
      // Create cache store if it doesn't exist (for backward compat)
      if (!db.objectStoreNames.contains('inventory_cache')) {
        db.createObjectStore('inventory_cache');
      }
    };
  });
}

/**
 * Add a mutation to the queue
 */
export async function queueMutation(mutation: Omit<Mutation, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<string> {
  const db = await openDB();
  const id = `${mutation.table}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const fullMutation: Mutation = {
    id,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
    ...mutation,
  };
  
  const transaction = db.transaction([MUTATION_STORE], 'readwrite');
  const store = transaction.objectStore(MUTATION_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.add(fullMutation);
    request.onsuccess = () => {
      console.log(`✅ Queued ${mutation.type} mutation for ${mutation.table}:`, mutation.data);
      resolve(id);
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get all pending mutations
 */
export async function getPendingMutations(): Promise<Mutation[]> {
  const db = await openDB();
  const transaction = db.transaction([MUTATION_STORE], 'readonly');
  const store = transaction.objectStore(MUTATION_STORE);
  const index = store.index('status');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll('pending');
    request.onsuccess = () => {
      const mutations = request.result as Mutation[];
      resolve(mutations.sort((a, b) => a.timestamp - b.timestamp)); // Oldest first
    };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update mutation status
 */
export async function updateMutationStatus(
  mutationId: string, 
  status: Mutation['status'], 
  error?: string
): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([MUTATION_STORE], 'readwrite');
  const store = transaction.objectStore(MUTATION_STORE);
  
  return new Promise((resolve, reject) => {
    const getRequest = store.get(mutationId);
    
    getRequest.onsuccess = () => {
      const mutation = getRequest.result as Mutation;
      if (!mutation) {
        reject(new Error(`Mutation ${mutationId} not found`));
        return;
      }
      
      mutation.status = status;
      if (error) mutation.error = error;
      if (status === 'failed') mutation.retryCount++;
      
      const putRequest = store.put(mutation);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Remove synced mutations (cleanup)
 */
export async function clearSyncedMutations(): Promise<number> {
  const db = await openDB();
  const transaction = db.transaction([MUTATION_STORE], 'readwrite');
  const store = transaction.objectStore(MUTATION_STORE);
  const index = store.index('status');
  
  return new Promise((resolve, reject) => {
    const request = index.openCursor(IDBKeyRange.only('synced'));
    let deletedCount = 0;
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        console.log(`🧹 Cleared ${deletedCount} synced mutations`);
        resolve(deletedCount);
      }
    };
    
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get mutation queue stats
 */
export async function getMutationStats(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
  total: number;
}> {
  const db = await openDB();
  const transaction = db.transaction([MUTATION_STORE], 'readonly');
  const store = transaction.objectStore(MUTATION_STORE);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    
    request.onsuccess = () => {
      const mutations = request.result as Mutation[];
      const stats = {
        pending: mutations.filter(m => m.status === 'pending').length,
        syncing: mutations.filter(m => m.status === 'syncing').length,
        failed: mutations.filter(m => m.status === 'failed').length,
        total: mutations.length,
      };
      resolve(stats);
    };
    
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Execute mutations on the server
 */
export async function syncMutations(
  supabaseUrl: string,
  supabaseKey: string,
  onProgress?: (current: number, total: number) => void
): Promise<{
  synced: number;
  failed: number;
  conflicts: Array<{ mutation: Mutation; remoteData: any }>;
}> {
  const pendingMutations = await getPendingMutations();
  
  if (pendingMutations.length === 0) {
    console.log('✅ No pending mutations to sync');
    return { synced: 0, failed: 0, conflicts: [] };
  }
  
  console.log(`🔄 Syncing ${pendingMutations.length} mutations...`);
  
  let synced = 0;
  let failed = 0;
  const conflicts: Array<{ mutation: Mutation; remoteData: any }> = [];
  
  for (let i = 0; i < pendingMutations.length; i++) {
    const mutation = pendingMutations[i];
    onProgress?.(i + 1, pendingMutations.length);
    
    try {
      await updateMutationStatus(mutation.id, 'syncing');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/${mutation.table}`, {
        method: getMutationMethod(mutation),
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=representation',
        },
        body: mutation.type === 'DELETE' ? undefined : JSON.stringify(mutation.data),
      });
      
      if (response.ok) {
        await updateMutationStatus(mutation.id, 'synced');
        synced++;
        console.log(`✅ Synced ${mutation.type} on ${mutation.table}`);
      } else if (response.status === 409) {
        // Conflict detected!
        const remoteData = await response.json();
        conflicts.push({ mutation, remoteData });
        await updateMutationStatus(mutation.id, 'failed', 'Conflict detected');
        failed++;
        console.warn(`⚠️ Conflict detected for ${mutation.table}:`, mutation.recordId);
      } else {
        const errorText = await response.text();
        await updateMutationStatus(mutation.id, 'failed', errorText);
        failed++;
        console.error(`❌ Failed to sync ${mutation.type} on ${mutation.table}:`, errorText);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await updateMutationStatus(mutation.id, 'failed', errorMessage);
      failed++;
      console.error(`❌ Error syncing mutation:`, error);
    }
  }
  
  console.log(`📊 Sync complete: ${synced} synced, ${failed} failed, ${conflicts.length} conflicts`);
  
  return { synced, failed, conflicts };
}

function getMutationMethod(mutation: Mutation): string {
  switch (mutation.type) {
    case 'INSERT': return 'POST';
    case 'UPDATE': return 'PATCH';
    case 'DELETE': return 'DELETE';
  }
}

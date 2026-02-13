/**
 * 🔴 REAL-TIME SYNC MANAGER
 * 
 * Manages real-time synchronization using Supabase Realtime.
 * Auto-syncs changes in background and handles network state.
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

export interface RealtimeSyncOptions {
  supabaseUrl: string;
  supabaseKey: string;
  tables: string[];
  onStatusChange?: (status: SyncStatus) => void;
  onDataChange?: (table: string, payload: any) => void;
  onError?: (error: Error) => void;
  autoSync?: boolean;
  syncInterval?: number; // in milliseconds
}

export class RealtimeSyncManager {
  private client: ReturnType<typeof createClient>;
  private channels: RealtimeChannel[] = [];
  private status: SyncStatus = 'offline';
  private options: RealtimeSyncOptions;
  private syncIntervalId?: number;
  private networkListener?: () => void;
  
  constructor(options: RealtimeSyncOptions) {
    this.options = options;
    this.client = createClient(options.supabaseUrl, options.supabaseKey);
    
    // Listen to network status changes
    this.setupNetworkListener();
    
    // Start auto-sync if enabled
    if (options.autoSync) {
      this.startAutoSync(options.syncInterval || 30000); // Default 30 seconds
    }
  }
  
  /**
   * Start listening to real-time changes
   */
  async start(): Promise<void> {
    console.log('🔴 Starting real-time sync...');
    
    try {
      // Subscribe to each table
      for (const table of this.options.tables) {
        const channel = this.client
          .channel(`public:${table}`)
          .on(
            'postgres_changes',
            {
              event: '*', // INSERT, UPDATE, DELETE
              schema: 'public',
              table: table,
            },
            (payload) => {
              console.log(`📡 Real-time change detected in ${table}:`, payload);
              this.options.onDataChange?.(table, payload);
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log(`✅ Subscribed to ${table} changes`);
              this.setStatus('online');
            } else if (status === 'CHANNEL_ERROR') {
              console.error(`❌ Error subscribing to ${table}`);
              this.setStatus('error');
            }
          });
        
        this.channels.push(channel);
      }
    } catch (error) {
      console.error('❌ Failed to start real-time sync:', error);
      this.setStatus('error');
      this.options.onError?.(error as Error);
    }
  }
  
  /**
   * Stop listening to real-time changes
   */
  async stop(): Promise<void> {
    console.log('⏹️ Stopping real-time sync...');
    
    for (const channel of this.channels) {
      await this.client.removeChannel(channel);
    }
    
    this.channels = [];
    this.setStatus('offline');
    
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
    }
  }
  
  /**
   * Start auto-sync timer
   */
  private startAutoSync(interval: number): void {
    console.log(`⏰ Starting auto-sync every ${interval / 1000}s`);
    
    this.syncIntervalId = window.setInterval(() => {
      if (this.status === 'online') {
        console.log('🔄 Auto-sync triggered');
        this.options.onDataChange?.('_auto_sync', { type: 'AUTO_SYNC' });
      }
    }, interval);
  }
  
  /**
   * Setup network state listener
   */
  private setupNetworkListener(): void {
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        console.log('🌐 Network: ONLINE');
        if (this.status === 'offline') {
          this.setStatus('online');
          // Reconnect realtime if was running
          if (this.channels.length === 0 && this.options.autoSync) {
            this.start();
          }
        }
      } else {
        console.log('🌐 Network: OFFLINE');
        this.setStatus('offline');
      }
    };
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
    
    this.networkListener = () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }
  
  /**
   * Update sync status
   */
  private setStatus(status: SyncStatus): void {
    if (this.status !== status) {
      this.status = status;
      console.log(`📊 Sync status changed: ${status}`);
      this.options.onStatusChange?.(status);
    }
  }
  
  /**
   * Get current status
   */
  getStatus(): SyncStatus {
    return this.status;
  }
  
  /**
   * Manual sync trigger
   */
  async triggerSync(): Promise<void> {
    if (this.status !== 'online') {
      console.warn('⚠️ Cannot sync while offline');
      return;
    }
    
    this.setStatus('syncing');
    this.options.onDataChange?.('_manual_sync', { type: 'MANUAL_SYNC' });
    
    // Status will be reset by the sync completion handler
    setTimeout(() => {
      if (this.status === 'syncing') {
        this.setStatus('online');
      }
    }, 5000);
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    this.networkListener?.();
  }
}

/**
 * Helper: Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Helper: Wait for online status
 */
export function waitForOnline(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (navigator.onLine) {
      resolve();
      return;
    }
    
    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onlineListener);
      reject(new Error('Network timeout'));
    }, timeout);
    
    const onlineListener = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', onlineListener);
      resolve();
    };
    
    window.addEventListener('online', onlineListener);
  });
}

/**
 * Helper: Get network information
 */
export function getNetworkInfo(): {
  online: boolean;
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
} {
  const nav = navigator as any;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
  
  return {
    online: navigator.onLine,
    type: connection?.type,
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    rtt: connection?.rtt,
  };
}

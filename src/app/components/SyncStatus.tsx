/**
 * 📊 SYNC STATUS INDICATOR
 * 
 * Shows real-time sync status, network state, and pending mutations.
 * Displays in top-right corner with offline/online indicators.
 */

import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock,
  X,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import type { SyncStatus as SyncStatusType } from '@/app/utils/realtime-sync';

interface SyncStatusProps {
  status: SyncStatusType;
  pendingCount?: number;
  lastSyncTime?: Date;
  onSyncNow?: () => void;
  className?: string;
}

export function SyncStatus({ 
  status, 
  pendingCount = 0, 
  lastSyncTime,
  onSyncNow,
  className 
}: SyncStatusProps) {
  const [expanded, setExpanded] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const getStatusConfig = () => {
    if (!online) {
      return {
        icon: WifiOff,
        color: 'text-[var(--destructive)]',
        bgColor: 'bg-[var(--destructive)]/10',
        label: 'Offline',
        description: 'No internet connection',
      };
    }
    
    switch (status) {
      case 'online':
        return {
          icon: Cloud,
          color: 'text-[var(--success)]',
          bgColor: 'bg-[var(--success)]/10',
          label: 'Online',
          description: 'Connected and synced',
        };
      case 'syncing':
        return {
          icon: RefreshCw,
          color: 'text-[var(--primary)]',
          bgColor: 'bg-[var(--primary)]/10',
          label: 'Syncing',
          description: 'Synchronizing changes...',
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-[var(--destructive)]',
          bgColor: 'bg-[var(--destructive)]/10',
          label: 'Error',
          description: 'Sync error occurred',
        };
      default:
        return {
          icon: CloudOff,
          color: 'text-[var(--muted-foreground)]',
          bgColor: 'bg-[var(--muted)]',
          label: 'Offline',
          description: 'Working offline',
        };
    }
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;
  
  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    
    const now = Date.now();
    const diff = now - lastSyncTime.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return lastSyncTime.toLocaleDateString();
  };
  
  return (
    <div className={cn('relative', className)}>
      {/* Compact Indicator */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all',
          config.bgColor,
          config.color,
          'border-current/20',
          'hover:scale-105',
          'cursor-pointer'
        )}
        title={config.description}
      >
        <Icon className={cn('w-4 h-4', status === 'syncing' && 'animate-spin')} />
        <span className="text-[0.75rem] font-medium">{config.label}</span>
        
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.5 bg-[var(--warning)] text-white text-[0.625rem] rounded-full font-bold">
            {pendingCount}
          </span>
        )}
      </button>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className={cn('px-4 py-3 border-b border-[var(--border)] flex items-center justify-between', config.bgColor)}>
            <div className="flex items-center gap-2">
              <Icon className={cn('w-5 h-5', config.color, status === 'syncing' && 'animate-spin')} />
              <div>
                <div className={cn('font-semibold', config.color)}>{config.label}</div>
                <div className="text-[0.75rem] text-[var(--muted-foreground)]">{config.description}</div>
              </div>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="p-1 hover:bg-black/5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Stats */}
          <div className="p-4 space-y-3">
            {/* Network Status */}
            <div className="flex items-center justify-between text-[0.875rem]">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                {online ? (
                  <Wifi className="w-4 h-4 text-[var(--success)]" />
                ) : (
                  <WifiOff className="w-4 h-4 text-[var(--destructive)]" />
                )}
                <span>Network</span>
              </div>
              <span className={cn('font-semibold', online ? 'text-[var(--success)]' : 'text-[var(--destructive)]')}>
                {online ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Pending Changes */}
            <div className="flex items-center justify-between text-[0.875rem]">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <Clock className="w-4 h-4" />
                <span>Pending Changes</span>
              </div>
              <span className={cn('font-semibold', pendingCount > 0 ? 'text-[var(--warning)]' : 'text-[var(--muted-foreground)]')}>
                {pendingCount}
              </span>
            </div>
            
            {/* Last Sync */}
            <div className="flex items-center justify-between text-[0.875rem]">
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <CheckCircle className="w-4 h-4" />
                <span>Last Sync</span>
              </div>
              <span className="font-semibold text-[var(--muted-foreground)]">
                {formatLastSync()}
              </span>
            </div>
          </div>
          
          {/* Actions */}
          {online && onSyncNow && (
            <div className="border-t border-[var(--border)] p-3">
              <button
                onClick={() => {
                  onSyncNow();
                  setExpanded(false);
                }}
                disabled={status === 'syncing'}
                className={cn(
                  'w-full h-9 px-4 rounded-[4px] text-[0.875rem] font-medium flex items-center justify-center gap-2',
                  'bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <RefreshCw className={cn('w-4 h-4', status === 'syncing' && 'animate-spin')} />
                {status === 'syncing' ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          )}
          
          {/* Offline Notice */}
          {!online && (
            <div className="border-t border-[var(--border)] p-3 bg-[var(--warning)]/10">
              <div className="flex items-start gap-2 text-[0.75rem]">
                <AlertCircle className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[var(--warning)]">Working Offline</div>
                  <div className="text-[var(--muted-foreground)] mt-1">
                    Your changes are saved locally and will sync automatically when you're back online.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple status badge (non-interactive)
 */
export function SyncStatusBadge({ status, className }: { status: SyncStatusType; className?: string }) {
  const getConfig = () => {
    switch (status) {
      case 'online':
        return { color: 'bg-[var(--success)]', label: 'Online' };
      case 'offline':
        return { color: 'bg-[var(--muted-foreground)]', label: 'Offline' };
      case 'syncing':
        return { color: 'bg-[var(--primary)]', label: 'Syncing' };
      case 'error':
        return { color: 'bg-[var(--destructive)]', label: 'Error' };
    }
  };
  
  const config = getConfig();
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('w-2 h-2 rounded-full', config.color, status === 'syncing' && 'animate-pulse')} />
      <span className="text-[0.75rem] text-[var(--muted-foreground)]">{config.label}</span>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Panel } from '@/app/components/Panel';
import { DataTable, Column } from '@/app/components/DataTable';
import { Badge } from '@/app/components/Badge';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Database,
  ShoppingBag,
  MessageSquare,
  Cloud,
  Activity,
  Server,
  Wifi,
  WifiOff,
  Info,
  Filter,
  Download,
  Zap,
  Circle,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface SyncEvent {
  id: string;
  timestamp: string;
  system: 'database' | 'amazon' | 'whatsapp' | 'cloud';
  operation: string;
  status: 'success' | 'error' | 'warning' | 'pending' | 'in-progress';
  message: string;
  details?: string;
  recordsProcessed?: number;
  duration?: number;
}

interface SystemStatus {
  name: string;
  icon: React.ReactNode;
  status: 'online' | 'offline' | 'syncing';
  lastSync: string;
  nextSync?: string;
  pendingCount: number;
  successRate: number;
  color: string;
}

const mockSyncEvents: SyncEvent[] = [
  {
    id: 'evt-001',
    timestamp: '2026-01-30 10:45:32',
    system: 'database',
    operation: 'Stock Level Sync',
    status: 'success',
    message: 'Successfully synced stock levels across all locations',
    recordsProcessed: 1250,
    duration: 2.3,
  },
  {
    id: 'evt-002',
    timestamp: '2026-01-30 10:45:15',
    system: 'amazon',
    operation: 'Order Import',
    status: 'success',
    message: 'Imported new orders from Amazon Seller Central',
    recordsProcessed: 15,
    duration: 5.7,
  },
  {
    id: 'evt-003',
    timestamp: '2026-01-30 10:44:50',
    system: 'whatsapp',
    operation: 'Message Queue Sync',
    status: 'success',
    message: 'Processed outgoing message queue',
    recordsProcessed: 8,
    duration: 1.2,
  },
  {
    id: 'evt-004',
    timestamp: '2026-01-30 10:30:12',
    system: 'amazon',
    operation: 'Inventory Update',
    status: 'error',
    message: 'Failed to update inventory on Amazon',
    details: 'API rate limit exceeded. Retry scheduled in 5 minutes.',
    recordsProcessed: 0,
    duration: 0.5,
  },
  {
    id: 'evt-005',
    timestamp: '2026-01-30 10:29:45',
    system: 'cloud',
    operation: 'Backup',
    status: 'success',
    message: 'Cloud backup completed successfully',
    details: 'Backup size: 2.4 GB, Compressed: 1.1 GB',
    recordsProcessed: 45230,
    duration: 45.2,
  },
  {
    id: 'evt-006',
    timestamp: '2026-01-30 10:15:30',
    system: 'database',
    operation: 'Sales Transaction Sync',
    status: 'warning',
    message: 'Sync completed with warnings',
    details: '3 transactions had duplicate checks, skipped for manual review',
    recordsProcessed: 47,
    duration: 3.1,
  },
  {
    id: 'evt-007',
    timestamp: '2026-01-30 10:15:00',
    system: 'whatsapp',
    operation: 'Auto-Reply Rules Update',
    status: 'success',
    message: 'Updated auto-reply rules configuration',
    recordsProcessed: 5,
    duration: 0.8,
  },
  {
    id: 'evt-008',
    timestamp: '2026-01-30 10:00:15',
    system: 'amazon',
    operation: 'Settlement Report Import',
    status: 'success',
    message: 'Imported Amazon settlement report',
    recordsProcessed: 52,
    duration: 8.3,
  },
  {
    id: 'evt-009',
    timestamp: '2026-01-30 09:45:20',
    system: 'database',
    operation: 'Inventory Reconciliation',
    status: 'success',
    message: 'Completed inventory reconciliation',
    recordsProcessed: 3420,
    duration: 12.5,
  },
  {
    id: 'evt-010',
    timestamp: '2026-01-30 09:30:00',
    system: 'cloud',
    operation: 'Configuration Sync',
    status: 'success',
    message: 'Synced system configuration to cloud',
    recordsProcessed: 150,
    duration: 2.1,
  },
];

const systemStatuses: SystemStatus[] = [
  {
    name: 'Database',
    icon: <Database className="w-5 h-5" />,
    status: 'online',
    lastSync: '2 minutes ago',
    nextSync: 'In 13 minutes',
    pendingCount: 0,
    successRate: 99.8,
    color: 'text-green-600',
  },
  {
    name: 'Amazon',
    icon: <ShoppingBag className="w-5 h-5" />,
    status: 'syncing',
    lastSync: '5 minutes ago',
    nextSync: 'In progress',
    pendingCount: 12,
    successRate: 95.2,
    color: 'text-blue-600',
  },
  {
    name: 'WhatsApp',
    icon: <MessageSquare className="w-5 h-5" />,
    status: 'online',
    lastSync: '1 minute ago',
    nextSync: 'In 4 minutes',
    pendingCount: 3,
    successRate: 98.5,
    color: 'text-green-600',
  },
  {
    name: 'Cloud Backup',
    icon: <Cloud className="w-5 h-5" />,
    status: 'online',
    lastSync: '16 minutes ago',
    nextSync: 'In 44 minutes',
    pendingCount: 0,
    successRate: 100.0,
    color: 'text-purple-600',
  },
];

export function SyncStatusPanel() {
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'warning' | 'pending'>('all');
  const [systemFilter, setSystemFilter] = useState<'all' | 'database' | 'amazon' | 'whatsapp' | 'cloud'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter events
  const filteredEvents = mockSyncEvents.filter((event) => {
    const matchesStatus = filter === 'all' || event.status === filter;
    const matchesSystem = systemFilter === 'all' || event.system === systemFilter;
    return matchesStatus && matchesSystem;
  });

  // Calculate statistics
  const totalEvents = mockSyncEvents.length;
  const successCount = mockSyncEvents.filter((e) => e.status === 'success').length;
  const errorCount = mockSyncEvents.filter((e) => e.status === 'error').length;
  const warningCount = mockSyncEvents.filter((e) => e.status === 'warning').length;
  const pendingCount = systemStatuses.reduce((sum, s) => sum + s.pendingCount, 0);

  // Sync Event Columns
  const syncColumns: Column<SyncEvent>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      width: '150px',
      render: (value) => (
        <div className="font-mono text-[0.75rem] text-[var(--muted-foreground)]">{value}</div>
      ),
    },
    {
      key: 'system',
      header: 'System',
      width: '120px',
      render: (value) => {
        const icons = {
          database: <Database className="w-3.5 h-3.5 mr-1" />,
          amazon: <ShoppingBag className="w-3.5 h-3.5 mr-1" />,
          whatsapp: <MessageSquare className="w-3.5 h-3.5 mr-1" />,
          cloud: <Cloud className="w-3.5 h-3.5 mr-1" />,
        };
        return (
          <Badge variant="secondary" className="capitalize">
            {icons[value as keyof typeof icons]}
            {value}
          </Badge>
        );
      },
    },
    {
      key: 'operation',
      header: 'Operation',
      width: '180px',
      render: (value) => <span className="font-medium text-[0.875rem]">{value}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (value) => {
        if (value === 'success') {
          return (
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Success
            </Badge>
          );
        } else if (value === 'error') {
          return (
            <Badge variant="destructive">
              <XCircle className="w-3 h-3 mr-1" />
              Error
            </Badge>
          );
        } else if (value === 'warning') {
          return (
            <Badge variant="warning">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Warning
            </Badge>
          );
        } else if (value === 'in-progress') {
          return (
            <Badge variant="info">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Running
            </Badge>
          );
        } else {
          return (
            <Badge variant="secondary">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          );
        }
      },
    },
    {
      key: 'message',
      header: 'Message',
      render: (value, row) => (
        <div>
          <div className="text-[0.875rem]">{value}</div>
          {row.details && (
            <div className="text-[0.75rem] text-[var(--muted-foreground)] mt-1">{row.details}</div>
          )}
        </div>
      ),
    },
    {
      key: 'recordsProcessed',
      header: 'Records',
      width: '90px',
      render: (value) => (
        <span className="tabular-nums text-[0.875rem]">{value !== undefined ? value : '-'}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      width: '90px',
      render: (value) => (
        <span className="tabular-nums text-[0.75rem] text-[var(--muted-foreground)]">
          {value !== undefined ? `${value}s` : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="m-0">Sync Status & Diagnostics</h2>
          <Badge variant="info" className="font-mono">
            <Server className="w-3 h-3 mr-1" />
            Real-time
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-[0.875rem] cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span className="text-[var(--muted-foreground)]">Auto-refresh</span>
          </label>
          <button
            onClick={() => setLastRefresh(new Date())}
            className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="h-9 px-4 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[0.875rem] font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-[var(--background)]">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* System Status Overview */}
          <div className="grid grid-cols-4 gap-4">
            {systemStatuses.map((system) => (
              <Panel key={system.name} glass>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn('p-2 bg-[var(--muted)] rounded-[4px]', system.color)}>
                      {system.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-[0.875rem]">{system.name}</div>
                      <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                        {system.lastSync}
                      </div>
                    </div>
                  </div>
                  {system.status === 'online' ? (
                    <Wifi className="w-4 h-4 text-green-600" />
                  ) : system.status === 'syncing' ? (
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-600" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[0.75rem]">
                    <span className="text-[var(--muted-foreground)]">Next sync:</span>
                    <span className="font-medium">{system.nextSync}</span>
                  </div>
                  <div className="flex items-center justify-between text-[0.75rem]">
                    <span className="text-[var(--muted-foreground)]">Pending:</span>
                    <Badge variant={system.pendingCount > 0 ? 'warning' : 'secondary'} className="text-[0.625rem]">
                      {system.pendingCount}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[0.75rem]">
                    <span className="text-[var(--muted-foreground)]">Success rate:</span>
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        system.successRate >= 99
                          ? 'text-green-600'
                          : system.successRate >= 95
                          ? 'text-blue-600'
                          : 'text-orange-600'
                      )}
                    >
                      {system.successRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Panel>
            ))}
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-5 gap-4">
            <div className="p-4 bg-white border border-[var(--border)] rounded-[4px] [box-shadow:var(--shadow-sm)]">
              <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" />
                Total Events
              </div>
              <div className="text-2xl font-bold tabular-nums">{totalEvents}</div>
            </div>

            <div className="p-4 bg-white border border-[var(--border)] rounded-[4px] [box-shadow:var(--shadow-sm)]">
              <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                Success
              </div>
              <div className="text-2xl font-bold tabular-nums text-green-600">{successCount}</div>
            </div>

            <div className="p-4 bg-white border border-[var(--border)] rounded-[4px] [box-shadow:var(--shadow-sm)]">
              <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                Errors
              </div>
              <div className="text-2xl font-bold tabular-nums text-red-600">{errorCount}</div>
            </div>

            <div className="p-4 bg-white border border-[var(--border)] rounded-[4px] [box-shadow:var(--shadow-sm)]">
              <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Warnings
              </div>
              <div className="text-2xl font-bold tabular-nums text-amber-600">{warningCount}</div>
            </div>

            <div className="p-4 bg-white border border-[var(--border)] rounded-[4px] [box-shadow:var(--shadow-sm)]">
              <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Pending
              </div>
              <div className="text-2xl font-bold tabular-nums text-blue-600">{pendingCount}</div>
            </div>
          </div>

          {/* Filters */}
          <Panel glass>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--muted-foreground)]" />
                <span className="text-[0.875rem] font-medium">Filters:</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[0.75rem] text-[var(--muted-foreground)]">Status:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setFilter('all')}
                    className={cn(
                      'h-8 px-3 rounded-[4px] text-[0.75rem] font-medium transition-colors',
                      filter === 'all'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-white border border-[var(--border)] hover:bg-[var(--secondary)]'
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('success')}
                    className={cn(
                      'h-8 px-3 rounded-[4px] text-[0.75rem] font-medium transition-colors',
                      filter === 'success'
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-[var(--border)] hover:bg-[var(--secondary)]'
                    )}
                  >
                    Success
                  </button>
                  <button
                    onClick={() => setFilter('error')}
                    className={cn(
                      'h-8 px-3 rounded-[4px] text-[0.75rem] font-medium transition-colors',
                      filter === 'error'
                        ? 'bg-red-600 text-white'
                        : 'bg-white border border-[var(--border)] hover:bg-[var(--secondary)]'
                    )}
                  >
                    Errors
                  </button>
                  <button
                    onClick={() => setFilter('warning')}
                    className={cn(
                      'h-8 px-3 rounded-[4px] text-[0.75rem] font-medium transition-colors',
                      filter === 'warning'
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-[var(--border)] hover:bg-[var(--secondary)]'
                    )}
                  >
                    Warnings
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[0.75rem] text-[var(--muted-foreground)]">System:</span>
                <select
                  value={systemFilter}
                  onChange={(e) => setSystemFilter(e.target.value as any)}
                  className="h-8 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.75rem]"
                >
                  <option value="all">All Systems</option>
                  <option value="database">Database</option>
                  <option value="amazon">Amazon</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="cloud">Cloud Backup</option>
                </select>
              </div>

              <div className="flex-1" />

              <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                Showing {filteredEvents.length} of {totalEvents} events
              </div>
            </div>
          </Panel>

          {/* Sync Event Log */}
          <Panel
            title="Sync Event Log"
            icon={<Zap className="w-4 h-4" />}
            glass
            action={
              <div className="text-[0.75rem] text-[var(--muted-foreground)] font-normal">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            }
          >
            <DataTable data={filteredEvents} columns={syncColumns} zebra={true} />
          </Panel>

          {/* Info Panel */}
          <Panel glass className="bg-blue-50 border-blue-300">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-[0.875rem]">
                <p className="font-medium text-blue-900 mb-2">Sync Status Information</p>
                <ul className="text-blue-800 space-y-1 text-[0.8125rem]">
                  <li>
                    • <strong>Database Sync:</strong> Synchronizes inventory, sales, and stock movements
                    across all locations every 15 minutes
                  </li>
                  <li>
                    • <strong>Amazon Integration:</strong> Imports orders, updates inventory, and fetches
                    settlement reports automatically
                  </li>
                  <li>
                    • <strong>WhatsApp Sync:</strong> Processes message queues and updates auto-reply
                    configurations in real-time
                  </li>
                  <li>
                    • <strong>Cloud Backup:</strong> Automated hourly backups ensure data safety and
                    disaster recovery
                  </li>
                  <li>
                    • <strong>Read-Only Access:</strong> Staff members can view sync status but cannot
                    modify sync configurations
                  </li>
                </ul>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

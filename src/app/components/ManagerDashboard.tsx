import React, { useState } from 'react';
import { Panel } from '@/app/components/Panel';
import { Toolbar, ToolbarButton, ToolbarSeparator } from '@/app/components/Toolbar';
import { DataTable, Column } from '@/app/components/DataTable';
import { MetricCard } from '@/app/components/MetricCard';
import { Badge } from '@/app/components/Badge';
import {
  RefreshCw,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  DollarSign,
  ArrowRightLeft,
  Clock,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Mock data for pending transfers
interface PendingTransfer {
  id: string;
  transferId: string;
  from: string;
  to: string;
  items: number;
  requestedBy: string;
  date: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending';
}

const pendingTransfers: PendingTransfer[] = [
  { id: '1', transferId: 'TRF-2026-0045', from: 'Main Store', to: 'Warehouse 1', items: 12, requestedBy: 'Raj Kumar', date: '2026-01-30', priority: 'High', status: 'Pending' },
  { id: '2', transferId: 'TRF-2026-0046', from: 'Central Godown', to: 'Branch Store - Pune', items: 8, requestedBy: 'Priya Shah', date: '2026-01-30', priority: 'High', status: 'Pending' },
  { id: '3', transferId: 'TRF-2026-0047', from: 'Warehouse 2', to: 'Main Store', items: 5, requestedBy: 'Amit Desai', date: '2026-01-29', priority: 'Medium', status: 'Pending' },
  { id: '4', transferId: 'TRF-2026-0048', from: 'Branch Store - Pune', to: 'Branch Store - Ahmedabad', items: 15, requestedBy: 'Sneha Patel', date: '2026-01-29', priority: 'Medium', status: 'Pending' },
  { id: '5', transferId: 'TRF-2026-0049', from: 'Main Store', to: 'Central Godown', items: 3, requestedBy: 'Vikram Singh', date: '2026-01-28', priority: 'Low', status: 'Pending' },
];

// Mock data for store performance
const storePerformanceData = [
  { store: 'Main Store', sales: 28500, target: 30000, achievement: 95 },
  { store: 'Pune Branch', sales: 18200, target: 20000, achievement: 91 },
  { store: 'Ahmedabad Branch', sales: 15800, target: 15000, achievement: 105 },
];

// Mock data for stock alerts
interface StockAlert {
  id: string;
  product: string;
  location: string;
  current: number;
  required: number;
  alertType: 'Critical' | 'Low' | 'Overstock';
}

const stockAlerts: StockAlert[] = [
  { id: '1', product: 'Wireless Mouse', location: 'Main Store', current: 3, required: 20, alertType: 'Critical' },
  { id: '2', product: 'USB-C Hub', location: 'Pune Branch', current: 7, required: 15, alertType: 'Low' },
  { id: '3', product: 'Desk Lamp LED', location: 'Central Godown', current: 245, required: 50, alertType: 'Overstock' },
  { id: '4', product: 'Webcam 1080p', location: 'Ahmedabad Branch', current: 2, required: 10, alertType: 'Critical' },
  { id: '5', product: 'Ergonomic Chair', location: 'Main Store', current: 8, required: 15, alertType: 'Low' },
];

// Mock data for outstanding payments
interface OutstandingPayment {
  id: string;
  invoiceNo: string;
  customer: string;
  amount: number;
  dueDate: string;
  overdueDays: number;
  status: 'Overdue' | 'Due Soon' | 'Pending';
}

const outstandingPayments: OutstandingPayment[] = [
  { id: '1', invoiceNo: 'INV-2026-0234', customer: 'ABC Electronics Ltd', amount: 45600, dueDate: '2026-01-25', overdueDays: 5, status: 'Overdue' },
  { id: '2', invoiceNo: 'INV-2026-0245', customer: 'Tech Solutions Pvt Ltd', amount: 32400, dueDate: '2026-01-28', overdueDays: 2, status: 'Overdue' },
  { id: '3', invoiceNo: 'INV-2026-0256', customer: 'Global Trading Co', amount: 18900, dueDate: '2026-02-02', overdueDays: 0, status: 'Due Soon' },
  { id: '4', invoiceNo: 'INV-2026-0267', customer: 'Metro Wholesale', amount: 56700, dueDate: '2026-02-05', overdueDays: 0, status: 'Due Soon' },
  { id: '5', invoiceNo: 'INV-2026-0278', customer: 'Retail Partners Inc', amount: 28300, dueDate: '2026-02-10', overdueDays: 0, status: 'Pending' },
];

// Daily performance trend
const dailyPerformanceData = [
  { day: 'Mon', sales: 12400, target: 12000 },
  { day: 'Tue', sales: 13200, target: 12000 },
  { day: 'Wed', sales: 11800, target: 12000 },
  { day: 'Thu', sales: 14100, target: 12000 },
  { day: 'Fri', sales: 15600, target: 12000 },
  { day: 'Sat', sales: 18900, target: 15000 },
  { day: 'Sun', sales: 16500, target: 15000 },
];

export function ManagerDashboard() {
  const [selectedFilter, setSelectedFilter] = useState('all');

  const transferColumns: Column<PendingTransfer>[] = [
    { key: 'transferId', header: 'Transfer ID', width: '130px', sortable: true },
    { key: 'from', header: 'From', sortable: true },
    { key: 'to', header: 'To', sortable: true },
    {
      key: 'items',
      header: 'Items',
      width: '80px',
      sortable: true,
      render: (value) => <span className="tabular-nums">{value}</span>,
    },
    { key: 'requestedBy', header: 'Requested By', width: '140px' },
    { key: 'date', header: 'Date', width: '110px', sortable: true },
    {
      key: 'priority',
      header: 'Priority',
      width: '100px',
      render: (value) => (
        <Badge variant={value === 'High' ? 'destructive' : value === 'Medium' ? 'warning' : 'default'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      width: '140px',
      render: (value, row) => (
        <div className="flex gap-1">
          <button
            onClick={() => console.log('Approve transfer:', row.transferId)}
            className="h-7 px-2 rounded-[2px] bg-[var(--success)] text-white hover:opacity-90 transition-opacity text-[0.75rem] font-medium"
            title="Approve"
          >
            <CheckCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => console.log('Reject transfer:', row.transferId)}
            className="h-7 px-2 rounded-[2px] bg-[var(--destructive)] text-white hover:opacity-90 transition-opacity text-[0.75rem] font-medium"
            title="Reject"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const stockAlertColumns: Column<StockAlert>[] = [
    { key: 'product', header: 'Product', sortable: true },
    { key: 'location', header: 'Location', width: '180px', sortable: true },
    {
      key: 'current',
      header: 'Current',
      width: '90px',
      sortable: true,
      render: (value) => <span className="tabular-nums">{value}</span>,
    },
    {
      key: 'required',
      header: 'Required',
      width: '90px',
      render: (value) => <span className="tabular-nums">{value}</span>,
    },
    {
      key: 'alertType',
      header: 'Alert',
      width: '110px',
      render: (value) => (
        <Badge
          variant={
            value === 'Critical' ? 'destructive' : value === 'Low' ? 'warning' : 'info'
          }
        >
          {value}
        </Badge>
      ),
    },
  ];

  const paymentColumns: Column<OutstandingPayment>[] = [
    { key: 'invoiceNo', header: 'Invoice No', width: '130px', sortable: true },
    { key: 'customer', header: 'Customer', sortable: true },
    {
      key: 'amount',
      header: 'Amount',
      width: '120px',
      sortable: true,
      render: (value) => <span className="tabular-nums">₹{value.toLocaleString()}</span>,
    },
    { key: 'dueDate', header: 'Due Date', width: '110px', sortable: true },
    {
      key: 'overdueDays',
      header: 'Overdue',
      width: '90px',
      sortable: true,
      render: (value) => (
        <span className={value > 0 ? 'text-[var(--destructive)] tabular-nums' : 'tabular-nums'}>
          {value > 0 ? `${value}d` : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      render: (value) => (
        <Badge
          variant={
            value === 'Overdue' ? 'destructive' : value === 'Due Soon' ? 'warning' : 'default'
          }
        >
          {value}
        </Badge>
      ),
    },
  ];

  const totalPendingAmount = outstandingPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const overdueCount = outstandingPayments.filter((p) => p.status === 'Overdue').length;

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <Toolbar>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="h-8 px-3 bg-white border border-[var(--border)] rounded-[4px] outline-none text-[0.875rem]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <ToolbarSeparator />
        <ToolbarButton>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </ToolbarButton>
        <ToolbarButton>
          <Filter className="w-4 h-4" />
          Filter
        </ToolbarButton>
        <div className="flex-1" />
        <div className="text-[0.875rem] text-[var(--muted-foreground)]">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </Toolbar>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="mb-1">Manager Dashboard</h1>
            <p className="text-[var(--muted-foreground)]">
              Monitor operations, approve transfers, and track store performance
            </p>
          </div>

          {/* Key Metrics - Action Items */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="Pending Approvals"
              value={pendingTransfers.length}
              icon={<Clock className="w-4 h-4" />}
              variant="warning"
            />
            <MetricCard
              title="Stock Alerts"
              value={stockAlerts.length}
              icon={<AlertTriangle className="w-4 h-4" />}
              variant="destructive"
            />
            <MetricCard
              title="Overdue Payments"
              value={overdueCount}
              icon={<DollarSign className="w-4 h-4" />}
              variant="destructive"
            />
            <MetricCard
              title="Today's Sales"
              value="₹62,500"
              change={8.5}
              icon={<TrendingUp className="w-4 h-4" />}
              variant="success"
            />
          </div>

          {/* Pending Transfers - Priority Section */}
          <Panel
            title="Pending Transfer Approvals"
            headerAction={
              <Badge variant="warning">{pendingTransfers.length} Pending</Badge>
            }
          >
            <DataTable data={pendingTransfers} columns={transferColumns} zebra={false} hover={true} />
          </Panel>

          {/* Store Performance & Stock Alerts Row */}
          <div className="grid grid-cols-3 gap-6">
            {/* Store Performance Summary */}
            <Panel title="Store Performance Summary" className="col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={storePerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis
                    dataKey="store"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    stroke="var(--border)"
                    tickFormatter={(value) => `₹${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="sales" fill="#0078D4" radius={[4, 4, 0, 0]} name="Actual Sales" />
                  <Bar dataKey="target" fill="#E1DFDD" radius={[4, 4, 0, 0]} name="Target" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 pt-4 border-t border-[var(--border-light)] grid grid-cols-3 gap-4">
                {storePerformanceData.map((store) => (
                  <div key={store.store} className="text-center">
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                      {store.store}
                    </div>
                    <div
                      className={`text-lg font-semibold tabular-nums ${
                        store.achievement >= 100 ? 'text-[var(--success)]' : 'text-[var(--warning)]'
                      }`}
                    >
                      {store.achievement}%
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Weekly Performance Trend */}
            <Panel title="Weekly Performance">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailyPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    stroke="var(--border)"
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#0078D4"
                    strokeWidth={2}
                    dot={{ fill: '#0078D4', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#D0D0D0"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#D0D0D0', r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Panel>
          </div>

          {/* Stock Alerts & Outstanding Payments Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Stock Alerts */}
            <Panel
              title="Stock Alerts"
              headerAction={
                <Badge variant="destructive">{stockAlerts.length} Alerts</Badge>
              }
            >
              <DataTable data={stockAlerts} columns={stockAlertColumns} zebra={false} hover={true} />
            </Panel>

            {/* Outstanding Payments */}
            <Panel
              title="Outstanding Payments"
              headerAction={
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{overdueCount} Overdue</Badge>
                  <span className="text-[0.875rem] text-[var(--muted-foreground)]">
                    Total: ₹{totalPendingAmount.toLocaleString()}
                  </span>
                </div>
              }
            >
              <DataTable
                data={outstandingPayments}
                columns={paymentColumns}
                zebra={false}
                hover={true}
              />
            </Panel>
          </div>

          {/* Quick Actions Summary */}
          <Panel title="Action Summary">
            <div className="grid grid-cols-4 gap-6">
              <div className="p-4 bg-[var(--background-alt)] rounded-[4px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-[4px] bg-[var(--warning)]/10 flex items-center justify-center">
                    <ArrowRightLeft className="w-4 h-4 text-[var(--warning)]" />
                  </div>
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] uppercase tracking-wide">
                    Transfers
                  </div>
                </div>
                <div className="text-xl font-semibold mb-1 tabular-nums">
                  {pendingTransfers.length}
                </div>
                <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                  Awaiting approval
                </div>
              </div>

              <div className="p-4 bg-[var(--background-alt)] rounded-[4px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-[4px] bg-[var(--destructive)]/10 flex items-center justify-center">
                    <Package className="w-4 h-4 text-[var(--destructive)]" />
                  </div>
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] uppercase tracking-wide">
                    Critical Stock
                  </div>
                </div>
                <div className="text-xl font-semibold mb-1 tabular-nums">
                  {stockAlerts.filter((a) => a.alertType === 'Critical').length}
                </div>
                <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                  Requires immediate action
                </div>
              </div>

              <div className="p-4 bg-[var(--background-alt)] rounded-[4px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-[4px] bg-[var(--destructive)]/10 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-[var(--destructive)]" />
                  </div>
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] uppercase tracking-wide">
                    Overdue Amount
                  </div>
                </div>
                <div className="text-xl font-semibold mb-1 tabular-nums">
                  ₹{outstandingPayments
                    .filter((p) => p.status === 'Overdue')
                    .reduce((sum, p) => sum + p.amount, 0)
                    .toLocaleString()}
                </div>
                <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                  Follow up required
                </div>
              </div>

              <div className="p-4 bg-[var(--background-alt)] rounded-[4px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-[4px] bg-[var(--success)]/10 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                  </div>
                  <div className="text-[0.75rem] text-[var(--muted-foreground)] uppercase tracking-wide">
                    Completed Today
                  </div>
                </div>
                <div className="text-xl font-semibold mb-1 tabular-nums">18</div>
                <div className="text-[0.75rem] text-[var(--muted-foreground)]">
                  Transfers & approvals
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

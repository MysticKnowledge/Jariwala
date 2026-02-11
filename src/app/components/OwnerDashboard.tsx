import React, { useState } from 'react';
import { Panel } from '@/app/components/Panel';
import { Toolbar, ToolbarButton, ToolbarSeparator } from '@/app/components/Toolbar';
import { DataTable, Column } from '@/app/components/DataTable';
import { MetricCard } from '@/app/components/MetricCard';
import { Badge } from '@/app/components/Badge';
import {
  Download,
  RefreshCw,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Mock data for charts
const monthlySalesData = [
  { month: 'Jan', store: 45000, amazon: 32000, total: 77000 },
  { month: 'Feb', store: 52000, amazon: 38000, total: 90000 },
  { month: 'Mar', store: 48000, amazon: 42000, total: 90000 },
  { month: 'Apr', store: 61000, amazon: 45000, total: 106000 },
  { month: 'May', store: 55000, amazon: 48000, total: 103000 },
  { month: 'Jun', store: 67000, amazon: 53000, total: 120000 },
  { month: 'Jul', store: 72000, amazon: 58000, total: 130000 },
  { month: 'Aug', store: 68000, amazon: 61000, total: 129000 },
  { month: 'Sep', store: 74000, amazon: 65000, total: 139000 },
  { month: 'Oct', store: 81000, amazon: 69000, total: 150000 },
  { month: 'Nov', store: 89000, amazon: 73000, total: 162000 },
  { month: 'Dec', store: 95000, amazon: 78000, total: 173000 },
];

const categoryPerformanceData = [
  { category: 'Electronics', sales: 125000, percentage: 35 },
  { category: 'Furniture', sales: 89000, percentage: 25 },
  { category: 'Accessories', sales: 71000, percentage: 20 },
  { category: 'Lighting', sales: 43000, percentage: 12 },
  { category: 'Office Supplies', sales: 28000, percentage: 8 },
];

const channelComparisonData = [
  { name: 'Store Sales', value: 867000, color: '#0078D4' },
  { name: 'Amazon Sales', value: 662000, color: '#107C10' },
];

interface LowStockItem {
  id: string;
  product: string;
  sku: string;
  current: number;
  minimum: number;
  status: 'Critical' | 'Low';
}

const lowStockItems: LowStockItem[] = [
  { id: '1', product: 'Wireless Mouse', sku: 'ACC-001', current: 5, minimum: 20, status: 'Critical' },
  { id: '2', product: 'USB-C Hub', sku: 'ACC-003', current: 8, minimum: 15, status: 'Low' },
  { id: '3', product: 'Desk Lamp LED', sku: 'LGT-001', current: 12, minimum: 25, status: 'Low' },
  { id: '4', product: 'Webcam 1080p', sku: 'CAM-001', current: 3, minimum: 10, status: 'Critical' },
];

export function OwnerDashboard() {
  const [dateRange, setDateRange] = useState('Today');

  const lowStockColumns: Column<LowStockItem>[] = [
    { key: 'sku', header: 'SKU', width: '100px' },
    { key: 'product', header: 'Product Name' },
    {
      key: 'current',
      header: 'Current',
      width: '90px',
      render: (value) => <span className="tabular-nums">{value}</span>,
    },
    {
      key: 'minimum',
      header: 'Minimum',
      width: '90px',
      render: (value) => <span className="tabular-nums">{value}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (value) => (
        <Badge variant={value === 'Critical' ? 'destructive' : 'warning'}>{value}</Badge>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <Toolbar>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--muted-foreground)]" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-8 px-3 bg-white border border-[var(--border)] rounded-[4px] outline-none text-[0.875rem]"
          >
            <option>Today</option>
            <option>Yesterday</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Year</option>
          </select>
        </div>
        <ToolbarSeparator />
        <ToolbarButton>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </ToolbarButton>
        <ToolbarButton>
          <Download className="w-4 h-4" />
          Export Report
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
            <h1 className="mb-1">Owner Dashboard</h1>
            <p className="text-[var(--muted-foreground)]">
              Real-time overview of business performance and inventory status
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="Today's Total Sales"
              value="$8,450"
              change={12.5}
              icon={<DollarSign className="w-4 h-4" />}
              variant="primary"
            />
            <MetricCard
              title="Amazon Sales"
              value="$3,280"
              change={8.3}
              icon={<ShoppingBag className="w-4 h-4" />}
              variant="success"
            />
            <MetricCard
              title="Total Stock Value"
              value="$245,890"
              change={-2.1}
              changeLabel="vs last week"
              icon={<Package className="w-4 h-4" />}
              variant="default"
            />
            <MetricCard
              title="Low Stock Alerts"
              value="12"
              change={-25}
              changeLabel="vs last week"
              icon={<AlertTriangle className="w-4 h-4" />}
              variant="warning"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-3 gap-6">
            {/* Monthly Sales Trend */}
            <Panel title="Monthly Sales Trend" className="col-span-2">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlySalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    stroke="var(--border)"
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="store"
                    stroke="#0078D4"
                    strokeWidth={2}
                    name="Store Sales"
                    dot={{ fill: '#0078D4', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amazon"
                    stroke="#107C10"
                    strokeWidth={2}
                    name="Amazon Sales"
                    dot={{ fill: '#107C10', r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8764B8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Total Sales"
                    dot={{ fill: '#8764B8', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            {/* Store vs Amazon Comparison */}
            <Panel title="Store vs Amazon (YTD)">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={channelComparisonData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {channelComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-4 border-t border-[var(--border-light)] space-y-2">
                <div className="flex justify-between text-[0.875rem]">
                  <span className="text-[var(--muted-foreground)]">Total Revenue:</span>
                  <span className="font-semibold tabular-nums">$1,529,000</span>
                </div>
                <div className="flex justify-between text-[0.875rem]">
                  <span className="text-[var(--muted-foreground)]">Store Contribution:</span>
                  <span className="tabular-nums">56.7%</span>
                </div>
                <div className="flex justify-between text-[0.875rem]">
                  <span className="text-[var(--muted-foreground)]">Amazon Contribution:</span>
                  <span className="tabular-nums">43.3%</span>
                </div>
              </div>
            </Panel>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-3 gap-6">
            {/* Product Category Performance */}
            <Panel title="Product Category Performance" className="col-span-2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis
                    dataKey="category"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                    stroke="var(--border)"
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                  />
                  <Bar dataKey="sales" fill="#0078D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-5 gap-4">
                {categoryPerformanceData.map((item) => (
                  <div key={item.category} className="text-center">
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">
                      {item.category}
                    </div>
                    <div className="font-semibold text-[var(--foreground)] tabular-nums">
                      {item.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Low Stock Alerts */}
            <Panel title="Low Stock Alerts" headerAction={
              <Badge variant="warning">{lowStockItems.length} Items</Badge>
            }>
              <DataTable
                data={lowStockItems}
                columns={lowStockColumns}
                zebra={false}
                hover={true}
              />
            </Panel>
          </div>

          {/* Recent Activity Summary */}
          <Panel title="Today's Activity Summary">
            <div className="grid grid-cols-4 gap-6">
              <div className="p-4 bg-[var(--background-alt)] rounded-[4px]">
                <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">
                  Orders Processed
                </div>
                <div className="text-2xl font-semibold mb-1 tabular-nums">47</div>
                <div className="text-[0.75rem] text-[var(--success)]">+15% from average</div>
              </div>
              
              <div className="p-4 bg-[var(--background-alt)] rounded-[4px]">
                <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">
                  Items Sold
                </div>
                <div className="text-2xl font-semibold mb-1 tabular-nums">142</div>
                <div className="text-[0.75rem] text-[var(--success)]">+8% from average</div>
              </div>
              
              <div className="p-4 bg-[var(--background-alt)] rounded-[4px]">
                <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">
                  Avg Order Value
                </div>
                <div className="text-2xl font-semibold mb-1 tabular-nums">$179.79</div>
                <div className="text-[0.75rem] text-[var(--muted-foreground)]">Stable</div>
              </div>
              
              <div className="p-4 bg-[var(--background-alt)] rounded-[4px]">
                <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-2 uppercase tracking-wide">
                  Returns Processed
                </div>
                <div className="text-2xl font-semibold mb-1 tabular-nums">3</div>
                <div className="text-[0.75rem] text-[var(--success)]">-40% from average</div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

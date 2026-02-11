import React, { useState } from 'react';
import { Panel } from '@/app/components/Panel';
import { DataTable } from '@/app/components/DataTable';

type UserRole = 'OWNER' | 'MANAGER' | 'STORE_STAFF' | 'GODOWN_STAFF' | 'ACCOUNTANT';

interface ReportsSectionProps {
  userRole?: UserRole;
}

type ReportType = 'daily_sales' | 'monthly_performance' | 'size_demand' | 'outstanding_ledger' | 'dead_stock';

interface Report {
  id: ReportType;
  name: string;
  description: string;
  roles: UserRole[];
  icon: string;
}

const reports: Report[] = [
  {
    id: 'daily_sales',
    name: 'Daily Sales Report',
    description: 'Revenue, units sold, and channel breakdown by day',
    roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'],
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    id: 'monthly_performance',
    name: 'Monthly Product Performance',
    description: 'Product rankings, sales, returns, and profit analysis',
    roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'],
    icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'size_demand',
    name: 'Size-Wise Demand Analysis',
    description: 'Size popularity, demand velocity, and reorder recommendations',
    roles: ['OWNER', 'MANAGER'],
    icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
  },
  {
    id: 'outstanding_ledger',
    name: 'Outstanding Customer Ledger',
    description: 'Customer credit balances with aging analysis',
    roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'],
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    id: 'dead_stock',
    name: 'Dead Stock Report',
    description: 'Slow-moving items with clearance recommendations',
    roles: ['OWNER', 'MANAGER'],
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

export function ReportsSection({ userRole = 'MANAGER' }: ReportsSectionProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateFilter, setDateFilter] = useState('today');

  // Filter reports based on user role
  const availableReports = reports.filter(report => report.roles.includes(userRole));

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Reports & Analytics</h1>
        <p className="text-[var(--muted-foreground)]">
          View comprehensive business reports derived from the event ledger
        </p>
      </div>

      {selectedReport ? (
        // Show selected report
        <ReportViewer
          reportType={selectedReport}
          dateFilter={dateFilter}
          onBack={() => setSelectedReport(null)}
          onDateFilterChange={setDateFilter}
        />
      ) : (
        // Show report grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableReports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:shadow-md transition-all duration-200 text-left group"
            >
              <div className="w-12 h-12 bg-[var(--accent)] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[var(--primary)] transition-colors">
                <svg className="w-6 h-6 text-[var(--primary)] group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={report.icon} />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">{report.name}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{report.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--primary)]">
                <span>View Report</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ReportViewerProps {
  reportType: ReportType;
  dateFilter: string;
  onBack: () => void;
  onDateFilterChange: (filter: string) => void;
}

function ReportViewer({ reportType, dateFilter, onBack, onDateFilterChange }: ReportViewerProps) {
  const report = reports.find(r => r.id === reportType)!;

  return (
    <div>
      {/* Report Header */}
      <Panel className="mb-4">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="font-semibold">{report.name}</h2>
              <p className="text-sm text-[var(--muted-foreground)]">{report.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value)}
              className="h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-[4px]"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
            </select>

            {/* Export Button */}
            <button className="h-10 px-4 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </Panel>

      {/* Report Content */}
      <Panel>
        {reportType === 'daily_sales' && <DailySalesReport dateFilter={dateFilter} />}
        {reportType === 'monthly_performance' && <MonthlyPerformanceReport />}
        {reportType === 'size_demand' && <SizeDemandReport />}
        {reportType === 'outstanding_ledger' && <OutstandingLedgerReport />}
        {reportType === 'dead_stock' && <DeadStockReport />}
      </Panel>
    </div>
  );
}

// Individual Report Components
function DailySalesReport({ dateFilter }: { dateFilter: string }) {
  const columns = ['Date', 'Location', 'Channel', 'Bills', 'Units Sold', 'Revenue', 'Avg Price'];
  const data = [
    ['Jan 30, 2026', 'Main Store Mumbai', 'STORE', '18', '42', '₹12,450', '₹296'],
    ['Jan 30, 2026', 'Store Pune', 'STORE', '12', '28', '₹8,960', '₹320'],
    ['Jan 30, 2026', 'Main Store Mumbai', 'AMAZON', '5', '8', '₹3,200', '₹400'],
    ['Jan 29, 2026', 'Main Store Mumbai', 'STORE', '22', '56', '₹15,890', '₹284'],
  ];

  return (
    <div>
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold">Daily Sales Summary</h3>
        <p className="text-sm text-[var(--muted-foreground)]">Source: daily_sales_report view</p>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}

function MonthlyPerformanceReport() {
  const columns = ['Product', 'Color', 'Units Sold', 'Returned', 'Revenue', 'Profit', 'Rank'];
  const data = [
    ['Cotton T-Shirt', 'Red', '156', '8', '₹93,444', '₹54,444', '1'],
    ['Cotton T-Shirt', 'Blue', '142', '6', '₹85,058', '₹49,558', '2'],
    ['Denim Jeans', 'Blue', '89', '4', '₹133,411', '₹79,911', '3'],
    ['Cotton T-Shirt', 'Black', '78', '5', '₹46,722', '₹27,222', '4'],
  ];

  return (
    <div>
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold">This Month's Top Products</h3>
        <p className="text-sm text-[var(--muted-foreground)]">Source: monthly_product_performance view</p>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}

function SizeDemandReport() {
  const columns = ['Category', 'Size', 'Color', '30d Sales', '7d Sales', 'Stock', 'Days Left', 'Status'];
  const data = [
    ['T-Shirt', 'M', 'Red', '48', '12', '27', '16', 'MONITOR'],
    ['T-Shirt', 'L', 'Blue', '42', '10', '19', '13', 'MONITOR'],
    ['T-Shirt', 'M', 'Blue', '38', '11', '5', '3', 'LOW - REORDER'],
    ['Jeans', '32', 'Blue', '28', '7', '0', '0', 'OUT_OF_STOCK - URGENT'],
  ];

  return (
    <div>
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold">Size & Demand Analysis</h3>
        <p className="text-sm text-[var(--muted-foreground)]">Source: size_wise_demand view</p>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}

function OutstandingLedgerReport() {
  const columns = ['Customer', 'Phone', 'Total Sales', 'Paid', 'Outstanding', '0-30 Days', '31-60 Days', '90+ Days', 'Status'];
  const data = [
    ['Rajesh Kumar', '+91 98765 43210', '₹25,000', '₹15,000', '₹10,000', '₹5,000', '₹3,000', '₹2,000', 'ACTIVE'],
    ['Priya Sharma', '+91 98765 43211', '₹18,000', '₹10,000', '₹8,000', '₹0', '₹0', '₹8,000', 'OVERDUE'],
    ['Amit Patel', '+91 98765 43212', '₹32,000', '₹20,000', '₹12,000', '₹12,000', '₹0', '₹0', 'HIGH_OUTSTANDING'],
  ];

  return (
    <div>
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold">Customer Outstanding Balances</h3>
        <p className="text-sm text-[var(--muted-foreground)]">Source: outstanding_ledger view</p>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}

function DeadStockReport() {
  const columns = ['SKU', 'Product', 'Size', 'Color', 'Stock', 'Last Sale', 'Days', 'Value', 'Classification', 'Action'];
  const data = [
    ['TS-RED-XL', 'T-Shirt', 'XL', 'Red', '45', 'Nov 15, 2025', '76', '₹11,250', 'SLOW_MOVING', 'DISCOUNT_15%'],
    ['JN-BLK-30', 'Jeans', '30', 'Black', '28', 'Sep 20, 2025', '132', '₹16,800', 'DEAD - NO_SALE_3M', 'DISCOUNT_30%'],
    ['TS-GRN-S', 'T-Shirt', 'S', 'Green', '38', 'Jun 10, 2025', '234', '₹9,500', 'DEAD - NEVER_SOLD', 'CLEARANCE_SALE'],
  ];

  return (
    <div>
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold">Dead & Slow-Moving Stock</h3>
        <p className="text-sm text-[var(--muted-foreground)]">Source: dead_stock_report view</p>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}

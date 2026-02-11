import React from 'react';
import { MetricCard } from '@/app/components/MetricCard';
import { Panel } from '@/app/components/Panel';

interface StaffDashboardProps {
  role: 'STORE_STAFF' | 'GODOWN_STAFF';
  location: string;
  onNavigate: (page: string) => void;
}

export function StaffDashboard({ role, location, onNavigate }: StaffDashboardProps) {
  const isStoreStaff = role === 'STORE_STAFF';
  const isGodownStaff = role === 'GODOWN_STAFF';

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">
          {isStoreStaff ? 'Store Staff Dashboard' : 'Godown Staff Dashboard'}
        </h1>
        <p className="text-[var(--muted-foreground)]">
          {location} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Today's Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {isStoreStaff && (
          <>
            <MetricCard
              title="Today's Sales"
              value="₹12,450"
              trend={{ value: 8.2, isPositive: true }}
              subtitle="18 transactions"
            />
            <MetricCard
              title="Items Sold"
              value="42"
              subtitle="Across all categories"
            />
            <MetricCard
              title="Exchange Requests"
              value="3"
              subtitle="2 pending approval"
            />
          </>
        )}
        
        {isGodownStaff && (
          <>
            <MetricCard
              title="Inward Today"
              value="124"
              subtitle="units received"
            />
            <MetricCard
              title="Outward Today"
              value="86"
              subtitle="units transferred"
            />
            <MetricCard
              title="Pending Tasks"
              value="5"
              subtitle="stock verification"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <Panel title="Quick Actions" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {isStoreStaff && (
            <>
              <QuickActionCard
                title="POS / Billing"
                description="Create new sale or bill"
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>}
                onClick={() => onNavigate('pos')}
                color="primary"
              />
              
              <QuickActionCard
                title="Exchange"
                description="Process product exchange"
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>}
                onClick={() => onNavigate('exchange')}
                color="secondary"
              />
              
              <QuickActionCard
                title="Check Stock"
                description="View inventory levels"
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>}
                onClick={() => onNavigate('inventory')}
                color="accent"
              />
            </>
          )}
          
          {isGodownStaff && (
            <>
              <QuickActionCard
                title="Stock Receipt"
                description="Record incoming stock"
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>}
                onClick={() => onNavigate('inventory')}
                color="primary"
              />
              
              <QuickActionCard
                title="Transfer Stock"
                description="Send to store locations"
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>}
                onClick={() => onNavigate('inventory')}
                color="secondary"
              />
              
              <QuickActionCard
                title="View Inventory"
                description="Check all stock levels"
                icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>}
                onClick={() => onNavigate('inventory')}
                color="accent"
              />
            </>
          )}
        </div>
      </Panel>

      {/* Recent Activity */}
      <Panel title="Recent Activity" className="mb-6">
        <div className="divide-y divide-[var(--border)]">
          {isStoreStaff && (
            <>
              <ActivityItem
                type="sale"
                description="Sale INV-2026-0125"
                amount="₹1,498"
                time="10 mins ago"
              />
              <ActivityItem
                type="sale"
                description="Sale INV-2026-0124"
                amount="₹2,997"
                time="25 mins ago"
              />
              <ActivityItem
                type="exchange"
                description="Exchange EXC-2026-015"
                amount="Size M → L"
                time="1 hour ago"
              />
            </>
          )}
          
          {isGodownStaff && (
            <>
              <ActivityItem
                type="inward"
                description="Purchase Order PO-2026-088"
                amount="150 units"
                time="2 hours ago"
              />
              <ActivityItem
                type="transfer"
                description="Transfer to Main Store"
                amount="45 units"
                time="3 hours ago"
              />
              <ActivityItem
                type="transfer"
                description="Transfer to Branch Store"
                amount="32 units"
                time="4 hours ago"
              />
            </>
          )}
        </div>
      </Panel>

      {/* Keyboard Shortcuts */}
      {isStoreStaff && (
        <Panel title="Keyboard Shortcuts">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 text-sm">
            <ShortcutItem keys={['F2']} label="Open POS" />
            <ShortcutItem keys={['F3']} label="Exchange" />
            <ShortcutItem keys={['F4']} label="Stock Check" />
            <ShortcutItem keys={['Ctrl', 'S']} label="Save" />
            <ShortcutItem keys={['Ctrl', 'P']} label="Print" />
            <ShortcutItem keys={['Esc']} label="Cancel" />
          </div>
        </Panel>
      )}
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: 'primary' | 'secondary' | 'accent';
}

function QuickActionCard({ title, description, icon, onClick, color }: QuickActionCardProps) {
  const colorClasses = {
    primary: 'bg-[var(--primary)] text-white',
    secondary: 'bg-blue-600 text-white',
    accent: 'bg-green-600 text-white',
  };

  return (
    <button
      onClick={onClick}
      className="p-6 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:shadow-md transition-all duration-200 text-left group"
    >
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorClasses[color]} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
    </button>
  );
}

interface ActivityItemProps {
  type: 'sale' | 'exchange' | 'inward' | 'transfer';
  description: string;
  amount: string;
  time: string;
}

function ActivityItem({ type, description, amount, time }: ActivityItemProps) {
  const icons = {
    sale: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    exchange: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    inward: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    transfer: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4',
  };

  return (
    <div className="p-4 flex items-center justify-between hover:bg-[var(--accent)] transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icons[type]} />
          </svg>
        </div>
        <div>
          <div className="font-medium">{description}</div>
          <div className="text-sm text-[var(--muted-foreground)]">{time}</div>
        </div>
      </div>
      <div className="font-semibold text-[var(--primary)]">{amount}</div>
    </div>
  );
}

interface ShortcutItemProps {
  keys: string[];
  label: string;
}

function ShortcutItem({ keys, label }: ShortcutItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd key={i} className="px-2 py-1 bg-[var(--accent)] border border-[var(--border)] rounded text-xs font-mono">
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}

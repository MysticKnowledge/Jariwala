import React from 'react';

type UserRole = 'OWNER' | 'MANAGER' | 'STORE_STAFF' | 'GODOWN_STAFF' | 'ACCOUNTANT';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole?: UserRole;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    roles: ['OWNER', 'MANAGER', 'STORE_STAFF', 'GODOWN_STAFF', 'ACCOUNTANT'],
  },
  {
    id: 'pos',
    label: 'POS / Billing',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    roles: ['OWNER', 'MANAGER', 'STORE_STAFF'],
  },
  {
    id: 'exchange',
    label: 'Exchange',
    icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    roles: ['OWNER', 'MANAGER', 'STORE_STAFF'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    roles: ['OWNER', 'MANAGER', 'STORE_STAFF', 'GODOWN_STAFF', 'ACCOUNTANT'],
  },
  {
    id: 'import',
    label: 'Bulk Import',
    icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    id: 'legacy-import',
    label: 'Legacy PRMAST',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'],
  },
  {
    id: 'users',
    label: 'Users & Roles',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    roles: ['OWNER', 'MANAGER', 'STORE_STAFF', 'GODOWN_STAFF', 'ACCOUNTANT'],
  },
];

export function Sidebar({ currentPage, onNavigate, userRole = 'STORE_STAFF' }: SidebarProps) {
  // Filter nav items based on user role
  const visibleItems = navigationItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="w-56 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
      {/* Logo/Header */}
      <div className="h-14 px-4 flex items-center border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="font-semibold">Retail POS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full h-9 px-3 rounded-[4px] flex items-center gap-3 text-left text-sm
                transition-colors duration-150
                ${isActive 
                  ? 'bg-[var(--accent)] text-[var(--primary)] font-medium' 
                  : 'text-[var(--foreground)] hover:bg-[var(--accent-hover)]'
                }
              `}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="text-xs text-[var(--muted-foreground)] space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>System Online</span>
          </div>
          <div>v1.0.0</div>
        </div>
      </div>
    </aside>
  );
}
import React, { useState } from 'react';
import { Sidebar } from '@/app/components/Sidebar';
import { OwnerDashboard } from '@/app/components/OwnerDashboard';
import { ManagerDashboard } from '@/app/components/ManagerDashboard';
import { StaffDashboard } from '@/app/components/StaffDashboard';
import { POSScreen } from '@/app/components/POSScreen';
import { ExchangeScreen } from '@/app/components/ExchangeScreen';
import { InventoryOverview } from '@/app/components/InventoryOverview';
import { UserRoleManagement } from '@/app/components/UserRoleManagement';
import { ReportsSection } from '@/app/components/ReportsSection';
import { WhatsAppPanel } from '@/app/components/WhatsAppPanel';
import { SettingsScreen } from '@/app/components/SettingsScreen';
import { StatusBar, StatusBarItem, StatusBarSeparator } from '@/app/components/StatusBar';
import { LoginScreen } from '@/app/components/LoginScreen';

// Match database roles exactly
type UserRole = 'OWNER' | 'MANAGER' | 'STORE_STAFF' | 'GODOWN_STAFF' | 'ACCOUNTANT';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<{ 
    username: string; 
    location: string; 
    role: UserRole;
    userId: string;
  } | null>(null);

  const handleLogin = (credentials: { username: string; password: string; location: string }) => {
    // In production, this validates against Supabase Auth
    // For demo: role detection based on username
    console.log('Login attempt:', credentials);
    
    let role: UserRole = 'STORE_STAFF';
    const username = credentials.username.toLowerCase();
    
    // Role detection
    if (username.includes('owner') || username.includes('jariwala')) {
      role = 'OWNER';
    } else if (username.includes('manager') || username.includes('admin')) {
      role = 'MANAGER';
    } else if (username.includes('godown') || username.includes('warehouse')) {
      role = 'GODOWN_STAFF';
    } else if (username.includes('accountant') || username.includes('accounts')) {
      role = 'ACCOUNTANT';
    }
    
    setUserInfo({
      username: credentials.username,
      location: credentials.location,
      role: role,
      userId: 'demo-user-id', // In production: from Supabase Auth
    });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserInfo(null);
    setCurrentPage('dashboard');
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Hide on POS for maximum space */}
        {currentPage !== 'pos' && (
          <Sidebar 
            currentPage={currentPage} 
            onNavigate={setCurrentPage} 
            userRole={userInfo?.role} 
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {currentPage === 'dashboard' && (
            <>
              {userInfo?.role === 'OWNER' && <OwnerDashboard />}
              {userInfo?.role === 'MANAGER' && <ManagerDashboard />}
              {(userInfo?.role === 'STORE_STAFF' || userInfo?.role === 'GODOWN_STAFF') && (
                <StaffDashboard 
                  role={userInfo.role} 
                  location={userInfo.location}
                  onNavigate={setCurrentPage}
                />
              )}
              {userInfo?.role === 'ACCOUNTANT' && (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-[var(--accent)] rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Accountant Dashboard</h2>
                    <p className="text-[var(--muted-foreground)] mb-6">
                      View reports and financial data. You have read-only access to all locations.
                    </p>
                    <button
                      onClick={() => setCurrentPage('reports')}
                      className="h-10 px-6 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[4px] font-medium"
                    >
                      View Reports
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          
          {currentPage === 'pos' && userInfo?.role !== 'ACCOUNTANT' && (
            <POSScreen 
              storeName={userInfo?.location || 'Main Store'} 
              onClose={() => setCurrentPage('dashboard')}
            />
          )}
          
          {currentPage === 'exchange' && userInfo?.role !== 'ACCOUNTANT' && userInfo?.role !== 'GODOWN_STAFF' && (
            <ExchangeScreen />
          )}
          
          {currentPage === 'inventory' && <InventoryOverview />}
          
          {currentPage === 'users' && (userInfo?.role === 'OWNER' || userInfo?.role === 'MANAGER') && (
            <UserRoleManagement />
          )}
          
          {currentPage === 'reports' && <ReportsSection userRole={userInfo?.role} />}
          
          {currentPage === 'settings' && <SettingsScreen />}
          
          {currentPage === 'whatsapp' && <WhatsAppPanel />}
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar>
        <StatusBarItem icon="user">{userInfo?.username || 'User'}</StatusBarItem>
        <StatusBarSeparator />
        <StatusBarItem icon="location">{userInfo?.location || 'Main Store'}</StatusBarItem>
        <StatusBarSeparator />
        <StatusBarItem icon="role">{userInfo?.role.replace('_', ' ')}</StatusBarItem>
        <StatusBarSeparator />
        <StatusBarItem icon="sync">Online</StatusBarItem>
        
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="h-7 px-3 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-[4px] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </StatusBar>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { StatusBar, StatusBarItem, StatusBarSeparator } from './components/StatusBar';
import { StaffDashboard } from './components/StaffDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { POSScreen } from './components/POSScreen';
import { RealPOSScreen } from './components/RealPOSScreen';
import { FinalPOSScreen } from './components/FinalPOSScreen';
import { ExchangeScreen } from './components/ExchangeScreen';
import { InventoryOverview } from './components/InventoryOverview';
import { ReportsSection } from './components/ReportsSection';
import { UserRoleManagement } from './components/UserRoleManagement';
import { UserManagement } from './components/UserManagement';
import { SettingsScreen } from './components/SettingsScreen';
import { WhatsAppPanel } from './components/WhatsAppPanel';
import { BulkImportPanel } from './components/BulkImportPanel';
import { GodownInwardEntry } from './components/GodownInwardEntry';
import { LegacyPRMASTImporter } from './components/LegacyPRMASTImporter';
import { signIn, signOut, getCurrentSession, type User, type UserRole } from '@/app/utils/auth';

export type { UserRole };
export type { User };

export type MenuOption =
  | 'dashboard'
  | 'pos'
  | 'exchange'
  | 'inventory'
  | 'godown-inward'
  | 'legacy-import'
  | 'reports'
  | 'users'
  | 'whatsapp'
  | 'bulk-import'
  | 'settings';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuOption>('dashboard');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  const checkSession = async () => {
    const session = await getCurrentSession();
    if (session) {
      setUser(session.user);
    }
    setLoading(false);
  };

  // Register Service Worker for PWA on mount
  useEffect(() => {
    // Check for existing session
    checkSession();
    
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration.scope);
            
            // Check for updates periodically
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000); // Check every hour
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      });
    }

    // Create manifest as data URI to avoid file serving issues
    const manifestData = {
      name: "Retail Management System",
      short_name: "Retail POS",
      description: "Business-grade retail software with Windows Fluent Design",
      start_url: window.location.origin + "/",
      scope: window.location.origin + "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0078D4",
      orientation: "any",
      icons: [
        {
          src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192'%3E%3Crect width='192' height='192' fill='%230078D4'/%3E%3Ctext x='96' y='105' font-family='Arial' font-size='64' fill='white' text-anchor='middle' font-weight='bold'%3ER%3C/text%3E%3Ctext x='96' y='155' font-family='Arial' font-size='24' fill='white' text-anchor='middle'%3EPOS%3C/text%3E%3C/svg%3E",
          sizes: "192x192",
          type: "image/svg+xml",
          purpose: "any maskable"
        },
        {
          src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='512' height='512'%3E%3Crect width='512' height='512' fill='%230078D4'/%3E%3Ctext x='256' y='280' font-family='Arial' font-size='180' fill='white' text-anchor='middle' font-weight='bold'%3ER%3C/text%3E%3Ctext x='256' y='400' font-family='Arial' font-size='64' fill='white' text-anchor='middle'%3EPOS%3C/text%3E%3C/svg%3E",
          sizes: "512x512",
          type: "image/svg+xml",
          purpose: "any maskable"
        }
      ],
      categories: ["business", "productivity", "shopping"]
    };

    const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(manifestBlob);

    // Remove any existing manifest link
    const existingLink = document.querySelector('link[rel="manifest"]');
    if (existingLink) {
      existingLink.remove();
    }

    // Add new manifest link
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = manifestURL;
    document.head.appendChild(manifestLink);
    
    console.log('✅ Manifest injected via blob URL');

    // Add theme-color meta tag
    if (!document.querySelector('meta[name="theme-color"]')) {
      const themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#0078D4';
      document.head.appendChild(themeColor);
    }

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
      console.log('💾 PWA install prompt ready');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    console.log('🚀 PWA features initialized');

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      URL.revokeObjectURL(manifestURL);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('PWA is already installed or install prompt is not available');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    } else {
      console.log('❌ User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const handleLogin = async (credentials: { username: string; password: string; location: string }) => {
    setLoading(true);
    
    const result = await signIn(credentials);
    
    if ('error' in result) {
      alert(result.error);
      setLoading(false);
      return;
    }
    
    setUser(result.user);
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setActiveMenu('dashboard');
  };

  // Show loading screen
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Hide on POS for maximum space */}
        {activeMenu !== 'pos' && (
          <Sidebar 
            currentPage={activeMenu} 
            onNavigate={setActiveMenu} 
            userRole={user.role} 
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          {activeMenu === 'dashboard' && (
            <>
              {user.role === 'OWNER' && <OwnerDashboard />}
              {user.role === 'MANAGER' && <ManagerDashboard />}
              {(user.role === 'STORE_STAFF' || user.role === 'GODOWN_STAFF') && (
                <StaffDashboard 
                  role={user.role} 
                  location={user.location}
                  onNavigate={setActiveMenu}
                />
              )}
            </>
          )}
          
          {activeMenu === 'pos' && user.role !== 'GODOWN_STAFF' && (
            <FinalPOSScreen 
              locationId={user.location_id}
              locationName={user.location_name} 
              onClose={() => setActiveMenu('dashboard')}
              onExchange={() => setActiveMenu('exchange')}
            />
          )}
          
          {activeMenu === 'exchange' && user.role !== 'GODOWN_STAFF' && (
            <ExchangeScreen />
          )}
          
          {activeMenu === 'inventory' && <InventoryOverview />}
          
          {activeMenu === 'users' && (user.role === 'OWNER' || user.role === 'MANAGER') && (
            <UserRoleManagement />
          )}
          
          {activeMenu === 'reports' && <ReportsSection userRole={user.role} />}
          
          {activeMenu === 'settings' && <SettingsScreen />}
          
          {activeMenu === 'whatsapp' && <WhatsAppPanel />}
          
          {activeMenu === 'import' && (user.role === 'OWNER' || user.role === 'MANAGER') && (
            <BulkImportPanel />
          )}
          
          {activeMenu === 'legacy-import' && (user.role === 'OWNER' || user.role === 'MANAGER') && (
            <LegacyPRMASTImporter />
          )}
          
          {activeMenu === 'godown-inward' && user.role === 'GODOWN_STAFF' && (
            <GodownInwardEntry />
          )}
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar>
        <StatusBarItem label="User" value={user.username || 'User'} />
        <StatusBarSeparator />
        <StatusBarItem label="Location" value={user.location || 'Main Store'} />
        <StatusBarSeparator />
        <StatusBarItem label="Role" value={user.role.replace('_', ' ')} />
        <StatusBarSeparator />
        <StatusBarItem label="Status" value="Online" />
        
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

export default App;
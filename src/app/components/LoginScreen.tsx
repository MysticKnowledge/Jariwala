import React, { useState } from 'react';
import { FormField, TextInput, SelectInput } from '@/app/components/FormField';
import { ToolbarButton } from '@/app/components/Toolbar';
import { Package, Wifi, WifiOff, LogIn, User, Lock, MapPin } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface LoginScreenProps {
  onLogin: (credentials: { username: string; password: string; location: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<Array<{ id: string; location_name: string; location_type: string }>>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [errors, setErrors] = useState<{ username?: string; password?: string; location?: string }>({});
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showManualInstall, setShowManualInstall] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: { username?: string; password?: string; location?: string } = {};
    
    if (!username.trim()) {
      newErrors.username = 'Username or mobile number is required';
    }
    
    if (!password.trim()) {
      newErrors.password = 'Password or PIN is required';
    }
    
    if (!location) {
      newErrors.location = 'Please select a location';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    onLogin({ username, password, location });
  };

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      setShowManualInstall(true);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
  };

  // Check if already installed
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone ||
                       document.referrer.includes('android-app://');

  // Simulate online/offline status toggle (for demo purposes)
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('💾 PWA install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Debug: Check PWA status
    setTimeout(() => {
      const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
      const isEdge = /Edg/.test(navigator.userAgent);
      console.log('🔍 Browser:', navigator.userAgent);
      console.log('🔍 Chrome/Edge:', isChrome || isEdge);
      console.log('🔍 Standalone:', isStandalone);
      console.log('🔍 HTTPS:', window.location.protocol === 'https:');
      console.log('🔍 Service Worker:', 'serviceWorker' in navigator);
      
      // Check manifest link
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (manifestLink) {
        console.log('✅ Manifest link found:', manifestLink.getAttribute('href'));
      } else {
        console.warn('⚠️ No manifest link in DOM');
      }
      
      // If not Chrome/Edge and not installed, show manual instructions
      if (!isChrome && !isEdge && !isStandalone && !deferredPrompt) {
        setTimeout(() => setShowManualInstall(true), 2000);
      }
    }, 1000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Fetch locations from Supabase
  React.useEffect(() => {
    const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
    
    const fetchLocations = async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('*');
      
      if (error) {
        console.error('Error fetching locations:', error);
        setLoadingLocations(false);
        return;
      }
      
      setLocations(data);
      setLoadingLocations(false);
    };

    fetchLocations();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Background pattern - subtle */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(45deg, #0078D4 0, #0078D4 1px, transparent 0, transparent 50%)`,
        backgroundSize: '10px 10px'
      }} />

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[4px] bg-[var(--primary)] mb-4 [box-shadow:var(--shadow-lg)]">
              <Package className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl mb-1">JARIWALA Retail System</h1>
            <p className="text-[var(--muted-foreground)]">Business Management Suite</p>
            
            {/* Install PWA Button - Always show unless already installed */}
            {!isStandalone && (
              <button
                onClick={handleInstallPWA}
                className="mt-4 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-[4px] text-sm font-medium inline-flex items-center gap-2 [box-shadow:var(--shadow-md)] transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install as Desktop App
              </button>
            )}
            
            {/* Already Installed Badge */}
            {isStandalone && (
              <div className="mt-4 px-4 py-2 bg-green-100 text-green-800 rounded-[4px] text-sm font-medium inline-flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                App Installed
              </div>
            )}
          </div>

          {/* Manual Install Instructions Modal */}
          {showManualInstall && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowManualInstall(false)}>
              <div className="bg-white rounded-[4px] p-6 max-w-lg w-full [box-shadow:var(--shadow-2xl)]" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">Install as Desktop App</h3>
                
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2 text-[var(--primary)]">🌐 Chrome / Edge:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
                      <li>Look for the ⊕ install icon in the address bar (right side)</li>
                      <li>Or click Menu (⋮) → "Install Retail POS"</li>
                      <li>Click "Install" in the popup</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 text-[var(--primary)]">📱 Mobile (Android/iOS):</h4>
                    <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
                      <li>Tap the Share/Menu button</li>
                      <li>Select "Add to Home Screen"</li>
                      <li>Tap "Add" to confirm</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 text-[var(--primary)]">🦊 Firefox:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-[var(--muted-foreground)]">
                      <li>Click Menu (☰) → More Tools</li>
                      <li>Select "Install this site as an app"</li>
                    </ol>
                  </div>
                  
                  <div className="pt-2 border-t border-[var(--border)]">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      <strong>Note:</strong> If you don't see the install option, make sure you're using Chrome, Edge, or a modern browser, and the site is loaded over HTTPS.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowManualInstall(false)}
                  className="mt-6 w-full px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-[4px] font-medium"
                >
                  Got it!
                </button>
              </div>
            </div>
          )}

          {/* Login Panel - Glass Effect */}
          <div className="bg-white/70 backdrop-blur-[12px] border border-white/30 rounded-[4px] [box-shadow:var(--shadow-xl)] p-8">
            <div className="mb-6">
              <h2 className="mb-1">Sign In</h2>
              <p className="text-[0.875rem] text-[var(--muted-foreground)]">
                Enter your credentials to access the system
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username / Mobile */}
              <FormField label="Username or Mobile Number" required error={errors.username}>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <TextInput
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username or mobile"
                    className="pl-10"
                    error={!!errors.username}
                    autoFocus
                  />
                </div>
              </FormField>

              {/* Password / PIN */}
              <FormField label="Password or PIN" required error={errors.password}>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <TextInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password or PIN"
                    className="pl-10"
                    error={!!errors.password}
                  />
                </div>
              </FormField>

              {/* Location Selector */}
              <FormField label="Location" required error={errors.location}>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none z-10" />
                  <SelectInput
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10"
                    error={!!errors.location}
                  >
                    <option value="">Select location...</option>
                    {loadingLocations ? (
                      <option value="loading">Loading locations...</option>
                    ) : (
                      locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.location_name} - {loc.location_type}</option>
                      ))
                    )}
                  </SelectInput>
                </div>
              </FormField>

              {/* Login Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className={cn(
                    'w-full h-10 px-4 rounded-[4px] border border-transparent transition-colors inline-flex items-center justify-center gap-2',
                    'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]',
                    'font-medium [box-shadow:var(--shadow-sm)]'
                  )}
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              </div>
            </form>

            {/* Footer Links */}
            <div className="mt-6 pt-6 border-t border-[var(--border-light)] flex justify-between text-[0.875rem]">
              <button
                type="button"
                className="text-[var(--primary)] hover:underline"
                onClick={() => alert('Contact your administrator for password reset')}
              >
                Forgot Password?
              </button>
              <button
                type="button"
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                onClick={() => alert('Contact: admin@jariwala.com')}
              >
                Need Help?
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="mt-6 text-center text-[0.75rem] text-[var(--muted-foreground)]">
            <p>Version 2.1.0 • © 2026 JARIWALA Retail System</p>
          </div>
        </div>
      </div>

      {/* Status Bar - Online/Offline Indicator */}
      <div className="h-7 px-4 bg-[var(--muted)] border-t border-[var(--border)] flex items-center justify-between text-[0.75rem]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-[var(--success)]" />
                <span className="text-[var(--success)] font-medium">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-[var(--destructive)]" />
                <span className="text-[var(--destructive)] font-medium">Offline</span>
              </>
            )}
          </div>
          <div className="text-[var(--muted-foreground)]">
            Server: jariwala-retail.local
          </div>
        </div>
        <div className="text-[var(--muted-foreground)]">
          {new Date().toLocaleString('en-IN', { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
          })}
        </div>
      </div>
    </div>
  );
}
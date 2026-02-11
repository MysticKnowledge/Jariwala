import React, { useState } from 'react';
import { FormField, TextInput, SelectInput } from '@/app/components/FormField';
import { ToolbarButton } from '@/app/components/Toolbar';
import { Package, Wifi, WifiOff, LogIn, User, Lock, MapPin } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface LoginScreenProps {
  onLogin: (credentials: { username: string; password: string; location: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [errors, setErrors] = useState<{ username?: string; password?: string; location?: string }>({});

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

  // Simulate online/offline status toggle (for demo purposes)
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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
          </div>

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
                    <option value="store-main">Main Store - Mumbai</option>
                    <option value="store-branch1">Branch Store - Pune</option>
                    <option value="store-branch2">Branch Store - Ahmedabad</option>
                    <option value="godown-central">Central Godown</option>
                    <option value="godown-warehouse1">Warehouse 1 - Navi Mumbai</option>
                    <option value="godown-warehouse2">Warehouse 2 - Vapi</option>
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

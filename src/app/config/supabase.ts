import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if Supabase is configured
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here'

// Create Supabase client only if configured, otherwise create a mock client
export const supabase: SupabaseClient = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabaseClient()

// Export configuration status
export const isSupabaseConfigured = isConfigured

/**
 * Create a mock Supabase client for when credentials are not configured
 * This prevents errors and allows the app to work with direct API calls
 */
function createMockSupabaseClient(): any {
  const mockError = {
    message: 'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env file.',
    details: 'See /QUICK-START.md for setup instructions',
  }

  return {
    functions: {
      invoke: async () => ({
        data: null,
        error: mockError,
      }),
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: mockError }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => ({
      select: () => ({ data: null, error: mockError }),
      insert: () => ({ data: null, error: mockError }),
      update: () => ({ data: null, error: mockError }),
      delete: () => ({ data: null, error: mockError }),
    }),
  }
}

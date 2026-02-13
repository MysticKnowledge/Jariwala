/**
 * 🔐 REAL AUTHENTICATION SYSTEM
 * 
 * Uses Supabase Auth for real user authentication.
 * No fake data - all credentials validated against database.
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export type UserRole = 'STORE_STAFF' | 'GODOWN_STAFF' | 'MANAGER' | 'OWNER';

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  role: UserRole;
  location_id: string;
  location_name: string;
  phone?: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  expiresAt: number;
}

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

/**
 * Sign in with email/phone and password
 */
export async function signIn(
  credentials: { username: string; password: string; location: string }
): Promise<{ user: User; accessToken: string } | { error: string }> {
  try {
    // Determine if username is email or phone
    const isEmail = credentials.username.includes('@');
    const isPhone = /^\d{10}$/.test(credentials.username);
    
    let authResult;
    
    if (isEmail) {
      // Sign in with email
      authResult = await supabase.auth.signInWithPassword({
        email: credentials.username,
        password: credentials.password,
      });
    } else if (isPhone) {
      // For phone login, we need to construct email format
      // Assuming format: +91{phone}@phone.local
      authResult = await supabase.auth.signInWithPassword({
        email: `+91${credentials.username}@phone.local`,
        password: credentials.password,
      });
    } else {
      // Username login - query database first
      const { data: userProfile } = await supabase
        .from('users')
        .select('email')
        .eq('username', credentials.username)
        .single();
      
      if (!userProfile) {
        return { error: 'Invalid username or password' };
      }
      
      authResult = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: credentials.password,
      });
    }
    
    if (authResult.error) {
      return { error: authResult.error.message };
    }
    
    if (!authResult.data.session) {
      return { error: 'Failed to create session' };
    }
    
    // Fetch user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        role,
        phone,
        email,
        location_id
      `)
      .eq('id', authResult.data.user.id)
      .single();
    
    if (profileError || !userProfile) {
      console.error('Profile fetch error:', profileError);
      return { error: 'User profile not found' };
    }
    
    // Fetch location separately to handle potential missing locations table
    let locationName = 'Unknown';
    try {
      const { data: locationData } = await supabase
        .from('locations')
        .select('location_name')
        .eq('id', userProfile.location_id)
        .single();
      
      if (locationData) {
        locationName = locationData.location_name;
      }
    } catch (err) {
      console.warn('Could not fetch location name:', err);
    }
    
    // Verify location access
    if (credentials.location && userProfile.location_id !== credentials.location) {
      return { error: 'You do not have access to this location' };
    }
    
    const user: User = {
      id: userProfile.id,
      email: userProfile.email,
      username: userProfile.username,
      name: userProfile.full_name,
      role: userProfile.role as UserRole,
      location_id: userProfile.location_id,
      location_name: locationName,
      phone: userProfile.phone,
    };
    
    // Store session
    localStorage.setItem('auth_session', JSON.stringify({
      user,
      accessToken: authResult.data.session.access_token,
      expiresAt: Date.now() + (authResult.data.session.expires_in || 3600) * 1000,
    }));
    
    return {
      user,
      accessToken: authResult.data.session.access_token,
    };
    
  } catch (error) {
    console.error('Sign in error:', error);
    return { error: 'An error occurred during sign in' };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  localStorage.removeItem('auth_session');
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<AuthSession | null> {
  try {
    // Check localStorage first
    const stored = localStorage.getItem('auth_session');
    if (stored) {
      const session: AuthSession = JSON.parse(stored);
      
      // Check if expired
      if (session.expiresAt > Date.now()) {
        return session;
      }
    }
    
    // Check Supabase session
    const { data } = await supabase.auth.getSession();
    
    if (!data.session) {
      return null;
    }
    
    // Fetch user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        role,
        phone,
        email,
        location_id
      `)
      .eq('id', data.session.user.id)
      .single();
    
    if (!userProfile) {
      return null;
    }
    
    // Fetch location separately to handle potential missing locations table
    let locationName = 'Unknown';
    try {
      const { data: locationData } = await supabase
        .from('locations')
        .select('location_name')
        .eq('id', userProfile.location_id)
        .single();
      
      if (locationData) {
        locationName = locationData.location_name;
      }
    } catch (err) {
      console.warn('Could not fetch location name:', err);
    }
    
    const user: User = {
      id: userProfile.id,
      email: userProfile.email,
      username: userProfile.username,
      name: userProfile.full_name,
      role: userProfile.role as UserRole,
      location_id: userProfile.location_id,
      location_name: locationName,
      phone: userProfile.phone,
    };
    
    const authSession: AuthSession = {
      user,
      accessToken: data.session.access_token,
      expiresAt: Date.now() + (data.session.expires_in || 3600) * 1000,
    };
    
    // Update localStorage
    localStorage.setItem('auth_session', JSON.stringify(authSession));
    
    return authSession;
    
  } catch (error) {
    console.error('Get session error:', error);
    return null;
  }
}

/**
 * Refresh session
 */
export async function refreshSession(): Promise<AuthSession | null> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      return null;
    }
    
    // Fetch user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select(`
        id,
        username,
        full_name,
        role,
        phone,
        email,
        location_id
      `)
      .eq('id', data.session.user.id)
      .single();
    
    if (!userProfile) {
      return null;
    }
    
    // Fetch location separately to handle potential missing locations table
    let locationName = 'Unknown';
    try {
      const { data: locationData } = await supabase
        .from('locations')
        .select('location_name')
        .eq('id', userProfile.location_id)
        .single();
      
      if (locationData) {
        locationName = locationData.location_name;
      }
    } catch (err) {
      console.warn('Could not fetch location name:', err);
    }
    
    const user: User = {
      id: userProfile.id,
      email: userProfile.email,
      username: userProfile.username,
      name: userProfile.full_name,
      role: userProfile.role as UserRole,
      location_id: userProfile.location_id,
      location_name: locationName,
      phone: userProfile.phone,
    };
    
    const authSession: AuthSession = {
      user,
      accessToken: data.session.access_token,
      expiresAt: Date.now() + (data.session.expires_in || 3600) * 1000,
    };
    
    localStorage.setItem('auth_session', JSON.stringify(authSession));
    
    return authSession;
    
  } catch (error) {
    console.error('Refresh session error:', error);
    return null;
  }
}

/**
 * Get Supabase client with auth
 */
export function getAuthedSupabaseClient() {
  return supabase;
}
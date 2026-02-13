/**
 * 👥 USER MANAGEMENT SERVICE
 * 
 * Create and manage users from within the app.
 * Only OWNER role can create/edit/delete users.
 */

import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: 'OWNER' | 'MANAGER' | 'STORE_STAFF' | 'GODOWN_STAFF';
  location_id: string;
  location_name?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  username: string;
  full_name: string;
  role: 'OWNER' | 'MANAGER' | 'STORE_STAFF' | 'GODOWN_STAFF';
  location_id: string;
  phone?: string;
}

export interface UpdateUserRequest {
  id: string;
  username?: string;
  full_name?: string;
  role?: 'OWNER' | 'MANAGER' | 'STORE_STAFF' | 'GODOWN_STAFF';
  location_id?: string;
  phone?: string;
  is_active?: boolean;
}

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

/**
 * Get all users (OWNER only)
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        username,
        full_name,
        role,
        location_id,
        phone,
        is_active,
        created_at,
        locations (
          location_name
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get users error:', error);
      return [];
    }
    
    return data.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      role: user.role as any,
      location_id: user.location_id,
      location_name: (user.locations as any)?.location_name,
      phone: user.phone,
      is_active: user.is_active,
      created_at: user.created_at,
    }));
  } catch (error) {
    console.error('Get users exception:', error);
    return [];
  }
}

/**
 * Get users by location
 */
export async function getUsersByLocation(locationId: string): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        username,
        full_name,
        role,
        location_id,
        phone,
        is_active,
        created_at,
        locations (
          location_name
        )
      `)
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Get users by location error:', error);
      return [];
    }
    
    return data.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      role: user.role as any,
      location_id: user.location_id,
      location_name: (user.locations as any)?.location_name,
      phone: user.phone,
      is_active: user.is_active,
      created_at: user.created_at,
    }));
  } catch (error) {
    console.error('Get users by location exception:', error);
    return [];
  }
}

/**
 * Create a new user (calls Edge Function)
 * 
 * This requires the Edge Function to use admin API to create auth user
 */
export async function createUser(
  request: CreateUserRequest
): Promise<{ user_id: string } | { error: string }> {
  try {
    // Call the Edge Function to create user
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-c45d1eeb/create-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(request),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create user error:', errorText);
      return { error: errorText || 'Failed to create user' };
    }
    
    const result = await response.json();
    
    if (result.error) {
      return { error: result.error };
    }
    
    return { user_id: result.user_id };
    
  } catch (error) {
    console.error('Create user exception:', error);
    return { error: 'An error occurred while creating user' };
  }
}

/**
 * Update user details
 */
export async function updateUser(
  request: UpdateUserRequest
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {};
    
    if (request.username) updateData.username = request.username;
    if (request.full_name) updateData.full_name = request.full_name;
    if (request.role) updateData.role = request.role;
    if (request.location_id) updateData.location_id = request.location_id;
    if (request.phone !== undefined) updateData.phone = request.phone;
    if (request.is_active !== undefined) updateData.is_active = request.is_active;
    
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', request.id);
    
    if (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Update user exception:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(userId: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);
    
    if (error) {
      console.error('Deactivate user error:', error);
      return { success: false };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Deactivate user exception:', error);
    return { success: false };
  }
}

/**
 * Activate user
 */
export async function activateUser(userId: string): Promise<{ success: boolean }> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', userId);
    
    if (error) {
      console.error('Activate user error:', error);
      return { success: false };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Activate user exception:', error);
    return { success: false };
  }
}

/**
 * Reset user password (calls Edge Function)
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-c45d1eeb/reset-password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ user_id: userId, new_password: newPassword }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText || 'Failed to reset password' };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Reset password exception:', error);
    return { success: false, error: 'An error occurred' };
  }
}

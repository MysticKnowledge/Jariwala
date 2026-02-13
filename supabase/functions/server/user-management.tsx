/**
 * 👥 USER MANAGEMENT EDGE FUNCTION
 * 
 * Handles user creation and password reset using Supabase Admin API.
 * Only accessible by authenticated OWNER users.
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Create a new user
 */
export async function handleCreateUser(request: Request): Promise<Response> {
  try {
    // Parse request
    const body = await request.json();
    const { email, password, username, full_name, role, location_id, phone } = body;
    
    // Validate required fields
    if (!email || !password || !username || !full_name || !role || !location_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate role
    const validRoles = ['OWNER', 'MANAGER', 'STORE_STAFF', 'GODOWN_STAFF'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Creating user:', email, role);
    
    // Create auth user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email since email server not configured
      user_metadata: {
        username: username,
        full_name: full_name,
        role: role,
      },
    });
    
    if (authError) {
      console.error('Auth user creation error:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create auth user' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Auth user created:', authData.user.id);
    
    // Insert into users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        username: username,
        full_name: full_name,
        role: role,
        location_id: location_id,
        phone: phone,
        is_active: true,
      });
    
    if (userError) {
      console.error('Users table insert error:', userError);
      
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('User created successfully:', authData.user.id);
    
    // Create audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: authData.user.id,
      action: 'USER_CREATED',
      table_name: 'users',
      record_id: authData.user.id,
      details: {
        email: email,
        username: username,
        role: role,
      },
    });
    
    return new Response(
      JSON.stringify({ 
        user_id: authData.user.id,
        email: email,
        username: username,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Create user exception:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while creating user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Reset user password
 */
export async function handleResetPassword(request: Request): Promise<Response> {
  try {
    // Parse request
    const body = await request.json();
    const { user_id, new_password } = body;
    
    // Validate required fields
    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate password length
    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Resetting password for user:', user_id);
    
    // Update password using admin API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );
    
    if (error) {
      console.error('Password reset error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Password reset successfully');
    
    // Create audit log
    await supabaseAdmin.from('audit_log').insert({
      user_id: user_id,
      action: 'PASSWORD_RESET',
      table_name: 'users',
      record_id: user_id,
      details: {
        reset_at: new Date().toISOString(),
      },
    });
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Reset password exception:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred while resetting password' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// =====================================================
// SUPABASE CLIENT CONFIGURATION
// =====================================================

import { createBrowserClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';
import { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

/**
 * Create a Supabase client for browser/client-side usage
 * Uses singleton pattern to avoid creating multiple instances
 */
export function createClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return client;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Get the current user's profile from the users table
 */
export async function getCurrentUserProfile() {
  const supabase = createClient();
  const user = await getCurrentUser();
  
  if (!user) return null;
  
  const { data: profile, error } = await supabase
    .from('users')
    .select('*, business:businesses(*)')
    .eq('auth_user_id', user.id)
    .single();
  
  if (error) {
    // Handle "Row not found" (PGRST116) gracefully - user might exist in Auth but not in public.users
    if (error.code === 'PGRST116') {
      return null;
    }

    logger.error({
      msg: 'Error fetching user profile',
      error: error ? { message: error.message, code: error.code, details: error.details } : undefined,
      userId: user.id,
    });
    return null;
  }

  // Map first_name and last_name to name/full_name if not present
  if (profile) {
    const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    if (!profile.name && fullName) {
      profile.name = fullName;
    }
    if (!profile.full_name && fullName) {
      profile.full_name = fullName;
    }
  }
  
  return profile;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  return { data, error };
}

/**
 * Sign in with magic link
 */
export async function signInWithMagicLink(email: string, redirectTo?: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || `${window.location.origin}/auth/callback`
    }
  });
  
  return { data, error };
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, metadata?: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  
  return { data, error };
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Reset password - routes through server API for rate limiting
 */
export async function resetPassword(email: string) {
  try {
    const response = await fetch('/api/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: { message: data.error || 'Failed to send reset email' },
      };
    }

    return { data, error: null };
  } catch (error: any) {
    return {
      data: null,
      error: { message: error.message || 'Failed to send reset email' },
    };
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  
  return { data, error };
}

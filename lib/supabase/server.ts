// =====================================================
// SUPABASE SERVER CLIENT FOR NEXT.JS APP ROUTER
// =====================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client for server-side usage
 * Use this in Server Components, Route Handlers, and Server Actions
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Create a Supabase admin client with service role key
 * WARNING: Only use in server-side code, never expose to client
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}

/**
 * Get the current user on the server
 */
export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Get the current user's profile from the server
 */
export async function getServerUserProfile() {
  const supabase = await createServerSupabaseClient();
  const user = await getServerUser();
  
  if (!user) return null;
  
  const { data: profile, error } = await supabase
    .from('users')
    .select('*, business:businesses(*)')
    .eq('auth_user_id', user.id)
    .single();
  
  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
  
  return profile;
}

/**
 * Check if current user can access CRM (Pro tier)
 */
export async function canAccessCRM() {
  const profile = await getServerUserProfile();
  
  if (!profile || !profile.business) {
    return false;
  }
  
  return profile.business.plan_tier === 'pro';
}

/**
 * Check if current user has a specific role
 */
export async function hasRole(requiredRole: string | string[]) {
  const profile = await getServerUserProfile();

  if (!profile) return false;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(profile.role as string);
}

/**
 * Alias for createServerSupabaseClient for backwards compatibility
 */
export const createClient = createServerSupabaseClient;

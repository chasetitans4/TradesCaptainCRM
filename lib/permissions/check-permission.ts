import { requireAdmin } from '@/lib/admin/auth';
import { hasPermission } from './checks';
import { Permission } from './roles';
import { getServerUserProfile } from '@/lib/supabase/server';
import type { UserRole } from '@/types';

/**
 * Get the current session (Unified for Admin and App users)
 */
export async function getServerSession() {
  // 1. Try Admin Auth (Cookie-based)
  try {
    const admin = await requireAdmin();
    if (admin) {
      return {
        user: {
          id: admin.id,
          role: admin.role as UserRole, // Ensure cast matches updated types
          email: admin.email,
          name: admin.name,
          businessId: undefined
        }
      };
    }
  } catch (e) {
    // Ignore error (e.g. if cookies are missing)
  }

  // 2. Try Supabase Auth (for App Users)
  try {
    const profile = await getServerUserProfile();
    if (profile) {
      return {
        user: {
          id: profile.id, // Use profile.id for consistency with business logic
          role: (profile.role || 'technician') as UserRole,
          email: profile.email,
          name: profile.full_name,
          businessId: profile.business_id
        }
      };
    }
  } catch (e) {
    // Ignore error
  }
  
  return null;
}

/**
 * Check if the current user has the required permission.
 * Throws an error if the user is not authenticated or does not have the permission.
 */
export async function checkPermission(permission: Permission, userId?: string): Promise<boolean> {
  const allowed = await hasServerPermission(permission);
  if (!allowed) {
    throw new Error(`Forbidden: Missing permission ${permission}`);
  }
  return true;
}

/**
 * Check if the current user has the required permission (returns boolean).
 * Does NOT throw error.
 */
export async function hasServerPermission(permission: Permission): Promise<boolean> {
  const session = await getServerSession();

  if (!session?.user?.role) {
    return false;
  }
  
  return hasPermission(session.user.role, permission);
}

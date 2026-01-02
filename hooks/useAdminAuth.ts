// =====================================================
// ADMIN AUTH HOOK
// Client-side hook for admin authentication and role checking
// =====================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'agent' | 'support';
  is_active: boolean;
}

interface UseAdminAuthResult {
  user: AdminUser | null;
  loading: boolean;
  error: string | null;
  isAuthorized: boolean;
}

/**
 * Hook to check admin authentication on client-side pages
 * Redirects to login if not authenticated or not authorized
 */
export function useAdminAuth(
  requiredRoles: ('super_admin' | 'admin' | 'agent' | 'support')[] = ['super_admin', 'admin', 'agent']
): UseAdminAuthResult {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/admin/auth/me');

        if (!response.ok) {
          // Not authenticated - redirect to login
          router.push('/admin/login');
          return;
        }

        const data = await response.json();
        const adminUser = data.user as AdminUser;

        // Check if user has required role
        if (!requiredRoles.includes(adminUser.role)) {
          setError('You do not have permission to access this page');
          setUser(null);
          // Redirect to admin dashboard or unauthorized page
          router.push('/admin');
          return;
        }

        setUser(adminUser);
        setError(null);
      } catch (err) {
        setError('Authentication check failed');
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router, requiredRoles]);

  return {
    user,
    loading,
    error,
    isAuthorized: !!user && !error,
  };
}

/**
 * Hook that requires super_admin role
 */
export function useSuperAdmin(): UseAdminAuthResult {
  return useAdminAuth(['super_admin']);
}

/**
 * Hook that requires admin or higher
 */
export function useAdminOrHigher(): UseAdminAuthResult {
  return useAdminAuth(['super_admin', 'admin']);
}

/**
 * Hook that requires agent or higher
 */
export function useAgentOrHigher(): UseAdminAuthResult {
  return useAdminAuth(['super_admin', 'admin', 'agent']);
}

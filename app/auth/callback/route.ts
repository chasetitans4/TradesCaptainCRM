import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

// Whitelist of allowed redirect paths to prevent open redirect attacks
const ALLOWED_REDIRECT_PATHS = [
  '/dashboard',
  '/settings',
  '/onboarding',
  '/customers',
  '/jobs',
  '/leads',
  '/invoices',
  '/quotes',
  '/calendar',
  '/messages',
  '/reports',
  '/team',
  '/',
];

/**
 * Validate redirect path against whitelist
 * Only allows relative paths that start with allowed prefixes
 */
function getSafeRedirectPath(requestedPath: string | null): string {
  const defaultPath = '/dashboard';

  if (!requestedPath) {
    return defaultPath;
  }

  // Prevent protocol-relative URLs and absolute URLs
  if (requestedPath.startsWith('//') || requestedPath.includes('://')) {
    return defaultPath;
  }

  // Ensure path starts with /
  const normalizedPath = requestedPath.startsWith('/') ? requestedPath : `/${requestedPath}`;

  // Check if path starts with any allowed prefix
  const isAllowed = ALLOWED_REDIRECT_PATHS.some(
    (allowed) => normalizedPath === allowed || normalizedPath.startsWith(`${allowed}/`)
  );

  return isAllowed ? normalizedPath : defaultPath;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeRedirectPath(searchParams.get('next'));

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Auth failed, redirect to login with error
  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
}

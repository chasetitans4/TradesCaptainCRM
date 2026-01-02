// =====================================================
// QUICKBOOKS CLIENT LIBRARY
// OAuth and API client for QuickBooks Online
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { encrypt, decrypt } from '@/lib/crypto';

// QuickBooks API base URLs
const SANDBOX_BASE_URL = 'https://sandbox-quickbooks.api.intuit.com';
const PRODUCTION_BASE_URL = 'https://quickbooks.api.intuit.com';

// OAuth endpoints
const OAUTH_BASE_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

export interface QuickBooksTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  realmId: string;
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(businessId: string): string {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI;
  const scope = 'com.intuit.quickbooks.accounting';

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri!,
    response_type: 'code',
    scope,
    state: businessId,
  });

  return `${OAUTH_BASE_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  realmId: string,
  businessId: string
): Promise<void> {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID!;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!;
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI!;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('QuickBooks token exchange failed:', error);
    throw new Error('Failed to exchange code for tokens');
  }

  const tokens = await response.json();

  const supabase = await createClient();

  // Encrypt tokens before storage
  const encryptedAccessToken = encrypt(tokens.access_token);
  const encryptedRefreshToken = encrypt(tokens.refresh_token);

  // Save encrypted tokens to database
  await supabase.from('quickbooks_connections').upsert({
    business_id: businessId,
    access_token: encryptedAccessToken,
    refresh_token: encryptedRefreshToken,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    realm_id: realmId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'business_id' });
}

/**
 * Refresh access token using refresh token
 * Note: refreshToken param is already decrypted by caller
 */
async function refreshTokens(businessId: string, refreshToken: string): Promise<QuickBooksTokens> {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID!;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET!;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh QuickBooks token');
  }

  const tokens = await response.json();

  const supabase = await createClient();

  // Encrypt new tokens before storage
  const encryptedAccessToken = encrypt(tokens.access_token);
  const encryptedRefreshToken = encrypt(tokens.refresh_token);

  // Update encrypted tokens in database
  await supabase
    .from('quickbooks_connections')
    .update({
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('business_id', businessId);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    realmId: '', // Will be filled in by caller
  };
}

/**
 * Get QuickBooks client credentials for a business
 * Decrypts tokens from database storage
 */
export async function getQuickBooksClient(businessId: string): Promise<{
  accessToken: string;
  realmId: string;
}> {
  const supabase = await createClient();

  const { data: connection, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (error || !connection) {
    throw new Error('QuickBooks not connected');
  }

  // Decrypt tokens from storage
  const decryptedAccessToken = decrypt(connection.access_token);
  const decryptedRefreshToken = decrypt(connection.refresh_token);

  // Check if token needs refresh (5 minute buffer)
  const expiresAt = new Date(connection.token_expires_at);
  const bufferTime = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - Date.now() <= bufferTime) {
    // Pass decrypted refresh token for API call
    const refreshedTokens = await refreshTokens(businessId, decryptedRefreshToken);
    return {
      accessToken: refreshedTokens.accessToken,
      realmId: connection.realm_id,
    };
  }

  return {
    accessToken: decryptedAccessToken,
    realmId: connection.realm_id,
  };
}

/**
 * Make an API call to QuickBooks
 */
export async function qbApiCall<T = any>(
  businessId: string,
  method: 'GET' | 'POST',
  endpoint: string,
  body?: any
): Promise<T> {
  const { accessToken, realmId } = await getQuickBooksClient(businessId);

  const baseUrl =
    process.env.QUICKBOOKS_ENVIRONMENT === 'sandbox'
      ? SANDBOX_BASE_URL
      : PRODUCTION_BASE_URL;

  const url = `${baseUrl}/v3/company/${realmId}/${endpoint}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  };

  if (method === 'POST' && body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('QuickBooks API error:', error);
    throw new Error(`QuickBooks API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Query QuickBooks entities
 */
export async function qbQuery<T = any>(
  businessId: string,
  query: string
): Promise<T> {
  const encodedQuery = encodeURIComponent(query);
  return qbApiCall(businessId, 'GET', `query?query=${encodedQuery}`);
}

/**
 * Check if QuickBooks is connected for a business
 */
export async function isQuickBooksConnected(businessId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('quickbooks_connections')
    .select('id')
    .eq('business_id', businessId)
    .single();

  return !!data;
}

/**
 * Disconnect QuickBooks
 */
export async function disconnectQuickBooks(businessId: string): Promise<void> {
  const supabase = await createClient();

  // Delete connection
  await supabase
    .from('quickbooks_connections')
    .delete()
    .eq('business_id', businessId);

  // Delete sync mappings
  await supabase
    .from('quickbooks_sync_map')
    .delete()
    .eq('business_id', businessId);
}

/**
 * Get connection status and info
 */
export async function getQuickBooksConnectionInfo(businessId: string): Promise<{
  connected: boolean;
  companyName?: string;
  lastSyncAt?: string;
  syncSettings?: {
    syncCustomers: boolean;
    syncInvoices: boolean;
    syncPayments: boolean;
    syncExpenses: boolean;
    autoSyncEnabled: boolean;
  };
} | null> {
  const supabase = await createClient();

  const { data: connection } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (!connection) {
    return { connected: false };
  }

  return {
    connected: true,
    companyName: connection.company_name,
    lastSyncAt: connection.last_sync_at,
    syncSettings: {
      syncCustomers: connection.sync_customers,
      syncInvoices: connection.sync_invoices,
      syncPayments: connection.sync_payments,
      syncExpenses: connection.sync_expenses,
      autoSyncEnabled: connection.auto_sync_enabled,
    },
  };
}

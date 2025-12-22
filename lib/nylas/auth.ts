// =====================================================
// NYLAS AUTHENTICATION
// =====================================================

import { nylas, nylasConfig, type NylasProvider } from './client';

/**
 * Generate OAuth URL for calendar connection
 * @param userId - The user ID to pass through to callback
 * @param provider - Optional provider hint (google, icloud, microsoft)
 */
export function getAuthUrl(userId: string, provider?: NylasProvider): string {
  const authUrl = nylas.auth.urlForOAuth2({
    clientId: nylasConfig.clientId,
    redirectUri: nylasConfig.redirectUri,
    state: userId, // Pass user ID to callback
    provider: provider, // Optional: 'google', 'icloud', 'microsoft'
  });
  return authUrl;
}

/**
 * Exchange authorization code for Nylas grant
 * Called in the OAuth callback after user authorizes
 */
export async function exchangeCodeForGrant(code: string): Promise<{
  grantId: string;
  email: string;
  provider: string;
}> {
  const response = await nylas.auth.exchangeCodeForToken({
    clientId: nylasConfig.clientId,
    clientSecret: nylasConfig.clientSecret,
    redirectUri: nylasConfig.redirectUri,
    code,
  });

  return {
    grantId: response.grantId,
    email: response.email,
    provider: response.provider,
  };
}

/**
 * Revoke Nylas grant (disconnect calendar)
 */
export async function revokeGrant(grantId: string): Promise<void> {
  try {
    await nylas.grants.destroy({ grantId });
  } catch (error) {
    console.error('Error revoking Nylas grant:', error);
    // Don't throw - we still want to clean up the database record
  }
}

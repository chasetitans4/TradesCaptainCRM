// =====================================================
// MULTI-LOCATION MANAGEMENT LIBRARY
// Handle clients with multiple business locations
// Version: 5.8
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import type { ClientLocation, CreateLocationInput } from './types';

// =====================================================
// LOCATION MANAGEMENT
// =====================================================

/**
 * Get all locations for a client
 */
export async function getClientLocations(clientId: string): Promise<ClientLocation[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('client_locations')
    .select('*')
    .eq('client_id', clientId)
    .order('is_primary', { ascending: false })
    .order('added_at', { ascending: true });

  if (error) throw new Error(`Failed to get locations: ${error.message}`);

  return data || [];
}

/**
 * Get a single location
 */
export async function getLocation(locationId: string): Promise<ClientLocation | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('client_locations')
    .select('*')
    .eq('id', locationId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get location: ${error.message}`);
  }

  return data;
}

/**
 * Add a new location to a client
 */
export async function addLocation(
  clientId: string,
  input: CreateLocationInput
): Promise<ClientLocation> {
  const supabase = createAdminClient();

  // Check if this is the first location (make it primary)
  const existing = await getClientLocations(clientId);
  const isPrimary = existing.length === 0;

  // Get primary location for sharing NeverMiss
  const primaryLocation = existing.find((l) => l.is_primary);

  const { data, error } = await supabase
    .from('client_locations')
    .insert({
      client_id: clientId,
      is_primary: isPrimary,
      location_name: input.location_name,
      address_line1: input.address_line1,
      address_line2: input.address_line2,
      city: input.city,
      state: input.state,
      zip: input.zip,
      phone: input.phone,
      shares_nevermiss_with: input.use_separate_nevermiss ? null : primaryLocation?.id,
      is_addon: !isPrimary,
      addon_price_cents: isPrimary ? null : 19900, // $199/mo for add-on locations
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add location: ${error.message}`);

  return data;
}

/**
 * Update a location
 */
export async function updateLocation(
  locationId: string,
  updates: Partial<ClientLocation>
): Promise<ClientLocation> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('client_locations')
    .update(updates)
    .eq('id', locationId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update location: ${error.message}`);

  return data;
}

/**
 * Delete a location
 */
export async function deleteLocation(locationId: string): Promise<void> {
  const supabase = createAdminClient();

  // Prevent deleting primary location
  const location = await getLocation(locationId);
  if (location?.is_primary) {
    throw new Error('Cannot delete primary location');
  }

  const { error } = await supabase
    .from('client_locations')
    .delete()
    .eq('id', locationId);

  if (error) throw new Error(`Failed to delete location: ${error.message}`);
}

/**
 * Calculate total monthly cost for a client with locations
 */
export async function calculateLocationPricing(
  clientId: string,
  basePlanPriceCents: number
): Promise<{
  base_plan: number;
  addon_locations: number;
  addon_count: number;
  total_monthly: number;
}> {
  const locations = await getClientLocations(clientId);
  const addons = locations.filter((l) => l.is_addon);
  const addonTotal = addons.reduce((sum, l) => sum + (l.addon_price_cents || 0), 0);

  return {
    base_plan: basePlanPriceCents,
    addon_locations: addonTotal,
    addon_count: addons.length,
    total_monthly: basePlanPriceCents + addonTotal,
  };
}

/**
 * Calculate commission for location add-ons
 */
export function calculateLocationCommission(addonPriceCents: number): {
  upfront: number;
  recurring_10: number;
  recurring_15: number;
  max_potential: number;
} {
  const upfront = Math.round(addonPriceCents * 0.5);
  const recurring10 = Math.round(addonPriceCents * 0.1);
  const recurring15 = Math.round(addonPriceCents * 0.15);

  // 3 months at 10% + 9 months at 15%
  const maxRecurring = recurring10 * 3 + recurring15 * 9;
  const maxPotential = upfront + maxRecurring;

  return {
    upfront,
    recurring_10: recurring10,
    recurring_15: recurring15,
    max_potential: maxPotential,
  };
}

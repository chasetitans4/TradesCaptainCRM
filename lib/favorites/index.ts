// =====================================================
// FAVORITES & RECENTLY VIEWED LIBRARY
// Track user favorites and recently viewed items
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
const favoritesLogger = logger.child({ context: 'favorites' });

export type EntityType = 'customer' | 'job' | 'lead' | 'invoice' | 'quote';

export interface Favorite {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  created_at: string;
  // Joined data
  entity?: {
    id: string;
    name?: string;
    title?: string;
  };
}

export interface RecentlyViewed {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  viewed_at: string;
  // Joined data
  entity?: {
    id: string;
    name?: string;
    title?: string;
  };
}

// =====================================================
// FAVORITES
// =====================================================

/**
 * Add an item to favorites
 */
export async function addFavorite(
  userId: string,
  entityType: EntityType,
  entityId: string
): Promise<Favorite> {
  const supabase = await createClient();

  // Check if already favorited
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  if (existing) {
    // Return existing favorite
    const { data } = await supabase
      .from('favorites')
      .select('*')
      .eq('id', existing.id)
      .single();
    return data!;
  }

  const { data, error } = await supabase
    .from('favorites')
    .insert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
    })
    .select()
    .single();

  if (error) {
    favoritesLogger.error({
      msg: 'Error adding favorite',
      userId,
      entityType,
      entityId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to add favorite');
  }

  return data;
}

/**
 * Remove an item from favorites
 */
export async function removeFavorite(
  userId: string,
  entityType: EntityType,
  entityId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  if (error) {
    favoritesLogger.error({
      msg: 'Error removing favorite',
      userId,
      entityType,
      entityId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to remove favorite');
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  userId: string,
  entityType: EntityType,
  entityId: string
): Promise<{ isFavorite: boolean }> {
  const supabase = await createClient();

  // Check if favorited
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  if (existing) {
    await removeFavorite(userId, entityType, entityId);
    return { isFavorite: false };
  } else {
    await addFavorite(userId, entityType, entityId);
    return { isFavorite: true };
  }
}

/**
 * Check if item is favorited
 */
export async function isFavorite(
  userId: string,
  entityType: EntityType,
  entityId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  return !!data;
}

/**
 * Get user's favorites by type
 */
export async function getFavorites(
  userId: string,
  entityType?: EntityType
): Promise<Favorite[]> {
  const supabase = await createClient();

  let query = supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  const { data, error } = await query;

  if (error) {
    favoritesLogger.error({
      msg: 'Error fetching favorites',
      userId,
      entityType,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to fetch favorites');
  }

  // Enrich with entity data
  const enriched = await enrichFavorites(data || []);
  return enriched;
}

/**
 * Enrich favorites with entity data
 */
async function enrichFavorites(favorites: Favorite[]): Promise<Favorite[]> {
  if (favorites.length === 0) return [];

  const supabase = await createClient();
  const enriched: Favorite[] = [];

  // Group by entity type
  const byType: Record<string, Favorite[]> = {};
  for (const fav of favorites) {
    if (!byType[fav.entity_type]) byType[fav.entity_type] = [];
    byType[fav.entity_type].push(fav);
  }

  // Fetch entity data for each type
  for (const [type, items] of Object.entries(byType)) {
    const ids = items.map((i) => i.entity_id);
    const table = getTableName(type as EntityType);
    const nameField = getNameField(type as EntityType);

    const { data: entities } = await supabase
      .from(table)
      .select(`id, ${nameField}`)
      .in('id', ids);

    const entityMap = new Map<string, Record<string, any>>(
      (entities as Array<Record<string, any>> | undefined)?.map((e) => [String(e.id), e]) || []
    );

    for (const item of items) {
      const entity = entityMap.get(item.entity_id);
      enriched.push({
        ...item,
        entity: entity
          ? {
              id: String(entity.id),
              name: entity[nameField] as string | undefined,
            }
          : undefined,
      });
    }
  }

  // Re-sort by created_at
  return enriched.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// =====================================================
// RECENTLY VIEWED
// =====================================================

/**
 * Record a viewed item
 */
export async function recordView(
  userId: string,
  entityType: EntityType,
  entityId: string
): Promise<void> {
  const supabase = await createClient();

  // Upsert - update if exists, insert if not
  const { error } = await supabase
    .from('recently_viewed')
    .upsert(
      {
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        viewed_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,entity_type,entity_id',
      }
    );

  if (error) {
    // Silently fail - this is not critical
    favoritesLogger.warn({
      msg: 'Error recording view',
      userId,
      entityType,
      entityId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
  }

  // Clean up old entries (keep last 50 per user)
  await cleanupRecentlyViewed(userId);
}

/**
 * Get recently viewed items
 */
export async function getRecentlyViewed(
  userId: string,
  limit: number = 10,
  entityType?: EntityType
): Promise<RecentlyViewed[]> {
  const supabase = await createClient();

  let query = supabase
    .from('recently_viewed')
    .select('*')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(limit);

  if (entityType) {
    query = query.eq('entity_type', entityType);
  }

  const { data, error } = await query;

  if (error) {
    favoritesLogger.error({
      msg: 'Error fetching recently viewed',
      userId,
      entityType,
      limit,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return [];
  }

  // Enrich with entity data
  const enriched = await enrichRecentlyViewed(data || []);
  return enriched;
}

/**
 * Enrich recently viewed with entity data
 */
async function enrichRecentlyViewed(
  items: RecentlyViewed[]
): Promise<RecentlyViewed[]> {
  if (items.length === 0) return [];

  const supabase = await createClient();
  const enriched: RecentlyViewed[] = [];

  // Group by entity type
  const byType: Record<string, RecentlyViewed[]> = {};
  for (const item of items) {
    if (!byType[item.entity_type]) byType[item.entity_type] = [];
    byType[item.entity_type].push(item);
  }

  // Fetch entity data for each type
  for (const [type, typeItems] of Object.entries(byType)) {
    const ids = typeItems.map((i) => i.entity_id);
    const table = getTableName(type as EntityType);
    const nameField = getNameField(type as EntityType);

    const { data: entities } = await supabase
      .from(table)
      .select(`id, ${nameField}`)
      .in('id', ids);

    const entityMap = new Map<string, Record<string, any>>(
      (entities as Array<Record<string, any>> | undefined)?.map((e) => [String(e.id), e]) || []
    );

    for (const item of typeItems) {
      const entity = entityMap.get(item.entity_id);
      enriched.push({
        ...item,
        entity: entity
          ? {
              id: String(entity.id),
              name: entity[nameField] as string | undefined,
            }
          : undefined,
      });
    }
  }

  // Re-sort by viewed_at
  return enriched.sort(
    (a, b) => new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime()
  );
}

/**
 * Clean up old recently viewed entries
 */
async function cleanupRecentlyViewed(userId: string): Promise<void> {
  const supabase = await createClient();

  // Get IDs of entries to keep (newest 50)
  const { data: toKeep } = await supabase
    .from('recently_viewed')
    .select('id')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(50);

  if (!toKeep || toKeep.length < 50) return;

  const keepIds = toKeep.map((r) => r.id);

  // Delete entries not in the keep list
  await supabase
    .from('recently_viewed')
    .delete()
    .eq('user_id', userId)
    .not('id', 'in', `(${keepIds.join(',')})`);
}

/**
 * Clear recently viewed for a user
 */
export async function clearRecentlyViewed(userId: string): Promise<void> {
  const supabase = await createClient();

  await supabase.from('recently_viewed').delete().eq('user_id', userId);
}

// =====================================================
// HELPERS
// =====================================================

function getTableName(entityType: EntityType): string {
  switch (entityType) {
    case 'customer':
      return 'customers';
    case 'job':
      return 'jobs';
    case 'lead':
      return 'leads';
    case 'invoice':
      return 'invoices';
    case 'quote':
      return 'quotes';
    default:
      return 'customers';
  }
}

function getNameField(entityType: EntityType): string {
  switch (entityType) {
    case 'customer':
    case 'lead':
      return 'name';
    case 'job':
      return 'service_type';
    case 'invoice':
      return 'invoice_number';
    case 'quote':
      return 'quote_number';
    default:
      return 'name';
  }
}

/**
 * Get href for entity
 */
export function getEntityHref(entityType: EntityType, entityId: string): string {
  switch (entityType) {
    case 'customer':
      return `/customers/${entityId}`;
    case 'job':
      return `/jobs/${entityId}`;
    case 'lead':
      return `/leads/${entityId}`;
    case 'invoice':
      return `/invoices/${entityId}`;
    case 'quote':
      return `/quotes/${entityId}`;
    default:
      return '/';
  }
}

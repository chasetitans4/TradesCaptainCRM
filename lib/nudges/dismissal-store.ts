/**
 * Nudge Dismissal Store
 *
 * Per CIL Spec Section 1.2:
 * - Dismissals respected, no reappearing unless conditions materially change
 * - localStorage + server sync
 * - Re-enable only on material condition change
 */

import type { NudgeDismissal, NudgeSource, NudgeEntityType } from './types';

const STORAGE_KEY = 'tc_nudge_dismissals';
const SYNC_DEBOUNCE_MS = 1000;

/**
 * Generate a unique key for a dismissal
 */
export function getDismissalKey(
  nudgeType: NudgeSource,
  entityType?: NudgeEntityType,
  entityId?: string,
  contextKey?: string
): string {
  const parts: string[] = [nudgeType];
  if (entityType) parts.push(entityType);
  if (entityId) parts.push(entityId);
  if (contextKey) parts.push(contextKey);
  return parts.join(':');
}

/**
 * Local storage helpers
 */
function getLocalDismissals(): Map<string, NudgeDismissal> {
  if (typeof window === 'undefined') return new Map();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored) as NudgeDismissal[];
    const map = new Map<string, NudgeDismissal>();

    for (const d of parsed) {
      const key = getDismissalKey(d.nudgeType, d.entityType, d.entityId, d.contextKey);

      // Skip expired dismissals
      if (d.expiresAt && new Date(d.expiresAt) < new Date()) {
        continue;
      }

      map.set(key, {
        ...d,
        dismissedAt: new Date(d.dismissedAt),
        expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
      });
    }

    return map;
  } catch {
    return new Map();
  }
}

function saveLocalDismissals(dismissals: Map<string, NudgeDismissal>): void {
  if (typeof window === 'undefined') return;

  try {
    const array = Array.from(dismissals.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
  } catch {
    // Storage full or unavailable
  }
}

/**
 * In-memory dismissal cache
 */
let dismissalCache: Map<string, NudgeDismissal> | null = null;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize the dismissal cache
 */
function ensureCache(): Map<string, NudgeDismissal> {
  if (!dismissalCache) {
    dismissalCache = getLocalDismissals();
  }
  return dismissalCache;
}

/**
 * Check if a nudge is dismissed
 */
export function isNudgeDismissed(
  nudgeType: NudgeSource,
  entityType?: NudgeEntityType,
  entityId?: string,
  contextKey?: string
): boolean {
  const cache = ensureCache();
  const key = getDismissalKey(nudgeType, entityType, entityId, contextKey);
  const dismissal = cache.get(key);

  if (!dismissal) return false;

  // Check if expired
  if (dismissal.expiresAt && dismissal.expiresAt < new Date()) {
    cache.delete(key);
    saveLocalDismissals(cache);
    return false;
  }

  return true;
}

/**
 * Dismiss a nudge
 */
export async function dismissNudge(
  userId: string,
  nudgeType: NudgeSource,
  options: {
    entityType?: NudgeEntityType;
    entityId?: string;
    contextKey?: string;
    expiresAt?: Date | null;
  } = {}
): Promise<void> {
  const cache = ensureCache();
  const key = getDismissalKey(nudgeType, options.entityType, options.entityId, options.contextKey);

  const dismissal: NudgeDismissal = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    userId,
    nudgeType,
    entityType: options.entityType,
    entityId: options.entityId,
    contextKey: options.contextKey,
    dismissedAt: new Date(),
    expiresAt: options.expiresAt,
  };

  cache.set(key, dismissal);
  saveLocalDismissals(cache);

  // Debounced server sync
  scheduleSyncToServer(userId);
}

/**
 * Un-dismiss a nudge (for material condition changes)
 */
export function undismissNudge(
  nudgeType: NudgeSource,
  entityType?: NudgeEntityType,
  entityId?: string,
  contextKey?: string
): void {
  const cache = ensureCache();
  const key = getDismissalKey(nudgeType, entityType, entityId, contextKey);
  cache.delete(key);
  saveLocalDismissals(cache);
}

/**
 * Get all active dismissals
 */
export function getActiveDismissals(): NudgeDismissal[] {
  const cache = ensureCache();
  const now = new Date();

  return Array.from(cache.values()).filter(
    (d) => !d.expiresAt || d.expiresAt > now
  );
}

/**
 * Get dismissals for a specific entity
 */
export function getDismissalsForEntity(
  entityType: NudgeEntityType,
  entityId: string
): NudgeDismissal[] {
  const cache = ensureCache();

  return Array.from(cache.values()).filter(
    (d) =>
      d.entityType === entityType &&
      d.entityId === entityId &&
      (!d.expiresAt || d.expiresAt > new Date())
  );
}

/**
 * Clear all dismissals (for testing/reset)
 */
export function clearAllDismissals(): void {
  dismissalCache = new Map();
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Clear expired dismissals
 */
export function cleanupExpiredDismissals(): number {
  const cache = ensureCache();
  const now = new Date();
  let removed = 0;

  for (const [key, dismissal] of cache) {
    if (dismissal.expiresAt && dismissal.expiresAt < now) {
      cache.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    saveLocalDismissals(cache);
  }

  return removed;
}

/**
 * Schedule sync to server (debounced)
 */
function scheduleSyncToServer(userId: string): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    syncDismissalsToServer(userId);
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Sync dismissals to server
 */
async function syncDismissalsToServer(userId: string): Promise<void> {
  try {
    const dismissals = getActiveDismissals();

    await fetch('/api/nudges/dismiss/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, dismissals }),
    });
  } catch (error) {
    // Silently fail - local storage is source of truth for offline
    console.debug('Failed to sync nudge dismissals:', error);
  }
}

/**
 * Load dismissals from server (on app init)
 */
export async function loadDismissalsFromServer(userId: string): Promise<void> {
  try {
    const response = await fetch(`/api/nudges/dismiss?userId=${userId}`);
    if (!response.ok) return;

    const serverDismissals = (await response.json()) as NudgeDismissal[];
    const cache = ensureCache();

    // Merge server dismissals with local (local takes precedence for conflicts)
    for (const sd of serverDismissals) {
      const key = getDismissalKey(sd.nudgeType, sd.entityType, sd.entityId, sd.contextKey);

      if (!cache.has(key)) {
        cache.set(key, {
          ...sd,
          dismissedAt: new Date(sd.dismissedAt),
          expiresAt: sd.expiresAt ? new Date(sd.expiresAt) : null,
        });
      }
    }

    saveLocalDismissals(cache);
  } catch {
    // Use local storage only
  }
}

/**
 * Material condition change - reset dismissals for an entity
 *
 * Per spec: Re-enable only on material condition change
 * Examples:
 * - Inactivity threshold crossed (e.g., 12-month mark)
 * - Equipment age milestone reached
 * - Agreement status changed
 * - 6+ months since dismissal (for certain nudges)
 */
export function handleMaterialConditionChange(
  entityType: NudgeEntityType,
  entityId: string,
  changeType: 'threshold_crossed' | 'status_changed' | 'milestone_reached'
): void {
  const cache = ensureCache();
  let changed = false;

  // Find and remove dismissals for this entity
  for (const [key, dismissal] of cache) {
    if (dismissal.entityType === entityType && dismissal.entityId === entityId) {
      cache.delete(key);
      changed = true;
    }
  }

  if (changed) {
    saveLocalDismissals(cache);
  }
}

/**
 * Calculate context hash for material change detection
 */
export function calculateContextHash(data: Record<string, unknown>): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Check if context has materially changed
 */
export function hasContextChanged(
  nudgeType: NudgeSource,
  entityType: NudgeEntityType,
  entityId: string,
  currentHash: string
): boolean {
  const cache = ensureCache();
  const key = getDismissalKey(nudgeType, entityType, entityId);
  const dismissal = cache.get(key);

  // No dismissal = show nudge
  if (!dismissal) return true;

  // Check if the context key (hash) has changed
  if (dismissal.contextKey && dismissal.contextKey !== currentHash) {
    // Material change detected - remove dismissal
    cache.delete(key);
    saveLocalDismissals(cache);
    return true;
  }

  return false;
}

// =====================================================
// INTERNAL CLOCK - Server Time Sync
// =====================================================

// Server time offset (difference between client and server)
let serverTimeOffset = 0;
let lastSyncTime = 0;
const SYNC_INTERVAL = 5 * 60 * 1000; // Re-sync every 5 minutes
import { logger } from '@/lib/logger';
const clockLogger = logger.child({ context: 'utils.clock' });

/**
 * Sync client time with server time
 */
export async function syncServerTime(): Promise<void> {
  try {
    const clientTime = Date.now();

    const response = await fetch('/api/time');
    if (!response.ok) {
      return;
    }

    const { serverTime } = await response.json();

    const roundTripTime = Date.now() - clientTime;
    const estimatedServerTime = serverTime + roundTripTime / 2;

    serverTimeOffset = estimatedServerTime - Date.now();
    lastSyncTime = Date.now();
  } catch (error) {
    clockLogger.warn({
      msg: 'Error syncing server time',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
  }
}

/**
 * Check if sync is needed and sync if so
 */
export async function ensureSynced(): Promise<void> {
  if (Date.now() - lastSyncTime > SYNC_INTERVAL) {
    await syncServerTime();
  }
}

/**
 * Get current server time
 */
export function getServerTime(): Date {
  return new Date(Date.now() + serverTimeOffset);
}

/**
 * Get current server timestamp in ISO format
 */
export function getTimestamp(): string {
  return getServerTime().toISOString();
}

/**
 * Format server time for display
 */
export function formatServerTime(
  format: 'time' | 'datetime' | 'date' = 'time',
  options?: {
    hour12?: boolean;
    showSeconds?: boolean;
  }
): string {
  const now = getServerTime();
  const { hour12 = true, showSeconds = true } = options || {};

  switch (format) {
    case 'time':
      return now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: showSeconds ? '2-digit' : undefined,
        hour12,
      });
    case 'datetime':
      return now.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    case 'date':
      return now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
  }
}

/**
 * Get the time offset from server (for debugging)
 */
export function getTimeOffset(): number {
  return serverTimeOffset;
}

import type { TrainingAnalyticsEvent } from '@/types/training';

// Buffer for batched analytics events
const analyticsBuffer: TrainingAnalyticsEvent[] = [];

/**
 * Track a training analytics event
 * Events are buffered and sent in batches
 */
export function trackTrainingEvent(event: Omit<TrainingAnalyticsEvent, 'id' | 'created_at'>): void {
  analyticsBuffer.push({
    ...event,
    timestamp: Date.now(),
  });
}

/**
 * Track module started event
 */
export function trackModuleStarted(
  businessId: string,
  userId: string,
  moduleId: string,
  metadata?: Record<string, unknown>
): void {
  trackTrainingEvent({
    business_id: businessId,
    user_id: userId,
    module_id: moduleId,
    event_type: 'module_started',
    metadata,
  });
}

/**
 * Track module completed event
 */
export function trackModuleCompleted(
  businessId: string,
  userId: string,
  moduleId: string,
  durationSeconds: number,
  metadata?: Record<string, unknown>
): void {
  trackTrainingEvent({
    business_id: businessId,
    user_id: userId,
    module_id: moduleId,
    event_type: 'module_completed',
    duration_seconds: durationSeconds,
    metadata,
  });
}

/**
 * Track module skipped event
 */
export function trackModuleSkipped(
  businessId: string,
  userId: string,
  moduleId: string,
  stepIndex: number
): void {
  trackTrainingEvent({
    business_id: businessId,
    user_id: userId,
    module_id: moduleId,
    event_type: 'module_skipped',
    step_index: stepIndex,
  });
}

/**
 * Track module exited event
 */
export function trackModuleExited(
  businessId: string,
  userId: string,
  moduleId: string,
  stepIndex: number,
  durationSeconds?: number
): void {
  trackTrainingEvent({
    business_id: businessId,
    user_id: userId,
    module_id: moduleId,
    event_type: 'module_exited',
    step_index: stepIndex,
    duration_seconds: durationSeconds,
  });
}

/**
 * Track checkpoint passed event
 */
export function trackCheckpointPassed(
  businessId: string,
  userId: string,
  moduleId: string,
  stepIndex: number
): void {
  trackTrainingEvent({
    business_id: businessId,
    user_id: userId,
    module_id: moduleId,
    event_type: 'checkpoint_passed',
    step_index: stepIndex,
  });
}

/**
 * Track checkpoint failed event
 */
export function trackCheckpointFailed(
  businessId: string,
  userId: string,
  moduleId: string,
  stepIndex: number
): void {
  trackTrainingEvent({
    business_id: businessId,
    user_id: userId,
    module_id: moduleId,
    event_type: 'checkpoint_failed',
    step_index: stepIndex,
  });
}

/**
 * Track TTS toggle event
 */
export function trackTTSToggle(
  businessId: string,
  userId: string,
  moduleId: string,
  enabled: boolean
): void {
  trackTrainingEvent({
    business_id: businessId,
    user_id: userId,
    module_id: moduleId,
    event_type: enabled ? 'tts_enabled' : 'tts_disabled',
  });
}

/**
 * Flush analytics buffer to server
 * Uses sendBeacon for reliability on page close
 */
export function flushAnalytics(): void {
  if (analyticsBuffer.length === 0) return;

  const events = [...analyticsBuffer];
  analyticsBuffer.length = 0;

  // Use sendBeacon if available (works even on page close)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon(
      '/api/training/analytics',
      JSON.stringify(events)
    );
  } else if (typeof fetch !== 'undefined') {
    // Fallback to fetch
    fetch('/api/training/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
      keepalive: true,
    }).catch((error) => {
      console.warn('[Training Analytics] Failed to send events:', error);
    });
  }
}

/**
 * Get buffered event count (for testing)
 */
export function getBufferedEventCount(): number {
  return analyticsBuffer.length;
}

/**
 * Setup auto-flush on page unload
 */
export function setupAnalyticsAutoFlush(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUnload = () => flushAnalytics();

  window.addEventListener('beforeunload', handleUnload);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAnalytics();
    }
  });

  return () => {
    window.removeEventListener('beforeunload', handleUnload);
  };
}

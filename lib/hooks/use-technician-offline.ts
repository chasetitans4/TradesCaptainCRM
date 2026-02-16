'use client';

import { useCallback } from 'react';
import { STORES } from '@/lib/offline/indexeddb';
import { queueOfflineMutation } from '@/lib/offline/mutation-queue';
import { isIndexedDBAvailable } from '@/lib/offline/indexeddb';
import type { WrapUpCompletionStatus } from '@/types';

interface QueuedResult {
  queued: true;
  mutationId: string;
}

/**
 * Hook providing offline-capable wrappers for technician actions.
 * When online, calls the API directly. When offline, queues the mutation
 * for replay when connectivity returns.
 */
export function useTechnicianOffline() {

  /**
   * POST to an API endpoint. If offline, queue the mutation.
   * Returns the JSON response when online, or a { queued, mutationId } object when offline.
   */
  const offlinePost = useCallback(async <T = any>(
    url: string,
    body: Record<string, any>,
    /** Optional: entity ID if this updates an existing job (for optimistic update) */
    entityId?: string,
  ): Promise<T | QueuedResult> => {
    // Online path — call API directly
    if (navigator.onLine) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      return response.json();
    }

    // Offline path — queue mutation
    if (!isIndexedDBAvailable()) {
      throw new Error('You are offline and offline storage is not available.');
    }

    const { mutationId } = await queueOfflineMutation(
      STORES.JOBS,
      'update',
      {
        id: entityId || `pending-${Date.now()}`,
        _offlineAction: url,
        _offlineBody: body,
        _offlineTimestamp: new Date().toISOString(),
      } as any,
      entityId,
    );

    return { queued: true, mutationId } as QueuedResult;
  }, []);

  /** Start a job — works offline by queuing status change */
  const startJob = useCallback(async (jobId: string) => {
    return offlinePost(`/api/jobs/${jobId}/start`, {}, jobId);
  }, [offlinePost]);

  /** Complete a job — works offline by queuing status change */
  const completeJob = useCallback(async (jobId: string) => {
    return offlinePost(`/api/jobs/${jobId}/complete`, {}, jobId);
  }, [offlinePost]);

  /** Send "On My Way" notification — works offline by queuing */
  const onMyWay = useCallback(async (
    jobId: string,
    latitude: number,
    longitude: number,
  ) => {
    return offlinePost('/api/technician/on-the-way', {
      jobId,
      latitude,
      longitude,
    }, jobId);
  }, [offlinePost]);

  /** Send "Running Late" notification — works offline by queuing */
  const runningLate = useCallback(async (
    jobId: string,
    delayMinutes: number,
  ) => {
    return offlinePost('/api/technician/running-late', {
      jobId,
      delayMinutes,
    }, jobId);
  }, [offlinePost]);

  /** Wrap up a job — works offline by queuing */
  const wrapUpJob = useCallback(async (jobId: string, data: {
    completion_status: WrapUpCompletionStatus;
    invoice_ready?: boolean;
    return_reason?: string;
    return_scheduled_for?: string;
    callback_reason?: string;
    wrapup_started_at?: string;
  }) => {
    return offlinePost(`/api/jobs/${jobId}/wrapup`, data, jobId);
  }, [offlinePost]);

  return {
    startJob,
    completeJob,
    wrapUpJob,
    onMyWay,
    runningLate,
    offlinePost,
  };
}

/** Type guard: check if a result was queued offline */
export function isQueued(result: any): result is QueuedResult {
  return result != null && typeof result === 'object' && result.queued === true;
}

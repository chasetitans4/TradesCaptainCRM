'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  checkFeatureAvailability,
  getPrerequisiteStatuses,
  getAllPrerequisiteStatuses,
  getSetupProgress,
  invalidatePrerequisiteCache,
  type FeatureId,
  type PrerequisiteId,
  type PrerequisiteStatus,
  type FeatureAvailability,
} from '@/lib/onboarding/prerequisites';

/**
 * Hook to check if a specific feature is available
 */
export function useFeatureAvailability(featureId: FeatureId) {
  const [availability, setAvailability] = useState<FeatureAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      invalidatePrerequisiteCache();
      const result = await checkFeatureAvailability(featureId);
      setAvailability(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check feature availability'));
    } finally {
      setLoading(false);
    }
  }, [featureId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    availability,
    loading,
    error,
    refresh,
    isAvailable: availability?.available ?? false,
    missingPrerequisites: availability?.missingPrerequisites ?? [],
    recommendedPrerequisites: availability?.recommendedPrerequisites ?? [],
    message: availability?.message ?? '',
  };
}

/**
 * Hook to check specific prerequisites
 */
export function usePrerequisites(ids: PrerequisiteId[]) {
  const [statuses, setStatuses] = useState<PrerequisiteStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      invalidatePrerequisiteCache();
      const result = await getPrerequisiteStatuses(ids);
      setStatuses(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check prerequisites'));
    } finally {
      setLoading(false);
    }
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    statuses,
    loading,
    error,
    refresh,
    allConfigured: statuses.every((s) => s.configured),
    configured: statuses.filter((s) => s.configured),
    missing: statuses.filter((s) => !s.configured),
  };
}

/**
 * Hook to get all prerequisites status (for setup page)
 */
export function useAllPrerequisites() {
  const [statuses, setStatuses] = useState<PrerequisiteStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      invalidatePrerequisiteCache();
      const result = await getAllPrerequisiteStatuses();
      setStatuses(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check prerequisites'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const byPriority = {
    required: statuses.filter((s) => s.priority === 'required'),
    recommended: statuses.filter((s) => s.priority === 'recommended'),
    optional: statuses.filter((s) => s.priority === 'optional'),
  };

  return {
    statuses,
    loading,
    error,
    refresh,
    byPriority,
    configured: statuses.filter((s) => s.configured),
    missing: statuses.filter((s) => !s.configured),
  };
}

/**
 * Hook to get setup progress
 */
export function useSetupProgress() {
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
    percentage: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      invalidatePrerequisiteCache();
      const result = await getSetupProgress();
      setProgress(result);
    } catch (err) {
      console.error('Failed to get setup progress:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    progress,
    loading,
    refresh,
    completed: progress?.completed ?? 0,
    total: progress?.total ?? 0,
    percentage: progress?.percentage ?? 0,
  };
}

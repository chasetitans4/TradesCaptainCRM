'use client';

import { useState, useEffect } from 'react';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';

/**
 * Hook to get today's remaining job count for sidebar badge.
 * Refreshes every 60 seconds. Only queries for technicians.
 */
export function useTodayJobCount(): number | null {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout | null = null;

    async function fetchCount() {
      try {
        const profile = await getCurrentUserProfile();
        if (!profile || !mounted) return;

        const supabase = createClient();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);

        let query = supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .gte('scheduled_date', todayStart.toISOString())
          .lt('scheduled_date', todayEnd.toISOString())
          .in('status', ['scheduled', 'in_progress']);

        if (profile.role === 'technician') {
          query = query.eq('assigned_user_id', profile.id);
        }

        const { count: jobCount } = await query;
        if (mounted) setCount(jobCount ?? 0);
      } catch {
        // Silently fail - badge is non-critical
      }
    }

    fetchCount();
    interval = setInterval(fetchCount, 60000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  return count;
}

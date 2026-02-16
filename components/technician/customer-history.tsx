'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton-loaders';
import { History, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

interface PastJob {
  id: string;
  service_type: string;
  title: string | null;
  scheduled_date: string;
  status: string;
  price: number | null;
  tech_notes: string | null;
  completion_notes: string | null;
}

interface CustomerHistoryProps {
  customerId: string;
  currentJobId: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
  scheduled: 'bg-info/10 text-info',
  in_progress: 'bg-warning/10 text-warning',
};

export function CustomerHistory({ customerId, currentJobId }: CustomerHistoryProps) {
  const [jobs, setJobs] = useState<PastJob[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!expanded || loaded) return;

    async function loadHistory() {
      const supabase = createClient();
      const { data } = await supabase
        .from('jobs')
        .select('id, service_type, title, scheduled_date, status, price, tech_notes, completion_notes')
        .eq('customer_id', customerId)
        .neq('id', currentJobId)
        .order('scheduled_date', { ascending: false })
        .limit(5);

      if (data) setJobs(data);
      setLoaded(true);
    }

    loadHistory();
  }, [expanded, loaded, customerId, currentJobId]);

  return (
    <div>
      <button
        className="w-full px-4 py-2.5 flex items-center gap-2 text-sm hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <History className="h-4 w-4 text-primary" />
        <span className="font-medium text-text">Past Jobs</span>
        <span className="ml-auto text-xs text-text-muted">
          {loaded ? (jobs.length > 0 ? `${jobs.length} recent` : 'None') : 'Tap to view'}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <div className={`expandable ${expanded ? 'open' : ''}`}>
        <div className="px-4 pb-3 space-y-2">
          {!loaded ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-lg bg-muted/30 p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <Skeleton index={i * 2} className="h-4 w-32" />
                    <Skeleton index={i * 2 + 1} className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton index={i * 2 + 2} className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-2">No previous jobs</p>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="rounded-lg bg-muted/30 p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text truncate">
                    {job.title || job.service_type}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {job.price !== null && (
                      <Badge variant="outline" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-0.5" />
                        {job.price.toLocaleString()}
                      </Badge>
                    )}
                    <Badge className={cn('text-xs', STATUS_COLORS[job.status] || 'bg-muted')}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-text-muted">
                  {new Date(job.scheduled_date).toLocaleDateString()}
                </p>
                {job.tech_notes && (
                  <p className="text-xs text-text-muted truncate">
                    {job.tech_notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

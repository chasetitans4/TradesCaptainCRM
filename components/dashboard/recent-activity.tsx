'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle,
  MessageSquare,
  FileText,
  UserPlus,
  DollarSign,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ActivityItem {
  id: string;
  type: 'job_completed' | 'message_received' | 'quote_sent' | 'lead_created' | 'payment_received';
  title: string;
  description: string;
  timestamp: Date;
  href?: string;
}

const activityIcons = {
  job_completed: { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  message_received: { icon: MessageSquare, color: 'text-blue-600 bg-blue-100' },
  quote_sent: { icon: FileText, color: 'text-purple-600 bg-purple-100' },
  lead_created: { icon: UserPlus, color: 'text-amber-600 bg-amber-100' },
  payment_received: { icon: DollarSign, color: 'text-green-600 bg-green-100' },
};

interface RecentActivityProps {
  activities?: ActivityItem[];
  loading?: boolean;
}

export function RecentActivity({ activities = [], loading }: RecentActivityProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-xl border shadow-soft">
        <div className="p-5 border-b">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="divide-y">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-muted rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse mt-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-soft">
      {/* Header */}
      <div className="p-5 border-b flex items-center justify-between">
        <h2 className="font-semibold">Recent Activity</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/activity" className="gap-1">
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {/* Activity List */}
      <div className="divide-y">
        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          activities.slice(0, 5).map((activity) => {
            const { icon: Icon, color } = activityIcons[activity.type];
            const content = (
              <div className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors">
                <div className={cn('p-2 rounded-full flex-shrink-0', color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </span>
              </div>
            );

            if (activity.href) {
              return (
                <Link key={activity.id} href={activity.href}>
                  {content}
                </Link>
              );
            }

            return <div key={activity.id}>{content}</div>;
          })
        )}
      </div>
    </div>
  );
}

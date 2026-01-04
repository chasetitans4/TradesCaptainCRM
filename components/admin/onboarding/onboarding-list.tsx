'use client';

// =====================================================
// ONBOARDING LIST COMPONENT
// Shows all clients in onboarding process
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, ChevronRight, Clock, AlertTriangle } from 'lucide-react';

interface OnboardingTask {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
}

interface ClientOnboarding {
  id: string;
  client_id: string;
  client_name: string;
  plan_track: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'stalled';
  started_at: string | null;
  completed_at: string | null;
  tasks: OnboardingTask[];
  progress_percent: number;
  days_in_onboarding: number;
}

interface OnboardingListProps {
  onboardings: ClientOnboarding[];
  loading: boolean;
  onClientClick: (clientId: string) => void;
}

export function OnboardingList({
  onboardings,
  loading,
  onClientClick,
}: OnboardingListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Active Onboardings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string, daysInOnboarding: number) => {
    if (status === 'completed') {
      return <Badge className="bg-green-500">Completed</Badge>;
    }
    if (status === 'stalled' || daysInOnboarding > 14) {
      return <Badge variant="destructive">Stalled</Badge>;
    }
    if (daysInOnboarding > 7) {
      return <Badge className="bg-yellow-500">Slow</Badge>;
    }
    return <Badge className="bg-blue-500">In Progress</Badge>;
  };

  const getPlanBadge = (track: string) => {
    const colors: Record<string, string> = {
      nevermiss: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      gold: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      starter: 'bg-muted text-muted-foreground',
    };
    return (
      <Badge variant="outline" className={colors[track] || colors.starter}>
        {track.charAt(0).toUpperCase() + track.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          Active Onboardings ({onboardings.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {onboardings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No active onboardings
          </div>
        ) : (
          <div className="space-y-3">
            {onboardings.map((onboarding) => {
              const completedTasks = onboarding.tasks.filter(
                (t) => t.status === 'completed'
              ).length;
              const totalTasks = onboarding.tasks.length;
              const blockedTasks = onboarding.tasks.filter(
                (t) => t.status === 'blocked'
              ).length;

              return (
                <div
                  key={onboarding.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onClientClick(onboarding.client_id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {onboarding.client_name}
                        </span>
                        {getPlanBadge(onboarding.plan_track)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Day {onboarding.days_in_onboarding}
                        </span>
                        <span>
                          {completedTasks}/{totalTasks} tasks
                        </span>
                        {blockedTasks > 0 && (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            {blockedTasks} blocked
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(
                        onboarding.status,
                        onboarding.days_in_onboarding
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <Progress value={onboarding.progress_percent} className="h-2" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

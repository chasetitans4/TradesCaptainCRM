'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/types';
import {
  Zap,
  Lock,
  Unlock,
  Briefcase,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface TechStats {
  jobsToday: number;
  jobsRemaining: number;
  lastCompletedAt: string | null;
  earnedToday?: number;
  pendingToday?: number;
}

interface TechModeHeaderProps {
  stats: TechStats | null;
  userRole: UserRole;
  isLocked: boolean;
  lockPressProgress: number;
  onLockToggle: () => void;
  onLockPressStart: () => void;
  onLockPressEnd: () => void;
}

export function TechModeHeader({
  stats,
  userRole,
  isLocked,
  lockPressProgress,
  onLockToggle,
  onLockPressStart,
  onLockPressEnd,
}: TechModeHeaderProps) {
  const isOwnerOrAdmin = userRole === 'owner' || userRole === 'admin';
  const showRevenue = isOwnerOrAdmin && stats?.earnedToday !== undefined;

  // Format time since last completion
  const getLastCompletedText = () => {
    if (!stats?.lastCompletedAt) return 'None yet';
    const completed = new Date(stats.lastCompletedAt);
    const now = new Date();
    const diffMs = now.getTime() - completed.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  return (
    <div className="bg-primary text-primary-foreground">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Technician Mode</h1>
            <p className="text-xs text-primary-foreground/80">Today's Work</p>
          </div>
        </div>

        {/* Lock Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-10 w-10 rounded-full text-primary-foreground hover:bg-white/20',
            isLocked && 'bg-white/20'
          )}
          onClick={onLockToggle}
          onMouseDown={onLockPressStart}
          onMouseUp={onLockPressEnd}
          onMouseLeave={onLockPressEnd}
          onTouchStart={onLockPressStart}
          onTouchEnd={onLockPressEnd}
          aria-label={isLocked ? 'Unlock (hold for 3 seconds)' : 'Lock Technician Mode'}
        >
          {isLocked ? (
            <Lock className="h-5 w-5" />
          ) : (
            <Unlock className="h-5 w-5" />
          )}

          {/* Lock progress indicator */}
          {lockPressProgress > 0 && (
            <svg
              className="absolute inset-0 -rotate-90"
              viewBox="0 0 40 40"
            >
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${lockPressProgress * 1.13} 113`}
                className="text-white"
              />
            </svg>
          )}
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="px-4 pb-4">
        <div className="flex gap-2">
          {/* Jobs Today */}
          <StatPill
            icon={Briefcase}
            label="Jobs Today"
            value={stats?.jobsToday ?? 0}
          />

          {/* Jobs Remaining */}
          <StatPill
            icon={Clock}
            label="Remaining"
            value={stats?.jobsRemaining ?? 0}
            highlight={stats?.jobsRemaining === 0}
          />

          {/* Last Completed OR Revenue (for owners) */}
          {showRevenue ? (
            <StatPill
              icon={DollarSign}
              label="Earned"
              value={`$${(stats?.earnedToday ?? 0).toLocaleString()}`}
              highlight
            />
          ) : (
            <StatPill
              icon={CheckCircle2}
              label="Last Done"
              value={getLastCompletedText()}
            />
          )}
        </div>

        {/* Revenue toggle hint for owners */}
        {isOwnerOrAdmin && (
          <p className="text-xs text-primary-foreground/60 mt-2 text-center">
            {showRevenue
              ? `$${(stats?.pendingToday ?? 0).toLocaleString()} pending`
              : 'Tap to see revenue'}
          </p>
        )}
      </div>
    </div>
  );
}

interface StatPillProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  highlight?: boolean;
}

function StatPill({ icon: Icon, label, value, highlight }: StatPillProps) {
  return (
    <div
      className={cn(
        'flex-1 rounded-lg px-3 py-2 text-center',
        highlight
          ? 'bg-white/20 text-primary-foreground'
          : 'bg-white/10 text-primary-foreground/90'
      )}
    >
      <div className="flex items-center justify-center gap-1.5 mb-0.5">
        <Icon className="h-4 w-4" />
        <span className="text-lg font-bold">{value}</span>
      </div>
      <p className="text-[10px] uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

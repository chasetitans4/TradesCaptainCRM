'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ConversationState, StateTransitionLog, LeadUrgency, QualificationData } from '@/types/leads-captain';
import {
  MessageSquare,
  ClipboardCheck,
  CheckCircle2,
  ArrowRight,
  User,
  Clock,
  Ban,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
} from 'lucide-react';

// =====================================================
// STATE CONFIGURATION
// =====================================================

interface StateConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  description: string;
}

const STATE_CONFIG: Record<ConversationState, StateConfig> = {
  INITIATED: {
    label: 'Initiated',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: <MessageSquare className="h-3 w-3" />,
    description: 'Conversation started',
  },
  QUALIFYING: {
    label: 'Qualifying',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: <ClipboardCheck className="h-3 w-3" />,
    description: 'Gathering lead information',
  },
  QUALIFIED: {
    label: 'Qualified',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    icon: <CheckCircle2 className="h-3 w-3" />,
    description: 'Lead qualified',
  },
  ROUTED: {
    label: 'Routed',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: <ArrowRight className="h-3 w-3" />,
    description: 'Sent to team member',
  },
  HUMAN_ACTIVE: {
    label: 'Human',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: <User className="h-3 w-3" />,
    description: 'Human handling',
  },
  UNRESPONSIVE: {
    label: 'Unresponsive',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    icon: <Clock className="h-3 w-3" />,
    description: 'No recent response',
  },
  OPTED_OUT: {
    label: 'Opted Out',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: <Ban className="h-3 w-3" />,
    description: 'Customer opted out',
  },
  CLOSED: {
    label: 'Closed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: <XCircle className="h-3 w-3" />,
    description: 'Conversation ended',
  },
};

// =====================================================
// STATE BADGE COMPONENT
// =====================================================

interface StateBadgeProps {
  state: ConversationState;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export function StateBadge({ state, size = 'sm', showIcon = true, className }: StateBadgeProps) {
  const config = STATE_CONFIG[state];
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border-0',
        config.bgColor,
        config.color,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        className
      )}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}

// =====================================================
// URGENCY BADGE COMPONENT
// =====================================================

interface UrgencyBadgeProps {
  urgency: LeadUrgency;
  className?: string;
}

const URGENCY_CONFIG: Record<LeadUrgency, { label: string; color: string; bgColor: string }> = {
  routine: { label: 'Routine', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  soon: { label: 'Soon', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  urgent: { label: 'Urgent', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  emergency: { label: 'Emergency', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export function UrgencyBadge({ urgency, className }: UrgencyBadgeProps) {
  const config = URGENCY_CONFIG[urgency];
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border-0 text-xs px-2 py-0.5',
        config.bgColor,
        config.color,
        className
      )}
    >
      {urgency === 'emergency' && <AlertTriangle className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}

// =====================================================
// STATE TIMELINE COMPONENT
// =====================================================

interface StateTimelineProps {
  transitions: StateTransitionLog[];
  className?: string;
}

export function StateTimeline({ transitions, className }: StateTimelineProps) {
  if (!transitions || transitions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No state transitions recorded
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {transitions.map((transition, index) => {
        const toConfig = STATE_CONFIG[transition.to_state];
        const fromConfig = transition.from_state ? STATE_CONFIG[transition.from_state] : null;
        const isLatest = index === 0;

        return (
          <div
            key={transition.id}
            className={cn(
              'flex items-start gap-3 p-2 rounded-lg',
              isLatest && 'bg-muted/50'
            )}
          >
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  toConfig.bgColor,
                  toConfig.color
                )}
              >
                {toConfig.icon}
              </div>
              {index < transitions.length - 1 && (
                <div className="w-0.5 h-4 bg-border mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {fromConfig && (
                  <>
                    <span className="text-xs text-muted-foreground">{fromConfig.label}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </>
                )}
                <StateBadge state={transition.to_state} showIcon={false} />
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {new Date(transition.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <span>•</span>
                <span className="capitalize">{transition.triggered_by}</span>
              </div>
              {transition.reason && (
                <p className="mt-1 text-xs text-muted-foreground">{transition.reason}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// STATE LIFECYCLE INDICATOR
// =====================================================

interface StateLifecycleProps {
  currentState: ConversationState;
  className?: string;
}

const LIFECYCLE_ORDER: ConversationState[] = [
  'INITIATED',
  'QUALIFYING',
  'QUALIFIED',
  'ROUTED',
  'HUMAN_ACTIVE',
  'CLOSED',
];

export function StateLifecycle({ currentState, className }: StateLifecycleProps) {
  const currentIndex = LIFECYCLE_ORDER.indexOf(currentState);
  const isOffPath = currentState === 'OPTED_OUT' || currentState === 'UNRESPONSIVE';

  if (isOffPath) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <StateBadge state={currentState} />
        <span className="text-xs text-muted-foreground">
          {STATE_CONFIG[currentState].description}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {LIFECYCLE_ORDER.map((state, index) => {
        const config = STATE_CONFIG[state];
        const isActive = state === currentState;
        const isPast = index < currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={state} className="flex items-center">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs',
                isActive && cn(config.bgColor, config.color),
                isPast && 'bg-success/20 text-success',
                isFuture && 'bg-muted text-muted-foreground'
              )}
              title={config.label}
            >
              {isPast ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                config.icon
              )}
            </div>
            {index < LIFECYCLE_ORDER.length - 1 && (
              <div
                className={cn(
                  'w-4 h-0.5',
                  isPast ? 'bg-success/50' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =====================================================
// QUALIFICATION PROGRESS COMPONENT
// =====================================================

interface QualificationProgressProps {
  data: QualificationData;
  className?: string;
}

const QUALIFICATION_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'service_needed', label: 'Service', required: true },
  { key: 'urgency', label: 'Urgency', required: true },
  { key: 'address', label: 'Address', required: false },
  { key: 'availability', label: 'Availability', required: false },
] as const;

export function QualificationProgress({ data, className }: QualificationProgressProps) {
  const completedCount = QUALIFICATION_FIELDS.filter(
    (field) => data[field.key as keyof QualificationData]
  ).length;
  const requiredCount = QUALIFICATION_FIELDS.filter((f) => f.required).length;
  const completedRequired = QUALIFICATION_FIELDS.filter(
    (f) => f.required && data[f.key as keyof QualificationData]
  ).length;

  const isComplete = completedRequired >= requiredCount;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Qualification</span>
        <Badge variant={isComplete ? 'success' : 'secondary'}>
          {completedCount}/{QUALIFICATION_FIELDS.length}
        </Badge>
      </div>

      <div className="space-y-1">
        {QUALIFICATION_FIELDS.map((field) => {
          const value = data[field.key as keyof QualificationData];
          const hasValue = !!value;

          return (
            <div
              key={field.key}
              className={cn(
                'flex items-center justify-between text-sm p-1.5 rounded',
                hasValue ? 'bg-success/10' : field.required ? 'bg-muted' : 'bg-transparent'
              )}
            >
              <span className={cn('text-muted-foreground', hasValue && 'text-foreground')}>
                {field.label}
                {field.required && !hasValue && <span className="text-danger ml-1">*</span>}
              </span>
              {hasValue ? (
                <span className="font-medium truncate max-w-[150px]">
                  {String(value)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Missing</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =====================================================
// HUMAN TAKEOVER BADGE
// =====================================================

interface HumanTakeoverBadgeProps {
  isHumanActive: boolean;
  takenOverAt?: string | null;
  className?: string;
}

export function HumanTakeoverBadge({ isHumanActive, takenOverAt, className }: HumanTakeoverBadgeProps) {
  if (!isHumanActive) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border-0 bg-orange-100 text-orange-700',
        className
      )}
    >
      <User className="h-3 w-3" />
      Human Active
      {takenOverAt && (
        <span className="text-xs opacity-70 ml-1">
          since {new Date(takenOverAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      )}
    </Badge>
  );
}

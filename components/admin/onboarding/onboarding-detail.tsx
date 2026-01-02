'use client';

// =====================================================
// ONBOARDING DETAIL COMPONENT
// Shows detailed onboarding progress for a client
// Version: 5.8
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  MessageSquare,
} from 'lucide-react';

interface OnboardingTask {
  id: string;
  phase: number;
  title: string;
  description: string | null;
  assigned_to: 'agent' | 'client' | 'support';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  completed_at: string | null;
  notes: string | null;
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

interface OnboardingDetailProps {
  onboarding: ClientOnboarding;
  loading: boolean;
  onBack: () => void;
  onTaskUpdate: (
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'blocked',
    notes?: string
  ) => Promise<void>;
}

export function OnboardingDetail({
  onboarding,
  loading,
  onBack,
  onTaskUpdate,
}: OnboardingDetailProps) {
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({});
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleTaskToggle = async (task: OnboardingTask) => {
    setUpdatingTask(task.id);
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await onTaskUpdate(task.id, newStatus, taskNotes[task.id]);
    } finally {
      setUpdatingTask(null);
    }
  };

  const handleMarkBlocked = async (taskId: string) => {
    setUpdatingTask(taskId);
    try {
      await onTaskUpdate(taskId, 'blocked', taskNotes[taskId]);
    } finally {
      setUpdatingTask(null);
    }
  };

  // Group tasks by phase
  const phases = onboarding.tasks.reduce((acc, task) => {
    const phase = task.phase;
    if (!acc[phase]) {
      acc[phase] = [];
    }
    acc[phase].push(task);
    return acc;
  }, {} as Record<number, OnboardingTask[]>);

  const phaseLabels: Record<number, string> = {
    1: 'Day 1: Welcome & Setup',
    2: 'Days 2-3: Configuration',
    3: 'Days 4-7: Training & Go-Live',
    4: 'Days 8-14: Follow-up & Optimization',
  };

  const getPhaseProgress = (phaseTasks: OnboardingTask[]) => {
    const completed = phaseTasks.filter((t) => t.status === 'completed').length;
    return Math.round((completed / phaseTasks.length) * 100);
  };

  const getAssigneeBadge = (assignee: string) => {
    const colors: Record<string, string> = {
      agent: 'bg-blue-100 text-blue-800',
      client: 'bg-green-100 text-green-800',
      support: 'bg-purple-100 text-purple-800',
    };
    return (
      <Badge variant="outline" className={colors[assignee] || colors.agent}>
        {assignee.charAt(0).toUpperCase() + assignee.slice(1)}
      </Badge>
    );
  };

  const getTaskIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'blocked':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{onboarding.client_name}</h1>
          <p className="text-muted-foreground">
            Onboarding - Day {onboarding.days_in_onboarding}
          </p>
        </div>
      </div>

      {/* Progress Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {onboarding.progress_percent}%
                </div>
                <div className="text-sm text-muted-foreground">Complete</div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Started{' '}
                {onboarding.started_at
                  ? new Date(onboarding.started_at).toLocaleDateString()
                  : 'Not started'}
              </div>
              <div className="text-sm">
                {onboarding.tasks.filter((t) => t.status === 'completed').length}/
                {onboarding.tasks.length} tasks completed
              </div>
            </div>
          </div>
          <Progress value={onboarding.progress_percent} className="h-3" />
        </CardContent>
      </Card>

      {/* Phases */}
      {Object.entries(phases)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([phase, tasks]) => {
          const phaseNum = Number(phase);
          const phaseProgress = getPhaseProgress(tasks);
          const isPhaseComplete = phaseProgress === 100;

          return (
            <Card key={phase}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isPhaseComplete ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center text-xs font-bold">
                        {phaseNum}
                      </div>
                    )}
                    {phaseLabels[phaseNum] || `Phase ${phaseNum}`}
                  </CardTitle>
                  <Badge
                    variant={isPhaseComplete ? 'default' : 'outline'}
                    className={isPhaseComplete ? 'bg-green-500' : ''}
                  >
                    {phaseProgress}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border ${
                        task.status === 'completed'
                          ? 'bg-green-50 border-green-200'
                          : task.status === 'blocked'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-background'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          {updatingTask === task.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Checkbox
                              checked={task.status === 'completed'}
                              onCheckedChange={() => handleTaskToggle(task)}
                              disabled={task.status === 'blocked'}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`font-medium ${
                                task.status === 'completed'
                                  ? 'line-through text-muted-foreground'
                                  : ''
                              }`}
                            >
                              {task.title}
                            </span>
                            {getAssigneeBadge(task.assigned_to)}
                            {task.status === 'blocked' && (
                              <Badge variant="destructive">Blocked</Badge>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {task.description}
                            </p>
                          )}
                          {task.notes && (
                            <div className="text-sm bg-muted p-2 rounded mt-2">
                              <strong>Notes:</strong> {task.notes}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setShowNotes({
                                  ...showNotes,
                                  [task.id]: !showNotes[task.id],
                                })
                              }
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Add Note
                            </Button>
                            {task.status !== 'completed' &&
                              task.status !== 'blocked' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => handleMarkBlocked(task.id)}
                                  disabled={updatingTask === task.id}
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Mark Blocked
                                </Button>
                              )}
                          </div>
                          {showNotes[task.id] && (
                            <div className="mt-2 flex gap-2">
                              <Textarea
                                placeholder="Add a note..."
                                value={taskNotes[task.id] || ''}
                                onChange={(e) =>
                                  setTaskNotes({
                                    ...taskNotes,
                                    [task.id]: e.target.value,
                                  })
                                }
                                className="text-sm"
                                rows={2}
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  onTaskUpdate(
                                    task.id,
                                    task.status,
                                    taskNotes[task.id]
                                  );
                                  setShowNotes({ ...showNotes, [task.id]: false });
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}

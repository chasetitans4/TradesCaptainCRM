'use client';

// =====================================================
// TASKS PANEL
// Today's tasks and overdue items
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle,
} from 'lucide-react';

interface Lead {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  interested_plan: string | null;
  estimated_value_cents: number | null;
}

interface Task {
  id: string;
  task_type: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  lead?: Lead;
}

interface TasksPanelProps {
  overdue: Task[];
  today: Task[];
  upcoming?: Task[];
  loading?: boolean;
  onCompleteTask?: (taskId: string) => void;
  onLeadClick?: (leadId: string) => void;
}

export function TasksPanel({
  overdue,
  today,
  upcoming,
  loading,
  onCompleteTask,
  onLeadClick,
}: TasksPanelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'demo':
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'proposal':
        return <FileText className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatPrice = (cents: number | null) => {
    if (!cents) return '';
    return '$' + Math.round(cents / 100).toLocaleString();
  };

  const TaskItem = ({
    task,
    isOverdue = false,
  }: {
    task: Task;
    isOverdue?: boolean;
  }) => (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        isOverdue ? 'border-destructive/30 bg-destructive/5' : ''
      }`}
    >
      <Checkbox
        checked={task.is_completed}
        onCheckedChange={() => onCompleteTask?.(task.id)}
      />
      <div className={`${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
        {getTaskIcon(task.task_type)}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-medium truncate cursor-pointer hover:text-primary"
          onClick={() => task.lead && onLeadClick?.(task.lead.id)}
        >
          {task.description || task.task_type}
          {task.lead && (
            <span className="text-muted-foreground font-normal">
              {' '}— {task.lead.company_name || task.lead.contact_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {isOverdue ? 'Due ' : ''}
            {new Date(task.due_date).toLocaleDateString()}
          </span>
          {task.lead?.interested_plan && (
            <Badge variant="outline" className="text-xs">
              {task.lead.interested_plan.replace('_', ' ')}
            </Badge>
          )}
          {task.lead?.estimated_value_cents && (
            <span className="text-success">
              {formatPrice(task.lead.estimated_value_cents)}/mo
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onCompleteTask?.(task.id)}
      >
        <CheckCircle className="h-4 w-4" />
      </Button>
    </div>
  );

  const totalTasks = overdue.length + today.length + (upcoming?.length || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today&apos;s Tasks
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {totalTasks === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>All caught up! No tasks for today.</p>
          </div>
        ) : (
          <>
            {/* Overdue */}
            {overdue.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Overdue ({overdue.length})
                </h4>
                <div className="space-y-2">
                  {overdue.map((task) => (
                    <TaskItem key={task.id} task={task} isOverdue />
                  ))}
                </div>
              </div>
            )}

            {/* Today */}
            {today.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Today ({today.length})
                </h4>
                <div className="space-y-2">
                  {today.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcoming && upcoming.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Upcoming ({upcoming.length})
                </h4>
                <div className="text-sm text-muted-foreground">
                  {upcoming.length} tasks this week
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TasksPanel;

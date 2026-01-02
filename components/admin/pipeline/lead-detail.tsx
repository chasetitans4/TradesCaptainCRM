'use client';

// =====================================================
// LEAD DETAIL PANEL
// Detailed view of a single lead
// Version: 5.8
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  FileText,
  Clock,
  Building,
  User,
  MapPin,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
}

interface Task {
  id: string;
  task_type: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
}

interface Lead {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: string | null;
  interested_plan: string | null;
  interested_track: string | null;
  estimated_value_cents: number | null;
  notes: string | null;
  stage: string;
  stage_changed_at: string;
  days_in_stage?: number;
  lost_reason: string | null;
  created_at: string;
}

interface LeadDetailProps {
  lead: Lead;
  activities: Activity[];
  tasks: Task[];
  loading?: boolean;
  onBack?: () => void;
  onStageChange?: (stage: string, lostReason?: string) => void;
  onLogActivity?: (type: string, description: string) => void;
  onCreateTask?: (task: { task_type: string; description: string; due_date: string }) => void;
  onCompleteTask?: (taskId: string) => void;
  onAddNote?: (note: string) => void;
}

const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export function LeadDetail({
  lead,
  activities,
  tasks,
  loading,
  onBack,
  onStageChange,
  onLogActivity,
  onCreateTask,
  onCompleteTask,
  onAddNote,
}: LeadDetailProps) {
  const [newNote, setNewNote] = useState('');

  const formatPrice = (cents: number | null) => {
    if (!cents) return '$0';
    return '$' + Math.round(cents / 100).toLocaleString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'stage_change':
        return <AlertCircle className="h-4 w-4" />;
      case 'task_completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const overdueTasks = tasks.filter(
    (t) => !t.is_completed && new Date(t.due_date) < new Date()
  );
  const upcomingTasks = tasks.filter(
    (t) => !t.is_completed && new Date(t.due_date) >= new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">
              {lead.company_name || lead.contact_name || 'Unnamed Lead'}
            </h2>
            <p className="text-muted-foreground">
              Created {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <Select
          value={lead.stage}
          onValueChange={(value) => onStageChange?.(value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Contact Info & Value */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.contact_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.contact_name}</span>
                </div>
              )}
              {lead.company_name && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.company_name}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                    {lead.email}
                  </a>
                </div>
              )}
              {(lead.city || lead.state) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {[lead.city, lead.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lead Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage</span>
                <Badge>{lead.stage.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days in Stage</span>
                <span
                  className={
                    (lead.days_in_stage || 0) > 3 ? 'text-destructive' : ''
                  }
                >
                  {lead.days_in_stage || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span className="capitalize">{lead.source || 'Unknown'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Potential Value */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Potential Value</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interested In</span>
                <span className="capitalize">
                  {lead.interested_plan?.replace('_', ' ') || 'Not specified'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monthly Value</span>
                <span className="text-xl font-bold text-success">
                  {formatPrice(lead.estimated_value_cents)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Upfront Commission</span>
                  <span>
                    ~{formatPrice((lead.estimated_value_cents || 0) * 0.5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Recurring Commission</span>
                  <span>
                    ~{formatPrice((lead.estimated_value_cents || 0) * 0.15)}/mo
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Activity & Notes */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLogActivity?.('call', 'Made a call')}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Log Call
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLogActivity?.('email', 'Sent email')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Log Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLogActivity?.('meeting', 'Had meeting')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Log Meeting
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onCreateTask?.({
                      task_type: 'followup',
                      description: 'Follow up',
                      due_date: new Date(Date.now() + 86400000)
                        .toISOString()
                        .split('T')[0],
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    No activity yet
                  </p>
                ) : (
                  activities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="text-muted-foreground">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.notes && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {lead.notes}
                </p>
              )}
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (newNote.trim()) {
                    onAddNote?.(newNote);
                    setNewNote('');
                  }
                }}
                disabled={!newNote.trim()}
              >
                Add Note
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tasks */}
        <div className="space-y-6">
          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Overdue ({overdueTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 rounded border border-destructive/20 bg-destructive/5"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-destructive" />
                      <span className="text-sm">
                        {task.description || task.task_type}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCompleteTask?.(task.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No upcoming tasks
                </p>
              ) : (
                upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {task.description || task.task_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCompleteTask?.(task.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LeadDetail;

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatDate, formatRelativeDate, getUrgencyColor } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { UserWithBusiness, Reminder, Customer, Job, Lead, ReminderRetention } from '@/types';
import {
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  User,
  Briefcase,
  FileText,
  Check,
  Trash2,
  MoreVertical,
  Save,
  Loader2,
  AlarmClock,
  X,
  ChevronRight,
} from 'lucide-react';

interface ReminderWithRelations extends Reminder {
  customer?: Customer | null;
  job?: Job | null;
  lead?: Lead | null;
}

export default function ReminderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reminderId = params.id as string;

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [reminder, setReminder] = useState<ReminderWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showSnoozeSheet, setShowSnoozeSheet] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editRetention, setEditRetention] = useState<ReminderRetention>('30_days');
  const [error, setError] = useState<string | null>(null);

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);
    }
    loadUser();
  }, [router]);

  // Load reminder
  const loadReminder = useCallback(async () => {
    if (!user || !reminderId) return;

    const supabase = createClient();

    try {
      const { data, error: reminderError } = await supabase
        .from('reminders')
        .select(`
          *,
          customer:customers (id, name, phone),
          job:jobs (id, service_type, scheduled_date),
          lead:leads (id, name, service_needed)
        `)
        .eq('id', reminderId)
        .single();

      if (reminderError) throw reminderError;

      setReminder(data as ReminderWithRelations);

      // Set edit form initial values
      const remindAt = new Date(data.remind_at);
      setEditTitle(data.title || '');
      setEditNotes(data.notes || '');
      setEditDate(remindAt.toISOString().split('T')[0]);
      setEditTime(remindAt.toTimeString().slice(0, 5));
      setEditRetention(data.retention || '30_days');
    } catch (err) {
      console.error('Error loading reminder:', err);
      router.push('/reminders');
    } finally {
      setLoading(false);
    }
  }, [user, reminderId, router]);

  useEffect(() => {
    if (user && reminderId) {
      loadReminder();
    }
  }, [user, reminderId, loadReminder]);

  // Toggle complete
  const toggleComplete = async () => {
    if (!reminder) return;

    setUpdating(true);
    const supabase = createClient();

    try {
      const newStatus = !reminder.completed;
      const { error } = await supabase
        .from('reminders')
        .update({
          completed: newStatus,
          completed_at: newStatus ? new Date().toISOString() : null,
        })
        .eq('id', reminder.id);

      if (error) throw error;

      setReminder({
        ...reminder,
        completed: newStatus,
        completed_at: newStatus ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.error('Error updating reminder:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Save edits
  const saveEdits = async () => {
    if (!reminder) return;

    if (!editTitle.trim()) {
      setError('Title is required');
      return;
    }
    if (!editDate) {
      setError('Date is required');
      return;
    }

    setUpdating(true);
    setError(null);

    const supabase = createClient();

    try {
      const remindAt = new Date(`${editDate}T${editTime || '09:00'}:00`).toISOString();

      const { error } = await supabase
        .from('reminders')
        .update({
          title: editTitle.trim(),
          notes: editNotes.trim() || null,
          remind_at: remindAt,
          retention: editRetention,
        })
        .eq('id', reminder.id);

      if (error) throw error;

      setReminder({
        ...reminder,
        title: editTitle.trim(),
        notes: editNotes.trim() || null,
        remind_at: remindAt,
        retention: editRetention,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating reminder:', err);
      setError('Failed to save changes');
    } finally {
      setUpdating(false);
    }
  };

  // Snooze reminder
  const snoozeReminder = async (hours: number) => {
    if (!reminder) return;

    setUpdating(true);
    const supabase = createClient();

    try {
      const snoozedUntil = new Date();
      snoozedUntil.setHours(snoozedUntil.getHours() + hours);

      const { error } = await supabase
        .from('reminders')
        .update({
          snoozed_until: snoozedUntil.toISOString(),
        })
        .eq('id', reminder.id);

      if (error) throw error;

      setReminder({
        ...reminder,
        snoozed_until: snoozedUntil.toISOString(),
      });
      setShowSnoozeSheet(false);
    } catch (err) {
      console.error('Error snoozing reminder:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Delete reminder
  const deleteReminder = async () => {
    if (!reminder || !confirm('Are you sure you want to delete this reminder?')) return;

    setUpdating(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminder.id);

      if (error) throw error;

      router.push('/reminders');
    } catch (err) {
      console.error('Error deleting reminder:', err);
      setUpdating(false);
    }
  };

  if (loading || !user) {
    return <ReminderDetailSkeleton />;
  }

  if (!reminder) {
    return null;
  }

  const remindAt = new Date(reminder.remind_at);
  const isOverdue = remindAt < new Date() && !reminder.completed;
  const urgencyColor = getUrgencyColor(reminder.remind_at);

  if (isEditing) {
    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="sticky-header bg-background border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsEditing(false)} className="p-2 -ml-2">
                <X className="h-5 w-5 text-text" />
              </button>
              <h1 className="text-lg font-semibold text-text">Edit Reminder</h1>
            </div>
          </div>
        </header>

        <div className="px-4 py-4 space-y-6">
          <div>
            <Label htmlFor="title" className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-text-muted" />
              Title *
            </Label>
            <Input
              id="title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="What do you need to remember?"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-text-muted" />
              When?
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
              <Input
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-text-muted" />
              Keep reminder
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditRetention('30_days')}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  editRetention === '30_days'
                    ? 'bg-primary/10 border-primary'
                    : 'border-border hover:bg-muted'
                )}
              >
                <p className="font-medium text-text">30 days</p>
                <p className="text-xs text-text-muted">Auto-delete after</p>
              </button>
              <button
                type="button"
                onClick={() => setEditRetention('forever')}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  editRetention === 'forever'
                    ? 'bg-primary/10 border-primary'
                    : 'border-border hover:bg-muted'
                )}
              >
                <p className="font-medium text-text">Forever</p>
                <p className="text-xs text-text-muted">Keep indefinitely</p>
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" />
              Notes
            </Label>
            <textarea
              id="notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              className="mt-1 w-full px-4 py-3 rounded-lg border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {error && (
            <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border pb-safe">
          <Button onClick={saveEdits} disabled={updating} className="w-full">
            {updating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft className="h-5 w-5 text-text" />
            </button>
            <h1 className="text-lg font-semibold text-text">Reminder</h1>
          </div>

          <Sheet open={showActionsSheet} onOpenChange={setShowActionsSheet}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-safe">
              <SheetHeader>
                <SheetTitle>Actions</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    setShowActionsSheet(false);
                    setIsEditing(true);
                  }}
                >
                  <FileText className="h-5 w-5" />
                  Edit Reminder
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    setShowActionsSheet(false);
                    setShowSnoozeSheet(true);
                  }}
                >
                  <AlarmClock className="h-5 w-5" />
                  Snooze
                </Button>
                <hr className="my-2" />
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-danger hover:text-danger hover:bg-danger/10"
                  onClick={deleteReminder}
                  disabled={updating}
                >
                  <Trash2 className="h-5 w-5" />
                  Delete Reminder
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Completion status */}
        <button
          onClick={toggleComplete}
          disabled={updating}
          className={cn(
            'w-full card p-4 flex items-center gap-4 transition-colors',
            reminder.completed
              ? 'bg-success/10 border-success'
              : isOverdue
              ? 'bg-danger/10 border-danger'
              : ''
          )}
        >
          <div
            className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0',
              reminder.completed
                ? 'bg-success border-success text-white'
                : isOverdue
                ? 'border-danger'
                : 'border-border'
            )}
          >
            {reminder.completed && <Check className="h-5 w-5" />}
          </div>
          <div className="text-left flex-1">
            <p
              className={cn(
                'text-lg font-semibold text-text',
                reminder.completed && 'line-through opacity-60'
              )}
            >
              {reminder.title}
            </p>
            <p className="text-sm text-text-muted">
              {reminder.completed ? 'Tap to mark incomplete' : 'Tap to mark complete'}
            </p>
          </div>
        </button>

        {/* Due date/time */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-3">Due</h2>
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg',
              reminder.completed
                ? 'bg-muted'
                : isOverdue
                ? 'bg-danger/10'
                : urgencyColor.bg
            )}
          >
            <Clock
              className={cn(
                'h-5 w-5',
                reminder.completed
                  ? 'text-text-muted'
                  : isOverdue
                  ? 'text-danger'
                  : urgencyColor.text
              )}
            />
            <div>
              <p
                className={cn(
                  'font-medium',
                  reminder.completed
                    ? 'text-text-muted'
                    : isOverdue
                    ? 'text-danger'
                    : 'text-text'
                )}
              >
                {formatDate(reminder.remind_at, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-text-muted">
                {formatDate(reminder.remind_at, 'h:mm a')} ({formatRelativeDate(reminder.remind_at)})
              </p>
            </div>
          </div>

          {reminder.snoozed_until && new Date(reminder.snoozed_until) > new Date() && (
            <div className="mt-3 flex items-center gap-2 text-warning">
              <AlarmClock className="h-4 w-4" />
              <span className="text-sm">
                Snoozed until {formatDate(reminder.snoozed_until, 'h:mm a')}
              </span>
            </div>
          )}
        </section>

        {/* Notes */}
        {reminder.notes && (
          <section className="card p-4">
            <h2 className="font-semibold text-text mb-2">Notes</h2>
            <p className="text-text whitespace-pre-wrap">{reminder.notes}</p>
          </section>
        )}

        {/* Linked entities */}
        {(reminder.customer || reminder.job || reminder.lead) && (
          <section className="card p-4">
            <h2 className="font-semibold text-text mb-3">Linked to</h2>
            <div className="space-y-2">
              {reminder.customer && (
                <Link
                  href={`/customers/${reminder.customer.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-text">{reminder.customer.name}</p>
                      <p className="text-xs text-text-muted">Customer</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-muted" />
                </Link>
              )}
              {reminder.job && (
                <Link
                  href={`/jobs/${reminder.job.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-success/10">
                      <Briefcase className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-text">{reminder.job.service_type}</p>
                      <p className="text-xs text-text-muted">Job</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-muted" />
                </Link>
              )}
              {reminder.lead && (
                <Link
                  href={`/leads/${reminder.lead.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-warning/10">
                      <FileText className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium text-text">
                        {reminder.lead.service_needed || reminder.lead.name}
                      </p>
                      <p className="text-xs text-text-muted">Lead</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-muted" />
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Retention */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-2">Retention</h2>
          <p className="text-sm text-text-muted">
            {reminder.retention === 'forever'
              ? 'This reminder will be kept indefinitely'
              : 'This reminder will be automatically deleted 30 days after completion'}
          </p>
        </section>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border pb-safe flex gap-3">
        <Button
          variant={reminder.completed ? 'outline' : 'default'}
          onClick={toggleComplete}
          disabled={updating}
          className="flex-1"
        >
          {reminder.completed ? (
            <>
              <X className="h-5 w-5 mr-2" />
              Mark Incomplete
            </>
          ) : (
            <>
              <Check className="h-5 w-5 mr-2" />
              Mark Complete
            </>
          )}
        </Button>
        {!reminder.completed && (
          <Button
            variant="outline"
            onClick={() => setShowSnoozeSheet(true)}
            disabled={updating}
          >
            <AlarmClock className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Snooze Sheet */}
      <Sheet open={showSnoozeSheet} onOpenChange={setShowSnoozeSheet}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader>
            <SheetTitle>Snooze Reminder</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { label: '1 hour', hours: 1 },
              { label: '3 hours', hours: 3 },
              { label: '6 hours', hours: 6 },
              { label: 'Tomorrow', hours: 24 },
            ].map((option) => (
              <button
                key={option.label}
                onClick={() => snoozeReminder(option.hours)}
                disabled={updating}
                className="p-4 rounded-lg border border-border hover:bg-muted text-left"
              >
                <p className="font-medium text-text">{option.label}</p>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ReminderDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-6 w-24 skeleton rounded" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-4">
        <div className="card h-24 skeleton" />
        <div className="card h-32 skeleton" />
        <div className="card h-24 skeleton" />
      </div>
    </div>
  );
}

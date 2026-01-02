'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatRelativeDate, formatDate, getUrgencyColor } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserWithBusiness, Reminder, Customer, Job, Lead } from '@/types';
import {
  Plus,
  Bell,
  Check,
  Clock,
  Calendar,
  ChevronRight,
  RefreshCw,
  User,
  Briefcase,
  Filter,
} from 'lucide-react';

interface ReminderWithRelations extends Reminder {
  customer?: Pick<Customer, 'id' | 'name'> | null;
  job?: Pick<Job, 'id' | 'title'> | null;
  lead?: Pick<Lead, 'id' | 'service_needed'> | null;
}

type FilterOption = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';

export default function RemindersPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [reminders, setReminders] = useState<ReminderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('all');

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

  // Load reminders
  const loadReminders = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('reminders')
        .select(`
          *,
          customer:customers (id, name),
          job:jobs (id, title),
          lead:leads (id, service_needed)
        `)
        .eq('user_id', user.id)
        .order('remind_at', { ascending: true });

      if (error) throw error;
      setReminders((data as ReminderWithRelations[]) || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadReminders();
    }
  }, [user, loadReminders]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
  };

  // Toggle reminder completion
  const toggleComplete = async (reminder: ReminderWithRelations) => {
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

      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminder.id
            ? { ...r, completed: newStatus, completed_at: newStatus ? new Date().toISOString() : null }
            : r
        )
      );
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  };

  // Filter reminders
  const filteredReminders = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return reminders.filter((reminder) => {
      const dueDate = new Date(reminder.remind_at);

      switch (filter) {
        case 'today':
          return (
            !reminder.completed &&
            dueDate >= todayStart &&
            dueDate < todayEnd
          );
        case 'upcoming':
          return !reminder.completed && dueDate >= todayEnd;
        case 'overdue':
          return !reminder.completed && dueDate < todayStart;
        case 'completed':
          return reminder.completed;
        default:
          return true;
      }
    });
  }, [reminders, filter]);

  // Group reminders by date
  const groupedReminders = useMemo(() => {
    const groups: Record<string, ReminderWithRelations[]> = {};
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    filteredReminders.forEach((reminder) => {
      const dueDate = new Date(reminder.remind_at);
      let groupKey: string;

      if (reminder.completed) {
        groupKey = 'Completed';
      } else if (dueDate < todayStart) {
        groupKey = 'Overdue';
      } else if (dueDate.toDateString() === todayStart.toDateString()) {
        groupKey = 'Today';
      } else {
        groupKey = formatDate(dueDate, 'EEEE, MMM d');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(reminder);
    });

    return groups;
  }, [filteredReminders]);

  // Count by filter
  const counts = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return {
      all: reminders.length,
      today: reminders.filter(
        (r) =>
          !r.completed &&
          new Date(r.remind_at) >= todayStart &&
          new Date(r.remind_at) < todayEnd
      ).length,
      upcoming: reminders.filter(
        (r) => !r.completed && new Date(r.remind_at) >= todayEnd
      ).length,
      overdue: reminders.filter(
        (r) => !r.completed && new Date(r.remind_at) < todayStart
      ).length,
      completed: reminders.filter((r) => r.completed).length,
    };
  }, [reminders]);

  if (loading || !user) {
    return <RemindersSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-text">Reminders</h1>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
            </Button>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'today', label: 'Today', count: counts.today },
              { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
              { id: 'overdue', label: 'Overdue', count: counts.overdue },
              { id: 'completed', label: 'Done', count: counts.completed },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as FilterOption)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5',
                  filter === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-muted text-text hover:bg-muted/80'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      filter === tab.id ? 'bg-white/20' : 'bg-background',
                      tab.id === 'overdue' && filter !== tab.id && 'bg-danger/10 text-danger'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Reminders List */}
      <div className="px-4 py-4">
        {filteredReminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-12 w-12 text-text-muted mb-4" />
            <h3 className="text-lg font-medium text-text mb-1">
              {filter === 'completed'
                ? 'No completed reminders'
                : filter === 'overdue'
                ? 'No overdue reminders'
                : 'No reminders yet'}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              {filter === 'all'
                ? 'Create a reminder to stay on top of your tasks'
                : 'All caught up!'}
            </p>
            {filter === 'all' && (
              <Link href="/reminders/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reminder
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedReminders).map(([group, items]) => (
              <div key={group}>
                <h2
                  className={cn(
                    'text-sm font-semibold mb-2',
                    group === 'Overdue' ? 'text-danger' : 'text-text-muted'
                  )}
                >
                  {group}
                </h2>
                <div className="space-y-2">
                  {items.map((reminder) => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onToggleComplete={() => toggleComplete(reminder)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link href="/reminders/new" className="fab">
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}

function ReminderCard({
  reminder,
  onToggleComplete,
}: {
  reminder: ReminderWithRelations;
  onToggleComplete: () => void;
}) {
  const urgencyColor = getUrgencyColor(reminder.remind_at);
  const isOverdue = new Date(reminder.remind_at) < new Date() && !reminder.completed;

  return (
    <div
      className={cn(
        'card p-3 flex items-start gap-3',
        reminder.completed && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onToggleComplete();
        }}
        className={cn(
          'mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          reminder.completed
            ? 'bg-success border-success text-white'
            : isOverdue
            ? 'border-danger hover:bg-danger/10'
            : 'border-border hover:bg-muted'
        )}
      >
        {reminder.completed && <Check className="h-4 w-4" />}
      </button>

      {/* Content */}
      <Link href={`/reminders/${reminder.id}`} className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'font-medium text-text',
              reminder.completed && 'line-through'
            )}
          >
            {reminder.title}
          </p>
          <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
        </div>

        {/* Due time */}
        <div className="flex items-center gap-2 mt-1 text-xs">
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full',
              reminder.completed
                ? 'bg-muted text-text-muted'
                : urgencyColor.bg,
              reminder.completed ? '' : urgencyColor.text
            )}
          >
            <Clock className="h-3 w-3" />
            {formatRelativeDate(reminder.remind_at)}
          </div>
        </div>

        {/* Related entity */}
        {(reminder.customer || reminder.job || reminder.lead) && (
          <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
            {reminder.customer && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {reminder.customer.name}
              </span>
            )}
            {reminder.job && (
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {reminder.job.title}
              </span>
            )}
            {reminder.lead && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {reminder.lead.service_needed || 'Lead'}
              </span>
            )}
          </div>
        )}
      </Link>
    </div>
  );
}

function RemindersSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="h-7 w-28 skeleton rounded" />
            <div className="h-10 w-10 skeleton rounded-lg" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-20 skeleton rounded-full" />
            ))}
          </div>
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        <div>
          <div className="h-4 w-16 skeleton rounded mb-2" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-20 skeleton" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission, DASHBOARD_SECTIONS } from '@/lib/permissions';
import { cn, getGreeting, formatRelativeDate, formatCurrency, getUrgencyColor, formatAddress } from '@/lib/utils';
import { getSmartNavigationUrl } from '@/lib/utils/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { AddressLink } from '@/components/ui/address-link';
import type { UserWithBusiness, Reminder, Job, Lead, Customer, UserRole, SMSConversation, SMSMessage } from '@/types';
import {
  Plus,
  Bell,
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  ChevronRight,
  Users,
  Briefcase,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  User,
  MapPin,
  RefreshCw,
  Pause,
  Play,
} from 'lucide-react';
import { GlobalPauseToggle } from '@/components/automation/global-pause-toggle';

// Dashboard section types
interface DashboardStats {
  newLeadsToday: number;
  activeJobs: number;
  unpaidInvoices: number;
  upcomingReminders: number;
}

interface TodayJob extends Job {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'address_line1' | 'city'>;
}

interface RecentLead extends Lead {
  customer?: Pick<Customer, 'id' | 'name' | 'phone'> | null;
}

interface UnrepliedConversation extends SMSConversation {
  customer?: Pick<Customer, 'id' | 'name' | 'phone'> | null;
  last_message?: Pick<SMSMessage, 'id' | 'body' | 'created_at'> | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [automationsPaused, setAutomationsPaused] = useState(false);
  const [todayJobs, setTodayJobs] = useState<TodayJob[]>([]);
  const [tomorrowJobs, setTomorrowJobs] = useState<TodayJob[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [unrepliedMessages, setUnrepliedMessages] = useState<UnrepliedConversation[]>([]);

  // Load user profile
  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await getCurrentUserProfile();
        if (!profile) {
          router.push('/login');
          return;
        }
        setUser(profile as UserWithBusiness);
      } catch (error) {
        console.error('Error loading user:', error);
        router.push('/login');
      }
    }
    loadUser();
  }, [router]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    try {
      // Load Leads Captain pause status (for global pause toggle)
      try {
        const lcRes = await fetch('/api/leads-captain/v2/config');
        if (lcRes.ok) {
          const lcData = await lcRes.json();
          setAutomationsPaused(lcData.config?.global_mode === 'paused');
        }
      } catch {
        // Leads Captain may not be set up - ignore
      }

      // Load reminders for current user
      const { data: remindersData } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('due_at', todayStart.toISOString())
        .lte('due_at', tomorrowEnd.toISOString())
        .order('due_at', { ascending: true })
        .limit(5);

      setReminders(remindersData || []);

      // Load today's jobs
      let todayJobsQuery = supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey (
            id,
            name,
            phone,
            address_line1,
            city
          )
        `)
        .gte('scheduled_date', todayStart.toISOString())
        .lt('scheduled_date', todayEnd.toISOString())
        .not('status', 'in', '("completed","cancelled")')
        .order('scheduled_time', { ascending: true });

      // Technicians only see their assigned jobs
      if (user.role === 'technician') {
        todayJobsQuery = todayJobsQuery.eq('assigned_user_id', user.id);
      }

      const { data: todayJobsData } = await todayJobsQuery;
      setTodayJobs((todayJobsData as TodayJob[]) || []);

      // Load tomorrow's jobs
      let tomorrowJobsQuery = supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey (
            id,
            name,
            phone,
            address_line1,
            city
          )
        `)
        .gte('scheduled_date', todayEnd.toISOString())
        .lt('scheduled_date', tomorrowEnd.toISOString())
        .not('status', 'in', '("completed","cancelled")')
        .order('scheduled_time', { ascending: true });

      if (user.role === 'technician') {
        tomorrowJobsQuery = tomorrowJobsQuery.eq('assigned_user_id', user.id);
      }

      const { data: tomorrowJobsData } = await tomorrowJobsQuery;
      setTomorrowJobs((tomorrowJobsData as TodayJob[]) || []);

      // Load stats and leads only for owners/admins
      if (hasPermission(user.role, 'view_leads')) {
        // Stats
        const [newLeadsRes, activeJobsRes, pastDueInvoicesRes] = await Promise.all([
          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', todayStart.toISOString()),
          supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .in('status', ['scheduled', 'in_progress']),
          // Past-due invoices: sent/unpaid AND due_date < today (Section 7.1)
          supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .in('status', ['sent', 'pending'])
            .lt('due_date', todayStart.toISOString()),
        ]);

        setStats({
          newLeadsToday: newLeadsRes.count || 0,
          activeJobs: activeJobsRes.count || 0,
          unpaidInvoices: pastDueInvoicesRes.count || 0,
          upcomingReminders: remindersData?.length || 0,
        });

        // Recent leads
        const { data: leadsData } = await supabase
          .from('leads')
          .select(`
            *,
            customer:customers (
              id,
              name,
              phone
            )
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentLeads((leadsData as RecentLead[]) || []);
      }

      // Load unreplied messages (for owners/admins - conversations needing response)
      if (hasPermission(user.role, 'view_messages')) {
        // Find conversations where last_customer_message_at > last business reply
        // Using a simpler approach: get conversations and check last message direction
        const { data: convos } = await supabase
          .from('sms_conversations')
          .select(`
            *,
            customer:customers (id, name, phone)
          `)
          .eq('business_id', user.business_id)
          .not('last_customer_message_at', 'is', null)
          .order('last_customer_message_at', { ascending: false })
          .limit(10);

        // For each, get last message to check if it needs reply
        const unrepliedConvos: UnrepliedConversation[] = [];
        for (const convo of convos || []) {
          const { data: messages } = await supabase
            .from('sms_messages')
            .select('id, body, direction, created_at')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMsg = messages?.[0];
          // If last message was inbound (from customer), it needs a reply
          if (lastMsg && lastMsg.direction === 'inbound') {
            unrepliedConvos.push({
              ...convo,
              last_message: {
                id: lastMsg.id,
                body: lastMsg.body,
                created_at: lastMsg.created_at,
              },
            });
          }
        }

        setUnrepliedMessages(unrepliedConvos.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Pull to refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  // Check if a section should be shown
  const shouldShowSection = (section: string): boolean => {
    if (!user) return false;
    const allowedSections = DASHBOARD_SECTIONS[user.role] || [];
    return allowedSections.includes(section);
  };

  // Global pause toggle handler - ≤2 taps accessible (Section 7.3)
  const handleAutomationPauseToggle = async (paused: boolean) => {
    try {
      const res = await fetch('/api/leads-captain/v2/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          global_mode: paused ? 'paused' : 'normal',
        }),
      });

      if (res.ok) {
        setAutomationsPaused(paused);
      }
    } catch (error) {
      console.error('Error toggling automation pause:', error);
    }
  };

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold text-text">
              {getGreeting()}, {user.name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-sm text-text-muted">{user.business?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Global Pause Toggle - 1 tap accessible from dashboard (Section 7.3) */}
            {hasPermission(user.role, 'view_leads') && (
              <GlobalPauseToggle
                isPaused={automationsPaused}
                onToggle={handleAutomationPauseToggle}
                variant="compact"
              />
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
            </Button>
            <Link href="/settings">
              <Avatar
                src={user.avatar_url || undefined}
                fallback={user.name?.charAt(0) || 'U'}
                size="sm"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-4 space-y-6">
        {/* Quick Stats - Owners/Admins only */}
        {shouldShowSection('stats') && stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="New Leads Today"
              value={stats.newLeadsToday}
              icon={Users}
              href="/leads"
              color="primary"
            />
            <StatCard
              label="Active Jobs"
              value={stats.activeJobs}
              icon={Briefcase}
              href="/jobs"
              color="success"
            />
            <StatCard
              label="Past-Due Invoices"
              value={stats.unpaidInvoices}
              icon={DollarSign}
              href="/invoices?filter=past_due"
              color="warning"
            />
            <StatCard
              label="Reminders"
              value={stats.upcomingReminders}
              icon={Bell}
              href="/reminders"
              color="info"
            />
          </div>
        )}

        {/* Needs Reply - Unreplied Messages */}
        {shouldShowSection('messages') && unrepliedMessages.length > 0 && (
          <Section
            title="Needs Reply"
            icon={MessageSquare}
            href="/messages"
            count={unrepliedMessages.length}
          >
            <div className="space-y-2">
              {unrepliedMessages.map((convo) => (
                <UnrepliedMessageCard key={convo.id} conversation={convo} />
              ))}
            </div>
          </Section>
        )}

        {/* Today's Reminders */}
        {shouldShowSection('reminders') && (
          <Section
            title="Today's Reminders"
            icon={Bell}
            href="/reminders"
            count={reminders.length}
          >
            {reminders.length === 0 ? (
              <EmptyState
                message="No reminders for today"
                icon={CheckCircle2}
              />
            ) : (
              <div className="space-y-2">
                {reminders.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Today's Jobs */}
        {shouldShowSection('todayJobs') && (
          <Section
            title="Today's Jobs"
            icon={Calendar}
            href="/jobs?filter=today"
            count={todayJobs.length}
          >
            {todayJobs.length === 0 ? (
              <EmptyState
                message="No jobs scheduled for today"
                icon={Calendar}
              />
            ) : (
              <div className="space-y-2">
                {todayJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Tomorrow's Jobs */}
        {shouldShowSection('tomorrowJobs') && (
          <Section
            title="Tomorrow's Jobs"
            icon={Calendar}
            href="/jobs?filter=tomorrow"
            count={tomorrowJobs.length}
          >
            {tomorrowJobs.length === 0 ? (
              <EmptyState
                message="No jobs scheduled for tomorrow"
                icon={Calendar}
              />
            ) : (
              <div className="space-y-2">
                {tomorrowJobs.map((job) => (
                  <JobCard key={job.id} job={job} showDate />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Recent Leads - Owners/Admins only */}
        {shouldShowSection('leads') && (
          <Section
            title="Recent Leads"
            icon={Users}
            href="/leads"
            count={recentLeads.length}
          >
            {recentLeads.length === 0 ? (
              <EmptyState
                message="No recent leads"
                icon={Users}
                action={{ label: 'Add Lead', href: '/leads/new' }}
              />
            ) : (
              <div className="space-y-2">
                {recentLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* You're Clear Today - shows when no actionable items */}
        <ClearTodayState
          hasUnrepliedMessages={unrepliedMessages.length > 0}
          hasReminders={reminders.length > 0}
          hasTodayJobs={todayJobs.length > 0}
          hasUnpaidInvoices={(stats?.unpaidInvoices ?? 0) > 0}
        />
      </div>

      {/* Floating Action Button */}
      {hasPermission(user.role, 'create_jobs') && (
        <QuickActionsButton userRole={user.role} />
      )}
    </div>
  );
}

// Sub-components

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  href: string;
  color: 'primary' | 'success' | 'warning' | 'info';
}

function StatCard({ label, value, icon: Icon, href, color }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  };

  return (
    <Link href={href} className="card p-3 flex items-center gap-3 active:scale-[0.98]">
      <div className={cn('p-2 rounded-lg', colorClasses[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-text">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </Link>
  );
}

interface SectionProps {
  title: string;
  icon: React.ElementType;
  href: string;
  count?: number;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, href, count, children }: SectionProps) {
  return (
    <section>
      <Link href={href} className="flex items-center justify-between mb-3 group">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-text">{title}</h2>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-text-muted group-hover:text-primary transition-colors" />
      </Link>
      {children}
    </section>
  );
}

interface EmptyStateProps {
  message: string;
  icon: React.ElementType;
  action?: { label: string; href: string };
}

function EmptyState({ message, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="card p-6 flex flex-col items-center justify-center text-center">
      <Icon className="h-8 w-8 text-text-muted mb-2" />
      <p className="text-sm text-text-muted">{message}</p>
      {action && (
        <Link href={action.href}>
          <Button variant="link" className="mt-2">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}

function ReminderCard({ reminder }: { reminder: Reminder }) {
  const reminderTime = reminder.remind_at;
  const urgencyColor = getUrgencyColor(reminderTime);

  return (
    <Link href={`/reminders/${reminder.id}`} className="card p-3 flex items-start gap-3 active:scale-[0.98]">
      <div className={cn('mt-0.5 p-1.5 rounded-full', urgencyColor.bg)}>
        <Bell className={cn('h-4 w-4', urgencyColor.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text truncate">{reminder.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Clock className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">
            {formatRelativeDate(reminderTime)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function JobCard({ job, showDate = false }: { job: TodayJob; showDate?: boolean }) {
  const statusColors: Record<string, string> = {
    scheduled: 'bg-info/10 text-info',
    in_progress: 'bg-warning/10 text-warning',
    completed: 'bg-success/10 text-success',
    cancelled: 'bg-danger/10 text-danger',
    no_show: 'bg-muted/10 text-muted-foreground',
  };

  return (
    <Link href={`/jobs/${job.id}`} className="card p-3 active:scale-[0.98]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text truncate">{job.title}</p>
          <p className="text-sm text-text-muted truncate">{job.customer?.name}</p>
        </div>
        <Badge className={cn('shrink-0', statusColors[job.status])}>
          {job.status.replace('_', ' ')}
        </Badge>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
        {job.scheduled_time && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{job.scheduled_time}</span>
          </div>
        )}
        {job.customer?.city && (
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{job.customer.city}</span>
          </div>
        )}
      </div>
      {/* Quick actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
        {job.customer?.phone && (
          <a
            href={`tel:${job.customer.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-primary"
          >
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
        )}
        {job.customer?.phone && (
          <a
            href={`sms:${job.customer.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-primary"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Text
          </a>
        )}
        {job.customer?.address_line1 && (
          <AddressLink
            address={job.customer.address_line1}
            city={job.customer.city}
            className="flex items-center gap-1 text-xs text-primary"
            iconClassName="h-3.5 w-3.5"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </Link>
  );
}

function LeadCard({ lead }: { lead: RecentLead }) {
  const statusColors: Record<string, string> = {
    new: 'bg-primary/10 text-primary',
    contacted: 'bg-info/10 text-info',
    qualified: 'bg-success/10 text-success',
    quoted: 'bg-warning/10 text-warning',
    scheduled: 'bg-info/10 text-info',
    won: 'bg-success/10 text-success',
    lost: 'bg-danger/10 text-danger',
  };

  return (
    <Link href={`/leads/${lead.id}`} className="card p-3 flex items-start gap-3 active:scale-[0.98]">
      <div className="p-2 rounded-full bg-primary/10">
        <User className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-text truncate">
            {lead.customer?.name || lead.name || 'Unknown'}
          </p>
          <Badge className={cn('shrink-0', statusColors[lead.status])}>
            {lead.status}
          </Badge>
        </div>
        <p className="text-sm text-text-muted truncate">{lead.service_needed}</p>
        <p className="text-xs text-text-muted mt-1">
          {formatRelativeDate(lead.created_at)}
        </p>
      </div>
    </Link>
  );
}

interface ClearTodayStateProps {
  hasUnrepliedMessages: boolean;
  hasReminders: boolean;
  hasTodayJobs: boolean;
  hasUnpaidInvoices: boolean;
}

function ClearTodayState({
  hasUnrepliedMessages,
  hasReminders,
  hasTodayJobs,
  hasUnpaidInvoices,
}: ClearTodayStateProps) {
  // Only show when there's nothing actionable
  const isClear = !hasUnrepliedMessages && !hasReminders && !hasTodayJobs && !hasUnpaidInvoices;

  if (!isClear) return null;

  return (
    <div className="card p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-success/5 to-success/10 border-success/20">
      <div className="p-4 rounded-full bg-success/10 mb-4">
        <CheckCircle2 className="h-10 w-10 text-success" />
      </div>
      <h3 className="text-xl font-semibold text-text mb-2">You're clear today</h3>
      <p className="text-sm text-text-muted max-w-xs">
        No messages need replies, no pending reminders, and no unpaid invoices. Take a moment to breathe.
      </p>
    </div>
  );
}

function UnrepliedMessageCard({ conversation }: { conversation: UnrepliedConversation }) {
  const name = conversation.customer?.name || conversation.phone || 'Unknown';
  const lastMessage = conversation.last_message;

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className="card p-3 flex items-start gap-3 active:scale-[0.98]"
    >
      <div className="p-2 rounded-full bg-warning/10">
        <MessageSquare className="h-4 w-4 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-text truncate">{name}</p>
          <Badge className="shrink-0 bg-warning/10 text-warning">
            Awaiting reply
          </Badge>
        </div>
        {lastMessage && (
          <p className="text-sm text-text-muted truncate mt-0.5">{lastMessage.body}</p>
        )}
        <p className="text-xs text-text-muted mt-1">
          {lastMessage ? formatRelativeDate(lastMessage.created_at) : ''}
        </p>
      </div>
    </Link>
  );
}

function QuickActionsButton({ userRole }: { userRole: UserRole }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { label: 'New Lead', href: '/leads/new', icon: Users, permission: 'create_leads' as const },
    { label: 'New Job', href: '/jobs/new', icon: Briefcase, permission: 'create_jobs' as const },
    { label: 'New Reminder', href: '/reminders/new', icon: Bell, permission: 'view_reminders' as const },
    { label: 'Log Call', href: '/calls/new', icon: Phone, permission: 'view_leads' as const },
  ].filter((action) => hasPermission(userRole, action.permission));

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Quick action menu */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 bg-background rounded-lg shadow-lg px-4 py-3 active:scale-95 transition-transform"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium text-text">{action.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fab z-50',
          open && 'rotate-45'
        )}
      >
        <Plus className="h-6 w-6" />
      </button>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="h-5 w-32 skeleton rounded" />
            <div className="h-4 w-24 skeleton rounded mt-1" />
          </div>
          <div className="h-10 w-10 skeleton rounded-full" />
        </div>
      </header>

      {/* Content skeleton */}
      <div className="px-4 py-4 space-y-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-3 h-20 skeleton" />
          ))}
        </div>

        {/* Section skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-32 skeleton rounded" />
            <div className="card p-4 h-24 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

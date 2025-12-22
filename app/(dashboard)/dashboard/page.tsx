'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission, DASHBOARD_SECTIONS } from '@/lib/permissions';
import { cn, getGreeting, formatRelativeDate, formatCurrency, getUrgencyColor } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import type { UserWithBusiness, Reminder, Job, Lead, Customer } from '@/types';
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
} from 'lucide-react';

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [todayJobs, setTodayJobs] = useState<TodayJob[]>([]);
  const [tomorrowJobs, setTomorrowJobs] = useState<TodayJob[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);

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
        const [newLeadsRes, activeJobsRes, unpaidInvoicesRes] = await Promise.all([
          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', todayStart.toISOString()),
          supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .in('status', ['scheduled', 'in_progress']),
          supabase
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'sent'),
        ]);

        setStats({
          newLeadsToday: newLeadsRes.count || 0,
          activeJobs: activeJobsRes.count || 0,
          unpaidInvoices: unpaidInvoicesRes.count || 0,
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
              label="Unpaid Invoices"
              value={stats.unpaidInvoices}
              icon={DollarSign}
              href="/invoices"
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
  const urgencyColor = getUrgencyColor(reminder.due_at);

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
            {formatRelativeDate(reminder.due_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function JobCard({ job, showDate = false }: { job: TodayJob; showDate?: boolean }) {
  const statusColors = {
    scheduled: 'bg-info/10 text-info',
    in_progress: 'bg-warning/10 text-warning',
    completed: 'bg-success/10 text-success',
    cancelled: 'bg-danger/10 text-danger',
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
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(
              `${job.customer.address_line1}, ${job.customer.city || ''}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-primary"
          >
            <MapPin className="h-3.5 w-3.5" />
            Directions
          </a>
        )}
      </div>
    </Link>
  );
}

function LeadCard({ lead }: { lead: RecentLead }) {
  const statusColors = {
    new: 'bg-primary/10 text-primary',
    contacted: 'bg-info/10 text-info',
    qualified: 'bg-success/10 text-success',
    quoted: 'bg-warning/10 text-warning',
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

function QuickActionsButton({ userRole }: { userRole: string }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { label: 'New Lead', href: '/leads/new', icon: Users, permission: 'create_leads' },
    { label: 'New Job', href: '/jobs/new', icon: Briefcase, permission: 'create_jobs' },
    { label: 'New Reminder', href: '/reminders/new', icon: Bell, permission: 'view_reminders' },
    { label: 'Log Call', href: '/calls/new', icon: Phone, permission: 'view_leads' },
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

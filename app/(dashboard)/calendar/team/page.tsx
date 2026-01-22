'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserWithBusiness, CalendarDisplayEvent } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  ArrowLeft,
  Users,
  Briefcase,
} from 'lucide-react';

interface Technician {
  id: string;
  name: string;
  avatar_url?: string;
  color?: string;
}

interface TeamJob {
  id: string;
  title: string;
  customerName?: string;
  startTime: Date;
  endTime: Date;
  status: string;
  jobType?: string;
  address?: string;
  technicianId?: string;
}

const JOB_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  estimate: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
  install: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  repair: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  maintenance: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  service: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
  follow_up: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

// Time slots for the grid (6 AM to 8 PM)
const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => i + 6); // 6, 7, 8, ..., 20

export default function TeamCalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<CalendarDisplayEvent[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  // Load technicians
  const loadTechnicians = useCallback(async () => {
    try {
      const response = await fetch('/api/dispatch/technicians');
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data.technicians || []);
      }
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  }, []);

  // Load events for selected date
  const loadEvents = useCallback(async () => {
    if (!user) return;

    setRefreshing(true);

    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    try {
      const response = await fetch(
        `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      const data = await response.json();
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    if (user) {
      loadEvents();
      loadTechnicians();
    }
  }, [user, loadEvents, loadTechnicians]);

  // Convert events to jobs
  const jobs = useMemo((): TeamJob[] => {
    return events
      .filter((event) => event.type === 'job')
      .map((event) => ({
        id: event.id,
        title: event.title,
        customerName: event.customer?.name,
        startTime: new Date(event.start),
        endTime: new Date(event.end),
        status: event.status || 'scheduled',
        jobType: event.job_type,
        address: event.address || undefined,
        technicianId: event.assigned_to,
      }));
  }, [events]);

  // Group jobs by technician
  const jobsByTechnician = useMemo(() => {
    const grouped: Record<string, TeamJob[]> = {};

    // Initialize with all technicians
    technicians.forEach((tech) => {
      grouped[tech.id] = [];
    });

    // Add unassigned group
    grouped['unassigned'] = [];

    // Group jobs
    jobs.forEach((job) => {
      const techId = job.technicianId || 'unassigned';
      if (grouped[techId]) {
        grouped[techId].push(job);
      } else {
        grouped['unassigned'].push(job);
      }
    });

    return grouped;
  }, [jobs, technicians]);

  // Navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Calculate job position on grid
  const getJobStyle = (job: TeamJob) => {
    const startHour = job.startTime.getHours() + job.startTime.getMinutes() / 60;
    const endHour = job.endTime.getHours() + job.endTime.getMinutes() / 60;
    const duration = endHour - startHour;

    const top = ((startHour - 6) / 14) * 100;
    const height = (duration / 14) * 100;

    return {
      top: `${Math.max(0, top)}%`,
      height: `${Math.min(100 - top, Math.max(height, 5))}%`,
    };
  };

  if (loading || !user) {
    return <TeamCalendarSkeleton />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/calendar">
                <Button variant="ghost" size="icon-sm">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-text flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Calendar
                </h1>
                <p className="text-sm text-muted-foreground">
                  {technicians.length} team members
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => loadEvents()}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="px-4 pb-3 flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                isToday(selectedDate)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              Today
            </button>
            <span className="text-lg font-semibold">
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => navigateDate('next')}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content - Scrollable Grid */}
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-max h-full flex">
          {/* Time Column */}
          <div className="w-16 shrink-0 border-r border-border bg-muted/30">
            <div className="h-16 border-b border-border" /> {/* Header spacer */}
            <div className="relative" style={{ height: 'calc(100% - 64px)' }}>
              {TIME_SLOTS.map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute w-full text-right pr-2 text-xs text-muted-foreground"
                  style={{ top: `${(idx / 14) * 100}%`, transform: 'translateY(-50%)' }}
                >
                  {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                </div>
              ))}
            </div>
          </div>

          {/* Technician Columns */}
          {technicians.map((tech) => (
            <TechnicianColumn
              key={tech.id}
              technician={tech}
              jobs={jobsByTechnician[tech.id] || []}
              getJobStyle={getJobStyle}
            />
          ))}

          {/* Unassigned Column */}
          {jobsByTechnician['unassigned']?.length > 0 && (
            <TechnicianColumn
              key="unassigned"
              technician={{ id: 'unassigned', name: 'Unassigned' }}
              jobs={jobsByTechnician['unassigned']}
              getJobStyle={getJobStyle}
              isUnassigned
            />
          )}
        </div>
      </div>

      {/* Summary Footer */}
      <footer className="shrink-0 bg-muted/30 border-t border-border px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} scheduled
          </span>
          <div className="flex items-center gap-4">
            {Object.entries(STATUS_COLORS).slice(0, 3).map(([status, color]) => (
              <span key={status} className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', color.split(' ')[0])} />
                <span className="capitalize">{status.replace('_', ' ')}</span>
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

interface TechnicianColumnProps {
  technician: Technician;
  jobs: TeamJob[];
  getJobStyle: (job: TeamJob) => { top: string; height: string };
  isUnassigned?: boolean;
}

function TechnicianColumn({ technician, jobs, getJobStyle, isUnassigned }: TechnicianColumnProps) {
  return (
    <div className="w-48 shrink-0 border-r border-border flex flex-col">
      {/* Technician Header */}
      <div
        className={cn(
          'h-16 px-3 py-2 border-b border-border flex items-center gap-2',
          isUnassigned ? 'bg-orange-50' : 'bg-muted/30'
        )}
      >
        {!isUnassigned && (
          <Avatar
            src={technician.avatar_url}
            fallback={technician.name.charAt(0)}
            size="sm"
          />
        )}
        {isUnassigned && (
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <Briefcase className="h-4 w-4 text-orange-600" />
          </div>
        )}
        <div className="min-w-0">
          <p className={cn('font-medium truncate', isUnassigned && 'text-orange-700')}>
            {technician.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Time grid lines */}
        {TIME_SLOTS.map((_, idx) => (
          <div
            key={idx}
            className="absolute w-full border-t border-border/50"
            style={{ top: `${(idx / 14) * 100}%` }}
          />
        ))}

        {/* Jobs */}
        {jobs.map((job) => {
          const colors = JOB_TYPE_COLORS[job.jobType || 'service'] || JOB_TYPE_COLORS.service;
          const statusColor = STATUS_COLORS[job.status] || STATUS_COLORS.scheduled;

          return (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className={cn(
                'absolute left-1 right-1 rounded-lg border p-2 overflow-hidden',
                'hover:shadow-md transition-shadow cursor-pointer',
                colors.bg,
                colors.border
              )}
              style={getJobStyle(job)}
            >
              <div className="h-full flex flex-col">
                <p className={cn('text-xs font-medium truncate', colors.text)}>
                  {job.title}
                </p>
                {job.customerName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {job.customerName}
                  </p>
                )}
                <div className="mt-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {job.startTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </Link>
          );
        })}

        {/* Empty state */}
        {jobs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No jobs</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamCalendarSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="shrink-0 bg-background border-b border-border">
        <div className="px-4 py-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="px-4 pb-3">
          <Skeleton className="h-10 w-full" />
        </div>
      </header>
      <div className="flex-1 flex">
        <div className="w-16 shrink-0 border-r border-border bg-muted/30" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-48 shrink-0 border-r border-border">
            <div className="h-16 px-3 py-2 border-b border-border">
              <Skeleton className="h-full" />
            </div>
            <div className="p-2 space-y-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-16" />
              <Skeleton className="h-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

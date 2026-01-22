'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserWithBusiness, Job, Customer, User } from '@/types';
import {
  Zap,
  Lock,
  Unlock,
  Phone,
  MessageSquare,
  Navigation,
  Play,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  FileText,
  AlertTriangle,
  PartyPopper,
  ChevronRight,
} from 'lucide-react';
import { TechModeHeader } from '@/components/technician/tech-mode-header';
import { ActiveJobCard } from '@/components/technician/active-job-card';
import { JobQueueList } from '@/components/technician/job-queue-list';
import { MissedActionBanner } from '@/components/technician/missed-action-banner';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import { InlineInvoiceForm } from '@/components/technician/inline-invoice-form';
import { VoiceNoteRecorder } from '@/components/technician/voice-note-recorder';
import { useToast } from '@/components/ui/use-toast';

interface TechJob extends Job {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address_line1' | 'city' | 'state' | 'zip'>;
  business: { id: string; name: string; phone?: string };
  assigned_user?: Pick<User, 'id' | 'name'> | null;
  invoices?: { id: string }[];
}

interface TechStats {
  jobsToday: number;
  jobsRemaining: number;
  lastCompletedAt: string | null;
  // Revenue stats for owners/admins only
  earnedToday?: number;
  pendingToday?: number;
}

type WorkflowStep = 'idle' | 'voice_note' | 'invoice';

export default function MyDayPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TechStats | null>(null);
  const [todayJobs, setTodayJobs] = useState<TechJob[]>([]);
  const [currentJob, setCurrentJob] = useState<TechJob | null>(null);
  const [upNextJobs, setUpNextJobs] = useState<TechJob[]>([]);
  const [missedInvoiceJob, setMissedInvoiceJob] = useState<TechJob | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockPressTimer, setLockPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [lockPressProgress, setLockPressProgress] = useState(0);

  // Workflow state
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [completedJobId, setCompletedJobId] = useState<string | null>(null);
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false);
  const [voiceNoteSheetOpen, setVoiceNoteSheetOpen] = useState(false);

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

  // Load today's jobs and stats
  const loadTodayData = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    try {
      // Load today's jobs for this technician
      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey (
            id, name, phone, email, address_line1, city, state, zip
          ),
          business:businesses (id, name, phone),
          assigned_user:users!jobs_assigned_user_id_fkey (id, name),
          invoices (id)
        `)
        .gte('scheduled_date', todayStart.toISOString())
        .lt('scheduled_date', todayEnd.toISOString())
        .order('scheduled_time', { ascending: true });

      // Technicians only see their assigned jobs
      if (user.role === 'technician') {
        query = query.eq('assigned_user_id', user.id);
      }

      const { data: jobsData } = await query;
      const jobs = (jobsData as TechJob[]) || [];
      setTodayJobs(jobs);

      // Find current job (in_progress or next scheduled)
      const inProgressJob = jobs.find(j => j.status === 'in_progress');
      const scheduledJobs = jobs.filter(j => j.status === 'scheduled');
      const completedJobs = jobs.filter(j => j.status === 'completed');

      if (inProgressJob) {
        setCurrentJob(inProgressJob);
        setUpNextJobs(scheduledJobs);
      } else if (scheduledJobs.length > 0) {
        setCurrentJob(scheduledJobs[0]);
        setUpNextJobs(scheduledJobs.slice(1));
      } else {
        setCurrentJob(null);
        setUpNextJobs([]);
      }

      // Check for missed invoice (completed job without invoice)
      const missedJob = completedJobs.find(j => !j.invoices || j.invoices.length === 0);
      setMissedInvoiceJob(missedJob || null);

      // Calculate stats
      const lastCompleted = completedJobs
        .filter(j => j.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];

      const statsData: TechStats = {
        jobsToday: jobs.length,
        jobsRemaining: scheduledJobs.length + (inProgressJob ? 1 : 0),
        lastCompletedAt: lastCompleted?.completed_at || null,
      };

      // Add revenue stats for owners/admins
      if (user.role === 'owner' || user.role === 'admin') {
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('total, status')
          .in('job_id', jobs.map(j => j.id));

        if (invoiceData) {
          statsData.earnedToday = invoiceData
            .filter(i => i.status === 'paid')
            .reduce((sum, i) => sum + (i.total || 0), 0);
          statsData.pendingToday = invoiceData
            .filter(i => i.status !== 'paid')
            .reduce((sum, i) => sum + (i.total || 0), 0);
        }
      }

      setStats(statsData);
    } catch (error) {
      console.error('Error loading today data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your jobs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      loadTodayData();
    }
  }, [user, loadTodayData]);

  // Handle "I'm On My Way" action
  const handleOnMyWay = async () => {
    if (!currentJob) return;

    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const response = await fetch('/api/technician/on-the-way', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: currentJob.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send notification');
      }

      const data = await response.json();

      toast({
        title: 'On Your Way!',
        description: `Customer notified. ETA: ${data.eta}`,
      });

      // Refresh data
      await loadTodayData();
    } catch (error) {
      console.error('Error sending on-my-way:', error);
      toast({
        title: 'Error',
        description: 'Could not get your location or send notification.',
        variant: 'destructive',
      });
    }
  };

  // Handle "Start Job" action
  const handleStartJob = async () => {
    if (!currentJob || !user) return;

    try {
      const response = await fetch(`/api/jobs/${currentJob.id}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start job');
      }

      toast({
        title: 'Job Started',
        description: 'Good luck!',
      });

      await loadTodayData();
    } catch (error) {
      console.error('Error starting job:', error);
      toast({
        title: 'Error',
        description: 'Failed to start job. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle "Complete Job" action
  const handleCompleteJob = async () => {
    if (!currentJob || !user) return;

    try {
      const response = await fetch(`/api/jobs/${currentJob.id}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to complete job');
      }

      setCompletedJobId(currentJob.id);

      // Show voice note sheet first (optional step)
      setWorkflowStep('voice_note');
      setVoiceNoteSheetOpen(true);
    } catch (error) {
      console.error('Error completing job:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete job. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle voice note completion (skip or recorded)
  const handleVoiceNoteComplete = (recorded: boolean) => {
    setVoiceNoteSheetOpen(false);

    if (recorded) {
      toast({
        title: 'Voice Note Saved',
        description: 'Your note has been attached to the job.',
      });
    }

    // Move to invoice step
    setWorkflowStep('invoice');
    setInvoiceSheetOpen(true);
  };

  // Handle invoice sent
  const handleInvoiceSent = async (nextJobId?: string) => {
    setInvoiceSheetOpen(false);
    setWorkflowStep('idle');
    setCompletedJobId(null);

    toast({
      title: 'Invoice Sent!',
      description: 'Moving to next job...',
    });

    // Auto-advance to next job
    await loadTodayData();

    // Check if done for the day
    if (!nextJobId && upNextJobs.length === 0) {
      toast({
        title: "You're Done for Today!",
        description: 'Great work. Take a well-deserved break.',
      });
    }
  };

  // Handle invoice skip
  const handleInvoiceSkip = async () => {
    setInvoiceSheetOpen(false);
    setWorkflowStep('idle');
    setCompletedJobId(null);

    await loadTodayData();
  };

  // Handle make current (switch to different job)
  const handleMakeCurrent = async (job: TechJob) => {
    // Add friction: confirm if current job is in progress
    if (currentJob?.status === 'in_progress') {
      const confirmed = window.confirm(
        'You have a job in progress. Complete it first or switch anyway?'
      );
      if (!confirmed) return;
    }

    // For now, just scroll to show that job info
    // In a more complex implementation, we'd update the current job assignment
    toast({
      title: 'Switched to Job',
      description: `Now viewing: ${job.title}`,
    });

    setCurrentJob(job);
    setUpNextJobs(todayJobs.filter(j =>
      j.id !== job.id &&
      j.status === 'scheduled'
    ));
  };

  // Lock mode handlers
  const handleLockToggle = () => {
    if (isLocked) {
      // Don't unlock directly - require long press
      return;
    }
    setIsLocked(true);
    toast({
      title: 'Technician Mode Locked',
      description: 'Hold the lock button for 3 seconds to unlock.',
    });
  };

  const handleLockPressStart = () => {
    if (!isLocked) return;

    const timer = setInterval(() => {
      setLockPressProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsLocked(false);
          setLockPressProgress(0);
          toast({
            title: 'Unlocked',
            description: 'You can now navigate away.',
          });
          return 0;
        }
        return prev + (100 / 30); // 3 seconds = 30 intervals at 100ms
      });
    }, 100);

    setLockPressTimer(timer);
  };

  const handleLockPressEnd = () => {
    if (lockPressTimer) {
      clearInterval(lockPressTimer);
      setLockPressTimer(null);
    }
    setLockPressProgress(0);
  };

  // Loading state
  if (loading || !user) {
    return <TechModeSkeleton />;
  }

  // All done for today
  const isDoneForDay = stats && stats.jobsRemaining === 0 && todayJobs.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <TechModeHeader
        stats={stats}
        userRole={user.role}
        isLocked={isLocked}
        lockPressProgress={lockPressProgress}
        onLockToggle={handleLockToggle}
        onLockPressStart={handleLockPressStart}
        onLockPressEnd={handleLockPressEnd}
      />

      {/* Main Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Missed Action Recovery Banner */}
        {missedInvoiceJob && (
          <MissedActionBanner
            job={missedInvoiceJob}
            onSendInvoice={() => {
              setCompletedJobId(missedInvoiceJob.id);
              setInvoiceSheetOpen(true);
            }}
          />
        )}

        {/* Current Job Card */}
        {currentJob ? (
          <ActiveJobCard
            job={currentJob}
            onOnMyWay={handleOnMyWay}
            onStartJob={handleStartJob}
            onCompleteJob={handleCompleteJob}
          />
        ) : isDoneForDay ? (
          /* All done celebration */
          <div className="card p-8 text-center bg-gradient-to-br from-success/5 to-success/10 border-success/20">
            <div className="p-4 rounded-full bg-success/10 inline-flex mb-4">
              <PartyPopper className="h-12 w-12 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-text mb-2">
              You're Done for Today!
            </h2>
            <p className="text-text-muted">
              {stats?.jobsToday} job{stats?.jobsToday !== 1 ? 's' : ''} completed. Great work!
            </p>
          </div>
        ) : (
          /* No jobs scheduled */
          <div className="card p-8 text-center">
            <div className="p-4 rounded-full bg-muted/50 inline-flex mb-4">
              <Clock className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-text mb-2">
              No Jobs Scheduled
            </h2>
            <p className="text-text-muted">
              Check back later or contact dispatch.
            </p>
          </div>
        )}

        {/* Up Next Queue */}
        {upNextJobs.length > 0 && (
          <JobQueueList
            jobs={upNextJobs}
            onMakeCurrent={handleMakeCurrent}
          />
        )}
      </div>

      {/* Sticky Footer Actions */}
      {currentJob && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-bottom">
          <div className="flex items-center justify-around gap-2">
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12"
              onClick={() => window.open(`tel:${currentJob.customer.phone}`)}
              disabled={!currentJob.customer.phone}
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12"
              onClick={() => window.open(`sms:${currentJob.customer.phone}`)}
              disabled={!currentJob.customer.phone}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12"
              onClick={() => {
                // TODO: Implement photo capture
                toast({ title: 'Coming Soon', description: 'Photo capture will be available soon.' });
              }}
            >
              <Camera className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 h-12"
              onClick={() => {
                const address = `${currentJob.customer.address_line1}, ${currentJob.customer.city}, ${currentJob.customer.state} ${currentJob.customer.zip}`;
                const encodedAddress = encodeURIComponent(address);
                window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
              }}
            >
              <Navigation className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Voice Note Bottom Sheet */}
      <BottomSheet
        open={voiceNoteSheetOpen}
        onOpenChange={setVoiceNoteSheetOpen}
        title="Add Voice Note"
        description="Optional - record a quick note about the job"
      >
        <VoiceNoteRecorder
          jobId={completedJobId || ''}
          onComplete={(recorded) => handleVoiceNoteComplete(recorded)}
          onSkip={() => handleVoiceNoteComplete(false)}
        />
      </BottomSheet>

      {/* Invoice Bottom Sheet */}
      <BottomSheet
        open={invoiceSheetOpen}
        onOpenChange={setInvoiceSheetOpen}
        title="Send Invoice"
        description="Quick invoice for the completed job"
      >
        <InlineInvoiceForm
          jobId={completedJobId || ''}
          job={completedJobId ? todayJobs.find(j => j.id === completedJobId) : undefined}
          onSent={handleInvoiceSent}
          onSkip={handleInvoiceSkip}
        />
      </BottomSheet>
    </div>
  );
}

function TechModeSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-48 bg-white/20 rounded animate-pulse" />
          <div className="h-8 w-8 bg-white/20 rounded animate-pulse" />
        </div>
        <div className="flex gap-4">
          <div className="h-16 flex-1 bg-white/20 rounded-lg animate-pulse" />
          <div className="h-16 flex-1 bg-white/20 rounded-lg animate-pulse" />
          <div className="h-16 flex-1 bg-white/20 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-4">
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
        <div className="h-32 bg-muted rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

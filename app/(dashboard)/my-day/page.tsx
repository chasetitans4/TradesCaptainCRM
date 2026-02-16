'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import type { UserWithBusiness, Job, Customer, User, WrapUpCompletionStatus } from '@/types';
import {
  Phone,
  MessageSquare,
  Navigation,
  Play,
  Clock,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton-loaders';
import { TechModeHeader } from '@/components/technician/tech-mode-header';
import { ActiveJobCard } from '@/components/technician/active-job-card';
import {
  CommandStrip,
  ShortcutsGrid,
  generateCommandStripCards,
} from '@/components/today';
import { JobQueueList } from '@/components/technician/job-queue-list';
import { MissedActionBanner } from '@/components/technician/missed-action-banner';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import { InlineInvoiceForm } from '@/components/technician/inline-invoice-form';
import { VoiceNoteRecorder } from '@/components/technician/voice-note-recorder';
import { BeforeAfterPhotos } from '@/components/technician/before-after-photos';
import { PartsUsedForm } from '@/components/technician/parts-used-form';
import { WrapUpModal } from '@/components/technician/wrap-up-modal';
import { calculateHaversineDistance } from '@/lib/utils/haversine';
import { useToast } from '@/components/ui/use-toast';
import { useOnlineStatus } from '@/lib/hooks/use-online-status';
import { useTechnicianOffline, isQueued } from '@/lib/hooks/use-technician-offline';
import { OfflineBanner } from '@/components/technician/offline-banner';

interface TechJob extends Job {
  customer: Pick<Customer,
    'id' | 'name' | 'phone' | 'email' | 'address_line1' | 'city' | 'state' | 'zip'
    | 'gate_code' | 'has_dog' | 'dog_info' | 'access_notes' | 'parking_notes'
    | 'latitude' | 'longitude'
  >;
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

type WorkflowStep = 'idle' | 'before_photos' | 'voice_note' | 'after_photos' | 'invoice';

export default function MyDayPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOnlineStatus();
  const techOffline = useTechnicianOffline();
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

  // Running late state
  const [runningLateSheetOpen, setRunningLateSheetOpen] = useState(false);

  // Before/after photos state
  const [beforePhotosOpen, setBeforePhotosOpen] = useState(false);
  const [afterPhotosOpen, setAfterPhotosOpen] = useState(false);

  // Parts logging state
  const [partsSheetOpen, setPartsSheetOpen] = useState(false);

  // Wrap Up modal state
  const [wrapUpOpen, setWrapUpOpen] = useState(false);

  // GPS auto-arrival state
  const [showArrivalPrompt, setShowArrivalPrompt] = useState(false);

  // AlertDialog for job switch confirmation
  const [confirmSwitchJob, setConfirmSwitchJob] = useState<TechJob | null>(null);

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
            id, name, phone, email, address_line1, city, state, zip,
            gate_code, has_dog, dog_info, access_notes, parking_notes,
            latitude, longitude
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

      // Add revenue stats
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
      } else {
        // Technician estimated earnings from job prices
        statsData.earnedToday = completedJobs
          .filter(j => j.price)
          .reduce((sum, j) => sum + (j.price || 0), 0);
        statsData.pendingToday = scheduledJobs
          .concat(inProgressJob ? [inProgressJob] : [])
          .filter(j => j.price)
          .reduce((sum, j) => sum + (j.price || 0), 0);
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

      const result = await techOffline.onMyWay(
        currentJob.id,
        position.coords.latitude,
        position.coords.longitude,
      );

      if (isQueued(result)) {
        toast({
          title: 'Queued Offline',
          description: 'Customer will be notified when you reconnect.',
        });
      } else {
        toast({
          title: 'On Your Way!',
          description: `Customer notified. ETA: ${(result as any).eta}`,
        });
      }

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

  // Handle "Running Late" action
  const handleRunningLate = () => {
    setRunningLateSheetOpen(true);
  };

  const handleSendRunningLate = async (delayMinutes: number) => {
    if (!currentJob) return;

    try {
      const result = await techOffline.runningLate(currentJob.id, delayMinutes);

      if (isQueued(result)) {
        toast({
          title: 'Queued Offline',
          description: `Delay notification will be sent when you reconnect.`,
        });
      } else {
        toast({
          title: 'Customer Notified',
          description: `Customer notified of ${delayMinutes} minute delay.`,
        });
      }

      setRunningLateSheetOpen(false);
    } catch (error) {
      console.error('Error sending running late:', error);
      toast({
        title: 'Error',
        description: 'Could not send notification. Try calling the customer.',
        variant: 'destructive',
      });
    }
  };

  // Handle "Start Job" action — prompts before-photos first
  const handleStartJob = async () => {
    if (!currentJob || !user) return;

    // Prompt for before-photos
    setWorkflowStep('before_photos');
    setBeforePhotosOpen(true);
  };

  // Actually start the job (after optional before-photos)
  const executeStartJob = async () => {
    if (!currentJob || !user) return;

    try {
      const result = await techOffline.startJob(currentJob.id);

      if (isQueued(result)) {
        toast({
          title: 'Queued Offline',
          description: 'Job start will be recorded when you reconnect.',
        });
      } else {
        toast({
          title: 'Job Started',
          description: 'Good luck!',
        });
      }

      setWorkflowStep('idle');
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

  // Handle "Wrap Up" action — opens full-screen modal
  const handleWrapUp = () => {
    if (!currentJob || !user) return;
    setWrapUpOpen(true);
  };

  // Handle wrap up confirmation from the modal
  const handleWrapUpConfirm = async (data: {
    completion_status: WrapUpCompletionStatus;
    invoice_ready: boolean;
    return_reason?: string;
    return_scheduled_for?: string;
    callback_reason?: string;
    wrapup_started_at: string;
  }) => {
    if (!currentJob) return;

    try {
      const result = await techOffline.wrapUpJob(currentJob.id, data);

      if (isQueued(result)) {
        toast({
          title: 'Queued Offline',
          description: 'Wrap up will be synced when you reconnect.',
        });
      }

      // Refresh data after wrap up
      await loadTodayData();
      setWrapUpOpen(false);
    } catch (error) {
      console.error('Error wrapping up job:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to wrap up job. Please try again.',
        variant: 'destructive',
      });
      throw error; // Re-throw so modal stays open
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
      setConfirmSwitchJob(job);
      return;
    }

    executeSwitchJob(job);
  };

  const executeSwitchJob = (job: TechJob) => {
    toast({
      title: 'Switched to Job',
      description: `Now viewing: ${job.title}`,
    });

    setCurrentJob(job);
    setUpNextJobs(todayJobs.filter(j =>
      j.id !== job.id &&
      j.status === 'scheduled'
    ));
    setConfirmSwitchJob(null);
  };

  // Handle before-photos completion
  const handleBeforePhotosComplete = (count: number) => {
    setBeforePhotosOpen(false);
    if (count > 0) {
      toast({ title: 'Photos Saved', description: `${count} before photo${count > 1 ? 's' : ''} uploaded.` });
    }
    // Now actually start the job
    executeStartJob();
  };

  const handleBeforePhotosSkip = () => {
    setBeforePhotosOpen(false);
    executeStartJob();
  };

  // Handle after-photos completion
  const handleAfterPhotosComplete = (count: number) => {
    setAfterPhotosOpen(false);
    if (count > 0) {
      toast({ title: 'Photos Saved', description: `${count} after photo${count > 1 ? 's' : ''} uploaded.` });
    }
    // Move to voice note step
    setWorkflowStep('voice_note');
    setVoiceNoteSheetOpen(true);
  };

  const handleAfterPhotosSkip = () => {
    setAfterPhotosOpen(false);
    // Move to voice note step
    setWorkflowStep('voice_note');
    setVoiceNoteSheetOpen(true);
  };

  // Handle parts form save
  const handlePartsSave = (parts: { name: string; quantity_used: number }[]) => {
    toast({
      title: 'Parts Logged',
      description: `${parts.length} part${parts.length > 1 ? 's' : ''} saved to this job.`,
    });
  };

  // GPS auto-arrival detection
  useEffect(() => {
    if (!currentJob || currentJob.status !== 'on_way') return;
    if (!currentJob.customer.latitude || !currentJob.customer.longitude) return;
    if (!navigator.geolocation) return;

    let lastCheck = 0;
    const THROTTLE_MS = 30000; // Check every 30 seconds

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastCheck < THROTTLE_MS) return;
        lastCheck = now;

        const distance = calculateHaversineDistance(
          position.coords.latitude,
          position.coords.longitude,
          currentJob.customer.latitude!,
          currentJob.customer.longitude!,
        );

        // Show arrival prompt at <= 0.1 miles (~528 feet)
        if (distance <= 0.1) {
          setShowArrivalPrompt(true);
          navigator.vibrate?.([200, 100, 200]); // Double pulse
        }
      },
      () => { /* Silently ignore geo errors */ },
      { enableHighAccuracy: true, maximumAge: 15000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentJob]);

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
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        onTriggerSync={triggerSync}
      />

      {/* Main Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Offline / Sync Banner */}
        <OfflineBanner
          isOnline={isOnline}
          pendingCount={pendingCount}
          isSyncing={isSyncing}
          onTriggerSync={triggerSync}
        />

        {/* Command Strip - Rule-based insights */}
        <CommandStrip
          cards={generateCommandStripCards({
            jobsBlockingPayment: todayJobs.filter(j => j.status === 'completed' && (!j.invoices || j.invoices.length === 0)).length,
          })}
        />

        {/* Shortcuts Grid - Quick actions */}
        <ShortcutsGrid
          isClockedIn={false}
          onClockToggle={() => {
            toast({ title: 'Coming Soon', description: 'Time tracking will be available soon.' });
          }}
        />

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

        {/* GPS Arrival Prompt */}
        {showArrivalPrompt && currentJob?.status === 'on_way' && (
          <div className="rounded-lg bg-success/10 border border-success/30 p-4 flex items-center justify-between gap-3 animate-slide-down">
            <div>
              <p className="font-semibold text-success">You've arrived!</p>
              <p className="text-sm text-text-muted">Ready to start the job?</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowArrivalPrompt(false)}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                className="bg-success hover:bg-success/90"
                onClick={() => { setShowArrivalPrompt(false); handleStartJob(); }}
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            </div>
          </div>
        )}

        {/* Current Job Card */}
        {currentJob ? (
          <ActiveJobCard
            job={currentJob}
            userId={user.id}
            onOnMyWay={handleOnMyWay}
            onStartJob={handleStartJob}
            onWrapUp={handleWrapUp}
            onRunningLate={handleRunningLate}
            onPartsUsed={() => setPartsSheetOpen(true)}
          />
        ) : isDoneForDay ? (
          /* Completion confirmation — calm, no celebration */
          <div className="card p-8 text-center animate-fade-in">
            <div className="p-3 rounded-full bg-success/10 inline-flex mb-4">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-text mb-1">
              All jobs complete
            </h2>
            <p className="text-sm text-text-muted">
              {stats?.jobsToday} job{stats?.jobsToday !== 1 ? 's' : ''} today
              {stats?.earnedToday ? ` · $${stats.earnedToday.toLocaleString()}` : ''}
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

      {/* Sticky Footer Actions — Square Tiles */}
      {currentJob && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 safe-area-bottom shadow-lg z-50">
          <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
            <Button
              variant="outline"
              className="flex-col h-auto aspect-square gap-1 p-0 border-2 active:scale-95 transition-transform"
              onClick={() => window.open(`tel:${currentJob.customer.phone}`)}
              disabled={!currentJob.customer.phone}
            >
              <Phone className="h-7 w-7 mb-1" />
              <span className="text-xs font-bold">Call</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto aspect-square gap-1 p-0 border-2 active:scale-95 transition-transform"
              onClick={() => window.open(`sms:${currentJob.customer.phone}`)}
              disabled={!currentJob.customer.phone}
            >
              <MessageSquare className="h-7 w-7 mb-1" />
              <span className="text-xs font-bold">Text</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto aspect-square gap-1 p-0 border-2 active:scale-95 transition-transform"
              onClick={() => {
                const phase = currentJob.status === 'in_progress' ? 'after' : 'before';
                if (phase === 'before') {
                  setBeforePhotosOpen(true);
                } else {
                  setAfterPhotosOpen(true);
                }
              }}
            >
              <Camera className="h-7 w-7 mb-1" />
              <span className="text-xs font-bold">Photo</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto aspect-square gap-1 p-0 border-2 active:scale-95 transition-transform"
              onClick={() => {
                const address = `${currentJob.customer.address_line1}, ${currentJob.customer.city}, ${currentJob.customer.state} ${currentJob.customer.zip}`;
                const encodedAddress = encodeURIComponent(address);
                window.open(`https://maps.google.com/?q=${encodedAddress}`, '_blank');
              }}
            >
              <Navigation className="h-7 w-7 mb-1" />
              <span className="text-xs font-bold">Nav</span>
            </Button>
          </div>
        </div>
      )}

      {/* Wrap Up Modal */}
      {currentJob && user && (
        <WrapUpModal
          open={wrapUpOpen}
          onOpenChange={setWrapUpOpen}
          job={currentJob}
          onConfirm={handleWrapUpConfirm}
        />
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

      {/* Running Late Bottom Sheet */}
      <BottomSheet
        open={runningLateSheetOpen}
        onOpenChange={setRunningLateSheetOpen}
        title="Running Late"
        description="Notify the customer of a delay"
      >
        <div className="space-y-3 p-1">
          {[5, 10, 15, 30].map((mins) => (
            <Button
              key={mins}
              variant="outline"
              className="w-full h-12 text-base justify-start"
              onClick={() => handleSendRunningLate(mins)}
            >
              <Clock className="h-5 w-5 mr-3 text-amber-500" />
              {mins} minutes late
            </Button>
          ))}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setRunningLateSheetOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </BottomSheet>

      {/* Before Photos */}
      {currentJob && user && (
        <BeforeAfterPhotos
          jobId={currentJob.id}
          businessId={currentJob.business.id}
          userId={user.id}
          phase="before"
          open={beforePhotosOpen}
          onOpenChange={setBeforePhotosOpen}
          onComplete={handleBeforePhotosComplete}
          onSkip={handleBeforePhotosSkip}
        />
      )}

      {/* After Photos */}
      {(completedJobId || currentJob) && user && (
        <BeforeAfterPhotos
          jobId={completedJobId || currentJob!.id}
          businessId={currentJob?.business.id || ''}
          userId={user.id}
          phase="after"
          open={afterPhotosOpen}
          onOpenChange={setAfterPhotosOpen}
          onComplete={handleAfterPhotosComplete}
          onSkip={handleAfterPhotosSkip}
        />
      )}

      {/* Parts Used Form */}
      {currentJob && (
        <PartsUsedForm
          jobId={currentJob.id}
          businessId={currentJob.business.id}
          open={partsSheetOpen}
          onOpenChange={setPartsSheetOpen}
          onSave={handlePartsSave}
        />
      )}

      {/* Job Switch Confirmation AlertDialog */}
      <AlertDialog
        open={!!confirmSwitchJob}
        onOpenChange={(open) => { if (!open) setConfirmSwitchJob(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch Job?</AlertDialogTitle>
            <AlertDialogDescription>
              You have a job in progress. Switch to &ldquo;{confirmSwitchJob?.title || 'Service Call'}&rdquo; anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmSwitchJob && executeSwitchJob(confirmSwitchJob)}>
              Switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TechModeSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton — matches TechModeHeader layout */}
      <div className="bg-primary text-primary-foreground">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-white/20 rounded-lg animate-pulse" />
            <div className="space-y-1">
              <div className="h-5 w-36 bg-white/20 rounded animate-pulse" />
              <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-14 w-14 bg-white/10 rounded-full animate-pulse" />
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <Skeleton className="h-16 flex-1 rounded-lg bg-white/10" />
          <Skeleton className="h-16 flex-1 rounded-lg bg-white/10" index={1} />
          <Skeleton className="h-16 flex-1 rounded-lg bg-white/10" index={2} />
        </div>
      </div>

      {/* Content skeleton — matches job card + queue layout */}
      <div className="px-4 py-4 space-y-4">
        {/* Active job card skeleton */}
        <div className="card border-2 border-border overflow-hidden">
          <div className="px-4 py-3 space-y-2">
            <Skeleton className="h-5 w-20 rounded-full" index={3} />
            <Skeleton className="h-6 w-48" index={4} />
          </div>
          <div className="px-4 py-3 border-t border-border space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" index={5} />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-32" index={6} />
                <Skeleton className="h-3 w-24" index={7} />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-14 flex-1 rounded-lg" index={8} />
              <Skeleton className="h-14 flex-1 rounded-lg" index={9} />
              <Skeleton className="h-14 flex-1 rounded-lg" index={10} />
            </div>
          </div>
          <div className="p-4 border-t border-border">
            <Skeleton className="h-20 w-full rounded-lg" index={11} />
          </div>
        </div>

        {/* Queue skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" index={12} />
          <Skeleton className="h-20 w-full rounded-lg" index={13} />
          <Skeleton className="h-20 w-full rounded-lg" index={14} />
        </div>
      </div>
    </div>
  );
}

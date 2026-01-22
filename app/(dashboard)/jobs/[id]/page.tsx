'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { hasPermission, canViewJob, canEditJob } from '@/lib/permissions';
import {
  cn,
  formatRelativeDate,
  formatPhoneNumber,
  formatDate,
  formatTime,
  formatAddress,
  formatCurrency,
} from '@/lib/utils';
import { getSmartNavigationUrl } from '@/lib/utils/navigation';
import { AddressLink } from '@/components/ui/address-link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import type { UserWithBusiness, Job, Customer, JobNote, JobPhoto, JobStatus, User } from '@/types';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Clock,
  Calendar,
  ChevronRight,
  Edit2,
  MoreVertical,
  CheckCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  User as UserIcon,
  FileText,
  DollarSign,
  Camera,
  Image,
  Send,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { MobileDetailHeader } from '@/components/ui/mobile-breadcrumb';
import { BottomActionBar, BottomActionBarSpacer } from '@/components/mobile/bottom-action-bar';
import { QuickContactBar } from '@/components/mobile/quick-contact-bar';

import { DocumentList } from '@/components/documents/document-list';

interface JobWithDetails extends Job {
  customer: Customer;
  assigned_user?: User | null;
}

const STATUS_COLORS: Record<JobStatus, string> = {
  scheduled: 'bg-info/10 text-info border-info/20',
  in_progress: 'bg-warning/10 text-warning border-warning/20',
  completed: 'bg-success/10 text-success border-success/20',
  cancelled: 'bg-danger/10 text-danger border-danger/20',
  no_show: 'bg-muted/10 text-muted-foreground border-muted/20',
};

const STATUS_OPTIONS: { value: JobStatus; label: string; icon: React.ElementType }[] = [
  { value: 'scheduled', label: 'Scheduled', icon: Calendar },
  { value: 'in_progress', label: 'In Progress', icon: PlayCircle },
  { value: 'completed', label: 'Completed', icon: CheckCircle },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle },
];

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [job, setJob] = useState<JobWithDetails | null>(null);
  const [notes, setNotes] = useState<(JobNote & { user: Pick<User, 'id' | 'name'> })[]>([]);
  const [photos, setPhotos] = useState<(JobPhoto & { user: Pick<User, 'id' | 'name'> })[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);

  // Note input
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  // Load job data
  const loadJob = useCallback(async () => {
    if (!user || !jobId) return;

    const supabase = createClient();

    try {
      // Load job with customer and assigned user
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers!jobs_customer_id_fkey (*),
          assigned_user:users!jobs_assigned_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      // Transform job data
      const formattedJob = {
        ...jobData,
        assigned_user: jobData.assigned_user ? {
          ...jobData.assigned_user,
          name: `${jobData.assigned_user.first_name} ${jobData.assigned_user.last_name}`.trim()
        } : null
      };

      // Check access for technicians
      if (user.role === 'technician' && formattedJob.assigned_to !== user.id) {
        router.push('/jobs');
        return;
      }

      setJob(formattedJob as JobWithDetails);

      // Load notes
      const { data: notesData } = await supabase
        .from('job_notes')
        .select(`
          *,
          user:users!job_notes_user_id_fkey (id, first_name, last_name)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      const formattedNotes = (notesData || []).map((note: any) => ({
        ...note,
        user: note.user ? {
          id: note.user.id,
          name: `${note.user.first_name} ${note.user.last_name}`.trim()
        } : null
      }));

      setNotes(formattedNotes);

      // Load photos
      const { data: photosData } = await supabase
        .from('job_photos')
        .select(`
          *,
          user:users!job_photos_user_id_fkey (id, first_name, last_name)
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      const formattedPhotos = (photosData || []).map((photo: any) => ({
        ...photo,
        user: photo.user ? {
          id: photo.user.id,
          name: `${photo.user.first_name} ${photo.user.last_name}`.trim()
        } : null
      }));

      setPhotos(formattedPhotos);
    } catch (error) {
      console.error('Error loading job:', error);
      router.push('/jobs');
    } finally {
      setLoading(false);
    }
  }, [user, jobId, router]);

  useEffect(() => {
    if (user && jobId) {
      loadJob();
    }
  }, [user, jobId, loadJob]);

  // Update job status
  const updateStatus = async (newStatus: JobStatus) => {
    if (!job) return;

    setUpdating(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', job.id);

      if (error) throw error;

      setJob({ ...job, status: newStatus });
      setShowStatusSheet(false);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Add note
  const addNote = async () => {
    if (!job || !user || !newNote.trim()) return;

    setAddingNote(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('job_notes')
        .insert({
          job_id: job.id,
          user_id: user.id,
          content: newNote.trim(),
        })
        .select(`
          *,
          user:users!job_notes_user_id_fkey (id, name)
        `)
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setAddingNote(false);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !job || !user) return;

    setUploadingPhoto(true);
    const supabase = createClient();

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${job.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(fileName);

      // Save photo record
      const { data, error } = await supabase
        .from('job_photos')
        .insert({
          job_id: job.id,
          user_id: user.id,
          url: publicUrl,
          caption: '',
        })
        .select(`
          *,
          user:users!job_photos_user_id_fkey (id, name)
        `)
        .single();

      if (error) throw error;

      setPhotos([data, ...photos]);
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete job
  const deleteJob = async () => {
    if (!job || !confirm('Are you sure you want to delete this job?')) return;

    setUpdating(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id);

      if (error) throw error;

      router.push('/jobs');
    } catch (error) {
      console.error('Error deleting job:', error);
      setUpdating(false);
    }
  };

  if (loading || !user || !job) {
    return <JobDetailSkeleton />;
  }

  const address = formatAddress(
    job.customer.address_line1,
    job.customer.city,
    job.customer.state,
    job.customer.zip
  );

  const canEdit = user.role === 'owner' || user.role === 'admin' || job.assigned_user_id === user.id;

  // Get next status action
  const getNextStatusAction = () => {
    switch (job.status) {
      case 'scheduled':
        return { label: 'Start Job', status: 'in_progress' as JobStatus, icon: PlayCircle };
      case 'in_progress':
        return { label: 'Complete Job', status: 'completed' as JobStatus, icon: CheckCircle };
      default:
        return null;
    }
  };

  const nextAction = getNextStatusAction();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft className="h-5 w-5 text-text" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-text truncate max-w-[200px]">
                {job.title}
              </h1>
              <Badge className={cn('border', STATUS_COLORS[job.status])}>
                {job.status.replace('_', ' ')}
              </Badge>
            </div>
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
                {hasPermission(user.role, 'manage_jobs') && (
                  <Link href={`/jobs/${job.id}/edit`} className="w-full">
                    <Button variant="ghost" className="w-full justify-start gap-3">
                      <Edit2 className="h-5 w-5" />
                      Edit Job
                    </Button>
                  </Link>
                )}
                <Link href={`/quotes/new?job_id=${job.id}`} className="w-full">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <FileText className="h-5 w-5" />
                    Create Quote
                  </Button>
                </Link>
                <Link href={`/invoices/new?job_id=${job.id}`} className="w-full">
                  <Button variant="ghost" className="w-full justify-start gap-3">
                    <DollarSign className="h-5 w-5" />
                    Create Invoice
                  </Button>
                </Link>
                {hasPermission(user.role, 'manage_jobs') && (
                  <>
                    <hr className="my-2" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 text-danger hover:text-danger hover:bg-danger/10"
                      onClick={deleteJob}
                      disabled={updating}
                    >
                      <Trash2 className="h-5 w-5" />
                      Delete Job
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-4 space-y-4">
        {/* Quick Contact Actions - Enhanced with QuickContactBar */}
        <QuickContactBar
          phone={job.customer.phone}
          email={job.customer.email}
          address={address}
          layout="2x2"
        />

        {/* Job Info */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-3">Job Details</h2>
          <div className="space-y-3">
            {job.scheduled_date && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">Scheduled</p>
                  <p className="text-text">
                    {formatDate(job.scheduled_date, 'EEEE, MMMM d, yyyy')}
                    {job.scheduled_time && ` at ${formatTime(job.scheduled_time)}`}
                  </p>
                </div>
              </div>
            )}
            {job.assigned_user && (
              <div className="flex items-start gap-3">
                <UserIcon className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">Assigned To</p>
                  <p className="text-text">{job.assigned_user.name}</p>
                </div>
              </div>
            )}
            {job.estimated_duration && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">Estimated Duration</p>
                  <p className="text-text">{job.estimated_duration} hours</p>
                </div>
              </div>
            )}
            {job.price && (
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-muted">Price</p>
                  <p className="text-text">{formatCurrency(job.price)}</p>
                </div>
              </div>
            )}
          </div>
          {job.description && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-text-muted mb-1">Description</p>
              <p className="text-text whitespace-pre-wrap">{job.description}</p>
            </div>
          )}
        </section>

        {/* Customer Info */}
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-text">Customer</h2>
            <Link href={`/customers/${job.customer.id}`}>
              <Button variant="ghost" size="sm" className="gap-1">
                View Profile
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar fallback={job.customer.name?.charAt(0) || 'C'} size="md" />
              <div>
                <p className="font-medium text-text">{job.customer.name}</p>
                {job.customer.phone && (
                  <p className="text-sm text-text-muted">
                    {formatPhoneNumber(job.customer.phone)}
                  </p>
                )}
              </div>
            </div>
            {address && (
              <AddressLink
                address={job.customer.address_line1}
                city={job.customer.city}
                state={job.customer.state}
                zip={job.customer.zip}
                className="flex items-start gap-3 text-primary"
                iconClassName="h-5 w-5 text-text-muted shrink-0 mt-0.5"
              />
            )}
          </div>
        </section>

        {/* Status Update */}
        {canEdit && (
          <section className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-text">Status</h2>
              <Sheet open={showStatusSheet} onOpenChange={setShowStatusSheet}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Badge className={cn('border', STATUS_COLORS[job.status])}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="pb-safe">
                  <SheetHeader>
                    <SheetTitle>Update Status</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isActive = job.status === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => updateStatus(option.value)}
                          disabled={updating || isActive}
                          className={cn(
                            'p-3 rounded-lg border flex items-center gap-2 transition-colors',
                            isActive
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'border-border hover:bg-muted'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </section>
        )}

        {/* Documents */}
        <section className="card p-4">
          <DocumentList
            entityType="job"
            entityId={job.id}
            readOnly={!hasPermission(user.role, 'manage_jobs')}
          />
        </section>

        {/* Photos */}
        <section className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-text">Photos ({photos.length})</h2>
            {hasPermission(user.role, 'add_job_photos') && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="gap-1"
                >
                  <Camera className="h-4 w-4" />
                  Add
                </Button>
              </>
            )}
          </div>

          {uploadingPhoto && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-pulse text-text-muted">Uploading...</div>
            </div>
          )}

          {photos.length === 0 && !uploadingPhoto ? (
            <div className="text-center py-6">
              <Image className="h-8 w-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">No photos yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square">
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute bottom-1 left-1 right-1 text-xs text-white bg-black/50 rounded px-1 py-0.5 truncate">
                    {photo.user?.name || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Notes */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-3">Notes ({notes.length})</h2>

          {/* Add note input */}
          {hasPermission(user.role, 'add_job_notes') && (
            <div className="flex gap-2 mb-4">
              <Input
                type="text"
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addNote();
                  }
                }}
                disabled={addingNote}
              />
              <Button
                size="icon"
                onClick={addNote}
                disabled={addingNote || !newNote.trim()}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          )}

          {notes.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">
              No notes yet
            </p>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="flex gap-3">
                  <Avatar
                    fallback={note.user?.name?.charAt(0) || '?'}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text text-sm">
                        {note.user?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-text-muted">
                        {formatRelativeDate(note.created_at)}
                      </span>
                    </div>
                    <p className="text-text mt-1 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bottom spacer for action bar */}
        <BottomActionBarSpacer />
      </div>

      {/* Bottom Action Bar - Mobile only */}
      {canEdit && nextAction && (
        <BottomActionBar
          actions={[
            ...(job.customer.phone ? [{
              icon: Phone,
              label: 'Call',
              onClick: () => window.location.href = `tel:${job.customer.phone}`,
            }] : []),
            ...(address ? [{
              icon: MapPin,
              label: 'Navigate',
              onClick: () => window.open(getSmartNavigationUrl(address), '_blank'),
            }] : []),
          ]}
          primaryAction={{
            icon: nextAction.icon,
            label: nextAction.label,
            onClick: () => updateStatus(nextAction.status),
            disabled: updating,
          }}
        />
      )}
    </div>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="flex-1">
            <div className="h-5 w-40 skeleton rounded mb-1" />
            <div className="h-5 w-24 skeleton rounded" />
          </div>
        </div>
      </header>
      <div className="px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-20 skeleton" />
          ))}
        </div>
        <div className="card h-48 skeleton" />
        <div className="card h-32 skeleton" />
        <div className="card h-40 skeleton" />
      </div>
    </div>
  );
}

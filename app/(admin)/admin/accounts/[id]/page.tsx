'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Briefcase,
  Upload,
  Trash2,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
  UserCog,
  RefreshCw,
  Ban,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { AdminPageHeader } from '@/components/admin/page-header';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';

interface AccountDetails {
  id: string;
  business_name: string;
  owner_name: string;
  owner_email: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  logo_url?: string;
  primary_color?: string;
  plan_type: string;
  plan_status: string;
  trial_start_date?: string;
  trial_end_date?: string;
  cancelled_at?: string;
  created_at: string;
  user_count?: number;
  customer_count?: number;
  job_count?: number;
}

const planNames: Record<string, string> = {
  blue_starter: 'Blue Starter',
  blue_pro: 'Blue Pro',
  blue_enterprise: 'Blue Enterprise',
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', label: 'Active' },
  trial: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', label: 'Trial' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Cancelled' },
  expired: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Expired' },
  suspended: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', label: 'Suspended' },
};

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = use(params);
  const router = useRouter();
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialogs
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [deleteLogoDialog, setDeleteLogoDialog] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      fetchAccount();
    }
  }, [accountId, isAuthorized]);

  async function fetchAccount() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Account not found');
        throw new Error('Failed to fetch account');
      }
      const data = await res.json();
      setAccount(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setErrorDialog({ open: true, message: 'Invalid file type. Please upload a JPEG, PNG, WebP, or SVG image.' });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorDialog({ open: true, message: 'File too large. Please upload an image smaller than 5MB.' });
      return;
    }

    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/admin/businesses/${accountId}/logo`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types
        if (data.type === 'too_small' && data.details) {
          throw new Error(
            `Image is too small (${data.details.width}x${data.details.height}px). Minimum size is ${data.details.minWidth}x${data.details.minHeight}px.`
          );
        }
        throw new Error(data.error || 'Failed to upload logo');
      }

      setAccount(prev => prev ? { ...prev, logo_url: data.logo_url } : null);

      // Show success with resize info if applicable
      const wasResized = data.dimensions?.wasResized;
      setSuccessDialog({
        open: true,
        message: wasResized
          ? `Logo uploaded and resized from ${data.dimensions.originalWidth}x${data.dimensions.originalHeight}px to ${data.dimensions.width}x${data.dimensions.height}px for optimal display.`
          : 'Logo uploaded successfully!',
      });
    } catch (error) {
      setErrorDialog({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to upload logo',
      });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleLogoDelete() {
    setUploadingLogo(true);
    setDeleteLogoDialog(false);

    try {
      const response = await fetch(`/api/admin/businesses/${accountId}/logo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete logo');
      }

      setAccount(prev => prev ? { ...prev, logo_url: undefined } : null);
      setSuccessDialog({ open: true, message: 'Logo removed successfully!' });
    } catch (error) {
      setErrorDialog({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete logo',
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleImpersonate() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/impersonate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to create impersonation session');
      const data = await res.json();
      window.open(data.login_url, '_blank');
    } catch (err) {
      setErrorDialog({ open: true, message: 'Failed to impersonate account' });
    } finally {
      setActionLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Account Not Found" />
        <div className="p-6 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-6 w-6" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error || 'Account not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const status = statusColors[account.plan_status] || statusColors.active;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={account.business_name}
        description={`Account ID: ${account.id}`}
        backHref="/admin/accounts"
        actions={
          <Button
            variant="outline"
            onClick={handleImpersonate}
            disabled={actionLoading}
            className="flex items-center gap-2"
          >
            <UserCog className="h-4 w-4" />
            Impersonate
          </Button>
        }
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Business Info Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Business Information
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-medium text-foreground">{account.business_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="font-medium text-foreground">{account.owner_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="font-medium text-foreground">{account.email || account.owner_email}</p>
              </div>
              {account.phone && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </p>
                  <p className="font-medium text-foreground">{account.phone}</p>
                </div>
              )}
              {account.website && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Website
                  </p>
                  <a
                    href={account.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    {account.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {(account.address || account.city) && (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium text-foreground">
                    {[account.address, account.city, account.state, account.zip]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Logo Management Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Business Logo
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Manage this business's logo. The logo will appear in their customer portal.
            </p>

            <div className="flex items-start gap-4">
              {/* Logo Preview */}
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
                {account.logo_url ? (
                  <img
                    src={account.logo_url}
                    alt="Business logo"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              {/* Upload/Delete Buttons */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {account.logo_url ? 'Change Logo' : 'Upload Logo'}
                    </>
                  )}
                </Button>
                {account.logo_url && (
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteLogoDialog(true)}
                    disabled={uploadingLogo}
                    className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Logo
                  </Button>
                )}
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p><span className="font-medium">Min:</span> 100x100px</p>
                  <p><span className="font-medium text-primary">Recommended:</span> 400x400px</p>
                  <p><span className="font-medium">Max:</span> 800x800px (auto-resized)</p>
                  <p className="text-muted-foreground/70">JPEG, PNG, WebP, SVG. Max 5MB.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Card */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Subscription
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-medium text-foreground">
                  {planNames[account.plan_type] || account.plan_type}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                  {account.plan_status === 'trial' && <Clock className="h-3 w-3" />}
                  {account.plan_status === 'active' && <CheckCircle className="h-3 w-3" />}
                  {account.plan_status === 'cancelled' && <XCircle className="h-3 w-3" />}
                  {status.label}
                </span>
              </div>
              {account.trial_end_date && account.plan_status === 'trial' && (
                <div>
                  <p className="text-sm text-muted-foreground">Trial Ends</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(account.trial_end_date), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium text-foreground">
                  {format(new Date(account.created_at), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(account.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold text-foreground mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Team Members
                </div>
                <span className="font-medium text-foreground">{account.user_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Customers
                </div>
                <span className="font-medium text-foreground">{account.customer_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  Jobs
                </div>
                <span className="font-medium text-foreground">{account.job_count || 0}</span>
              </div>
            </div>
          </div>

          {/* Brand Preview */}
          {account.primary_color && (
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-semibold text-foreground mb-4">Brand Color</h2>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border"
                  style={{ backgroundColor: account.primary_color }}
                />
                <span className="font-mono text-sm text-muted-foreground">
                  {account.primary_color}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Logo Dialog */}
      <AlertDialog open={deleteLogoDialog} onOpenChange={setDeleteLogoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Logo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this business's logo? This will affect how their customer portal looks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploadingLogo}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogoDelete}
              disabled={uploadingLogo}
              className="bg-red-600 hover:bg-red-700"
            >
              {uploadingLogo ? 'Removing...' : 'Remove Logo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <AlertDialog open={successDialog.open} onOpenChange={(open) => !open && setSuccessDialog({ open: false, message: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Success
            </AlertDialogTitle>
            <AlertDialogDescription>
              {successDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => !open && setErrorDialog({ open: false, message: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

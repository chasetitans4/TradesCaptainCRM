'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Shield,
  Wrench,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import type { UserWithBusiness } from '@/types';
import { useToast } from '@/components/ui/use-toast';

export default function InviteTeamMemberPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'technician'>('technician');

  const loadData = useCallback(async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }

    // Check permission
    if (!hasPermission(profile.role as any, 'manage_team')) {
      router.push('/settings/team');
      return;
    }

    setUser(profile as UserWithBusiness);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({ title: 'Invalid email', description: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), role }),
      });

      if (response.ok) {
        router.push('/settings/team');
      } else {
        const data = await response.json();
        toast({ title: 'Failed to send invitation', description: data.error || 'Please try again', variant: 'destructive' });
      }
    } catch (_error) {
      toast({ title: 'Failed to send invitation', description: 'Please try again', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canInviteAdmin = user.role === 'owner';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Invite Team Member</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Email */}
        <div className="bg-card rounded-xl border border-border p-4">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        {/* Role Selection */}
        <div className="bg-card rounded-xl border border-border p-4">
          <label className="text-sm font-medium text-muted-foreground block mb-3">
            Role
          </label>

          <div className="space-y-3">
            {canInviteAdmin && (
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={cn(
                  'w-full flex items-center gap-4 p-4 border rounded-xl transition-colors text-left',
                  role === 'admin'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted'
                )}
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Admin</p>
                  <p className="text-sm text-muted-foreground">
                    Full access except billing and ownership
                  </p>
                </div>
                {role === 'admin' && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setRole('technician')}
              className={cn(
                'w-full flex items-center gap-4 p-4 border rounded-xl transition-colors text-left',
                role === 'technician'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted'
              )}
            >
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Wrench className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Technician</p>
                <p className="text-sm text-muted-foreground">
                  View assigned jobs, add notes and photos, update status
                </p>
              </div>
              {role === 'technician' && (
                <CheckCircle className="h-5 w-5 text-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            An invitation email will be sent with a link to create their account.
            The invitation expires in 7 days.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={sending || !email.trim()}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="h-5 w-5" />
              Send Invitation
            </>
          )}
        </button>
      </form>
    </div>
  );
}

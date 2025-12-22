'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Label, Alert, AlertDescription, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { createClient, signUp } from '@/lib/supabase/client';
import { Lock, Building2, User, CheckCircle2, XCircle, Loader2, Shield, Wrench } from 'lucide-react';

interface InviteData {
  id: string;
  email: string;
  role: string;
  business_name: string;
  business_logo: string | null;
  inviter_name: string;
  type: 'legacy' | 'team_invitation';
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchInviteData() {
      try {
        const supabase = createClient();

        // First, try to find in team_invitations table (new system)
        const { data: invitation, error: inviteError } = await supabase
          .from('team_invitations')
          .select(`
            id,
            email,
            role,
            status,
            expires_at,
            business:businesses(name, logo_url),
            inviter:users!team_invitations_invited_by_fkey(name)
          `)
          .eq('token', token)
          .single();

        if (invitation && !inviteError) {
          // Check if already accepted
          if (invitation.status === 'accepted') {
            router.push('/login');
            return;
          }

          // Check if expired or cancelled
          if (invitation.status === 'expired' || invitation.status === 'cancelled') {
            setExpired(true);
            return;
          }

          // Check if expires_at has passed
          if (new Date(invitation.expires_at) < new Date()) {
            setExpired(true);
            // Update status to expired
            await supabase
              .from('team_invitations')
              .update({ status: 'expired' })
              .eq('id', invitation.id);
            return;
          }

          setInviteData({
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            business_name: (invitation.business as any)?.name || 'Unknown Business',
            business_logo: (invitation.business as any)?.logo_url || null,
            inviter_name: (invitation.inviter as any)?.name || 'A team member',
            type: 'team_invitation',
          });
          setLoading(false);
          return;
        }

        // Fallback: Check legacy invite system (users.invite_token)
        const { data: user, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            email,
            name,
            role,
            invite_token,
            invited_at,
            status,
            business:businesses(name, logo_url)
          `)
          .eq('invite_token', token)
          .single();

        if (userError || !user) {
          setExpired(true);
          return;
        }

        // Check if invite is expired (7 days)
        if (user.invited_at) {
          const invitedAt = new Date(user.invited_at);
          const now = new Date();
          const daysDiff = (now.getTime() - invitedAt.getTime()) / (1000 * 60 * 60 * 24);

          if (daysDiff > 7) {
            setExpired(true);
            return;
          }
        }

        // Check if already accepted
        if (user.status === 'active') {
          router.push('/login');
          return;
        }

        setName(user.name);
        setInviteData({
          id: user.id,
          email: user.email,
          role: user.role,
          business_name: (user.business as any)?.name || 'Unknown Business',
          business_logo: (user.business as any)?.logo_url || null,
          inviter_name: '',
          type: 'legacy',
        });
      } catch (err) {
        console.error('Error fetching invite:', err);
        setExpired(true);
      } finally {
        setLoading(false);
      }
    }

    fetchInviteData();
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setSubmitting(false);
      return;
    }

    if (inviteData?.type === 'team_invitation' && !name.trim()) {
      setError('Please enter your name');
      setSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();

      // Create auth user
      const { data: authData, error: authError } = await signUp(
        inviteData!.email,
        password,
        { full_name: name }
      );

      if (authError) {
        setError(authError.message);
        return;
      }

      if (authData?.user) {
        if (inviteData?.type === 'team_invitation') {
          // New team invitation flow
          // First, get the invitation to get business_id
          const { data: invitation } = await supabase
            .from('team_invitations')
            .select('business_id, role, invited_by')
            .eq('token', token)
            .single();

          if (!invitation) {
            setError('Invitation not found');
            return;
          }

          // Create user record
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              auth_user_id: authData.user.id,
              email: inviteData.email,
              name: name,
              business_id: invitation.business_id,
              role: invitation.role,
              invited_by: invitation.invited_by,
              status: 'active',
              accepted_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error('Error creating user:', insertError);
            setError('Failed to create account. Please try again.');
            return;
          }

          // Mark invitation as accepted
          await supabase
            .from('team_invitations')
            .update({
              status: 'accepted',
              accepted_at: new Date().toISOString(),
            })
            .eq('token', token);

        } else {
          // Legacy flow - update existing user record
          const { error: updateError } = await supabase
            .from('users')
            .update({
              auth_user_id: authData.user.id,
              status: 'active',
              accepted_at: new Date().toISOString(),
              invite_token: null,
            })
            .eq('invite_token', token);

          if (updateError) {
            setError('Failed to complete setup. Please contact support.');
            return;
          }
        }

        setSuccess(true);
      }
    } catch (err) {
      console.error('Error accepting invite:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-text-muted">Loading invitation...</p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-6">
          <XCircle className="w-8 h-8 text-danger" />
        </div>

        <h1 className="text-2xl font-bold text-text mb-2 text-center">Invalid or Expired Invitation</h1>
        <p className="text-text-muted text-center mb-8">
          This invitation link is no longer valid. Please contact your administrator for a new invitation.
        </p>

        <Link href="/login" className="w-full">
          <Button variant="outline" className="w-full">
            Go to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>

        <h1 className="text-2xl font-bold text-text mb-2 text-center">Welcome to the team!</h1>
        <p className="text-text-muted text-center mb-8">
          Your account has been set up. Check your email to verify your account, then sign in to get started.
        </p>

        <Link href="/login" className="w-full">
          <Button className="w-full">
            Sign In
          </Button>
        </Link>
      </div>
    );
  }

  const RoleIcon = inviteData?.role === 'admin' ? Shield : Wrench;

  return (
    <div className="flex-1 flex flex-col max-w-sm mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-2">Accept Invitation</h1>
        <p className="text-text-muted">Set up your account to join the team</p>
      </div>

      {/* Invite Details Card */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
              {inviteData?.business_logo ? (
                <img src={inviteData.business_logo} alt="" className="w-10 h-10 object-cover" />
              ) : (
                <Building2 className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <p className="font-medium text-text">{inviteData?.business_name}</p>
              {inviteData?.inviter_name && (
                <p className="text-sm text-text-muted">
                  Invited by {inviteData.inviter_name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <RoleIcon className="w-5 h-5 text-text-muted" />
            </div>
            <div>
              <p className="font-medium text-text capitalize">{inviteData?.role}</p>
              <p className="text-sm text-text-muted">{inviteData?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="danger" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {inviteData?.type === 'team_invitation' && (
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-12"
                required
                autoComplete="name"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Create Password</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-12"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-12"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" loading={submitting}>
          Complete Setup
        </Button>
      </form>
    </div>
  );
}

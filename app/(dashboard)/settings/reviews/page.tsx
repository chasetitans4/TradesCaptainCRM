'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Loader2,
  Check,
  MessageSquare,
  Mail,
  TrendingUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ReviewStats {
  totalSent: number;
  clicked: number;
  reviewed: number;
  clickRate: number;
  conversionRate: number;
}

export default function ReviewSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [googleLink, setGoogleLink] = useState('');
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Get business settings
      const { data: profile } = await supabase
        .from('users')
        .select('business:businesses(review_link_google)')
        .eq('auth_user_id', user.id)
        .single();

      if (profile?.business) {
        setGoogleLink((profile.business as any).review_link_google || '');
      }

      // Get stats
      const res = await fetch('/api/reviews?stats=true');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Get business ID
      const { data: profile } = await supabase
        .from('users')
        .select('business_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Update business
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ review_link_google: googleLink || null })
        .eq('id', profile.business_id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-text">Review Requests</h1>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />}
        {success && <Check className="h-4 w-4 text-success ml-auto" />}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <Alert variant="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-bold text-text">{stats.totalSent}</p>
                <p className="text-xs text-text-muted">Sent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-bold text-primary">{stats.clickRate}%</p>
                <p className="text-xs text-text-muted">Click Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 text-center">
                <p className="text-2xl font-bold text-success">{stats.reviewed}</p>
                <p className="text-xs text-text-muted">Reviews</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Google Review Link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-warning" />
              Google Review Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="google-link">Your Google Review URL</Label>
              <Input
                id="google-link"
                placeholder="https://g.page/r/..."
                value={googleLink}
                onChange={(e) => setGoogleLink(e.target.value)}
              />
              <p className="text-xs text-text-muted">
                This is the link customers will receive to leave a review
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium text-text mb-2">How to find your link:</p>
              <ol className="text-xs text-text-muted space-y-1 list-decimal list-inside">
                <li>Search for your business on Google</li>
                <li>Click &quot;Write a review&quot;</li>
                <li>Copy the URL from your browser</li>
              </ol>
              <a
                href="https://support.google.com/business/answer/7035772"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary mt-2"
              >
                Learn more <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Link
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium text-text text-sm">Job Completed</p>
                <p className="text-xs text-text-muted">
                  When you mark a job as complete, we queue a review request
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-text text-sm">Automated Message</p>
                <p className="text-xs text-text-muted">
                  24 hours later, we send a friendly SMS or email
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium text-text text-sm">More Reviews</p>
                <p className="text-xs text-text-muted">
                  Happy customers leave reviews, boosting your ranking
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sample Message */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sample Message</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-text">
                &quot;Hi John! Thank you for choosing ABC Plumbing. If you were happy
                with our service, we&apos;d really appreciate a quick review. It only
                takes a minute!&quot;
              </p>
              <p className="text-xs text-primary mt-2">[Review Link]</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

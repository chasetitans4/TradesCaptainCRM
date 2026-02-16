'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { UserWithBusiness } from '@/types';
import type { VoiceCallEvent, VoiceEscalationEvent } from '@/types/voice-receptionist';
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneMissed,
  Bot,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  Bell,
  Mail,
  PhoneOutgoing,
  Check,
  X,
  Loader2,
} from 'lucide-react';

interface CallDetail extends VoiceCallEvent {
  customers?: {
    id: string;
    first_name: string;
    last_name?: string;
    phone: string;
    email?: string;
  };
  escalations?: Array<VoiceEscalationEvent & {
    contact?: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
    };
  }>;
}

export default function CallDetailPage() {
  const router = useRouter();
  const params = useParams();
  const callId = params.id as string;

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [call, setCall] = useState<CallDetail | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    try {
      const response = await fetch(`/api/voice/calls/${callId}`);
      if (response.ok) {
        const data = await response.json();
        setCall(data.call);
      } else if (response.status === 404) {
        toast({
          title: 'Call not found',
          description: 'This call record does not exist.',
          variant: 'destructive',
        });
        router.push('/voice');
        return;
      }
    } catch (error) {
      toast({
        title: 'Failed to load call details',
        description: 'Please try again',
        variant: 'destructive',
      });
    }

    setLoading(false);
  }, [router, toast, callId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    const local = digits.startsWith('1') && digits.length === 11 ? digits.substring(1) : digits;
    if (local.length === 10) {
      return `(${local.substring(0, 3)}) ${local.substring(3, 6)}-${local.substring(6)}`;
    }
    return phone;
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function formatDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  function getEscalationIcon(actionType: string) {
    switch (actionType) {
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
        return <Bell className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'outbound_voice':
        return <PhoneOutgoing className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  }

  if (loading || !user) {
    return <CallDetailSkeleton />;
  }

  if (!call) {
    return null;
  }

  const customerName = call.customers
    ? `${call.customers.first_name} ${call.customers.last_name || ''}`.trim()
    : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Call Details</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Call Status Card */}
        <section className="card p-4">
          <div className="flex items-start gap-4">
            {/* Status Icon */}
            <div
              className={cn(
                'p-3 rounded-full',
                call.is_emergency
                  ? 'bg-danger/10'
                  : call.was_missed
                    ? 'bg-warning/10'
                    : call.was_ai_answered
                      ? 'bg-success/10'
                      : 'bg-muted'
              )}
            >
              {call.is_emergency ? (
                <AlertTriangle className="h-6 w-6 text-danger" />
              ) : call.was_missed ? (
                <PhoneMissed className="h-6 w-6 text-warning" />
              ) : call.was_ai_answered ? (
                <Bot className="h-6 w-6 text-success" />
              ) : (
                <PhoneIncoming className="h-6 w-6 text-text-muted" />
              )}
            </div>

            {/* Call Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-text">
                  {customerName || formatPhone(call.phone_from)}
                </h2>
                {call.is_emergency && (
                  <Badge variant="destructive">Emergency</Badge>
                )}
                {call.was_ai_answered && (
                  <Badge variant="default" className="bg-success">AI Handled</Badge>
                )}
                {call.was_missed && (
                  <Badge variant="secondary">Missed</Badge>
                )}
              </div>

              <p className="text-sm text-text-muted mt-1">
                {formatDateTime(call.call_start_time)}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-text-muted">Duration</p>
              <p className="font-semibold text-text">{formatDuration(call.call_duration_seconds)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">State</p>
              <p className="font-semibold text-text capitalize">
                {call.availability_state?.toLowerCase().replace('_', ' ') || '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">AI Confidence</p>
              <p className="font-semibold text-text">
                {call.ai_confidence ? `${(call.ai_confidence * 100).toFixed(0)}%` : '--'}
              </p>
            </div>
          </div>
        </section>

        {/* Caller Info */}
        <section className="card p-4">
          <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Caller Information
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-muted">Phone</span>
              <a href={`tel:${call.phone_from}`} className="text-primary font-medium">
                {formatPhone(call.phone_from)}
              </a>
            </div>

            {call.customers && (
              <>
                <div className="flex justify-between">
                  <span className="text-text-muted">Name</span>
                  <span className="text-text">{customerName}</span>
                </div>
                {call.customers.email && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Email</span>
                    <a href={`mailto:${call.customers.email}`} className="text-primary">
                      {call.customers.email}
                    </a>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between">
              <span className="text-text-muted">Called To</span>
              <span className="text-text">{formatPhone(call.phone_to)}</span>
            </div>
          </div>
        </section>

        {/* AI Summary */}
        {call.ai_summary && (
          <section className="card p-4">
            <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Summary
            </h3>
            <p className="text-text-muted">{call.ai_summary}</p>

            {call.ai_deferred_reason && (
              <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning font-medium">AI Deferred</p>
                <p className="text-sm text-text-muted mt-1">{call.ai_deferred_reason}</p>
              </div>
            )}
          </section>
        )}

        {/* Extracted Data */}
        {call.ai_extracted_data && Object.keys(call.ai_extracted_data).length > 0 && (
          <section className="card p-4">
            <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Extracted Information
            </h3>
            <div className="space-y-2">
              {Object.entries(call.ai_extracted_data).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-text-muted capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-text">{String(value)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Emergency Details */}
        {call.is_emergency && (
          <section className="card p-4 border-l-4 border-l-danger">
            <h3 className="font-semibold text-danger mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Emergency Details
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-text-muted">Detection Source</span>
                <span className="text-text capitalize">
                  {call.emergency_source?.toLowerCase().replace(/_/g, ' ') || 'Unknown'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Escalation Timeline */}
        {call.escalations && call.escalations.length > 0 && (
          <section className="card p-4">
            <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Escalation Timeline
            </h3>

            <div className="space-y-3">
              {call.escalations.map((escalation, index) => (
                <div
                  key={escalation.id || index}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg',
                    escalation.failed_at
                      ? 'bg-danger/5'
                      : escalation.acknowledged_at
                        ? 'bg-success/5'
                        : 'bg-muted/50'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'p-2 rounded-full',
                      escalation.failed_at
                        ? 'bg-danger/10 text-danger'
                        : escalation.acknowledged_at
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-text-muted'
                    )}
                  >
                    {getEscalationIcon(escalation.action_type)}
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text capitalize">
                        {escalation.action_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-text-muted">Step {escalation.step}</span>
                    </div>

                    {escalation.contact && (
                      <p className="text-sm text-text-muted">
                        To: {escalation.contact.first_name} {escalation.contact.last_name}
                      </p>
                    )}

                    <p className="text-xs text-text-muted mt-1">
                      Sent: {formatDateTime(escalation.sent_at)}
                    </p>

                    {escalation.acknowledged_at && (
                      <p className="text-xs text-success mt-1 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Acknowledged: {formatDateTime(escalation.acknowledged_at)}
                        {escalation.acknowledgment_method && (
                          <span>via {escalation.acknowledgment_method.replace('_', ' ')}</span>
                        )}
                      </p>
                    )}

                    {escalation.failed_at && (
                      <p className="text-xs text-danger mt-1 flex items-center gap-1">
                        <X className="h-3 w-3" />
                        Failed: {escalation.failure_reason || 'Unknown error'}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Metadata */}
        <section className="card p-4">
          <h3 className="font-semibold text-text mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Call Metadata
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Call SID</span>
              <span className="text-text font-mono text-xs">{call.call_sid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Initiation Source</span>
              <span className="text-text">{call.initiation_source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Evidence ID</span>
              <span className="text-text font-mono text-xs truncate max-w-[200px]">
                {call.initiation_evidence_id}
              </span>
            </div>
            {call.voicemail_requested && (
              <div className="flex justify-between">
                <span className="text-text-muted">Voicemail</span>
                <Badge variant="secondary">Requested</Badge>
              </div>
            )}
          </div>
        </section>

        {/* Actions */}
        {call.customers && (
          <Button
            onClick={() => router.push(`/customers/${call.customers?.id}`)}
            className="w-full"
          >
            <User className="h-4 w-4 mr-2" />
            View Customer Profile
          </Button>
        )}
      </div>
    </div>
  );
}

function CallDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-6 w-32 skeleton rounded" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-4">
        <div className="card p-4 h-40 skeleton" />
        <div className="card p-4 h-32 skeleton" />
        <div className="card p-4 h-24 skeleton" />
      </div>
    </div>
  );
}

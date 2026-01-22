'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Circle,
  Send,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  MoreVertical
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory
} from '@/lib/admin/types';
import { AdminPageHeader } from '@/components/admin/page-header';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const statusConfig: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: any }> = {
  open: { label: 'Open', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: Circle },
  in_progress: { label: 'In Progress', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Clock },
  waiting_on_customer: { label: 'Waiting', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: User },
  resolved: { label: 'Resolved', color: 'text-green-700', bgColor: 'bg-green-100', icon: CheckCircle },
  closed: { label: 'Closed', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: XCircle },
};

const priorityConfig: Record<TicketPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  medium: { label: 'Medium', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { loading: authLoading, isAuthorized, user } = useAgentOrHigher();
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      fetchTicket();
    }
  }, [isAuthorized, id]);

  async function fetchTicket() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`);
      if (!res.ok) throw new Error('Failed to fetch ticket');
      const data = await res.json();
      setTicket(data.ticket);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: TicketStatus) {
    if (!ticket) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      const data = await res.json();
      setTicket(data.ticket);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  }

  async function sendReply() {
    if (!replyText.trim() || !ticket || !user) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'agent',
          sender_id: user.id,
          sender_name: user.name || 'Support Agent',
          message: replyText,
          is_internal: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to send reply');

      // Refresh ticket to get new message
      await fetchTicket();
      setReplyText('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Error: {error || 'Ticket not found'}
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const StatusIcon = statusConfig[ticket.status as TicketStatus]?.icon || Circle;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/tickets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>Ticket #{ticket.ticket_number}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{ticket.subject}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={ticket.status}
              onValueChange={(val) => updateStatus(val as TicketStatus)}
              disabled={submitting}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col md:flex-row">
          {/* Main Content - Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <Card>
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{ticket.user_name}</div>
                    <div className="text-xs text-muted-foreground">Original Request</div>
                  </div>
                  <div className="ml-auto text-xs text-muted-foreground">
                    {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 text-foreground whitespace-pre-wrap">
                {ticket.description}
              </CardContent>
            </Card>

            {ticket.messages?.map((msg) => (
              <Card key={msg.id} className={msg.sender_type === 'agent' ? 'ml-12 border-primary/20' : 'mr-12'}>
                <CardHeader className={`pb-2 ${msg.sender_type === 'agent' ? 'bg-primary/5' : 'bg-muted/30'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.sender_type === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {msg.sender_type === 'agent' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">{msg.sender_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {msg.sender_type === 'agent' ? 'Support Agent' : 'Customer'}
                      </div>
                    </div>
                    <div className="ml-auto text-xs text-muted-foreground">
                      {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 text-foreground text-sm whitespace-pre-wrap">
                  {msg.message}
                </CardContent>
              </Card>
            ))}

            <div className="pt-4 pb-8">
              <h3 className="text-sm font-medium mb-2 text-foreground">Reply to Customer</h3>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                className="min-h-[150px] mb-4"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReplyText('')} disabled={submitting}>
                  Clear
                </Button>
                <Button onClick={sendReply} disabled={submitting || !replyText.trim()}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Reply
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar - Ticket Info */}
          <div className="w-full md:w-80 border-l border-border bg-card p-6 overflow-y-auto">
            <h3 className="font-semibold text-lg mb-4 text-foreground">Ticket Details</h3>
            
            <div className="space-y-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Priority</div>
                <Badge variant="outline" className={`${priorityConfig[ticket.priority as TicketPriority]?.bgColor} ${priorityConfig[ticket.priority as TicketPriority]?.color} border-0`}>
                  {priorityConfig[ticket.priority as TicketPriority]?.label}
                </Badge>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Category</div>
                <div className="font-medium text-foreground capitalize">
                  {ticket.category.replace('_', ' ')}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium mb-3 text-foreground">Customer Info</h4>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{ticket.user_name}</div>
                      <div className="text-xs text-muted-foreground">Contact Name</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{ticket.business_name}</div>
                      <div className="text-xs text-muted-foreground">Business</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-foreground">{ticket.user_email || 'No email provided'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {ticket.ai_summary && (
                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-2 flex items-center gap-2 text-foreground">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    AI Summary
                  </h4>
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {ticket.ai_summary}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

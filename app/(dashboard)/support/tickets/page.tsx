'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Ticket,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  ArrowLeft,
  Send,
  User,
  Bot,
  Headphones,
} from 'lucide-react';
import Link from 'next/link';
import type {
  SupportTicket,
  TicketMessage,
  TicketStatus,
  TicketPriority,
} from '@/lib/admin/types';

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  waiting_on_customer: { label: 'Waiting on You', color: 'bg-orange-100 text-orange-700', icon: MessageSquare },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600', icon: CheckCircle2 },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-gray-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-500' },
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const { toast } = useToast();

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const response = await fetch(`/api/tickets?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (_error) {
      toast({ title: 'Failed to load tickets', description: 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Fetch ticket messages when selected
  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (_error) {
      toast({ title: 'Failed to load messages', description: 'Please try again', variant: 'destructive' });
    }
  }, [toast]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket, fetchMessages]);

  // Send message
  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      const response = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          sender_type: 'customer',
          sender_id: 'current-user', // Would come from auth context
          sender_name: 'You',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        // Refresh ticket to get updated status
        fetchTickets();
      }
    } catch (_error) {
      toast({ title: 'Failed to send message', description: 'Please try again', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.ticket_number.toLowerCase().includes(query) ||
        ticket.subject.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    }
    return date.toLocaleDateString();
  };

  // Ticket detail view
  if (selectedTicket) {
    const statusConfig = STATUS_CONFIG[selectedTicket.status];
    const priorityConfig = PRIORITY_CONFIG[selectedTicket.priority];

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-border px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedTicket(null)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-text-muted font-mono">
                  #{selectedTicket.ticket_number}
                </span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.color)}>
                  {statusConfig.label}
                </span>
              </div>
              <h1 className="font-semibold text-text truncate">{selectedTicket.subject}</h1>
            </div>
          </div>
        </header>

        {/* Ticket Info */}
        <div className="px-4 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Clock className="h-4 w-4" />
              {formatDate(selectedTicket.created_at)}
            </div>
            <div className={cn('flex items-center gap-1.5', priorityConfig.color)}>
              <AlertCircle className="h-4 w-4" />
              {priorityConfig.label} Priority
            </div>
          </div>

          {/* AI Summary */}
          <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">AI Summary</span>
            </div>
            <p className="text-sm text-text">{selectedTicket.ai_summary}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Initial description */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">You</span>
                <span className="text-xs text-text-muted">{formatDate(selectedTicket.created_at)}</span>
              </div>
              <div className="bg-primary/5 rounded-lg p-3 text-sm text-text">
                {selectedTicket.description}
              </div>
            </div>
          </div>

          {/* Chat conversation context if available */}
          {selectedTicket.conversation_context && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-text-muted">Chat Context</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-text-muted whitespace-pre-wrap">
                  {selectedTicket.conversation_context}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                msg.sender_type === 'customer' ? 'bg-primary/10' :
                msg.sender_type === 'agent' ? 'bg-green-100' : 'bg-gray-100'
              )}>
                {msg.sender_type === 'customer' ? (
                  <User className="h-4 w-4 text-primary" />
                ) : msg.sender_type === 'agent' ? (
                  <Headphones className="h-4 w-4 text-green-600" />
                ) : (
                  <Bot className="h-4 w-4 text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {msg.sender_type === 'customer' ? 'You' :
                     msg.sender_type === 'agent' ? msg.sender_name : 'System'}
                  </span>
                  <span className="text-xs text-text-muted">{formatDate(msg.created_at)}</span>
                  {msg.sender_type === 'agent' && (
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                      Support Team
                    </span>
                  )}
                </div>
                <div className={cn(
                  'rounded-lg p-3 text-sm',
                  msg.sender_type === 'customer' ? 'bg-primary/5 text-text' :
                  msg.sender_type === 'agent' ? 'bg-green-50 text-text' : 'bg-gray-50 text-text-muted'
                )}>
                  {msg.message}
                </div>
              </div>
            </div>
          ))}

          {/* Status messages */}
          {selectedTicket.status === 'resolved' && selectedTicket.resolution_notes && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-green-600">Resolved</span>
                  {selectedTicket.resolved_at && (
                    <span className="text-xs text-text-muted">{formatDate(selectedTicket.resolved_at)}</span>
                  )}
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-sm text-text">
                  {selectedTicket.resolution_notes}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reply input - only show if not closed */}
        {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
          <div className="border-t border-border p-4 bg-white">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Press Enter to send or click the send button
            </p>
          </div>
        )}

        {/* Reopen option for resolved tickets */}
        {selectedTicket.status === 'resolved' && (
          <div className="border-t border-border p-4 bg-white text-center">
            <p className="text-sm text-text-muted mb-2">Issue not resolved?</p>
            <Button variant="outline" size="sm" onClick={() => {
              setNewMessage("I still need help with this issue...");
            }}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Reopen Ticket
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Tickets list view
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Ticket className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Support Tickets</h1>
              <p className="text-white/70 text-sm">Track your support requests</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchTickets}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            type="search"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white text-text"
          />
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              statusFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-muted text-text-muted hover:bg-muted/80'
            )}
          >
            All Tickets
          </button>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as TicketStatus)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                statusFilter === status
                  ? 'bg-primary text-white'
                  : 'bg-muted text-text-muted hover:bg-muted/80'
              )}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Tickets list */}
        {loading ? (
          <div className="card p-8 text-center">
            <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-text-muted">Loading tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="card p-8 text-center">
            <Ticket className="h-12 w-12 text-text-muted mx-auto mb-3" />
            <h3 className="font-medium text-text mb-1">No tickets found</h3>
            <p className="text-sm text-text-muted mb-4">
              {searchQuery
                ? `No tickets match "${searchQuery}"`
                : statusFilter !== 'all'
                ? `No ${STATUS_CONFIG[statusFilter].label.toLowerCase()} tickets`
                : "You haven't submitted any support tickets yet"}
            </p>
            <Link href="/help">
              <Button variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Visit Help Center
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const statusConfig = STATUS_CONFIG[ticket.status];
              const StatusIcon = statusConfig.icon;
              const priorityConfig = PRIORITY_CONFIG[ticket.priority];

              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="w-full card p-4 text-left hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg flex-shrink-0',
                      ticket.status === 'waiting_on_customer' ? 'bg-orange-100' :
                      ticket.status === 'resolved' ? 'bg-green-100' :
                      ticket.status === 'in_progress' ? 'bg-yellow-100' : 'bg-blue-100'
                    )}>
                      <StatusIcon className={cn(
                        'h-5 w-5',
                        ticket.status === 'waiting_on_customer' ? 'text-orange-600' :
                        ticket.status === 'resolved' ? 'text-green-600' :
                        ticket.status === 'in_progress' ? 'text-yellow-600' : 'text-blue-600'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-text-muted font-mono">
                          #{ticket.ticket_number}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                        {ticket.priority === 'high' || ticket.priority === 'urgent' ? (
                          <span className={cn('text-xs font-medium', priorityConfig.color)}>
                            {priorityConfig.label}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="font-medium text-text truncate">{ticket.subject}</h3>
                      <p className="text-sm text-text-muted truncate mt-0.5">
                        {ticket.ai_summary}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(ticket.created_at)}
                        </span>
                        {ticket.messages && ticket.messages.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {ticket.messages.length} replies
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-text-muted flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Help section */}
        <div className="card p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <Bot className="h-6 w-6 text-primary flex-shrink-0" />
            <div>
              <h4 className="font-medium text-text mb-1">Need help with something else?</h4>
              <p className="text-sm text-text-muted mb-3">
                Our AI assistant can help you with most questions instantly. Click the chat bubble or visit the Help Center.
              </p>
              <div className="flex gap-2">
                <Link href="/help">
                  <Button variant="outline" size="sm">
                    Help Center
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

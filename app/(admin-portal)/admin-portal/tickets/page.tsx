'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  Filter,
  Clock,
  User,
  Building2,
  MessageSquare,
  AlertCircle,
  Loader2,
  RefreshCcw,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Circle,
  Eye,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketStats,
} from '@/lib/admin/types';

const statusConfig: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
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

const categoryLabels: Record<TicketCategory, string> = {
  technical_issue: 'Technical Issue',
  billing_question: 'Billing Question',
  feature_request: 'Feature Request',
  how_to_question: 'How-To Question',
  account_issue: 'Account Issue',
  integration_help: 'Integration Help',
  bug_report: 'Bug Report',
  other: 'Other',
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [statusFilter, priorityFilter, categoryFilter]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/tickets?${params}`);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/tickets?stats=true');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }

  async function updateTicketStatus(ticketId: string, status: TicketStatus) {
    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update ticket');
      const data = await res.json();

      // Update local state
      setTickets(prev => prev.map(t => t.id === ticketId ? data.ticket : t));
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(data.ticket);
      }
      fetchStats();
    } catch (err: any) {
      alert('Failed to update ticket: ' + err.message);
    } finally {
      setUpdatingTicket(false);
    }
  }

  async function sendReply(ticketId: string) {
    if (!replyText.trim()) return;

    setUpdatingTicket(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_type: 'agent',
          sender_id: 'admin-user', // In production, get from auth
          sender_name: 'Support Agent',
          message: replyText,
          is_internal: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to send reply');

      // Refresh ticket
      const ticketRes = await fetch(`/api/tickets/${ticketId}`);
      if (ticketRes.ok) {
        const data = await ticketRes.json();
        setSelectedTicket(data.ticket);
        setTickets(prev => prev.map(t => t.id === ticketId ? data.ticket : t));
      }

      setReplyText('');
    } catch (err: any) {
      alert('Failed to send reply: ' + err.message);
    } finally {
      setUpdatingTicket(false);
    }
  }

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.business_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-500">Manage customer support requests</p>
        </div>
        <button
          onClick={() => { fetchTickets(); fetchStats(); }}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
            <p className="text-sm text-yellow-700">Open</p>
            <p className="text-2xl font-bold text-yellow-800">{stats.open}</p>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <p className="text-sm text-blue-700">In Progress</p>
            <p className="text-2xl font-bold text-blue-800">{stats.in_progress}</p>
          </div>
          <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
            <p className="text-sm text-purple-700">Waiting</p>
            <p className="text-2xl font-bold text-purple-800">{stats.waiting_on_customer}</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <p className="text-sm text-green-700">Resolved</p>
            <p className="text-2xl font-bold text-green-800">{stats.resolved}</p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Avg Response</p>
            <p className="text-2xl font-bold text-gray-800">{stats.avg_response_time_hours.toFixed(1)}h</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTickets()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_on_customer">Waiting on Customer</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Categories</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="flex gap-6">
        {/* Tickets List */}
        <div className={`flex-1 ${selectedTicket ? 'hidden lg:block lg:max-w-md' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No tickets found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {filteredTickets.map((ticket) => {
                const status = statusConfig[ticket.status as TicketStatus];
                const priority = priorityConfig[ticket.priority as TicketPriority];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-gray-500">{ticket.ticket_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priority.bgColor} ${priority.color}`}>
                            {priority.label}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900 truncate">{ticket.subject}</h3>
                        <p className="text-sm text-gray-500 truncate">{ticket.business_name} • {ticket.user_name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ticket Detail Panel */}
        {selectedTicket && (
          <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-gray-500">{selectedTicket.ticket_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[selectedTicket.priority as TicketPriority].bgColor} ${priorityConfig[selectedTicket.priority as TicketPriority].color}`}>
                      {priorityConfig[selectedTicket.priority as TicketPriority].label}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {categoryLabels[selectedTicket.category as TicketCategory]}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="lg:hidden p-2 hover:bg-gray-200 rounded-lg"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Status Actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                {(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'] as TicketStatus[]).map((status) => {
                  const config = statusConfig[status];
                  const isActive = selectedTicket.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => updateTicketStatus(selectedTicket.id, status)}
                      disabled={updatingTicket || isActive}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        isActive
                          ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-gray-300`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Info */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedTicket.user_name}</p>
                  <p className="text-sm text-gray-500">{selectedTicket.user_email}</p>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <Building2 className="h-3 w-3" />
                    {selectedTicket.business_name}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">AI Summary</p>
                  <p className="text-sm text-blue-900 mt-1">{selectedTicket.ai_summary}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>

              {selectedTicket.page_context && (
                <p className="text-xs text-gray-400 mt-3">
                  Page context: {selectedTicket.page_context}
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="p-4 border-b border-gray-200 max-h-60 overflow-y-auto">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Conversation</p>
              <div className="space-y-3">
                {selectedTicket.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg ${
                      msg.sender_type === 'customer'
                        ? 'bg-gray-100'
                        : msg.sender_type === 'agent'
                        ? 'bg-primary/10'
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{msg.sender_name}</span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                      </span>
                      {msg.is_internal && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">Internal</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reply Input */}
            <div className="p-4 bg-gray-50">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => sendReply(selectedTicket.id)}
                  disabled={!replyText.trim() || updatingTicket}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {updatingTicket ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ContactCard } from '@/components/outreach/contact-card';
import { ConversationView } from '@/components/outreach/conversation-view';
import { CallScheduler } from '@/components/outreach/call-scheduler';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Plus,
  Loader2,
  Users,
  MessageSquare,
  Calendar,
  X,
} from 'lucide-react';
import type {
  OutreachContact,
  OutreachConversation,
  OutreachMessage,
} from '@/types/outreach';

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'qualifying', label: 'Qualifying' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'call_scheduled', label: 'Call Scheduled' },
  { value: 'call_completed', label: 'Call Completed' },
  { value: 'converted', label: 'Converted' },
  { value: 'pending_admin', label: 'Pending Admin' },
];

const interestOptions = [
  { value: 'hot', label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
];

export default function OutreachContactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<OutreachContact | null>(null);
  const [conversation, setConversation] = useState<OutreachConversation | null>(null);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [interestFilter, setInterestFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (interestFilter) params.set('interest_level', interestFilter);
      params.set('page', String(page));
      params.set('page_size', '25');

      const response = await fetch(`/api/outreach/contacts?${params}`);
      const data = await response.json();

      setContacts(data.data || []);
      setTotal(data.total || 0);
      setHasMore(data.has_more || false);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, statusFilter, interestFilter, page]);

  const loadConversation = async (contact: OutreachContact) => {
    setSelectedContact(contact);
    setIsLoadingConversation(true);

    try {
      const response = await fetch(
        `/api/outreach/conversations?contact_id=${contact.id}`
      );
      const data = await response.json();

      if (data.data?.length > 0) {
        const conv = data.data[0];
        setConversation(conv);

        // Load messages
        const messagesRes = await fetch(
          `/api/outreach/conversations/${conv.id}/messages`
        );
        const messagesData = await messagesRes.json();
        setMessages(messagesData.data || []);
      } else {
        setConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedContact || !conversation) return;

    setIsSending(true);
    try {
      const response = await fetch(
        `/api/outreach/conversations/${conversation.id}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message_text: message,
            sender_type: 'human',
          }),
        }
      );

      if (response.ok) {
        // Reload messages
        const messagesRes = await fetch(
          `/api/outreach/conversations/${conversation.id}/messages`
        );
        const messagesData = await messagesRes.json();
        setMessages(messagesData.data || []);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleTakeover = async () => {
    if (!conversation) return;

    await fetch(`/api/outreach/conversations/${conversation.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'takeover',
        agent_id: 'current-user', // Would use actual user ID
      }),
    });

    // Reload conversation
    if (selectedContact) {
      loadConversation(selectedContact);
    }
  };

  const handleScheduleCall = async (scheduledAt: Date, agentId?: string) => {
    if (!selectedContact) return;

    await fetch('/api/outreach/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: selectedContact.id,
        scheduled_at: scheduledAt.toISOString(),
        agent_id: agentId,
      }),
    });

    setShowScheduler(false);
    fetchContacts();
    if (selectedContact) {
      loadConversation(selectedContact);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setInterestFilter('');
    setPage(1);
  };

  const hasFilters = search || statusFilter || interestFilter;

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-6">
        {/* Contact List */}
        <div className="w-[400px] flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Contacts
                  <Badge variant="secondary">{total}</Badge>
                </CardTitle>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {/* Search & Filters */}
              <div className="space-y-2 mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={interestFilter} onValueChange={setInterestFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Interest" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {interestOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasFilters && (
                    <Button variant="ghost" size="icon" onClick={clearFilters}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto space-y-2 pb-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No contacts found</p>
                </div>
              ) : (
                <>
                  {contacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onClick={() => loadConversation(contact)}
                      selected={selectedContact?.id === contact.id}
                      compact
                    />
                  ))}
                  {hasMore && (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Load More
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conversation Panel */}
        <Card className="flex-1 flex flex-col">
          {!selectedContact ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a Contact</p>
                <p className="text-sm">Choose a contact to view their conversation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Contact Header */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <ContactCard contact={selectedContact} compact />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScheduler(true)}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Schedule Call
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Conversation */}
              <CardContent className="flex-1 p-0 overflow-hidden">
                {conversation ? (
                  <ConversationView
                    conversation={conversation}
                    messages={messages}
                    contact={selectedContact}
                    onSendMessage={handleSendMessage}
                    onTakeover={handleTakeover}
                    isLoading={isLoadingConversation}
                    isSending={isSending}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">No Conversation Yet</p>
                      <p className="text-sm mb-4">
                        Start a conversation with this contact
                      </p>
                      <Button onClick={() => setShowScheduler(true)}>
                        Schedule a Call
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Schedule Call Dialog */}
      <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Schedule a Call</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <CallScheduler
              contactId={selectedContact.id}
              contactTimezone={selectedContact.timezone ?? undefined}
              onSchedule={handleScheduleCall}
              onCancel={() => setShowScheduler(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

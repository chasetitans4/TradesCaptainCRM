'use client';

// =====================================================
// LEADS CAPTAIN CONVERSATION VIEWER
// View conversation threads for a client
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Calendar, Phone, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  message_text: string;
  sent_at: string;
}

interface Conversation {
  id: string;
  caller_phone: string;
  status: 'captured' | 'booked' | 'no_response' | 'in_progress';
  lead_name: string | null;
  lead_service_needed: string | null;
  lead_address: string | null;
  appointment_date: string | null;
  sms_count: number;
  started_at: string;
  messages?: Message[];
}

interface ConversationViewerProps {
  conversations?: Conversation[];
  loading?: boolean;
  onViewAll?: () => void;
}

export function LeadsCaptainConversationViewer({
  conversations,
  loading,
  onViewAll,
}: ConversationViewerProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: Conversation['status']) => {
    switch (status) {
      case 'booked':
        return <Badge className="bg-success">📅 Booked</Badge>;
      case 'captured':
        return <Badge variant="secondary">💬 Captured</Badge>;
      case 'no_response':
        return <Badge variant="outline">❌ No Reply</Badge>;
      case 'in_progress':
        return <Badge variant="default">⏳ In Progress</Badge>;
      default:
        return null;
    }
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Recent Conversations
        </CardTitle>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary hover:underline"
          >
            View All
          </button>
        )}
      </CardHeader>
      <CardContent>
        {!conversations || conversations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No conversations yet
          </p>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(conversation.started_at), {
                        addSuffix: true,
                      })}
                      <span>—</span>
                      <Phone className="h-4 w-4" />
                      {formatPhoneNumber(conversation.caller_phone)}
                    </div>
                    {getStatusBadge(conversation.status)}
                  </div>

                  {/* Messages */}
                  {conversation.messages && conversation.messages.length > 0 && (
                    <div className="space-y-2 border-l-2 border-muted pl-4 ml-2">
                      {conversation.messages.slice(0, 6).map((message) => (
                        <div key={message.id} className="text-sm">
                          <span
                            className={`font-medium ${
                              message.direction === 'outbound'
                                ? 'text-primary'
                                : 'text-foreground'
                            }`}
                          >
                            {message.direction === 'outbound' ? 'AI:' : 'Customer:'}
                          </span>{' '}
                          <span className="text-muted-foreground">
                            {message.message_text.length > 100
                              ? message.message_text.slice(0, 100) + '...'
                              : message.message_text}
                          </span>
                        </div>
                      ))}
                      {conversation.messages.length > 6 && (
                        <p className="text-xs text-muted-foreground">
                          +{conversation.messages.length - 6} more messages
                        </p>
                      )}
                    </div>
                  )}

                  {/* Lead Summary */}
                  {(conversation.lead_name ||
                    conversation.lead_service_needed ||
                    conversation.appointment_date) && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <User className="h-4 w-4" />
                        Lead Info
                      </div>
                      <div className="space-y-1">
                        {conversation.lead_name && (
                          <p>
                            <span className="text-muted-foreground">Name:</span>{' '}
                            {conversation.lead_name}
                          </p>
                        )}
                        {conversation.lead_service_needed && (
                          <p>
                            <span className="text-muted-foreground">Service:</span>{' '}
                            {conversation.lead_service_needed}
                          </p>
                        )}
                        {conversation.lead_address && (
                          <p>
                            <span className="text-muted-foreground">Address:</span>{' '}
                            {conversation.lead_address}
                          </p>
                        )}
                        {conversation.appointment_date && (
                          <p className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-success" />
                            <span className="text-success font-medium">
                              Appointment:{' '}
                              {new Date(conversation.appointment_date).toLocaleString()}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default LeadsCaptainConversationViewer;

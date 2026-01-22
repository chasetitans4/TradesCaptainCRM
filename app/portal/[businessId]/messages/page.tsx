'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { MessageCircle, Bot, Loader2, Sparkles, User, UserCheck, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AIPauseToggle } from '@/components/portal/ai-pause-toggle';
import { MessageInput } from '@/components/messages/message-input';
import { logger } from '@/lib/logger';
import { useDemoMode, getDemoMessages, mergeWithDemoData } from '@/lib/portal/demo-data/use-demo-data';

const portalMessagesLogger = logger.child({ context: 'portal.messages' });

interface Message {
  id: string;
  body: string;
  direction: 'inbound' | 'outbound';
  sender: string;
  status: string;
  created_at: string;
  is_ai_response?: boolean;
  ai_confidence?: number;
  detected_intent?: string;
  metadata?: {
    source?: string;
    [key: string]: unknown;
  };
}

export default function MessagesPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasPhone, setHasPhone] = useState(true);
  const [escalating, setEscalating] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [escalationError, setEscalationError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const demoMode = useDemoMode();

  useEffect(() => {
    loadMessages();
  }, [businessId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    try {
      const res = await fetch(`/api/portal/messages?businessId=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setHasPhone(data.hasPhone);
      }
    } catch (error) {
      portalMessagesLogger.error({
        msg: 'Error loading messages',
        businessId,
        error: error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) },
      });
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(body: string) {
    setSending(true);
    try {
      const res = await fetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, message: body }),
      });

      if (res.ok) {
        await loadMessages();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send message');
      }
    } catch (error) {
      portalMessagesLogger.error({
        msg: 'Error sending message',
        businessId,
        error: error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) },
      });
    } finally {
      setSending(false);
    }
  }

  async function escalateToHuman() {
    setEscalating(true);
    setEscalationError(null);
    try {
      const res = await fetch('/api/portal/messages/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });

      if (res.ok) {
        setEscalated(true);
        // Auto-hide success message after 10 seconds
        setTimeout(() => setEscalated(false), 10000);
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to escalate');
      }
    } catch (error) {
      portalMessagesLogger.error({
        msg: 'Error escalating to human',
        businessId,
        error: error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) },
      });
      setEscalationError(error instanceof Error ? error.message : 'Failed to escalate');
    } finally {
      setEscalating(false);
    }
  }

  // Convert demo messages to match page format and merge with real data
  const demoMessages = getDemoMessages().map((msg) => ({
    id: msg.id,
    body: msg.content,
    direction: msg.sender === 'customer' ? 'inbound' : 'outbound' as const,
    sender: msg.sender === 'ai' ? 'ai' : msg.sender === 'customer' ? 'customer' : 'business',
    status: 'delivered',
    created_at: msg.timestamp,
    is_ai_response: msg.sender === 'ai',
  })) as Message[];
  const displayMessages = mergeWithDemoData(messages, demoMessages, demoMode);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
        date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
        date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  };

  if (loading) {
    return <MessagesSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500">Your conversation history with us</p>
        </div>
        <div className="flex items-center gap-2">
          <AIPauseToggle businessId={businessId} />
        </div>
      </div>

      {/* Escalation Success Alert */}
      {escalated && (
        <Alert className="border-green-200 bg-green-50">
          <UserCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your request has been escalated. A team member will respond shortly.
          </AlertDescription>
        </Alert>
      )}

      {/* Escalation Error Alert */}
      {escalationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{escalationError}</AlertDescription>
        </Alert>
      )}

      {!hasPhone ? (
        <NoPhoneCard />
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0 flex flex-col h-[600px]">
            {/* Message list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {displayMessages.length === 0 ? (
                <EmptyMessages />
              ) : (
                <>
                  {displayMessages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      formatTime={formatTime}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Escalate to Human Button */}
            <div className="px-4 py-2 border-t bg-gray-50">
              <Button
                variant="outline"
                size="sm"
                onClick={escalateToHuman}
                disabled={escalating || escalated}
                className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300"
              >
                {escalating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Requesting...
                  </>
                ) : escalated ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Human Support Requested
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Request Human Support
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 text-center mt-1">
                Need to speak with a person? We'll prioritize your conversation.
              </p>
            </div>

            {/* Message input */}
            <MessageInput
              onSend={sendMessage}
              disabled={sending}
              placeholder="Type a message..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper to format intent labels for display
function formatIntentLabel(intent?: string): string | null {
  if (!intent) return null;
  const labels: Record<string, string> = {
    new_lead: 'New Request',
    pricing: 'Pricing',
    availability: 'Availability',
    emergency: 'Emergency',
    schedule: 'Scheduling',
    reschedule: 'Reschedule',
    cancel: 'Cancellation',
    existing_customer: 'Existing Customer',
    complaint: 'Complaint',
    refund: 'Refund',
    general: 'General',
    wrong_number: 'Wrong Number',
  };
  return labels[intent] || intent.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Helper to get AI confidence label
function getConfidenceLabel(confidence?: number): { label: string; color: string } | null {
  if (confidence === undefined || confidence === null) return null;
  if (confidence >= 80) return { label: 'Confident', color: 'bg-green-100 text-green-700' };
  if (confidence >= 50) return { label: 'Moderate', color: 'bg-yellow-100 text-yellow-700' };
  return { label: 'Uncertain', color: 'bg-orange-100 text-orange-700' };
}

function MessageBubble({
  message,
  formatTime,
}: {
  message: Message;
  formatTime: (date: string) => string;
}) {
  // inbound = customer sent, outbound = business/AI sent
  const isCustomer = message.direction === 'inbound';
  const isAI = message.sender === 'ai' || message.is_ai_response;
  const intentLabel = formatIntentLabel(message.detected_intent);
  const confidenceInfo = getConfidenceLabel(message.ai_confidence);

  return (
    <div className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2 ${
          isCustomer
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {/* AI indicator for business messages */}
        {!isCustomer && isAI && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
            <div className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              <span>AI Response</span>
            </div>
            {confidenceInfo && (
              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${confidenceInfo.color}`}>
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                {confidenceInfo.label}
              </Badge>
            )}
          </div>
        )}

        {/* Human response indicator */}
        {!isCustomer && !isAI && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <User className="h-3 w-3" />
            <span>Team Response</span>
          </div>
        )}

        {/* Intent tag for inbound messages */}
        {isCustomer && intentLabel && (
          <div className="flex items-center gap-1 mb-1.5 -mt-0.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-100 border-0">
              {intentLabel}
            </Badge>
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>

        <p
          className={`text-xs mt-1 ${
            isCustomer ? 'text-blue-200' : 'text-gray-400'
          }`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

function NoPhoneCard() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No phone number on file
        </h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          To send and receive messages, please update your profile with a phone number.
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyMessages() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        No messages yet
      </h3>
      <p className="text-gray-500 max-w-xs">
        Start a conversation by sending us a message below.
      </p>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
      </div>
      <Card>
        <CardContent className="p-0 h-[600px]">
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`h-16 rounded-2xl animate-pulse ${
                      i % 2 === 0 ? 'w-48 bg-blue-200' : 'w-56 bg-gray-200'
                    }`}
                  />
                </div>
              ))}
            </div>
            <div className="h-16 border-t bg-gray-50 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

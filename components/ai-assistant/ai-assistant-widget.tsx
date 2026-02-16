'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Minimize2,
  Maximize2,
  RefreshCw,
  Ticket,
  CheckCircle,
  AlertCircle,
  Edit3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TicketCategory } from '@/lib/admin/types';
import { useAIAssistant } from '@/lib/contexts/ai-assistant-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  links?: { path: string; label: string }[];
  actions?: { id: string; name: string }[];
  offerTicket?: boolean;
  timestamp: Date;
}

interface TicketSummary {
  summary: string;
  suggestedCategory: TicketCategory;
  suggestedPriority: string;
  suggestedSubject: string;
}

type TicketFlowState = 'idle' | 'summarizing' | 'confirming' | 'submitting' | 'submitted' | 'error';

const CATEGORY_LABELS: Record<string, string> = {
  technical_issue: 'Technical Issue',
  billing_question: 'Billing Question',
  feature_request: 'Feature Request',
  how_to_question: 'How-To Question',
  account_issue: 'Account Issue',
  integration_help: 'Integration Help',
  bug_report: 'Bug Report',
  other: 'Other',
};

export function AIAssistantWidget() {
  const { isOpen, toggle: toggleAssistant, close: closeAssistant } = useAIAssistant();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  // Ticket creation state
  const [ticketFlowState, setTicketFlowState] = useState<TicketFlowState>('idle');
  const [ticketSummary, setTicketSummary] = useState<TicketSummary | null>(null);
  const [editedSummary, setEditedSummary] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedCategory, setEditedCategory] = useState<string>('other');
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [isEditingSummary, setIsEditingSummary] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pathname = usePathname();
  const router = useRouter();

  // Fetch contextual suggestions when path changes
  useEffect(() => {
    if (isOpen && !isMinimized) {
      fetchSuggestions();
    }
  }, [pathname, isOpen, isMinimized]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ticketFlowState]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && ticketFlowState === 'idle') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, ticketFlowState]);

  // Reset minimized state when opening
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
      setHasUnread(false);
    }
  }, [isOpen]);

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your TradesCaptain assistant. I can help you navigate the CRM, answer questions, or perform actions like creating leads and jobs. If I can't help, I can create a support ticket for you. What can I help you with?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length]);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`/api/ai/assistant?path=${encodeURIComponent(pathname)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          currentPath: pathname,
          conversationHistory: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        links: data.links,
        actions: data.actions,
        offerTicket: data.offerTicket,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions([]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLinkClick = (path: string) => {
    router.push(path);
    const confirmMessage: Message = {
      id: `nav-${Date.now()}`,
      role: 'assistant',
      content: `Taking you to ${path}...`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, confirmMessage]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // Start the ticket creation flow
  const startTicketCreation = async () => {
    setTicketFlowState('summarizing');

    try {
      // Get AI summary of the conversation
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/tickets/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_history: conversationHistory,
          current_page: pathname,
        }),
      });

      if (!res.ok) throw new Error('Failed to summarize');

      const summary: TicketSummary = await res.json();
      setTicketSummary(summary);
      setEditedSummary(summary.summary);
      setEditedSubject(summary.suggestedSubject);
      setEditedCategory(summary.suggestedCategory);
      setTicketFlowState('confirming');
    } catch (error) {
      console.error('Failed to summarize issue:', error);
      setTicketFlowState('error');

      // Add error message
      const errorMessage: Message = {
        id: `ticket-error-${Date.now()}`,
        role: 'assistant',
        content: "I had trouble summarizing your issue. Please try again or describe your problem in more detail.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);

      setTimeout(() => setTicketFlowState('idle'), 2000);
    }
  };

  // Submit the ticket
  const submitTicket = async () => {
    setTicketFlowState('submitting');

    try {
      // In production, get these from auth context
      const mockUser = {
        user_id: 'demo-user-id',
        user_name: 'Demo User',
        user_email: 'demo@example.com',
        business_id: 'demo-business-id',
        business_name: 'Demo Business',
      };

      const conversationContext = messages
        .map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editedSubject,
          description: editedSummary,
          ai_summary: ticketSummary?.summary || editedSummary,
          category: editedCategory,
          priority: ticketSummary?.suggestedPriority || 'medium',
          conversation_context: conversationContext,
          page_context: pathname,
          ...mockUser,
        }),
      });

      if (!res.ok) throw new Error('Failed to create ticket');

      const data = await res.json();
      setTicketNumber(data.ticket.ticket_number);
      setTicketFlowState('submitted');

      // Add success message
      const successMessage: Message = {
        id: `ticket-success-${Date.now()}`,
        role: 'assistant',
        content: `Great news! I've created support ticket #${data.ticket.ticket_number} for you. Our support team will review your issue and get back to you soon. You can track your ticket status anytime.`,
        links: [
          { path: '/support/tickets', label: 'View My Tickets' },
          { path: '/help', label: 'Help Center' },
        ],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, successMessage]);

      // Reset ticket state after a moment
      setTimeout(() => {
        setTicketFlowState('idle');
        setTicketSummary(null);
        setTicketNumber(null);
        setIsEditingSummary(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setTicketFlowState('error');

      const errorMessage: Message = {
        id: `ticket-error-${Date.now()}`,
        role: 'assistant',
        content: "I couldn't create the ticket right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);

      setTimeout(() => setTicketFlowState('idle'), 2000);
    }
  };

  const cancelTicket = () => {
    setTicketFlowState('idle');
    setTicketSummary(null);
    setIsEditingSummary(false);

    const cancelMessage: Message = {
      id: `ticket-cancel-${Date.now()}`,
      role: 'assistant',
      content: "No problem! Let me know if there's anything else I can help you with.",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, cancelMessage]);
  };

  const clearConversation = () => {
    setMessages([]);
    setSuggestions([]);
    setTicketFlowState('idle');
    setTicketSummary(null);
    setTicketNumber(null);

    const welcomeMessage: Message = {
      id: 'welcome-new',
      role: 'assistant',
      content: "Conversation cleared! How can I help you?",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    fetchSuggestions();
  };

  const handleClose = () => {
    closeAssistant();
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Render ticket confirmation UI
  const renderTicketConfirmation = () => {
    if (ticketFlowState === 'summarizing') {
      return (
        <div className="p-4 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Analyzing your issue...</p>
              <p className="text-xs text-blue-700">Creating a summary for the support team</p>
            </div>
          </div>
        </div>
      );
    }

    if (ticketFlowState === 'confirming' && ticketSummary) {
      return (
        <div className="p-4 bg-blue-50 border-t border-blue-100 space-y-3">
          <div className="flex items-start gap-2">
            <Ticket className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Create Support Ticket</p>
              <p className="text-xs text-blue-700 mt-0.5">Please review the summary before submitting</p>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Subject</label>
            <input
              type="text"
              value={editedSubject}
              onChange={(e) => setEditedSubject(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
            <select
              value={editedCategory}
              onChange={(e) => setEditedCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">Issue Summary</label>
              <button
                onClick={() => setIsEditingSummary(!isEditingSummary)}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Edit3 className="h-3 w-3" />
                {isEditingSummary ? 'Done' : 'Edit'}
              </button>
            </div>
            {isEditingSummary ? (
              <textarea
                value={editedSummary}
                onChange={(e) => setEditedSummary(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              />
            ) : (
              <div className="bg-white p-3 rounded-lg border border-gray-200 text-sm text-gray-700">
                {editedSummary}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={cancelTicket}
              className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitTicket}
              disabled={!editedSummary.trim() || !editedSubject.trim()}
              className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Submit Ticket
            </button>
          </div>
        </div>
      );
    }

    if (ticketFlowState === 'submitting') {
      return (
        <div className="p-4 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Creating your ticket...</p>
              <p className="text-xs text-blue-700">Just a moment</p>
            </div>
          </div>
        </div>
      );
    }

    if (ticketFlowState === 'submitted') {
      return (
        <div className="p-4 bg-green-50 border-t border-green-100">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Ticket Created!</p>
              <p className="text-xs text-green-700">Reference: #{ticketNumber}</p>
            </div>
          </div>
        </div>
      );
    }

    if (ticketFlowState === 'error') {
      return (
        <div className="p-4 bg-red-50 border-t border-red-100">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-900">Something went wrong</p>
              <p className="text-xs text-red-700">Please try again</p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Floating Chat Bubble - Upper Right */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleAssistant}
            className={cn(
              'fixed z-[70] w-12 h-12 rounded-full shadow-lg',
              'bg-primary text-white',
              'flex items-center justify-center',
              'hover:bg-primary/90 transition-colors',
              // Lower right - above bottom nav bar
              'bottom-24 right-4',
              // Desktop: lower right corner (no bottom bar)
              'lg:bottom-6 lg:right-6'
            )}
            aria-label="Open AI Assistant"
          >
            <Bot className="h-5 w-5" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : '500px',
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed z-[70]',
              // Mobile: above bottom nav bar
              'bottom-24 left-4 right-4',
              // Desktop: lower right corner
              'lg:bottom-6 lg:right-6 lg:left-auto',
              'lg:w-[380px] max-w-full',
              'bg-surface rounded-2xl shadow-lg',
              'flex flex-col overflow-hidden',
              'border border-border'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">AI Assistant</h3>
                  <p className="text-xs text-white/70">Here to help</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearConversation}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Clear conversation"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleMinimize}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title={isMinimized ? 'Expand' : 'Minimize'}
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-2',
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                          message.role === 'user'
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-600'
                        )}
                      >
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>

                      {/* Message Content */}
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-3 py-2',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-muted text-foreground rounded-tl-sm shadow-sm'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                        {/* Links */}
                        {message.links && message.links.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.links.map((link, i) => (
                              <button
                                key={i}
                                onClick={() => handleLinkClick(link.path)}
                                className={cn(
                                  'flex items-center gap-1 text-xs font-medium',
                                  'px-2 py-1 rounded-lg transition-colors',
                                  message.role === 'user'
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-foreground'
                                )}
                              >
                                <ExternalLink className="h-3 w-3" />
                                {link.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        {message.actions && message.actions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.actions.map((action, i) => (
                              <button
                                key={i}
                                onClick={() => handleLinkClick(`/${action.id.replace('create_', '').replace('_', '-')}s/new`)}
                                className={cn(
                                  'flex items-center gap-1 text-xs font-medium',
                                  'px-2 py-1 rounded-lg transition-colors',
                                  'bg-green-100 hover:bg-green-200 text-green-700'
                                )}
                              >
                                <ChevronRight className="h-3 w-3" />
                                {action.name}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Ticket Offer Button */}
                        {message.offerTicket && ticketFlowState === 'idle' && (
                          <div className="mt-3 pt-2 border-t border-gray-100">
                            <button
                              onClick={startTicketCreation}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Ticket className="h-4 w-4" />
                              Create Support Ticket
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Ticket Confirmation UI */}
                {ticketFlowState !== 'idle' && renderTicketConfirmation()}

                {/* Suggestions */}
                {ticketFlowState === 'idle' && suggestions.length > 0 && messages.length <= 1 && (
                  <div className="px-4 py-2 border-t border-gray-100 bg-white">
                    <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                {ticketFlowState === 'idle' && (
                  <div className="p-3 border-t border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        disabled={isLoading}
                      />
                      <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isLoading}
                        className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center',
                          'transition-colors',
                          input.trim() && !isLoading
                            ? 'bg-primary text-white hover:bg-primary/90'
                            : 'bg-gray-100 text-gray-400'
                        )}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Powered by AI • Your data stays private
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AIAssistantWidget;

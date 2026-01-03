'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Headphones,
  User,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { CustomerLookup } from '@/components/admin/support/customer-lookup';
import { ConversationViewer } from '@/components/admin/support/conversation-viewer';
import { SmsTroubleshooter } from '@/components/admin/support/sms-troubleshooter';
import { AIIssueReporter } from '@/components/admin/support/ai-issue-reporter';
import { NotificationLogs } from '@/components/admin/support/notification-logs';
import { QuickReference } from '@/components/admin/support/quick-reference';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';

interface SelectedCustomer {
  id: string;
  business_name: string;
  owner_name: string;
  email: string;
  status: string;
  billing_status: string;
  plan_type: string;
  leads_captain_phone?: string;
  forward_to?: string;
}

export default function AdminSupportPage() {
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [activeTab, setActiveTab] = useState<'conversations' | 'sms' | 'notifications' | 'ai-issues'>('conversations');
  const [reportingConversation, setReportingConversation] = useState<string | null>(null);

  const handleSelectCustomer = useCallback((customer: SelectedCustomer) => {
    setSelectedCustomer(customer);
    setActiveTab('conversations');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedCustomer(null);
    setReportingConversation(null);
  }, []);

  const handleReportIssue = useCallback((conversationId: string) => {
    setReportingConversation(conversationId);
  }, []);

  const handleCloseReportIssue = useCallback(() => {
    setReportingConversation(null);
  }, []);

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          {selectedCustomer && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Headphones className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-text">
            {selectedCustomer ? 'Customer Support' : 'Leads Captain Support Dashboard'}
          </h1>
        </div>
        {selectedCustomer && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{selectedCustomer.plan_type}</Badge>
            <Badge
              variant={
                selectedCustomer.status === 'active'
                  ? 'success'
                  : selectedCustomer.status === 'trial'
                  ? 'warning'
                  : 'danger'
              }
            >
              {selectedCustomer.status}
            </Badge>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        {!selectedCustomer ? (
          /* No Customer Selected - Show Lookup and Reference */
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <CustomerLookup onSelectCustomer={handleSelectCustomer} />
              <AIIssueReporter />
            </div>
            <div>
              <QuickReference />
            </div>
          </div>
        ) : reportingConversation ? (
          /* Reporting AI Issue */
          <AIIssueReporter
            conversationId={reportingConversation}
            onClose={handleCloseReportIssue}
          />
        ) : (
          /* Customer Selected - Show Details */
          <div className="space-y-6">
            {/* Customer Info Card */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">
                      {selectedCustomer.business_name || 'No Business Name'}
                    </h2>
                    <p className="text-muted-foreground">
                      {selectedCustomer.owner_name || 'No Owner Name'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCustomer.email}
                    </p>
                    {selectedCustomer.leads_captain_phone && (
                      <p className="text-sm mt-1">
                        <span className="text-muted-foreground">Leads Captain:</span>{' '}
                        {selectedCustomer.leads_captain_phone}
                      </p>
                    )}
                    {selectedCustomer.forward_to && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Forwards to:</span>{' '}
                        {selectedCustomer.forward_to}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={
                      selectedCustomer.billing_status === 'current'
                        ? 'success'
                        : selectedCustomer.billing_status === 'past_due'
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    Billing: {selectedCustomer.billing_status}
                  </Badge>
                  <a
                    href={`https://dashboard.stripe.com/customers/${selectedCustomer.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View in Stripe
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
              <Button
                variant={activeTab === 'conversations' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('conversations')}
              >
                Conversations
              </Button>
              <Button
                variant={activeTab === 'sms' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('sms')}
              >
                SMS Issues
              </Button>
              <Button
                variant={activeTab === 'notifications' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('notifications')}
              >
                Notifications
              </Button>
              <Button
                variant={activeTab === 'ai-issues' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('ai-issues')}
              >
                AI Issues
              </Button>
            </div>

            {/* Tab Content */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {activeTab === 'conversations' && (
                  <ConversationViewer
                    organizationId={selectedCustomer.id}
                    onReportIssue={handleReportIssue}
                  />
                )}
                {activeTab === 'sms' && (
                  <SmsTroubleshooter organizationId={selectedCustomer.id} />
                )}
                {activeTab === 'notifications' && (
                  <NotificationLogs organizationId={selectedCustomer.id} />
                )}
                {activeTab === 'ai-issues' && <AIIssueReporter />}
              </div>
              <div>
                <QuickReference />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

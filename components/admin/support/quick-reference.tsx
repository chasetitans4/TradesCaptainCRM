'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Phone,
  MessageSquare,
  Bot,
  Bell,
  CreditCard,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface QuickFixItem {
  issue: string;
  firstCheck: string;
  quickFix: string;
}

interface FAQScript {
  question: string;
  answer: string;
}

const QUICK_FIXES: QuickFixItem[] = [
  {
    issue: 'Texts not sending',
    firstCheck: 'Twilio status',
    quickFix: 'Check status.twilio.com',
  },
  {
    issue: 'Calls not forwarding',
    firstCheck: 'Forward-to number',
    quickFix: 'Verify number in settings',
  },
  {
    issue: "Didn't get notification",
    firstCheck: 'Notification settings',
    quickFix: 'Check email spam, verify phone',
  },
  {
    issue: 'AI said something wrong',
    firstCheck: 'Conversation log',
    quickFix: 'Flag for prompt review',
  },
  {
    issue: "Can't log in",
    firstCheck: 'Email/password',
    quickFix: 'Send password reset',
  },
  {
    issue: 'Number not working',
    firstCheck: 'Account status',
    quickFix: 'Check billing status',
  },
];

const FAQ_SCRIPTS: FAQScript[] = [
  {
    question: 'How does Leads Captain work?',
    answer:
      "When someone calls your Leads Captain number and you can't answer, we text them back within 3 seconds. Our AI has a conversation to find out what they need, their address, and when they're available. Then you get a notification with all the details so you can call them back.",
  },
  {
    question: "Will customers know it's AI?",
    answer:
      "The AI speaks as your business — it says things like 'Sorry I missed your call, I'm with a customer.' Most people just think it's you texting them back. And you can customize the greeting and tone to match your style.",
  },
  {
    question: 'What if someone sends something inappropriate?',
    answer:
      'The AI is trained to stay professional and end conversations that become inappropriate. You can also block specific numbers from your dashboard.',
  },
  {
    question: 'Can I see the conversations?',
    answer:
      "Yes! Every conversation is saved in your dashboard. You can see exactly what was said, and you get the full transcript in your notification.",
  },
  {
    question: 'What happens when I run out of SMS?',
    answer:
      "We never cut you off. If you go over your limit, the AI keeps working and we'll reach out about adding more SMS or upgrading. Your leads are too important to lose.",
  },
  {
    question: 'Can I change my number?',
    answer:
      "We can provision a new number, but you'd need to update anywhere you've listed the old one (truck, cards, Google listing, etc.). Is there an issue with your current number?",
  },
  {
    question: 'I want to cancel',
    answer:
      "I'm sorry to hear that. Can I ask what's not working? We might be able to fix it. [Listen, then offer solutions or process cancellation]",
  },
  {
    question: 'How do I get help?',
    answer:
      'You can reply to any email from us, use the chat in your dashboard, or call us at [support number]. We\'re here to help!',
  },
];

const ERROR_CODES = [
  { code: '21211', meaning: 'Invalid phone number', fix: 'Verify forward_to number format' },
  { code: '21214', meaning: 'Cannot route to number', fix: 'Carrier issue, try different number' },
  { code: '21610', meaning: 'Recipient blocked sender', fix: 'Customer needs to unblock' },
  { code: '30003', meaning: 'Unreachable', fix: 'Phone off or no service' },
  { code: '30004', meaning: 'Blocked', fix: 'Customer blocked the number' },
  { code: '30005', meaning: 'Unknown destination', fix: 'Invalid phone number' },
  { code: '30006', meaning: 'Landline', fix: "Can't send SMS to landline" },
  { code: '30007', meaning: 'Carrier violation', fix: 'Content filtered (rare)' },
];

export function QuickReference() {
  const [expandedSection, setExpandedSection] = useState<string | null>('quick-fixes');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Quick Reference Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Pages */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <div className="font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Always Check First
          </div>
          <div className="flex gap-2">
            <a
              href="https://status.twilio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              status.twilio.com
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://status.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              status.anthropic.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Quick Fixes Section */}
        <div className="border rounded-lg">
          <button
            className="w-full p-3 flex items-center justify-between hover:bg-muted/50"
            onClick={() => toggleSection('quick-fixes')}
          >
            <span className="font-medium flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Quick Fixes
            </span>
            {expandedSection === 'quick-fixes' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSection === 'quick-fixes' && (
            <div className="p-3 border-t">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1">Issue</th>
                    <th className="py-1">First Check</th>
                    <th className="py-1">Quick Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {QUICK_FIXES.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="py-2">{item.issue}</td>
                      <td className="py-2 text-muted-foreground">{item.firstCheck}</td>
                      <td className="py-2">{item.quickFix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Error Codes Section */}
        <div className="border rounded-lg">
          <button
            className="w-full p-3 flex items-center justify-between hover:bg-muted/50"
            onClick={() => toggleSection('error-codes')}
          >
            <span className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS Error Codes
            </span>
            {expandedSection === 'error-codes' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSection === 'error-codes' && (
            <div className="p-3 border-t">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1">Code</th>
                    <th className="py-1">Meaning</th>
                    <th className="py-1">Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {ERROR_CODES.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="py-2">
                        <Badge variant="outline">{item.code}</Badge>
                      </td>
                      <td className="py-2">{item.meaning}</td>
                      <td className="py-2 text-muted-foreground">{item.fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FAQ Scripts Section */}
        <div className="border rounded-lg">
          <button
            className="w-full p-3 flex items-center justify-between hover:bg-muted/50"
            onClick={() => toggleSection('faq')}
          >
            <span className="font-medium flex items-center gap-2">
              <Bot className="h-4 w-4" />
              FAQ Scripts
            </span>
            {expandedSection === 'faq' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSection === 'faq' && (
            <div className="p-3 border-t space-y-3">
              {FAQ_SCRIPTS.map((item, idx) => (
                <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                  <div className="font-medium text-sm mb-1">
                    &quot;{item.question}&quot;
                  </div>
                  <div className="text-sm text-muted-foreground italic">
                    &quot;{item.answer}&quot;
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Escalation Tiers */}
        <div className="border rounded-lg">
          <button
            className="w-full p-3 flex items-center justify-between hover:bg-muted/50"
            onClick={() => toggleSection('escalation')}
          >
            <span className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Escalation Paths
            </span>
            {expandedSection === 'escalation' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSection === 'escalation' && (
            <div className="p-3 border-t space-y-3">
              <div className="p-3 border rounded-lg">
                <div className="font-medium">Tier 1: Support Rep</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Password resets, basic settings, FAQ questions, simple troubleshooting
                </div>
                <div className="text-sm mt-2">
                  <strong>Escalate when:</strong> Database changes needed, frustrated customer,
                  technical issue not in guide, billing disputes
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="font-medium">Tier 2: Senior Support</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Database queries/fixes, complex troubleshooting, billing adjustments,
                  retention calls
                </div>
                <div className="text-sm mt-2">
                  <strong>Escalate when:</strong> System-wide outage, AI prompt changes,
                  refund &gt; $100, legal/compliance
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="font-medium">Tier 3: Engineering</div>
                <div className="text-sm text-muted-foreground mt-1">
                  System outages, bug fixes, AI prompt updates, infrastructure issues
                </div>
                <div className="text-sm mt-2">
                  <strong>Contact:</strong> Slack #eng-support, PagerDuty (P0/P1 only)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cancellation Script */}
        <div className="border rounded-lg">
          <button
            className="w-full p-3 flex items-center justify-between hover:bg-muted/50"
            onClick={() => toggleSection('cancellation')}
          >
            <span className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Cancellation Handling
            </span>
            {expandedSection === 'cancellation' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedSection === 'cancellation' && (
            <div className="p-3 border-t">
              <div className="space-y-2 text-sm">
                <div className="font-medium">Before Processing:</div>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Ask why they&apos;re canceling</li>
                  <li>
                    Offer solutions:
                    <ul className="list-disc ml-4 mt-1">
                      <li>&quot;Not using it?&quot; → Offer setup help</li>
                      <li>&quot;Too expensive?&quot; → Offer FIRST50 for next month</li>
                      <li>&quot;Not working?&quot; → Troubleshoot the issue</li>
                      <li>&quot;Switching to competitor?&quot; → Note which one</li>
                    </ul>
                  </li>
                </ol>
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-yellow-700 dark:text-yellow-400">
                  <strong>Note:</strong> Number retained for 60 days. Data deleted after 60 days.
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

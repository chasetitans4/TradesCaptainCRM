'use client';

// =====================================================
// SUPPORT RESPONSE TEMPLATES
// Pre-written templates for common support scenarios
// Version: 1.0
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  MessageCircle,
  Copy,
  CheckCircle,
  Search,
  User,
  HelpCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
  Clock,
  Zap,
} from 'lucide-react';

interface Template {
  id: string;
  title: string;
  scenario: string;
  category: 'onboarding' | 'confusion' | 'engagement' | 'retention' | 'technical';
  template: string;
  variables?: string[];
}

const TEMPLATES: Template[] = [
  {
    id: 'new-user-day1',
    title: 'New User - First Day',
    scenario: 'User just signed up and needs guidance',
    category: 'onboarding',
    template: `Welcome to TradesCaptain! I'm here to help you get started.

Here's what I recommend for your first day:
1. Log in and explore the dashboard (5 min)
2. Add your first lead — even a test one (2 min)
3. Download the mobile app (3 min)
4. Enable notifications so you never miss a lead

What questions do you have? I'm happy to walk you through anything.`,
  },
  {
    id: 'confused-features',
    title: 'User Confused About Features',
    scenario: 'User is overwhelmed by all the features',
    category: 'confusion',
    template: `I understand — there's a lot to take in!

Let's focus on the basics first:
1. Dashboard: Your home base. Shows leads, tasks, and stats.
2. Leads: Every potential customer goes here.
3. Pipeline: Visual view of where each lead is in your sales process.
4. Calendar: Your scheduled jobs.

Don't worry about the advanced features yet. Master these four things first, and the rest will make sense.

Want me to schedule a quick 15-minute walkthrough call?`,
  },
  {
    id: 'not-using-crm',
    title: 'User Not Using CRM',
    scenario: 'User hasn\'t logged in for a while',
    category: 'engagement',
    template: `I noticed you haven't logged in lately. No judgment — running a business is busy!

But here's the thing: TradesCaptain only works if you use it.

Here's the minimum habit that makes a difference:
- Morning: Check dashboard (2 min)
- During day: Add leads as they come in (30 sec each)
- End of day: Update any job statuses (2 min)

That's 5-10 minutes a day, and it can mean the difference between landing and losing jobs.

What's been getting in the way? Let's solve it together.`,
  },
  {
    id: 'cancellation-request',
    title: 'User Requesting Cancellation',
    scenario: 'User wants to cancel their subscription',
    category: 'retention',
    template: `I'm sorry to hear you're thinking of cancelling.

Before you go, would you mind sharing what's not working?

If it's:
- Hard to use → Let's schedule a training call (free, 15 min)
- Not seeing value → Let's review your setup and make sure it's optimized
- Budget concerns → We have options that might work better
- Just not for you → Totally understand, no hard feelings

What's the main issue? I'd love a chance to make it right.`,
  },
  {
    id: 'login-issues',
    title: 'Login Issues',
    scenario: 'User can\'t log in to their account',
    category: 'technical',
    template: `I'm sorry you're having trouble logging in. Let's fix this!

Please try these steps:
1. Make sure you're using the correct email: [USER_EMAIL]
2. Click "Forgot Password" on the login page to reset
3. Check your spam folder for the reset email
4. Try a different browser or clear your cache

If none of that works, I can manually reset your password right now. Just confirm your email address and I'll send a fresh reset link.`,
    variables: ['USER_EMAIL'],
  },
  {
    id: 'leads-captain-not-working',
    title: 'Leads Captain Not Responding',
    scenario: 'AI texting isn\'t working as expected',
    category: 'technical',
    template: `Let me help troubleshoot your Leads Captain setup!

First, let's verify a few things:
1. Is your business phone number correctly forwarded to our system?
2. Are you testing during your set business hours?
3. Is the AI set to respond to all missed calls or only new numbers?

Common fixes:
- Call forwarding wasn't set up completely at the carrier level
- Business hours are set differently than expected
- Do Not Disturb mode on your phone is blocking notifications

Can you call your business number right now and let it go to voicemail? I'll watch on our end to see what happens.`,
  },
  {
    id: 'feature-request',
    title: 'Feature Request Response',
    scenario: 'User requests a feature we don\'t have',
    category: 'engagement',
    template: `That's a great suggestion! I've added it to our feature request list.

Here's how our development process works:
- All requests get reviewed by our product team
- We prioritize based on how many customers need it
- Popular requests often make it into our roadmap

In the meantime, here's a workaround that might help: [WORKAROUND]

I'll personally let you know if/when we add this feature. Thanks for helping make TradesCaptain better!`,
    variables: ['WORKAROUND'],
  },
  {
    id: 'positive-feedback',
    title: 'Positive Feedback Response',
    scenario: 'User shares positive experience',
    category: 'engagement',
    template: `That's amazing to hear! Thank you so much for sharing.

Stories like yours are exactly why we built TradesCaptain — to help contractors like you spend less time on admin work and more time on what you do best.

Would you be open to sharing your experience as a testimonial? It would really help other contractors who are on the fence about giving us a try.

Either way, thanks for being part of the TradesCaptain family. We're here whenever you need us!`,
  },
  {
    id: 'billing-question',
    title: 'Billing Question',
    scenario: 'User has questions about their bill',
    category: 'technical',
    template: `Happy to help clarify your billing!

Your current subscription:
- Plan: [PLAN_NAME]
- Monthly rate: [MONTHLY_RATE]
- Billing date: [BILLING_DATE]
- Next charge: [NEXT_CHARGE_DATE]

If you're seeing a charge you don't recognize, it might be:
- Your monthly subscription renewal
- An annual plan payment
- A plan upgrade you recently made

Can you tell me the date and amount of the charge in question? I'll look it up right away.`,
    variables: ['PLAN_NAME', 'MONTHLY_RATE', 'BILLING_DATE', 'NEXT_CHARGE_DATE'],
  },
  {
    id: 'upgrade-discussion',
    title: 'Upgrade Discussion',
    scenario: 'User is considering upgrading',
    category: 'engagement',
    template: `Great question about upgrading!

Based on your current usage, here's what upgrading to [PLAN_NAME] would get you:

New features you'd unlock:
- [FEATURE_1]
- [FEATURE_2]
- [FEATURE_3]

Price difference: [PRICE_DIFF]/month

The upgrade takes effect immediately — no interruption to your service.

Would you like me to walk you through what each of those features does? Happy to show you a quick demo.`,
    variables: ['PLAN_NAME', 'FEATURE_1', 'FEATURE_2', 'FEATURE_3', 'PRICE_DIFF'],
  },
  {
    id: 'weekly-checkin',
    title: 'Weekly Check-in (Gold Customers)',
    scenario: 'Proactive outreach to premium customers',
    category: 'engagement',
    template: `Hi [NAME]! Just checking in on your week.

Looking at your dashboard:
- You've added [LEADS_COUNT] new leads this week
- [JOBS_COUNT] jobs scheduled
- [REVENUE] in quotes sent

A few things to consider:
- You have [STALE_LEADS] leads that haven't been contacted in 48+ hours
- [FOLLOW_UP_COUNT] quotes need follow-up

Anything I can help with? I'm here for whatever you need.`,
    variables: ['NAME', 'LEADS_COUNT', 'JOBS_COUNT', 'REVENUE', 'STALE_LEADS', 'FOLLOW_UP_COUNT'],
  },
  {
    id: 'seo-progress-update',
    title: 'SEO Progress Update',
    scenario: 'Monthly SEO update for Local SEO customers',
    category: 'engagement',
    template: `Hi [NAME]! Here's your monthly Local SEO update.

Progress this month:
- Citations built: [CITATIONS_NEW] new ([CITATIONS_TOTAL] total)
- Google ranking change: [RANKING_CHANGE]
- Reviews received: [REVIEWS_NEW]

What we're working on next:
- [NEXT_ACTION_1]
- [NEXT_ACTION_2]

Remember: SEO is a marathon, not a sprint. Most contractors see significant results by month 3-4. You're right on track!

Questions? Just reply to this email.`,
    variables: ['NAME', 'CITATIONS_NEW', 'CITATIONS_TOTAL', 'RANKING_CHANGE', 'REVIEWS_NEW', 'NEXT_ACTION_1', 'NEXT_ACTION_2'],
  },
];

const CATEGORY_CONFIG = {
  onboarding: { label: 'Onboarding', color: 'bg-blue-100 text-blue-700', icon: User },
  confusion: { label: 'Confusion', color: 'bg-yellow-100 text-yellow-700', icon: HelpCircle },
  engagement: { label: 'Engagement', color: 'bg-green-100 text-green-700', icon: Zap },
  retention: { label: 'Retention', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  technical: { label: 'Technical', color: 'bg-purple-100 text-purple-700', icon: Clock },
};

export default function SupportTemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, Record<string, string>>>({});

  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.scenario.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.template.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const copyTemplate = (template: Template) => {
    let text = template.template;
    const values = customValues[template.id] || {};

    // Replace variables with custom values
    template.variables?.forEach((variable) => {
      const value = values[variable] || `[${variable}]`;
      text = text.replace(new RegExp(`\\[${variable}\\]`, 'g'), value);
    });

    navigator.clipboard.writeText(text);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const updateCustomValue = (templateId: string, variable: string, value: string) => {
    setCustomValues((prev) => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [variable]: value,
      },
    }));
  };

  const getPreviewText = (template: Template) => {
    let text = template.template;
    const values = customValues[template.id] || {};

    template.variables?.forEach((variable) => {
      const value = values[variable];
      if (value) {
        text = text.replace(new RegExp(`\\[${variable}\\]`, 'g'), value);
      }
    });

    return text;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Support Templates</h1>
              <p className="text-sm text-gray-500">
                Pre-written responses for common support scenarios
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Button>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(key)}
                  >
                    <config.icon className="h-4 w-4 mr-1" />
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates */}
        <div className="space-y-4">
          {filteredTemplates.map((template) => {
            const categoryConfig = CATEGORY_CONFIG[template.category];
            const CategoryIcon = categoryConfig.icon;

            return (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${categoryConfig.color}`}>
                        <CategoryIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        <CardDescription>{template.scenario}</CardDescription>
                      </div>
                    </div>
                    <Badge className={categoryConfig.color}>{categoryConfig.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Variable Inputs */}
                  {template.variables && template.variables.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        Customize Variables
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {template.variables.map((variable) => (
                          <div key={variable}>
                            <label className="text-xs text-gray-500 mb-1 block">
                              {variable.replace(/_/g, ' ')}
                            </label>
                            <Input
                              placeholder={`Enter ${variable.toLowerCase().replace(/_/g, ' ')}`}
                              value={customValues[template.id]?.[variable] || ''}
                              onChange={(e) =>
                                updateCustomValue(template.id, variable, e.target.value)
                              }
                              className="text-sm h-9"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Template Preview */}
                  <div className="bg-white border rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                      {getPreviewText(template)}
                    </pre>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end">
                    <Button onClick={() => copyTemplate(template)}>
                      {copiedId === template.id ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Template
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredTemplates.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

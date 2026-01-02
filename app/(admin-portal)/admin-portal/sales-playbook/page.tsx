'use client';

// =====================================================
// AGENT SALES PLAYBOOK
// Training guide for sales agents with discovery questions,
// plan recommendations, objection handling, and close scripts
// Version: 1.0
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Book,
  MessageSquare,
  Target,
  DollarSign,
  Shield,
  Lightbulb,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Printer,
  Search,
  Globe,
  Building2,
  Layers,
  Zap,
} from 'lucide-react';

// Plan overview data
const PLANS = [
  {
    id: 'leads_captain',
    name: 'Leads Captain',
    icon: Zap,
    color: 'bg-green-500',
    price: '$29/mo',
    tagline: 'AI missed call text-back service',
    solves: 'I miss calls when I\'m on a job',
    keyStat: 'Most contractors recover $2,000+/month in missed jobs',
    trial: '14-day free trial',
  },
  {
    id: 'blue',
    name: 'Blue CRM',
    icon: Building2,
    color: 'bg-blue-500',
    price: '$49-199/mo',
    tagline: 'Simple CRM for contractors',
    tiers: 'Starter $49 | Pro $99 | Growth $199',
    solves: 'I forget to follow up with leads',
    keyStat: '20-30% more jobs closed with proper follow-up',
  },
  {
    id: 'web',
    name: 'Web',
    icon: Globe,
    color: 'bg-purple-500',
    price: '$149-349/mo',
    tagline: 'Professional contractor websites',
    tiers: 'Starter $149 | Pro $249 | Premium $349',
    solves: 'My website looks outdated',
    keyStat: 'First impression in 0.05 seconds',
  },
  {
    id: 'silver',
    name: 'Silver Bundle',
    icon: Layers,
    color: 'bg-gray-500',
    price: '$199-449/mo',
    tagline: 'Website + Leads Captain + Basic CRM',
    tiers: 'Starter $199 | Pro $299 | Growth $449',
    solves: 'I need help with everything but budget is tight',
    keyStat: 'Save $57/mo vs buying separately',
  },
  {
    id: 'gold',
    name: 'Gold Bundle',
    icon: Layers,
    color: 'bg-yellow-500',
    price: '$249-549/mo',
    tagline: 'Everything in Silver + Full CRM + Priority Support',
    tiers: 'Starter $249 | Pro $349 | Growth $549',
    solves: 'I\'m serious about growing my business',
    keyStat: 'Full business system for less than a part-time hire',
  },
  {
    id: 'seo',
    name: 'Local SEO',
    icon: Search,
    color: 'bg-green-600',
    price: '$99-199/mo',
    tagline: 'Get found in local search',
    tiers: 'Foundation $99 | Growth $149 | Dominate $199',
    solves: 'Customers can\'t find me on Google',
    keyStat: 'Average client ranks in 3-Pack within 90 days',
  },
];

// Discovery questions
const DISCOVERY_QUESTIONS = {
  business: [
    'What trade are you in? (plumber, HVAC, electrician, roofer, etc.)',
    'How long have you been in business?',
    'How many jobs do you do per month?',
    'Is it just you, or do you have a team?',
  ],
  tools: [
    'Do you have a website right now?',
    'How do you currently keep track of leads and customers?',
    'What happens when you miss a phone call?',
    'How do customers find you? (referrals, Google, ads, etc.)',
  ],
  pain: [
    'What\'s your biggest frustration with running the business side?',
    'Have you ever lost a job because you couldn\'t respond fast enough?',
    'How much time do you spend on paperwork vs. actual work?',
  ],
  goals: [
    'Where do you want to be in 12 months?',
    'How many more jobs per month would make a real difference?',
    'What would it mean if you could stop worrying about missed calls?',
  ],
};

// Recommendation mapping
const RECOMMENDATIONS = [
  { trigger: 'I miss calls all the time', plan: 'Leads Captain ($29)', why: 'Solves the immediate problem' },
  { trigger: 'I forget to follow up with leads', plan: 'Blue CRM ($49+)', why: 'Tracks everything' },
  { trigger: 'My website is embarrassing', plan: 'Web ($149+)', why: 'Professional online presence' },
  { trigger: 'I need help with everything', plan: 'Silver or Gold', why: 'Bundled value' },
  { trigger: 'I\'m not showing up on Google', plan: 'Local SEO ($99+)', why: 'Get found locally' },
  { trigger: 'I want to grow but I\'m overwhelmed', plan: 'Gold + Local SEO', why: 'Full solution' },
];

// Sales scripts
const SALES_SCRIPTS = {
  leads_captain: {
    plan: 'Leads Captain ($29/mo)',
    script: `"Based on what you told me about missing calls, I'd start with Leads Captain. It's $29/month and here's what happens: when you miss a call, our AI instantly texts them back, asks what they need, and can even book an appointment. Most plumbers recover $2,000+ in jobs they would have lost. You can try it free for 14 days."`,
  },
  blue: {
    plan: 'Blue CRM ($49-199/mo)',
    script: `"You mentioned you're using sticky notes and your memory to track jobs. Blue CRM will change that. You'll see every lead, every job, every follow-up in one place. Works on your phone too. Start at $49/month — you'll wonder how you lived without it."`,
  },
  web: {
    plan: 'Web ($149-349/mo)',
    script: `"Your website is the first thing customers see. Right now, it's either outdated or doesn't exist. For $149/month, we'll build you a professional site that looks great, works on phones, and actually helps you get found on Google. It pays for itself with one extra job."`,
  },
  silver: {
    plan: 'Silver Bundle ($199-449/mo)',
    script: `"Here's what I'd recommend: the Silver bundle. You get a professional website, Leads Captain so you never lose a call, and a basic CRM to track everything. Instead of $227 separately, it's $199/month. It's everything you need to look professional and stop losing leads."`,
  },
  gold: {
    plan: 'Gold Bundle ($249-549/mo)',
    script: `"You said you want to grow. Gold gives you everything: website, Leads Captain, full CRM with all the features, and priority support. It's the 'I'm serious about my business' package. $249/month — cheaper than hiring help, and it works 24/7."`,
  },
  seo: {
    plan: 'Local SEO ($99-199/mo)',
    script: `"You said customers can't find you on Google. That's what Local SEO fixes. We'll get you listed on 50+ directories, manage your Google reviews, and track your rankings. Most clients hit the Google 3-pack within 90 days. Starts at $99/month."`,
  },
};

// Objection handling
const OBJECTIONS = [
  {
    objection: 'That\'s too expensive',
    response: 'What\'s one missed job worth to you? This pays for itself with one job.',
  },
  {
    objection: 'I need to think about it',
    response: 'Totally understand. What questions can I answer right now to help you decide?',
  },
  {
    objection: 'I\'m not tech-savvy',
    response: 'That\'s exactly why we built this. It\'s designed for contractors, not tech people. I\'ll walk you through everything.',
  },
  {
    objection: 'I tried something like this before',
    response: 'What didn\'t work? We\'re built specifically for trades — not generic software that doesn\'t fit.',
  },
  {
    objection: 'Can I start small?',
    response: 'Absolutely. Start with Leads Captain at $29. You can always add more later.',
  },
  {
    objection: 'Do I need all of this?',
    response: 'No, start with what hurts most. Missing calls? Leads Captain. No website? Web. We can grow together.',
  },
];

// Closing techniques
const CLOSING_TECHNIQUES = [
  {
    name: 'The Assumptive Close',
    script: `"Alright, let's get you set up. I'll need your business name, phone number, and email. Which plan are we starting with — the [recommended plan]?"`,
  },
  {
    name: 'The Choice Close',
    script: `"So it sounds like [Plan A] or [Plan B] would both work for you. Which one feels like the better fit right now?"`,
  },
  {
    name: 'The Urgency Close',
    script: `"If we get you started today, you could have this live by [tomorrow/next week]. That means no more missed calls starting [date]. Let's do it."`,
  },
];

export default function SalesPlaybookPage() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['discovery']));
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyScript = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Book className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sales Playbook</h1>
              <p className="text-sm text-gray-500">
                Agent consulting guide for TradesCaptain products
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Guide
          </Button>
        </div>
      </header>

      <div className="p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="print:hidden">
            <TabsTrigger value="overview">Plan Overview</TabsTrigger>
            <TabsTrigger value="discovery">Discovery</TabsTrigger>
            <TabsTrigger value="scripts">Sales Scripts</TabsTrigger>
            <TabsTrigger value="objections">Objections</TabsTrigger>
            <TabsTrigger value="closing">Closing</TabsTrigger>
          </TabsList>

          {/* Plan Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  All TradesCaptain Plans at a Glance
                </CardTitle>
                <CardDescription>
                  Quick reference for matching customer needs to the right plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {PLANS.map((plan) => (
                    <div
                      key={plan.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${plan.color} text-white`}>
                          <plan.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="text-sm text-primary font-medium">{plan.price}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{plan.tagline}</p>
                      {plan.tiers && (
                        <p className="text-xs text-gray-500 mb-2">{plan.tiers}</p>
                      )}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">
                          <strong>Solves:</strong> "{plan.solves}"
                        </p>
                        <p className="text-xs text-green-600">
                          <strong>Key stat:</strong> {plan.keyStat}
                        </p>
                        {plan.trial && (
                          <Badge variant="secondary" className="mt-2">{plan.trial}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Reference Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Match: Problem to Solution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Problem</th>
                        <th className="text-left py-2 px-4">Solution</th>
                        <th className="text-left py-2 px-4">Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {RECOMMENDATIONS.map((rec, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-2 px-4 text-sm">"{rec.trigger}"</td>
                          <td className="py-2 px-4 text-sm text-gray-600">{rec.why}</td>
                          <td className="py-2 px-4">
                            <Badge variant="default">{rec.plan}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discovery Tab */}
          <TabsContent value="discovery" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  The Discovery Framework
                </CardTitle>
                <CardDescription>
                  Step-by-step questions to understand the customer's situation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Business Basics */}
                <div className="border rounded-lg">
                  <button
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                    onClick={() => toggleSection('business')}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Step 1</Badge>
                      <span className="font-medium">Business Basics</span>
                    </div>
                    {expandedSections.has('business') ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedSections.has('business') && (
                    <div className="px-4 pb-4 space-y-2">
                      {DISCOVERY_QUESTIONS.business.map((q, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>"{q}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Current Tools */}
                <div className="border rounded-lg">
                  <button
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                    onClick={() => toggleSection('tools')}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Step 2</Badge>
                      <span className="font-medium">Current Tools</span>
                    </div>
                    {expandedSections.has('tools') ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedSections.has('tools') && (
                    <div className="px-4 pb-4 space-y-2">
                      {DISCOVERY_QUESTIONS.tools.map((q, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>"{q}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pain Points */}
                <div className="border rounded-lg">
                  <button
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                    onClick={() => toggleSection('pain')}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Step 3</Badge>
                      <span className="font-medium">Pain Points</span>
                    </div>
                    {expandedSections.has('pain') ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedSections.has('pain') && (
                    <div className="px-4 pb-4 space-y-2">
                      {DISCOVERY_QUESTIONS.pain.map((q, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>"{q}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Goals */}
                <div className="border rounded-lg">
                  <button
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                    onClick={() => toggleSection('goals')}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Step 4</Badge>
                      <span className="font-medium">Goals</span>
                    </div>
                    {expandedSections.has('goals') ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {expandedSections.has('goals') && (
                    <div className="px-4 pb-4 space-y-2">
                      {DISCOVERY_QUESTIONS.goals.map((q, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>"{q}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Scripts Tab */}
          <TabsContent value="scripts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Recommendation Scripts
                </CardTitle>
                <CardDescription>
                  Copy-paste scripts for each plan recommendation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(SALES_SCRIPTS).map(([key, { plan, script }]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default">{plan}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyScript(script, key)}
                      >
                        {copiedScript === key ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 italic bg-gray-50 p-3 rounded">
                      {script}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Objections Tab */}
          <TabsContent value="objections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Objection Handling
                </CardTitle>
                <CardDescription>
                  Common objections and how to address them
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {OBJECTIONS.map((obj, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="danger" className="bg-red-100 text-red-700">
                          Objection
                        </Badge>
                        <span className="font-medium">"{obj.objection}"</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700">{obj.response}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Closing Tab */}
          <TabsContent value="closing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Closing Techniques
                </CardTitle>
                <CardDescription>
                  Scripts to close the sale effectively
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {CLOSING_TECHNIQUES.map((tech, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{tech.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyScript(tech.script, `close-${idx}`)}
                      >
                        {copiedScript === `close-${idx}` ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 italic bg-gray-50 p-3 rounded">
                      {tech.script}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

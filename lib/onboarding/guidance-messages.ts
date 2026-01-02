// =====================================================
// IN-APP GUIDANCE MESSAGES
// Contextual help messages, tooltips, and user guidance
// Version: 1.0
// =====================================================

export interface GuidanceMessage {
  id: string;
  type: 'welcome' | 'empty_state' | 'milestone' | 'warning' | 'tip' | 'weekly';
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: string; // function name to call
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: string; // function name to call
  };
  dismissible: boolean;
  showOnce: boolean;
}

// Welcome and first-time user messages
export const WELCOME_MESSAGES: GuidanceMessage[] = [
  {
    id: 'first-login-welcome',
    type: 'welcome',
    title: 'Welcome to TradesCaptain!',
    message:
      "Let's get you set up in the next 10 minutes. Your first step: Add your first lead. Even if it's a test, this will help you understand how everything works.",
    action: {
      label: 'Add Your First Lead',
      href: '/leads/new',
    },
    dismissible: true,
    showOnce: true,
  },
];

// Empty state messages for various sections
export const EMPTY_STATE_MESSAGES: Record<string, GuidanceMessage> = {
  dashboard: {
    id: 'empty-dashboard',
    type: 'empty_state',
    title: 'Your dashboard is empty',
    message:
      "You haven't added any leads yet. Every successful contractor starts by tracking every single lead.",
    action: {
      label: 'Add Your First Lead',
      href: '/leads/new',
    },
    secondaryAction: {
      label: 'Watch Quick Tutorial',
      href: '/help/getting-started',
    },
    dismissible: false,
    showOnce: false,
  },
  leads: {
    id: 'empty-leads',
    type: 'empty_state',
    title: 'No leads yet',
    message:
      'Start tracking your potential customers here. Add anyone who has shown interest in your services.',
    action: {
      label: 'Add Lead',
      href: '/leads/new',
    },
    dismissible: false,
    showOnce: false,
  },
  jobs: {
    id: 'empty-jobs',
    type: 'empty_state',
    title: 'No jobs scheduled',
    message: 'When you schedule jobs from your leads, they will appear here.',
    action: {
      label: 'View Leads',
      href: '/leads',
    },
    dismissible: false,
    showOnce: false,
  },
  invoices: {
    id: 'empty-invoices',
    type: 'empty_state',
    title: 'No invoices yet',
    message: 'Create invoices for completed jobs to get paid faster.',
    action: {
      label: 'Create Invoice',
      href: '/invoices/new',
    },
    dismissible: false,
    showOnce: false,
  },
};

// Milestone celebration messages
export const MILESTONE_MESSAGES: GuidanceMessage[] = [
  {
    id: 'first-lead-added',
    type: 'milestone',
    title: 'You added your first lead!',
    message:
      "Now move them through your pipeline as things progress. Contacted them? Update to 'Contacted'. Sent a quote? Update to 'Quoted'. Your pipeline only helps if you keep it current.",
    dismissible: true,
    showOnce: true,
  },
  {
    id: 'first-job-completed',
    type: 'milestone',
    title: 'First job completed!',
    message:
      "Great work! Don't forget to send an invoice and ask for a review. Reviews are gold for getting more customers.",
    action: {
      label: 'Create Invoice',
      href: '/invoices/new',
    },
    dismissible: true,
    showOnce: true,
  },
  {
    id: 'ten-leads-added',
    type: 'milestone',
    title: "You're building momentum!",
    message:
      "10 leads added! You're developing a great habit. Keep tracking every inquiry — even the ones that seem like long shots.",
    dismissible: true,
    showOnce: true,
  },
];

// Warning messages for engagement
export const WARNING_MESSAGES: Record<string, GuidanceMessage> = {
  'no-activity-24h': {
    id: 'no-activity-24h',
    type: 'warning',
    title: "You haven't logged in for a while",
    message:
      'You have leads that might need attention. Remember: Speed wins. The first contractor to respond usually gets the job.',
    action: {
      label: 'Check Your Leads',
      href: '/leads',
    },
    dismissible: true,
    showOnce: false,
  },
  'lead-not-contacted': {
    id: 'lead-not-contacted',
    type: 'warning',
    title: 'Lead needs attention',
    message:
      "has been sitting in 'New' for 24+ hours. Leads are 80% less likely to close after 24 hours.",
    action: {
      label: 'Contact Now',
      onClick: 'contactLead',
    },
    secondaryAction: {
      label: 'Mark as Contacted',
      onClick: 'markContacted',
    },
    dismissible: true,
    showOnce: false,
  },
  'quote-no-response': {
    id: 'quote-no-response',
    type: 'warning',
    title: 'Quote needs follow-up',
    message:
      "hasn't responded to your quote in 3 days. A quick follow-up call could close this deal.",
    action: {
      label: 'Follow Up',
      onClick: 'followUp',
    },
    dismissible: true,
    showOnce: false,
  },
};

// Daily tips
export const DAILY_TIPS: GuidanceMessage[] = [
  {
    id: 'tip-add-every-lead',
    type: 'tip',
    title: 'Rule #1: Add Every Lead',
    message: 'Even if they seem like a long shot. You never know which one will turn into a job.',
    dismissible: true,
    showOnce: false,
  },
  {
    id: 'tip-add-immediately',
    type: 'tip',
    title: 'Rule #2: Add Leads Immediately',
    message: "While you're on the phone or right after. Details fade fast.",
    dismissible: true,
    showOnce: false,
  },
  {
    id: 'tip-contact-24h',
    type: 'tip',
    title: 'Rule #3: Contact Within 24 Hours',
    message: 'Speed wins. The first contractor to respond usually gets the job.',
    dismissible: true,
    showOnce: false,
  },
  {
    id: 'tip-update-status',
    type: 'tip',
    title: 'Rule #4: Update Status Every Time',
    message: 'Your pipeline only helps if it reflects reality.',
    dismissible: true,
    showOnce: false,
  },
  {
    id: 'tip-check-dashboard',
    type: 'tip',
    title: 'Rule #5: Check Your Dashboard Every Morning',
    message: '5 minutes prevents leads from falling through cracks.',
    dismissible: true,
    showOnce: false,
  },
];

// Tooltips for specific UI elements
export const TOOLTIPS: Record<string, { title: string; description: string }> = {
  // Dashboard tooltips
  'dashboard-new-leads': {
    title: 'New Leads',
    description:
      "Leads who contacted you but haven't been qualified yet. These need your attention first.",
  },
  'dashboard-revenue': {
    title: 'Revenue',
    description: 'Total invoiced amount for completed jobs this month.',
  },
  'dashboard-tasks': {
    title: "Today's Tasks",
    description: 'Actions you need to take today. Complete these to keep leads moving.',
  },

  // Pipeline stage tooltips
  'pipeline-new': {
    title: 'New',
    description:
      "Someone expressed interest but you haven't contacted them yet. Speed is critical here.",
  },
  'pipeline-contacted': {
    title: 'Contacted',
    description: "You've talked to them. Next step: qualify and quote.",
  },
  'pipeline-quoted': {
    title: 'Quoted',
    description: "You sent a price. Follow up if you don't hear back in 2-3 days.",
  },
  'pipeline-scheduled': {
    title: 'Scheduled',
    description: 'Job is on the calendar. Make sure you have all the info you need.',
  },
  'pipeline-completed': {
    title: 'Completed',
    description: "Job is done. Don't forget to send the invoice!",
  },
  'pipeline-paid': {
    title: 'Paid',
    description: 'You got paid. Congratulations! Consider asking for a review.',
  },

  // Lead profile tooltips
  'lead-source': {
    title: 'Source',
    description: 'Where this lead came from. Helps you know what marketing is working.',
  },
  'lead-notes': {
    title: 'Notes',
    description: 'Add everything you learn. Future you will thank present you.',
  },
  'lead-next-action': {
    title: 'Next Action',
    description: "What needs to happen next? Set a reminder so it doesn't slip.",
  },

  // Estimate tooltips
  'estimate-line-items': {
    title: 'Line Items',
    description:
      'Break down your quote into parts: labor, materials, etc. Transparency builds trust.',
  },
  'estimate-notes': {
    title: 'Notes',
    description: 'Include scope, timeline, and terms. Clarity prevents disputes later.',
  },

  // NeverMiss tooltips
  'nevermiss-conversations': {
    title: 'AI Conversations',
    description:
      'See every text conversation the AI has had. You can take over anytime.',
  },
  'nevermiss-hot-lead': {
    title: 'Hot Lead',
    description: 'This person expressed strong interest or urgency. Contact them ASAP.',
  },
  'nevermiss-response-rate': {
    title: 'Response Rate',
    description:
      'Percentage of missed calls where the customer texted back. Industry average is 50%.',
  },
};

// Weekly summary message template
export function getWeeklySummaryMessage(stats: {
  leadsAdded: number;
  leadsContacted: number;
  contactRate: number;
  jobsCompleted: number;
  revenue: number;
}): GuidanceMessage {
  return {
    id: 'weekly-summary',
    type: 'weekly',
    title: 'Your Week in Review',
    message: `Leads Added: ${stats.leadsAdded}
Leads Contacted: ${stats.leadsContacted} (${stats.contactRate}% contact rate)
Jobs Completed: ${stats.jobsCompleted}
Revenue: $${stats.revenue.toLocaleString()}

Keep it up!`,
    action: {
      label: 'View Full Report',
      href: '/reports',
    },
    dismissible: true,
    showOnce: false,
  };
}

// Helper to get a random daily tip
export function getRandomDailyTip(): GuidanceMessage {
  return DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)];
}

// Helper to check if a message should be shown
export function shouldShowMessage(messageId: string): boolean {
  if (typeof window === 'undefined') return false;
  const dismissed = localStorage.getItem(`guidance-${messageId}`);
  return !dismissed;
}

// Helper to dismiss a message
export function dismissMessage(messageId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`guidance-${messageId}`, 'true');
}

// Helper to reset all dismissed messages (for testing)
export function resetAllMessages(): void {
  if (typeof window === 'undefined') return;
  const keys = Object.keys(localStorage).filter((key) => key.startsWith('guidance-'));
  keys.forEach((key) => localStorage.removeItem(key));
}

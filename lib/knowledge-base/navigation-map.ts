// ===========================================
// NAVIGATION MAP - Deep linking for AI Assistant
// Maps friendly names to actual routes
// ===========================================

export interface NavigationRoute {
  path: string;
  label: string;
  description: string;
  keywords: string[];
  category: string;
}

export const NAVIGATION_MAP: NavigationRoute[] = [
  // Dashboard
  {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Main dashboard with overview stats and recent activity',
    keywords: ['home', 'overview', 'stats', 'metrics', 'main', 'start'],
    category: 'main',
  },

  // Leads
  {
    path: '/leads',
    label: 'Leads',
    description: 'View and manage all leads',
    keywords: ['leads', 'prospects', 'potential customers', 'inquiries'],
    category: 'leads',
  },
  {
    path: '/leads/new',
    label: 'Add New Lead',
    description: 'Create a new lead manually',
    keywords: ['add lead', 'new lead', 'create lead', 'enter lead'],
    category: 'leads',
  },

  // Customers
  {
    path: '/customers',
    label: 'Customers',
    description: 'View and manage all customers',
    keywords: ['customers', 'clients', 'contacts', 'customer list'],
    category: 'customers',
  },
  {
    path: '/customers/new',
    label: 'Add New Customer',
    description: 'Create a new customer profile',
    keywords: ['add customer', 'new customer', 'create customer'],
    category: 'customers',
  },

  // Jobs
  {
    path: '/jobs',
    label: 'Jobs',
    description: 'View and manage all jobs',
    keywords: ['jobs', 'work orders', 'appointments', 'service calls', 'tasks'],
    category: 'jobs',
  },
  {
    path: '/jobs/new',
    label: 'Create New Job',
    description: 'Schedule a new job or appointment',
    keywords: ['add job', 'new job', 'create job', 'schedule job', 'book appointment'],
    category: 'jobs',
  },

  // Calendar
  {
    path: '/calendar',
    label: 'Calendar',
    description: 'View schedule and appointments in calendar view',
    keywords: ['calendar', 'schedule', 'appointments', 'availability', 'booking'],
    category: 'scheduling',
  },

  // Quotes
  {
    path: '/quotes',
    label: 'Quotes',
    description: 'View and manage all quotes',
    keywords: ['quotes', 'estimates', 'proposals', 'pricing'],
    category: 'quotes',
  },
  {
    path: '/quotes/new',
    label: 'Create New Quote',
    description: 'Create a new quote or estimate',
    keywords: ['add quote', 'new quote', 'create estimate', 'make proposal'],
    category: 'quotes',
  },

  // Invoices
  {
    path: '/invoices',
    label: 'Invoices',
    description: 'View and manage all invoices',
    keywords: ['invoices', 'bills', 'payments', 'billing'],
    category: 'invoices',
  },
  {
    path: '/invoices/new',
    label: 'Create New Invoice',
    description: 'Create a new invoice',
    keywords: ['add invoice', 'new invoice', 'create bill', 'bill customer'],
    category: 'invoices',
  },

  // Messages
  {
    path: '/messages',
    label: 'Messages',
    description: 'SMS conversations with customers',
    keywords: ['messages', 'sms', 'text', 'conversations', 'chat'],
    category: 'communication',
  },
  {
    path: '/messages/new',
    label: 'New Message',
    description: 'Start a new SMS conversation',
    keywords: ['send message', 'new text', 'send sms', 'text customer'],
    category: 'communication',
  },

  // Calls
  {
    path: '/calls',
    label: 'Calls',
    description: 'View call history and logs',
    keywords: ['calls', 'phone', 'call log', 'phone calls'],
    category: 'communication',
  },

  // Follow-ups
  {
    path: '/follow-ups',
    label: 'Follow-ups',
    description: 'View and manage follow-up reminders',
    keywords: ['follow-ups', 'reminders', 'tasks', 'to-do'],
    category: 'tasks',
  },

  // Expenses
  {
    path: '/expenses',
    label: 'Expenses',
    description: 'Track and manage business expenses',
    keywords: ['expenses', 'costs', 'spending', 'receipts'],
    category: 'finance',
  },
  {
    path: '/expenses/new',
    label: 'Add Expense',
    description: 'Record a new business expense',
    keywords: ['add expense', 'new expense', 'record cost', 'upload receipt'],
    category: 'finance',
  },

  // Receipts
  {
    path: '/receipts',
    label: 'Receipts',
    description: 'View and manage receipt uploads',
    keywords: ['receipts', 'receipt scanner', 'expense receipts'],
    category: 'finance',
  },

  // Timesheets
  {
    path: '/timesheets',
    label: 'Timesheets',
    description: 'Track employee time and hours',
    keywords: ['timesheets', 'time tracking', 'hours', 'clock in', 'clock out'],
    category: 'team',
  },

  // Mileage
  {
    path: '/mileage',
    label: 'Mileage',
    description: 'Track vehicle mileage for jobs',
    keywords: ['mileage', 'driving', 'vehicle', 'distance', 'travel'],
    category: 'tracking',
  },

  // Reports
  {
    path: '/reports',
    label: 'Reports',
    description: 'View business reports and analytics',
    keywords: ['reports', 'analytics', 'statistics', 'data', 'insights'],
    category: 'reports',
  },

  // Reviews
  {
    path: '/reviews',
    label: 'Reviews',
    description: 'View and respond to customer reviews',
    keywords: ['reviews', 'feedback', 'ratings', 'testimonials'],
    category: 'reputation',
  },

  // Dispatch
  {
    path: '/dispatch',
    label: 'Dispatch Board',
    description: 'Dispatch and assign jobs to technicians',
    keywords: ['dispatch', 'assign', 'technician', 'field service'],
    category: 'scheduling',
  },

  // Settings - Main
  {
    path: '/settings',
    label: 'Settings',
    description: 'Account and business settings',
    keywords: ['settings', 'preferences', 'configuration', 'account'],
    category: 'settings',
  },

  // Settings - Team
  {
    path: '/settings/team',
    label: 'Team Settings',
    description: 'Manage team members and permissions',
    keywords: ['team', 'employees', 'staff', 'users', 'permissions', 'roles'],
    category: 'settings',
  },
  {
    path: '/settings/team/invite',
    label: 'Invite Team Member',
    description: 'Invite a new team member',
    keywords: ['invite', 'add user', 'new employee', 'add team member'],
    category: 'settings',
  },

  // Settings - Billing
  {
    path: '/settings/billing',
    label: 'Billing Settings',
    description: 'Manage subscription and payment methods',
    keywords: ['billing', 'subscription', 'payment', 'plan', 'pricing', 'upgrade'],
    category: 'settings',
  },

  // Settings - Calendar
  {
    path: '/settings/calendar',
    label: 'Calendar Settings',
    description: 'Configure calendar and availability',
    keywords: ['calendar settings', 'working hours', 'availability', 'schedule settings'],
    category: 'settings',
  },

  // Settings - Services
  {
    path: '/settings/services',
    label: 'Services & Pricing',
    description: 'Manage service catalog and pricing',
    keywords: ['services', 'pricing', 'rates', 'service list', 'price list'],
    category: 'settings',
  },

  // Settings - Phone
  {
    path: '/settings/phone',
    label: 'Phone Settings',
    description: 'Configure business phone number',
    keywords: ['phone', 'phone number', 'call settings', 'voicemail'],
    category: 'settings',
  },

  // Settings - AI/SMS
  {
    path: '/settings/ai-sms',
    label: 'AI SMS Settings',
    description: 'Configure AI auto-responses for SMS',
    keywords: ['ai', 'auto-response', 'sms settings', 'automated messages'],
    category: 'settings',
  },

  // Settings - SMS Templates
  {
    path: '/settings/sms-templates',
    label: 'SMS Templates',
    description: 'Create and manage message templates',
    keywords: ['templates', 'message templates', 'quick replies', 'canned responses'],
    category: 'settings',
  },

  // Settings - Integrations
  {
    path: '/settings/integrations',
    label: 'Integrations',
    description: 'Connect third-party services',
    keywords: ['integrations', 'connect', 'quickbooks', 'google', 'zapier'],
    category: 'settings',
  },

  // Settings - Reviews
  {
    path: '/settings/reviews',
    label: 'Review Settings',
    description: 'Configure review request settings',
    keywords: ['review settings', 'review requests', 'feedback settings'],
    category: 'settings',
  },

  // Settings - Promotions
  {
    path: '/settings/promotions',
    label: 'Promotions',
    description: 'Create and manage promotions and discounts',
    keywords: ['promotions', 'discounts', 'coupons', 'deals', 'special offers'],
    category: 'settings',
  },

  // Settings - Referrals
  {
    path: '/settings/referrals',
    label: 'Referral Program',
    description: 'Manage customer referral program',
    keywords: ['referrals', 'referral program', 'rewards', 'refer a friend'],
    category: 'settings',
  },

  // Settings - Memberships
  {
    path: '/settings/memberships',
    label: 'Memberships',
    description: 'Create membership plans for recurring services',
    keywords: ['memberships', 'service plans', 'recurring', 'subscriptions'],
    category: 'settings',
  },

  // Settings - Features
  {
    path: '/settings/features',
    label: 'Feature Settings',
    description: 'Enable or disable CRM features',
    keywords: ['features', 'modules', 'enable', 'disable', 'toggle'],
    category: 'settings',
  },

  // Help
  {
    path: '/help',
    label: 'Help Center',
    description: 'Browse help articles and documentation',
    keywords: ['help', 'support', 'documentation', 'faq', 'how to'],
    category: 'support',
  },

  // Support Tickets
  {
    path: '/support/tickets',
    label: 'My Support Tickets',
    description: 'View and track your support tickets',
    keywords: ['tickets', 'support tickets', 'my tickets', 'ticket status', 'support requests'],
    category: 'support',
  },

  // Feature Requests
  {
    path: '/feature-requests',
    label: 'Feature Requests',
    description: 'Submit and vote on feature requests',
    keywords: ['feature', 'request', 'suggestion', 'idea', 'feedback', 'roadmap', 'vote'],
    category: 'support',
  },
];

// Find best matching route for a query
export function findBestRoute(query: string): NavigationRoute | null {
  const normalizedQuery = query.toLowerCase();

  // Exact path match
  const exactMatch = NAVIGATION_MAP.find(
    route => route.path.toLowerCase() === normalizedQuery ||
             route.label.toLowerCase() === normalizedQuery
  );
  if (exactMatch) return exactMatch;

  // Keyword match with scoring
  let bestMatch: NavigationRoute | null = null;
  let bestScore = 0;

  for (const route of NAVIGATION_MAP) {
    let score = 0;

    // Check label
    if (route.label.toLowerCase().includes(normalizedQuery)) {
      score += 10;
    }

    // Check keywords
    for (const keyword of route.keywords) {
      if (keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword)) {
        score += 5;
      }
    }

    // Check description
    if (route.description.toLowerCase().includes(normalizedQuery)) {
      score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = route;
    }
  }

  return bestScore >= 3 ? bestMatch : null;
}

// Get routes by category
export function getRoutesByCategory(category: string): NavigationRoute[] {
  return NAVIGATION_MAP.filter(route => route.category === category);
}

// Get all categories
export function getAllCategories(): string[] {
  return [...new Set(NAVIGATION_MAP.map(route => route.category))];
}

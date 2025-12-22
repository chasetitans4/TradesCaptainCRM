// ===========================================
// AI ASSISTANT ACTIONS
// Actions the AI can perform on behalf of the user
// ===========================================

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  parameters: ActionParameter[];
  route?: string;
  requiresConfirmation: boolean;
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  description: string;
  options?: string[]; // For select type
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  route?: string; // Navigate to this route after action
}

// Available actions the AI can perform
export const AVAILABLE_ACTIONS: ActionDefinition[] = [
  // Navigation actions
  {
    id: 'navigate',
    name: 'Navigate to Page',
    description: 'Navigate the user to a specific page in the CRM',
    keywords: ['go to', 'open', 'show me', 'take me to', 'navigate'],
    parameters: [
      { name: 'destination', type: 'string', required: true, description: 'The page to navigate to' }
    ],
    requiresConfirmation: false,
  },

  // Lead actions
  {
    id: 'create_lead',
    name: 'Create New Lead',
    description: 'Create a new lead in the system',
    keywords: ['new lead', 'add lead', 'create lead', 'enter lead'],
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Lead name' },
      { name: 'phone', type: 'string', required: false, description: 'Phone number' },
      { name: 'email', type: 'string', required: false, description: 'Email address' },
      { name: 'service_type', type: 'string', required: false, description: 'Type of service needed' },
      { name: 'notes', type: 'string', required: false, description: 'Additional notes' },
    ],
    route: '/leads/new',
    requiresConfirmation: true,
  },

  // Customer actions
  {
    id: 'create_customer',
    name: 'Create New Customer',
    description: 'Create a new customer profile',
    keywords: ['new customer', 'add customer', 'create customer'],
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Customer name' },
      { name: 'phone', type: 'string', required: false, description: 'Phone number' },
      { name: 'email', type: 'string', required: false, description: 'Email address' },
      { name: 'address', type: 'string', required: false, description: 'Address' },
    ],
    route: '/customers/new',
    requiresConfirmation: true,
  },

  // Job actions
  {
    id: 'create_job',
    name: 'Create New Job',
    description: 'Schedule a new job or appointment',
    keywords: ['new job', 'schedule job', 'create job', 'book job', 'add appointment'],
    parameters: [
      { name: 'customer_name', type: 'string', required: true, description: 'Customer name' },
      { name: 'job_type', type: 'string', required: false, description: 'Type of job' },
      { name: 'date', type: 'date', required: false, description: 'Scheduled date' },
      { name: 'notes', type: 'string', required: false, description: 'Job notes' },
    ],
    route: '/jobs/new',
    requiresConfirmation: true,
  },

  // Quote actions
  {
    id: 'create_quote',
    name: 'Create New Quote',
    description: 'Create a new quote/estimate',
    keywords: ['new quote', 'create estimate', 'add quote', 'make proposal'],
    parameters: [
      { name: 'customer_name', type: 'string', required: true, description: 'Customer name' },
    ],
    route: '/quotes/new',
    requiresConfirmation: true,
  },

  // Invoice actions
  {
    id: 'create_invoice',
    name: 'Create New Invoice',
    description: 'Create a new invoice',
    keywords: ['new invoice', 'create invoice', 'add invoice', 'bill customer'],
    parameters: [
      { name: 'customer_name', type: 'string', required: true, description: 'Customer name' },
    ],
    route: '/invoices/new',
    requiresConfirmation: true,
  },

  // Message actions
  {
    id: 'send_message',
    name: 'Send Message',
    description: 'Start a new SMS conversation',
    keywords: ['send message', 'text customer', 'send sms', 'message'],
    parameters: [
      { name: 'recipient', type: 'string', required: true, description: 'Customer name or phone' },
      { name: 'message', type: 'string', required: false, description: 'Message content' },
    ],
    route: '/messages/new',
    requiresConfirmation: true,
  },

  // Search actions
  {
    id: 'search',
    name: 'Search',
    description: 'Search for customers, leads, jobs, or invoices',
    keywords: ['search', 'find', 'look up', 'look for'],
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'type', type: 'select', required: false, description: 'Type to search', options: ['all', 'customers', 'leads', 'jobs', 'invoices'] },
    ],
    requiresConfirmation: false,
  },

  // Settings actions
  {
    id: 'open_settings',
    name: 'Open Settings',
    description: 'Open a specific settings page',
    keywords: ['settings', 'configure', 'setup', 'preferences'],
    parameters: [
      { name: 'section', type: 'select', required: false, description: 'Settings section', options: ['general', 'team', 'billing', 'calendar', 'services', 'phone', 'ai-sms', 'integrations'] },
    ],
    route: '/settings',
    requiresConfirmation: false,
  },

  // Report actions
  {
    id: 'view_reports',
    name: 'View Reports',
    description: 'View business reports and analytics',
    keywords: ['reports', 'analytics', 'stats', 'metrics', 'data'],
    parameters: [
      { name: 'report_type', type: 'select', required: false, description: 'Type of report', options: ['revenue', 'jobs', 'leads', 'customers', 'team'] },
    ],
    route: '/reports',
    requiresConfirmation: false,
  },

  // Help actions
  {
    id: 'get_help',
    name: 'Get Help',
    description: 'Find help articles on a topic',
    keywords: ['help', 'how to', 'tutorial', 'guide', 'learn'],
    parameters: [
      { name: 'topic', type: 'string', required: true, description: 'Help topic' },
    ],
    requiresConfirmation: false,
  },
];

// Find matching action for user intent
export function findAction(query: string): ActionDefinition | null {
  const normalizedQuery = query.toLowerCase();

  for (const action of AVAILABLE_ACTIONS) {
    for (const keyword of action.keywords) {
      if (normalizedQuery.includes(keyword)) {
        return action;
      }
    }
  }

  return null;
}

// Extract parameters from user message
export function extractParameters(
  message: string,
  action: ActionDefinition
): Record<string, any> {
  const params: Record<string, any> = {};

  // Simple parameter extraction - AI will do the heavy lifting
  // This is a fallback for common patterns

  // Extract phone numbers
  const phoneMatch = message.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    params.phone = phoneMatch[0];
  }

  // Extract email
  const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    params.email = emailMatch[0];
  }

  // Extract dates (simple patterns)
  const datePatterns = [
    /tomorrow/i,
    /today/i,
    /next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /\d{1,2}\/\d{1,2}(\/\d{2,4})?/,
  ];

  for (const pattern of datePatterns) {
    const dateMatch = message.match(pattern);
    if (dateMatch) {
      params.date = dateMatch[0];
      break;
    }
  }

  return params;
}

// Get action suggestions based on current page
export function getContextualActions(currentPath: string): ActionDefinition[] {
  const contextActions: Record<string, string[]> = {
    '/dashboard': ['create_lead', 'create_job', 'view_reports'],
    '/leads': ['create_lead', 'search'],
    '/customers': ['create_customer', 'search'],
    '/jobs': ['create_job', 'search'],
    '/quotes': ['create_quote', 'search'],
    '/invoices': ['create_invoice', 'search'],
    '/messages': ['send_message', 'search'],
    '/calendar': ['create_job'],
    '/settings': ['open_settings'],
    '/reports': ['view_reports'],
  };

  const actionIds = contextActions[currentPath] || ['search', 'get_help'];

  return AVAILABLE_ACTIONS.filter(action => actionIds.includes(action.id));
}

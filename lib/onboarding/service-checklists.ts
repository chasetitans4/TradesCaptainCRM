// =====================================================
// SERVICE ONBOARDING CHECKLISTS
// Plan-specific onboarding tasks for different service types
// =====================================================

import { PlanTrack, PlanTier } from '@/lib/pricing/plans';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  required: boolean;
  order: number;
  subItems?: {
    id: string;
    title: string;
    required: boolean;
  }[];
}

export interface ServiceChecklist {
  planTrack: PlanTrack;
  planTier?: PlanTier;
  name: string;
  items: ChecklistItem[];
}

export interface ClientChecklistStatus {
  client_id: string;
  checklist_type: string;
  items: {
    item_id: string;
    completed: boolean;
    completed_at?: string;
    completed_by?: string;
    notes?: string;
    sub_items?: {
      sub_item_id: string;
      completed: boolean;
      completed_at?: string;
    }[];
  }[];
  started_at: string;
  completed_at?: string;
  overall_progress: number;
}

// =====================================================
// LOCAL SEO ONBOARDING CHECKLIST
// =====================================================

export const LOCAL_SEO_CHECKLIST: ChecklistItem[] = [
  {
    id: 'verify_website',
    title: "Verify client's existing website URL",
    description: 'Confirm the website is live, accessible, and belongs to the client',
    category: 'Prerequisites',
    required: true,
    order: 1,
  },
  {
    id: 'gbp_access',
    title: 'Request GBP access or create new profile',
    description: 'Get access to existing Google Business Profile or create a new one',
    category: 'Google Business Profile',
    required: true,
    order: 2,
    subItems: [
      { id: 'gbp_claim', title: 'Claim or create GBP listing', required: true },
      { id: 'gbp_verify', title: 'Complete verification process', required: true },
    ],
  },
  {
    id: 'gbp_optimization',
    title: 'Complete GBP optimization',
    description: 'Fully optimize the Google Business Profile',
    category: 'Google Business Profile',
    required: true,
    order: 3,
    subItems: [
      { id: 'gbp_business_info', title: 'Business info verified (name, address, phone)', required: true },
      { id: 'gbp_categories', title: 'Primary and secondary categories selected', required: true },
      { id: 'gbp_service_area', title: 'Service area configured', required: true },
      { id: 'gbp_description', title: 'Business description written (750 chars)', required: true },
      { id: 'gbp_photos', title: 'Photos uploaded (minimum 10)', required: true },
      { id: 'gbp_posts', title: 'First 2 posts created', required: true },
      { id: 'gbp_services', title: 'Services/products added', required: false },
      { id: 'gbp_hours', title: 'Business hours set', required: true },
    ],
  },
  {
    id: 'citations',
    title: 'Submit citations',
    description: 'Submit business to directories (quantity based on plan tier)',
    category: 'Citations',
    required: true,
    order: 4,
    subItems: [
      { id: 'citations_tier1', title: 'Tier 1 directories (Google, Bing, Apple, Yelp)', required: true },
      { id: 'citations_tier2', title: 'Tier 2 directories (industry-specific)', required: true },
      { id: 'citations_tier3', title: 'Tier 3 directories (local/regional)', required: false },
    ],
  },
  {
    id: 'onsite_audit',
    title: 'Perform on-site SEO audit',
    description: "Audit client's existing website for SEO issues",
    category: 'On-Site SEO',
    required: true,
    order: 5,
    subItems: [
      { id: 'audit_meta', title: 'Meta titles and descriptions reviewed', required: true },
      { id: 'audit_headings', title: 'Heading structure analyzed', required: true },
      { id: 'audit_schema', title: 'Schema markup assessed', required: true },
      { id: 'audit_speed', title: 'Page speed tested', required: true },
      { id: 'audit_mobile', title: 'Mobile-friendliness checked', required: true },
    ],
  },
  {
    id: 'onsite_implementation',
    title: 'Implement on-site optimizations',
    description: 'Apply SEO fixes to the website (with client approval)',
    category: 'On-Site SEO',
    required: true,
    order: 6,
    subItems: [
      { id: 'impl_meta', title: 'Meta tags optimized', required: true },
      { id: 'impl_schema', title: 'Local business schema added', required: true },
      { id: 'impl_nap', title: 'NAP consistency verified', required: true },
    ],
  },
  {
    id: 'rank_tracking',
    title: 'Set up ranking tracking',
    description: 'Configure keyword rank tracking for target terms',
    category: 'Reporting',
    required: true,
    order: 7,
    subItems: [
      { id: 'rank_keywords', title: 'Target keywords identified (10-20)', required: true },
      { id: 'rank_locations', title: 'Tracking locations set', required: true },
      { id: 'rank_baseline', title: 'Baseline rankings recorded', required: true },
    ],
  },
  {
    id: 'competitor_tracking',
    title: 'Set up competitor tracking',
    description: 'Track competitor rankings and GBP performance (Pro/Enterprise)',
    category: 'Reporting',
    required: false, // Required for Pro/Enterprise only
    order: 8,
    subItems: [
      { id: 'comp_identify', title: 'Top 3 competitors identified', required: true },
      { id: 'comp_tracking', title: 'Competitor tracking configured', required: true },
    ],
  },
  {
    id: 'schedule_reports',
    title: 'Schedule first monthly report',
    description: 'Set up recurring reporting based on plan tier',
    category: 'Reporting',
    required: true,
    order: 9,
  },
  {
    id: 'welcome_email',
    title: 'Send welcome email with deliverables summary',
    description: 'Send client onboarding complete email with what to expect',
    category: 'Communication',
    required: true,
    order: 10,
  },
];

// =====================================================
// GOLD PLAN ONBOARDING CHECKLIST (includes Local SEO)
// =====================================================

export const GOLD_CHECKLIST: ChecklistItem[] = [
  // Website Build Section
  {
    id: 'website_discovery',
    title: 'Website discovery call',
    description: 'Gather requirements, content, and design preferences',
    category: 'Website Build',
    required: true,
    order: 1,
    subItems: [
      { id: 'discovery_call', title: 'Discovery call completed', required: true },
      { id: 'content_received', title: 'Content/photos received from client', required: true },
      { id: 'branding_confirmed', title: 'Logo and branding confirmed', required: true },
    ],
  },
  {
    id: 'website_build',
    title: 'Build website',
    description: 'Design and develop the website',
    category: 'Website Build',
    required: true,
    order: 2,
    subItems: [
      { id: 'design_mockup', title: 'Design mockup approved', required: true },
      { id: 'pages_built', title: 'All pages built', required: true },
      { id: 'mobile_responsive', title: 'Mobile responsive verified', required: true },
      { id: 'forms_working', title: 'Contact forms working', required: true },
      { id: 'speed_optimized', title: 'Speed optimized', required: true },
    ],
  },
  {
    id: 'website_launch',
    title: 'Launch website',
    description: 'Go live with the new website',
    category: 'Website Build',
    required: true,
    order: 3,
    subItems: [
      { id: 'ssl_installed', title: 'SSL certificate installed', required: true },
      { id: 'domain_connected', title: 'Domain connected', required: true },
      { id: 'analytics_installed', title: 'Google Analytics installed', required: true },
      { id: 'search_console', title: 'Search Console verified', required: true },
      { id: 'client_approved', title: 'Client approval received', required: true },
    ],
  },
  // CRM Setup Section
  {
    id: 'crm_setup',
    title: 'CRM account setup',
    description: 'Set up BlueHQ CRM account',
    category: 'CRM Setup',
    required: true,
    order: 4,
    subItems: [
      { id: 'crm_account', title: 'Account created', required: true },
      { id: 'crm_users', title: 'Users added', required: true },
      { id: 'crm_business_info', title: 'Business info configured', required: true },
      { id: 'crm_services', title: 'Services/pricing configured', required: false },
    ],
  },
  {
    id: 'crm_training',
    title: 'CRM training session',
    description: 'Train client on using the CRM',
    category: 'CRM Setup',
    required: true,
    order: 5,
    subItems: [
      { id: 'training_scheduled', title: 'Training session scheduled', required: true },
      { id: 'training_completed', title: 'Training session completed', required: true },
      { id: 'training_followup', title: 'Follow-up resources sent', required: false },
    ],
  },
  // Local SEO Section (from Local SEO checklist)
  {
    id: 'gbp_setup',
    title: 'Google Business Profile setup',
    description: 'Set up and optimize GBP',
    category: 'Local SEO Setup',
    required: true,
    order: 6,
    subItems: [
      { id: 'gbp_claimed', title: 'GBP claimed/created', required: true },
      { id: 'gbp_verified', title: 'Verification completed', required: true },
      { id: 'gbp_optimized', title: 'Profile fully optimized', required: true },
      { id: 'gbp_photos', title: 'Photos uploaded (10+)', required: true },
      { id: 'gbp_posts', title: 'First posts created', required: true },
    ],
  },
  {
    id: 'citations_gold',
    title: 'Citation submissions',
    description: 'Submit to directories based on tier',
    category: 'Local SEO Setup',
    required: true,
    order: 7,
    subItems: [
      { id: 'citations_submitted', title: 'Citations submitted', required: true },
      { id: 'citations_verified', title: 'Listings verified', required: false },
    ],
  },
  {
    id: 'onsite_seo',
    title: 'On-site SEO implementation',
    description: 'Apply SEO optimizations to new website',
    category: 'Local SEO Setup',
    required: true,
    order: 8,
    subItems: [
      { id: 'meta_tags', title: 'Meta tags optimized', required: true },
      { id: 'schema_markup', title: 'Schema markup added', required: true },
      { id: 'internal_linking', title: 'Internal linking configured', required: true },
    ],
  },
  {
    id: 'rank_tracking_gold',
    title: 'Ranking tracking configured',
    description: 'Set up keyword and ranking tracking',
    category: 'Local SEO Setup',
    required: true,
    order: 9,
  },
  {
    id: 'competitor_tracking_gold',
    title: 'Competitor tracking (Pro/Enterprise)',
    description: 'Set up competitor monitoring',
    category: 'Local SEO Setup',
    required: false,
    order: 10,
  },
  // AI SMS Section
  {
    id: 'ai_sms_setup',
    title: 'AI SMS configuration',
    description: 'Configure AI SMS auto-responder',
    category: 'AI SMS Configuration',
    required: true,
    order: 11,
    subItems: [
      { id: 'phone_provisioned', title: 'Phone number provisioned', required: true },
      { id: 'ai_personality', title: 'AI personality configured', required: true },
      { id: 'auto_responses', title: 'Auto-response templates set', required: true },
      { id: 'escalation_rules', title: 'Escalation rules configured', required: true },
      { id: 'testing_complete', title: 'Testing completed', required: true },
    ],
  },
  // Final
  {
    id: 'gold_welcome',
    title: 'Send welcome package',
    description: 'Send client complete onboarding summary',
    category: 'Communication',
    required: true,
    order: 12,
  },
];

// =====================================================
// WEB PLAN ONBOARDING CHECKLIST
// =====================================================

export const WEB_CHECKLIST: ChecklistItem[] = [
  {
    id: 'web_discovery',
    title: 'Website discovery call',
    description: 'Gather requirements, content, and design preferences',
    category: 'Discovery',
    required: true,
    order: 1,
    subItems: [
      { id: 'discovery_call', title: 'Discovery call completed', required: true },
      { id: 'content_received', title: 'Content/photos received', required: true },
      { id: 'branding_confirmed', title: 'Logo and branding confirmed', required: true },
      { id: 'sitemap_approved', title: 'Sitemap approved', required: true },
    ],
  },
  {
    id: 'web_design',
    title: 'Design phase',
    description: 'Create and approve website design',
    category: 'Design',
    required: true,
    order: 2,
    subItems: [
      { id: 'mockup_created', title: 'Design mockup created', required: true },
      { id: 'mockup_revision', title: 'Revisions completed', required: false },
      { id: 'mockup_approved', title: 'Final design approved', required: true },
    ],
  },
  {
    id: 'web_development',
    title: 'Development phase',
    description: 'Build the website',
    category: 'Development',
    required: true,
    order: 3,
    subItems: [
      { id: 'homepage_built', title: 'Homepage built', required: true },
      { id: 'inner_pages', title: 'Inner pages built', required: true },
      { id: 'forms_configured', title: 'Contact forms working', required: true },
      { id: 'mobile_tested', title: 'Mobile responsive verified', required: true },
      { id: 'speed_tested', title: 'Speed optimized', required: true },
    ],
  },
  {
    id: 'web_onpage_seo',
    title: 'On-page SEO',
    description: 'Basic on-page SEO setup (included with Web plans)',
    category: 'SEO',
    required: true,
    order: 4,
    subItems: [
      { id: 'meta_tags', title: 'Meta titles/descriptions set', required: true },
      { id: 'schema_basic', title: 'Basic schema markup added', required: true },
      { id: 'heading_structure', title: 'Heading structure optimized', required: true },
      { id: 'image_alt', title: 'Image alt tags added', required: true },
    ],
  },
  {
    id: 'web_gbp_addon',
    title: 'GBP Setup (if add-on purchased)',
    description: '$99 one-time GBP setup service',
    category: 'Add-On Services',
    required: false,
    order: 5,
    subItems: [
      { id: 'gbp_created', title: 'GBP created/claimed', required: true },
      { id: 'gbp_verified', title: 'Verification completed', required: true },
      { id: 'gbp_optimized', title: 'Profile optimized', required: true },
      { id: 'gbp_photos', title: 'Initial photos uploaded', required: true },
      { id: 'gbp_posts', title: 'First 2 posts created', required: true },
    ],
  },
  {
    id: 'web_launch',
    title: 'Website launch',
    description: 'Go live with the website',
    category: 'Launch',
    required: true,
    order: 6,
    subItems: [
      { id: 'ssl_installed', title: 'SSL certificate installed', required: true },
      { id: 'domain_configured', title: 'Domain configured', required: true },
      { id: 'analytics_setup', title: 'Analytics installed', required: true },
      { id: 'search_console', title: 'Search Console verified', required: true },
      { id: 'client_signoff', title: 'Client sign-off received', required: true },
    ],
  },
  {
    id: 'web_welcome',
    title: 'Send launch confirmation',
    description: 'Send client website launch confirmation',
    category: 'Communication',
    required: true,
    order: 7,
  },
];

// =====================================================
// BLUE (CRM ONLY) ONBOARDING CHECKLIST
// =====================================================

export const BLUE_CHECKLIST: ChecklistItem[] = [
  {
    id: 'blue_account',
    title: 'Account setup',
    description: 'Create and configure CRM account',
    category: 'Account Setup',
    required: true,
    order: 1,
    subItems: [
      { id: 'account_created', title: 'Account created', required: true },
      { id: 'users_added', title: 'Team members added', required: true },
      { id: 'password_set', title: 'Password set and 2FA enabled', required: true },
    ],
  },
  {
    id: 'blue_business',
    title: 'Business profile setup',
    description: 'Configure business information',
    category: 'Account Setup',
    required: true,
    order: 2,
    subItems: [
      { id: 'business_name', title: 'Business name and address set', required: true },
      { id: 'logo_uploaded', title: 'Logo uploaded', required: false },
      { id: 'contact_info', title: 'Contact info configured', required: true },
    ],
  },
  {
    id: 'blue_services',
    title: 'Services and pricing',
    description: 'Set up service catalog and pricing',
    category: 'Configuration',
    required: true,
    order: 3,
    subItems: [
      { id: 'services_added', title: 'Services added', required: true },
      { id: 'pricing_set', title: 'Pricing configured', required: true },
      { id: 'service_areas', title: 'Service areas defined', required: false },
    ],
  },
  {
    id: 'blue_integrations',
    title: 'Integrations setup',
    description: 'Connect payment and communication tools',
    category: 'Configuration',
    required: false,
    order: 4,
    subItems: [
      { id: 'stripe_connected', title: 'Stripe connected', required: false },
      { id: 'twilio_connected', title: 'Twilio connected', required: false },
      { id: 'calendar_sync', title: 'Calendar synced', required: false },
    ],
  },
  {
    id: 'blue_training',
    title: 'Training session',
    description: 'Complete CRM training',
    category: 'Training',
    required: true,
    order: 5,
    subItems: [
      { id: 'training_scheduled', title: 'Training scheduled', required: true },
      { id: 'training_completed', title: 'Training completed', required: true },
      { id: 'resources_sent', title: 'Help resources shared', required: true },
    ],
  },
  {
    id: 'blue_welcome',
    title: 'Welcome complete',
    description: 'Send welcome confirmation and next steps',
    category: 'Communication',
    required: true,
    order: 6,
  },
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get the appropriate checklist for a plan
 */
export function getChecklistForPlan(
  track: PlanTrack,
  tier?: PlanTier,
  hasGbpAddon?: boolean
): ChecklistItem[] {
  let checklist: ChecklistItem[];

  switch (track) {
    case 'seo':
      checklist = [...LOCAL_SEO_CHECKLIST];
      // Adjust requirements based on tier
      if (tier === 'starter') {
        // Remove competitor tracking for starter
        checklist = checklist.map(item =>
          item.id === 'competitor_tracking'
            ? { ...item, required: false }
            : item
        );
      }
      break;

    case 'gold':
      checklist = [...GOLD_CHECKLIST];
      // Adjust for tier
      if (tier === 'starter') {
        checklist = checklist.map(item =>
          item.id === 'competitor_tracking_gold'
            ? { ...item, required: false }
            : item
        );
      }
      break;

    case 'web':
      checklist = [...WEB_CHECKLIST];
      // Include or exclude GBP addon section
      if (!hasGbpAddon) {
        checklist = checklist.filter(item => item.id !== 'web_gbp_addon');
      }
      break;

    case 'blue':
    default:
      checklist = [...BLUE_CHECKLIST];
      break;
  }

  return checklist;
}

/**
 * Calculate progress percentage for a checklist
 */
export function calculateChecklistProgress(
  checklist: ChecklistItem[],
  completedItemIds: string[]
): number {
  const requiredItems = checklist.filter(item => item.required);
  if (requiredItems.length === 0) return 100;

  const completedRequired = requiredItems.filter(item =>
    completedItemIds.includes(item.id)
  );

  return Math.round((completedRequired.length / requiredItems.length) * 100);
}

/**
 * Get next incomplete item in checklist
 */
export function getNextIncompleteItem(
  checklist: ChecklistItem[],
  completedItemIds: string[]
): ChecklistItem | null {
  return checklist.find(item =>
    item.required && !completedItemIds.includes(item.id)
  ) || null;
}

/**
 * Initialize a new checklist status for a client
 */
export function initializeClientChecklist(
  clientId: string,
  track: PlanTrack,
  tier?: PlanTier,
  hasGbpAddon?: boolean
): ClientChecklistStatus {
  const checklist = getChecklistForPlan(track, tier, hasGbpAddon);

  return {
    client_id: clientId,
    checklist_type: track,
    items: checklist.map(item => ({
      item_id: item.id,
      completed: false,
      sub_items: item.subItems?.map(sub => ({
        sub_item_id: sub.id,
        completed: false,
      })),
    })),
    started_at: new Date().toISOString(),
    overall_progress: 0,
  };
}

// In-memory storage for demo (replace with Supabase in production)
const checklistStorage: Map<string, ClientChecklistStatus> = new Map();

/**
 * Get checklist status for a client
 */
export async function getClientChecklistStatus(
  clientId: string
): Promise<ClientChecklistStatus | null> {
  return checklistStorage.get(clientId) || null;
}

/**
 * Save checklist status for a client
 */
export async function saveClientChecklistStatus(
  status: ClientChecklistStatus
): Promise<ClientChecklistStatus> {
  // Calculate progress
  const completedItems = status.items.filter(item => item.completed);
  const checklist = getChecklistForPlan(status.checklist_type as PlanTrack);
  status.overall_progress = calculateChecklistProgress(
    checklist,
    completedItems.map(i => i.item_id)
  );

  // Check if completed
  if (status.overall_progress === 100 && !status.completed_at) {
    status.completed_at = new Date().toISOString();
  }

  checklistStorage.set(status.client_id, status);
  return status;
}

/**
 * Update a single item in the checklist
 */
export async function updateChecklistItem(
  clientId: string,
  itemId: string,
  completed: boolean,
  completedBy?: string,
  notes?: string
): Promise<ClientChecklistStatus | null> {
  const status = await getClientChecklistStatus(clientId);
  if (!status) return null;

  const itemIndex = status.items.findIndex(i => i.item_id === itemId);
  if (itemIndex === -1) return null;

  status.items[itemIndex] = {
    ...status.items[itemIndex],
    completed,
    completed_at: completed ? new Date().toISOString() : undefined,
    completed_by: completedBy,
    notes,
  };

  return saveClientChecklistStatus(status);
}

/**
 * Update a sub-item in the checklist
 */
export async function updateChecklistSubItem(
  clientId: string,
  itemId: string,
  subItemId: string,
  completed: boolean
): Promise<ClientChecklistStatus | null> {
  const status = await getClientChecklistStatus(clientId);
  if (!status) return null;

  const itemIndex = status.items.findIndex(i => i.item_id === itemId);
  if (itemIndex === -1) return null;

  const subItems = status.items[itemIndex].sub_items;
  if (!subItems) return null;

  const subItemIndex = subItems.findIndex(s => s.sub_item_id === subItemId);
  if (subItemIndex === -1) return null;

  subItems[subItemIndex] = {
    ...subItems[subItemIndex],
    completed,
    completed_at: completed ? new Date().toISOString() : undefined,
  };

  // Auto-complete parent if all required sub-items are done
  const checklist = getChecklistForPlan(status.checklist_type as PlanTrack);
  const checklistItem = checklist.find(c => c.id === itemId);
  if (checklistItem?.subItems) {
    const requiredSubItems = checklistItem.subItems.filter(s => s.required);
    const completedSubItems = subItems.filter(
      s => s.completed && requiredSubItems.some(r => r.id === s.sub_item_id)
    );

    if (completedSubItems.length === requiredSubItems.length) {
      status.items[itemIndex].completed = true;
      status.items[itemIndex].completed_at = new Date().toISOString();
    }
  }

  return saveClientChecklistStatus(status);
}

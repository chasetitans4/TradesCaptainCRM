// =====================================================
// ONBOARDING QUESTIONNAIRE LIBRARY
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface OnboardingResponses {
  // Business Info (already collected)
  businessName: string;
  tradeType: string;

  // Team Size
  teamSize: 'solo' | '2-5' | '6-10' | '10+';

  // Feature Preferences
  wantsTimesheets: boolean;
  wantsReceipts: boolean;
  wantsRouteOptimization: boolean;
  wantsOnlineBooking: boolean;
  wantsReviewRequests: boolean;
  wantsAiSms: boolean;

  // Billing Preferences
  billingType: 'quotes_only' | 'invoices_only' | 'both';

  // Communication Preferences
  appointmentReminders: boolean;
  notificationPreference: 'email' | 'sms' | 'both' | 'push';
}

export interface QuestionnaireQuestion {
  id: string;
  type: 'single' | 'multi' | 'text';
  question: string;
  description?: string;
  options?: { value: string; label: string; description?: string }[];
  required?: boolean;
}

export const QUESTIONNAIRE_QUESTIONS: QuestionnaireQuestion[] = [
  {
    id: 'teamSize',
    type: 'single',
    question: 'How big is your team?',
    description: 'This helps us recommend the right features',
    options: [
      { value: 'solo', label: 'Just me', description: 'One-person operation' },
      { value: '2-5', label: '2-5 people', description: 'Small team' },
      { value: '6-10', label: '6-10 people', description: 'Growing team' },
      { value: '10+', label: '10+ people', description: 'Large operation' },
    ],
    required: true,
  },
  {
    id: 'billingType',
    type: 'single',
    question: 'How do you bill customers?',
    description: 'We can enable the features you need',
    options: [
      { value: 'quotes_only', label: 'Quotes only', description: 'I send quotes but invoice elsewhere' },
      { value: 'invoices_only', label: 'Invoices only', description: 'I invoice after the job' },
      { value: 'both', label: 'Both', description: 'I quote jobs then convert to invoices' },
    ],
    required: true,
  },
  {
    id: 'features',
    type: 'multi',
    question: 'Which features interest you?',
    description: 'Select all that apply - you can change these later',
    options: [
      { value: 'timesheets', label: 'Timesheets', description: 'Track technician hours' },
      { value: 'receipts', label: 'Receipt Tracking', description: 'Save and tag receipts to jobs' },
      { value: 'route_optimization', label: 'Route Optimization', description: 'Optimize daily routes' },
      { value: 'online_booking', label: 'Online Booking', description: 'Let customers book online' },
      { value: 'review_requests', label: 'Google Reviews', description: 'Request reviews after jobs' },
    ],
    required: false,
  },
  {
    id: 'aiServices',
    type: 'single',
    question: 'Interested in AI-powered services?',
    // v6.3: Leads Captain is now a $49/mo add-on available for any Blue CRM plan
    description: 'Leads Captain ($49/mo add-on) can auto-respond to customer texts and capture leads. Available for any plan. You can add or remove this anytime in Settings > AI Services.',
    options: [
      { value: 'yes', label: 'Yes, I\'m interested', description: 'Learn more about Leads Captain add-on ($49/mo)' },
      { value: 'no', label: 'No thanks', description: 'Handle all customer messages yourself' },
    ],
    required: true,
  },
  {
    id: 'notifications',
    type: 'single',
    question: 'How should we notify you?',
    description: 'For new leads, appointments, etc.',
    options: [
      { value: 'email', label: 'Email only' },
      { value: 'sms', label: 'SMS only' },
      { value: 'both', label: 'Email + SMS' },
      { value: 'push', label: 'Push notifications' },
    ],
    required: true,
  },
  {
    id: 'appointmentReminders',
    type: 'single',
    question: 'Send appointment reminders to customers?',
    description: 'Automated reminders before scheduled jobs',
    options: [
      { value: 'yes', label: 'Yes, send reminders' },
      { value: 'no', label: 'No, I\'ll handle it myself' },
    ],
    required: true,
  },
];

/**
 * Process questionnaire responses and set up initial feature settings
 * v6.3: AI services preference is now just an interest flag - actual activation requires addon purchase
 */
export async function processQuestionnaireResponses(
  businessId: string,
  responses: Record<string, any>
): Promise<void> {
  const supabase = await createClient();

  // Map responses to feature settings
  const features = responses.features || [];
  const featureSettings = {
    business_id: businessId,
    // v6.3: ai_sms_enabled stays false until they purchase the addon
    ai_sms_enabled: false,
    auto_appointment_reminders: responses.appointmentReminders === 'yes',
    auto_review_requests: features.includes('review_requests'),
    // Scheduling
    online_booking_enabled: features.includes('online_booking'),
    route_optimization_enabled: features.includes('route_optimization'),
    // CRM
    timesheets_enabled: features.includes('timesheets'),
    receipts_enabled: features.includes('receipts'),
    quotes_enabled: responses.billingType === 'quotes_only' || responses.billingType === 'both',
    invoices_enabled: responses.billingType === 'invoices_only' || responses.billingType === 'both',
    // Notifications
    email_notifications: responses.notifications === 'email' || responses.notifications === 'both',
    sms_notifications: responses.notifications === 'sms' || responses.notifications === 'both',
    push_notifications: responses.notifications === 'push',
  };

  // Upsert feature settings
  const { error } = await supabase
    .from('feature_settings')
    .upsert(featureSettings, { onConflict: 'business_id' });

  if (error) {
    const { logger } = await import('@/lib/logger');
    const onboardingLogger = logger.child({ context: 'onboarding.questionnaire' });
    onboardingLogger.error({
      msg: 'Error saving feature settings',
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    throw new Error('Failed to save feature preferences');
  }

  // Save questionnaire responses to businesses table
  // v6.3: interested_in_ai_addon flag tracks interest for follow-up
  await supabase
    .from('businesses')
    .update({
      questionnaire_completed: true,
      questionnaire_completed_at: new Date().toISOString(),
      team_size: responses.teamSize,
      // v6.3: Don't auto-enable AI - requires addon purchase
      ai_sms_enabled: false,
    })
    .eq('id', businessId);

  // v6.3: If interested in AI, redirect them to AI services page after onboarding
  // This is handled in the frontend redirect logic
}

/**
 * Get recommended features based on team size and trade type
 */
export function getRecommendedFeatures(teamSize: string, tradeType: string): string[] {
  const recommendations: string[] = [];

  // Route optimization for larger teams
  if (teamSize !== 'solo') {
    recommendations.push('route_optimization');
    recommendations.push('timesheets');
  }

  // Review requests for all
  recommendations.push('review_requests');

  // Online booking for service trades
  if (['plumbing', 'hvac', 'electrical'].includes(tradeType)) {
    recommendations.push('online_booking');
  }

  // AI SMS for busy businesses
  if (teamSize === '6-10' || teamSize === '10+') {
    recommendations.push('ai_sms');
  }

  return recommendations;
}

/**
 * Check if questionnaire is completed
 */
export async function isQuestionnaireCompleted(businessId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('businesses')
    .select('questionnaire_completed')
    .eq('id', businessId)
    .single();

  return data?.questionnaire_completed ?? false;
}

// =====================================================
// ADMIN PORTAL LIBRARY
// Core functions for super admin portal management
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { format, addDays, addMonths, differenceInDays } from 'date-fns';
import crypto from 'crypto';

// =====================================================
// TYPES
// =====================================================

export type AdminRole = 'super_admin' | 'admin' | 'agent' | 'support';
export type PlanType = 'blue_starter' | 'blue_pro' | 'blue_enterprise';
export type PlanStatus = 'trial' | 'active' | 'cancelled' | 'suspended' | 'founders';
export type SubmissionType = 'trial' | 'founders';
export type SubmissionStatus = 'pending' | 'approved' | 'sent' | 'registered' | 'rejected';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface CRMAccount {
  id: string;
  business_name: string;
  owner_email: string;
  owner_name: string;
  phone?: string;
  plan_type: PlanType;
  plan_status: PlanStatus;
  is_trial: boolean;
  trial_start_date?: string;
  trial_end_date?: string;
  trial_converted: boolean;
  is_founders: boolean;
  founders_start_date?: string;
  founders_end_date?: string;
  founders_slot_number?: number;
  web_invoice_number?: string;
  web_plan_type?: string;
  web_plan_status?: string;
  web_plan_start_date?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  payment_method_added: boolean;
  next_billing_date?: string;
  monthly_price?: number;
  created_by_agent_id?: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  // Populated fields
  agent?: AdminUser;
}

export interface AgentSubmission {
  id: string;
  agent_id: string;
  agent_name: string;
  submission_type: SubmissionType;
  client_company_name: string;
  client_email: string;
  client_phone?: string;
  web_invoice_number: string;
  web_plan_type: string;
  crm_plan_selected: PlanType;
  invoice_validated: boolean;
  validation_error?: string;
  status: SubmissionStatus;
  rejection_reason?: string;
  crm_account_id?: string;
  invite_email_sent_at?: string;
  invite_token?: string;
  invite_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FoundersProgram {
  id: string;
  total_slots: number;
  slots_used: number;
  is_open: boolean;
  closed_at?: string;
}

export interface AdminActivityLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at: string;
  admin_user?: AdminUser;
}

export interface DashboardStats {
  totalAccounts: number;
  activePaying: number;
  trialsEndingSoon: number;
  foundersRemaining: number;
  mrr: number;
  trialConversionRate: number;
  churnRate: number;
  pendingSubmissions: number;
}

// =====================================================
// PRICING CONSTANTS
// =====================================================

export const CRM_PLANS = {
  blue_starter: {
    name: 'Blue Starter',
    price: 49,
    users: 1,
    features: ['CRM basics', 'Jobs', 'Quotes', 'Invoices'],
  },
  blue_pro: {
    name: 'Blue Pro',
    price: 99,
    users: 5,
    features: ['Everything in Starter', 'AI SMS', 'Calendar sync', 'Automations'],
  },
  blue_enterprise: {
    name: 'Blue Enterprise',
    price: 149,
    users: 15,
    features: ['Everything in Pro', 'Advanced reports', 'API access', 'Priority support'],
  },
};

export const TRIAL_DURATION_DAYS = 30;
export const FOUNDERS_DURATION_MONTHS = 3;
export const FOUNDERS_TOTAL_SLOTS = 100;
export const INVITE_EXPIRY_DAYS = 7;

// =====================================================
// ADMIN USER FUNCTIONS
// =====================================================

export async function getAdminUser(adminId: string): Promise<AdminUser | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', adminId)
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('is_active', true)
    .single();

  if (error) return null;
  return data;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createAdminUser(
  admin: { email: string; name: string; role: AdminRole; password: string }
): Promise<AdminUser> {
  const supabase = await createClient();

  // Hash password (use bcrypt in production)
  const passwordHash = crypto.createHash('sha256').update(admin.password).digest('hex');

  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      email: admin.email.toLowerCase(),
      name: admin.name,
      role: admin.role,
      password_hash: passwordHash,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAdminLastLogin(adminId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', adminId);
}

// =====================================================
// CRM ACCOUNTS FUNCTIONS
// =====================================================

export async function getCRMAccounts(
  filters: {
    status?: PlanStatus;
    planType?: PlanType;
    agentId?: string;
    search?: string;
  } = {},
  page: number = 1,
  limit: number = 25
): Promise<{ accounts: CRMAccount[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('crm_accounts')
    .select('*, agent:admin_users!crm_accounts_created_by_agent_id_fkey(id, name, email)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('plan_status', filters.status);
  }
  if (filters.planType) {
    query = query.eq('plan_type', filters.planType);
  }
  if (filters.agentId) {
    query = query.eq('created_by_agent_id', filters.agentId);
  }
  if (filters.search) {
    query = query.or(`business_name.ilike.%${filters.search}%,owner_email.ilike.%${filters.search}%`);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { accounts: data || [], total: count || 0 };
}

export async function getCRMAccount(accountId: string): Promise<CRMAccount | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('crm_accounts')
    .select('*, agent:admin_users!crm_accounts_created_by_agent_id_fkey(id, name, email)')
    .eq('id', accountId)
    .single();

  if (error) return null;
  return data;
}

export async function createCRMAccount(
  account: {
    businessName: string;
    ownerEmail: string;
    ownerName: string;
    phone?: string;
    planType: PlanType;
    isTrial: boolean;
    isFounders: boolean;
    webInvoiceNumber?: string;
    webPlanType?: string;
    agentId?: string;
    foundersSlotNumber?: number;
  }
): Promise<CRMAccount> {
  const supabase = await createClient();

  const now = new Date();
  let planStatus: PlanStatus = 'active';
  let trialEndDate: string | null = null;
  let foundersEndDate: string | null = null;
  let monthlyPrice = CRM_PLANS[account.planType].price;

  if (account.isTrial) {
    planStatus = 'trial';
    trialEndDate = format(addDays(now, TRIAL_DURATION_DAYS), 'yyyy-MM-dd');
    monthlyPrice = 0;
  } else if (account.isFounders) {
    planStatus = 'founders';
    foundersEndDate = format(addMonths(now, FOUNDERS_DURATION_MONTHS), 'yyyy-MM-dd');
    monthlyPrice = 0;
  }

  const { data, error } = await supabase
    .from('crm_accounts')
    .insert({
      business_name: account.businessName,
      owner_email: account.ownerEmail.toLowerCase(),
      owner_name: account.ownerName,
      phone: account.phone,
      plan_type: account.planType,
      plan_status: planStatus,
      is_trial: account.isTrial,
      trial_start_date: account.isTrial ? format(now, 'yyyy-MM-dd') : null,
      trial_end_date: trialEndDate,
      is_founders: account.isFounders,
      founders_start_date: account.isFounders ? format(now, 'yyyy-MM-dd') : null,
      founders_end_date: foundersEndDate,
      founders_slot_number: account.foundersSlotNumber,
      web_invoice_number: account.webInvoiceNumber,
      web_plan_type: account.webPlanType,
      web_plan_status: 'active',
      monthly_price: monthlyPrice,
      created_by_agent_id: account.agentId,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCRMAccount(
  accountId: string,
  updates: Partial<CRMAccount>
): Promise<CRMAccount> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('crm_accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function extendTrial(accountId: string, days: number): Promise<CRMAccount> {
  const account = await getCRMAccount(accountId);
  if (!account || !account.is_trial || !account.trial_end_date) {
    throw new Error('Account is not on trial');
  }

  const newEndDate = addDays(new Date(account.trial_end_date), days);
  return updateCRMAccount(accountId, {
    trial_end_date: format(newEndDate, 'yyyy-MM-dd'),
  });
}

export async function convertTrialToPaid(accountId: string): Promise<CRMAccount> {
  const account = await getCRMAccount(accountId);
  if (!account || !account.is_trial) {
    throw new Error('Account is not on trial');
  }

  return updateCRMAccount(accountId, {
    plan_status: 'active',
    is_trial: false,
    trial_converted: true,
    monthly_price: CRM_PLANS[account.plan_type].price,
    next_billing_date: format(new Date(), 'yyyy-MM-dd'),
  });
}

export async function cancelAccount(accountId: string): Promise<CRMAccount> {
  return updateCRMAccount(accountId, {
    plan_status: 'cancelled',
    cancelled_at: new Date().toISOString(),
  });
}

export async function suspendAccount(accountId: string): Promise<CRMAccount> {
  return updateCRMAccount(accountId, {
    plan_status: 'suspended',
  });
}

export async function reactivateAccount(accountId: string): Promise<CRMAccount> {
  return updateCRMAccount(accountId, {
    plan_status: 'active',
  });
}

export async function changePlan(accountId: string, newPlan: PlanType): Promise<CRMAccount> {
  return updateCRMAccount(accountId, {
    plan_type: newPlan,
    monthly_price: CRM_PLANS[newPlan].price,
  });
}

// =====================================================
// AGENT SUBMISSIONS FUNCTIONS
// =====================================================

export async function getAgentSubmissions(
  filters: {
    agentId?: string;
    status?: SubmissionStatus;
    type?: SubmissionType;
  } = {},
  page: number = 1,
  limit: number = 25
): Promise<{ submissions: AgentSubmission[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('agent_submissions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.agentId) {
    query = query.eq('agent_id', filters.agentId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.type) {
    query = query.eq('submission_type', filters.type);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { submissions: data || [], total: count || 0 };
}

export async function createAgentSubmission(
  agentId: string,
  agentName: string,
  submission: {
    type: SubmissionType;
    clientCompanyName: string;
    clientEmail: string;
    clientPhone?: string;
    webInvoiceNumber: string;
    webPlanType: string;
    crmPlanSelected: PlanType;
  }
): Promise<AgentSubmission> {
  const supabase = await createClient();

  // Generate invite token
  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteExpires = addDays(new Date(), INVITE_EXPIRY_DAYS);

  const { data, error } = await supabase
    .from('agent_submissions')
    .insert({
      agent_id: agentId,
      agent_name: agentName,
      submission_type: submission.type,
      client_company_name: submission.clientCompanyName,
      client_email: submission.clientEmail.toLowerCase(),
      client_phone: submission.clientPhone,
      web_invoice_number: submission.webInvoiceNumber,
      web_plan_type: submission.webPlanType,
      crm_plan_selected: submission.crmPlanSelected,
      status: 'pending',
      invite_token: inviteToken,
      invite_expires_at: inviteExpires.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSubmissionByToken(token: string): Promise<AgentSubmission | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('agent_submissions')
    .select('*')
    .eq('invite_token', token)
    .single();

  if (error) return null;

  // Check if expired
  if (data.invite_expires_at && new Date(data.invite_expires_at) < new Date()) {
    return null;
  }

  return data;
}

export async function markInviteSent(submissionId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('agent_submissions')
    .update({
      status: 'sent',
      invite_email_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId);
}

export async function markSubmissionRegistered(
  submissionId: string,
  crmAccountId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('agent_submissions')
    .update({
      status: 'registered',
      crm_account_id: crmAccountId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId);
}

export async function rejectSubmission(
  submissionId: string,
  reason: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('agent_submissions')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId);
}

// =====================================================
// FOUNDERS PROGRAM FUNCTIONS
// =====================================================

export async function getFoundersStatus(): Promise<FoundersProgram> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('founders_program')
    .select('*')
    .single();

  if (error) {
    // Initialize if doesn't exist
    const { data: newData, error: insertError } = await supabase
      .from('founders_program')
      .insert({
        total_slots: FOUNDERS_TOTAL_SLOTS,
        slots_used: 0,
        is_open: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return newData;
  }

  return data;
}

export async function claimFoundersSlot(): Promise<number> {
  const supabase = await createClient();

  const status = await getFoundersStatus();

  if (!status.is_open) {
    throw new Error('Founders program is closed');
  }

  if (status.slots_used >= status.total_slots) {
    throw new Error('No founders slots remaining');
  }

  const newSlotNumber = status.slots_used + 1;

  const { error } = await supabase
    .from('founders_program')
    .update({
      slots_used: newSlotNumber,
      is_open: newSlotNumber < status.total_slots,
      closed_at: newSlotNumber >= status.total_slots ? new Date().toISOString() : null,
    })
    .eq('id', status.id);

  if (error) throw error;

  return newSlotNumber;
}

export async function closeFoundersProgram(): Promise<void> {
  const supabase = await createClient();
  const status = await getFoundersStatus();

  await supabase
    .from('founders_program')
    .update({
      is_open: false,
      closed_at: new Date().toISOString(),
    })
    .eq('id', status.id);
}

// =====================================================
// ACTIVITY LOG FUNCTIONS
// =====================================================

export async function logAdminActivity(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, any>,
  ipAddress?: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('admin_activity_log')
    .insert({
      admin_user_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: ipAddress,
    });
}

export async function getActivityLog(
  filters: {
    adminId?: string;
    action?: string;
    targetType?: string;
  } = {},
  page: number = 1,
  limit: number = 50
): Promise<{ activities: AdminActivityLog[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('admin_activity_log')
    .select('*, admin_user:admin_users(id, name, email)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters.adminId) {
    query = query.eq('admin_user_id', filters.adminId);
  }
  if (filters.action) {
    query = query.eq('action', filters.action);
  }
  if (filters.targetType) {
    query = query.eq('target_type', filters.targetType);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { activities: data || [], total: count || 0 };
}

// =====================================================
// EMAIL LOG FUNCTIONS
// =====================================================

export async function logEmail(
  accountId: string | null,
  emailType: string,
  sentTo: string,
  metadata?: Record<string, any>
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('crm_email_log')
    .insert({
      crm_account_id: accountId,
      email_type: emailType,
      sent_to: sentTo,
      metadata,
    });
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  // Get all accounts
  const { data: accounts } = await supabase
    .from('crm_accounts')
    .select('*');

  const allAccounts = accounts || [];

  // Calculate stats
  const totalAccounts = allAccounts.length;
  const activePaying = allAccounts.filter(a => a.plan_status === 'active').length;

  // Trials ending in 7 days
  const sevenDaysFromNow = addDays(new Date(), 7);
  const trialsEndingSoon = allAccounts.filter(a => {
    if (!a.is_trial || !a.trial_end_date) return false;
    const endDate = new Date(a.trial_end_date);
    return endDate <= sevenDaysFromNow && endDate >= new Date();
  }).length;

  // Founders remaining
  const foundersStatus = await getFoundersStatus();
  const foundersRemaining = foundersStatus.total_slots - foundersStatus.slots_used;

  // MRR
  const mrr = allAccounts
    .filter(a => a.plan_status === 'active')
    .reduce((sum, a) => sum + (a.monthly_price || 0), 0);

  // Trial conversion rate
  const convertedTrials = allAccounts.filter(a => a.trial_converted).length;
  const totalTrials = allAccounts.filter(a => a.is_trial || a.trial_converted).length;
  const trialConversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

  // Churn rate (simplified)
  const cancelledAccounts = allAccounts.filter(a => a.plan_status === 'cancelled').length;
  const churnRate = totalAccounts > 0 ? (cancelledAccounts / totalAccounts) * 100 : 0;

  // Pending submissions
  const { count: pendingSubmissions } = await supabase
    .from('agent_submissions')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'sent']);

  return {
    totalAccounts,
    activePaying,
    trialsEndingSoon,
    foundersRemaining,
    mrr,
    trialConversionRate: Math.round(trialConversionRate),
    churnRate: Math.round(churnRate * 10) / 10,
    pendingSubmissions: pendingSubmissions || 0,
  };
}

// =====================================================
// INVOICE VALIDATION (STUB - integrate with web billing)
// =====================================================

export interface InvoiceValidation {
  valid: boolean;
  planType?: string;
  planStatus?: string;
  startDate?: string;
  error?: string;
}

export async function validateWebInvoice(invoiceNumber: string): Promise<InvoiceValidation> {
  // TODO: Integrate with actual web billing system
  // For now, return mock validation

  if (!invoiceNumber || !invoiceNumber.startsWith('WEB-')) {
    return { valid: false, error: 'Invalid invoice number format' };
  }

  // Mock validation - in production, call web billing API
  return {
    valid: true,
    planType: 'pro',
    planStatus: 'active',
    startDate: format(new Date(), 'yyyy-MM-dd'),
  };
}

// =====================================================
// IMPERSONATION
// =====================================================

export async function createImpersonationToken(
  adminId: string,
  accountId: string
): Promise<string> {
  // Log the impersonation
  await logAdminActivity(
    adminId,
    'impersonated',
    'crm_account',
    accountId,
    { action: 'started' }
  );

  // Generate temporary token
  const token = crypto.randomBytes(32).toString('hex');

  // In production, store this token with expiry and account mapping
  // For now, encode the account ID in the token
  const tokenData = Buffer.from(JSON.stringify({
    accountId,
    adminId,
    expires: addDays(new Date(), 1).toISOString(),
  })).toString('base64');

  return `imp_${tokenData}`;
}

export async function validateImpersonationToken(token: string): Promise<{
  valid: boolean;
  accountId?: string;
  adminId?: string;
}> {
  try {
    if (!token.startsWith('imp_')) {
      return { valid: false };
    }

    const tokenData = JSON.parse(Buffer.from(token.slice(4), 'base64').toString());

    if (new Date(tokenData.expires) < new Date()) {
      return { valid: false };
    }

    return {
      valid: true,
      accountId: tokenData.accountId,
      adminId: tokenData.adminId,
    };
  } catch {
    return { valid: false };
  }
}

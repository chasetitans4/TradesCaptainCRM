// =====================================================
// CLIENT REGISTRATION API
// GET /api/register/:token - Validate invite token
// POST /api/register/:token - Complete registration
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getSubmissionByToken,
  createCRMAccount,
  markSubmissionRegistered,
  logEmail,
  CRM_PLANS,
  PlanType,
} from '@/lib/admin';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const submission = await getSubmissionByToken(token);

    if (!submission) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 404 }
      );
    }

    if (submission.status === 'registered') {
      return NextResponse.json(
        { error: 'This invite has already been used' },
        { status: 400 }
      );
    }

    const plan = CRM_PLANS[submission.crm_plan_selected as PlanType];

    return NextResponse.json({
      valid: true,
      submission_type: submission.submission_type,
      company_name: submission.client_company_name,
      email: submission.client_email,
      plan: {
        type: submission.crm_plan_selected,
        name: plan?.name || submission.crm_plan_selected,
        price: plan?.price || 0,
        users: plan?.users || 1,
        features: plan?.features || [],
      },
      is_founders: submission.submission_type === 'founders',
      is_trial: submission.submission_type === 'trial',
    });
  } catch (error) {
    apiLogger.error({ error, context: 'GET /api/register/[token]' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate invite' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const submission = await getSubmissionByToken(token);

    if (!submission) {
      return NextResponse.json(
        { error: 'Invalid or expired invite link' },
        { status: 404 }
      );
    }

    if (submission.status === 'registered') {
      return NextResponse.json(
        { error: 'This invite has already been used' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { full_name, password, plan_type } = body;

    if (!full_name || !password) {
      return NextResponse.json(
        { error: 'Name and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: submission.client_email,
      password,
      options: {
        data: {
          full_name,
          company_name: submission.client_company_name,
        },
      },
    });

    if (authError) {
      apiLogger.error({ error: authError, context: 'auth signup' });
      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 400 }
      );
    }

    // Determine the final plan (user can change during registration for trials)
    const finalPlan = submission.submission_type === 'founders'
      ? 'blue_starter' // Founders always get Starter
      : (plan_type || submission.crm_plan_selected) as PlanType;

    // Create CRM account
    const crmAccount = await createCRMAccount({
      businessName: submission.client_company_name,
      ownerEmail: submission.client_email,
      ownerName: full_name,
      phone: submission.client_phone,
      planType: finalPlan,
      isTrial: submission.submission_type === 'trial',
      isFounders: submission.submission_type === 'founders',
      webInvoiceNumber: submission.web_invoice_number,
      webPlanType: submission.web_plan_type,
      agentId: submission.agent_id,
    });

    // Create business in the CRM database
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: submission.client_company_name,
        owner_id: authData.user?.id,
        plan_type: finalPlan,
        settings: {
          is_trial: submission.submission_type === 'trial',
          is_founders: submission.submission_type === 'founders',
          crm_account_id: crmAccount.id,
        },
      })
      .select()
      .single();

    if (businessError) {
      apiLogger.error({ error: businessError, context: 'business creation' });
    }

    // Create user profile
    if (business) {
      await supabase.from('users').insert({
        auth_user_id: authData.user?.id,
        business_id: business.id,
        email: submission.client_email,
        first_name: full_name.split(' ')[0],
        last_name: full_name.split(' ').slice(1).join(' '),
        role: 'owner',
      });
    }

    // Mark submission as registered
    await markSubmissionRegistered(submission.id, crmAccount.id);

    // Log welcome email
    await logEmail(
      crmAccount.id,
      'welcome',
      submission.client_email,
      { planType: finalPlan, isFounders: submission.submission_type === 'founders' }
    );

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      account: {
        id: crmAccount.id,
        business_name: crmAccount.business_name,
        plan_type: crmAccount.plan_type,
        plan_status: crmAccount.plan_status,
        trial_end_date: crmAccount.trial_end_date,
        founders_end_date: crmAccount.founders_end_date,
      },
    }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, context: 'POST /api/register/[token]' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete registration' },
      { status: 500 }
    );
  }
}

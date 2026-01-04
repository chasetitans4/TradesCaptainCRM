// =====================================================
// CREATE TRIAL SUBMISSION API
// POST /api/admin/submissions/trial - Create trial submission
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import {
  createAgentSubmission,
  validateWebInvoice,
  logAdminActivity,
  PlanType,
} from '@/lib/admin';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      client_company_name,
      client_email,
      client_phone,
      web_invoice_number,
      crm_plan_selected,
    } = body;

    // Validate required fields
    if (!client_company_name || !client_email || !web_invoice_number || !crm_plan_selected) {
      return NextResponse.json(
        { error: 'Company name, email, invoice number, and plan are required' },
        { status: 400 }
      );
    }

    // Validate CRM plan
    if (!['blue_starter', 'blue_pro', 'blue_enterprise'].includes(crm_plan_selected)) {
      return NextResponse.json(
        { error: 'Invalid CRM plan selected' },
        { status: 400 }
      );
    }

    // Validate web invoice
    const invoiceValidation = await validateWebInvoice(web_invoice_number);

    if (!invoiceValidation.valid) {
      return NextResponse.json(
        { error: invoiceValidation.error || 'Invalid invoice number' },
        { status: 400 }
      );
    }

    // Create submission
    const submission = await createAgentSubmission(admin.id, admin.name, {
      type: 'trial',
      clientCompanyName: client_company_name,
      clientEmail: client_email,
      clientPhone: client_phone,
      webInvoiceNumber: web_invoice_number,
      webPlanType: invoiceValidation.planType || 'unknown',
      crmPlanSelected: crm_plan_selected as PlanType,
    });

    // Log activity
    const ip = request.headers.get('x-forwarded-for') || '';
    await logAdminActivity(
      admin.id,
      'created_trial_submission',
      'agent_submission',
      submission.id,
      { company: client_company_name, email: client_email },
      ip
    );

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    apiLogger.error({ msg: 'Error in POST /api/admin/submissions/trial', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create trial submission' },
      { status: 400 }
    );
  }
}

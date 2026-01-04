// =====================================================
// CREATE FOUNDERS SUBMISSION API
// POST /api/admin/submissions/founders - Create founders submission
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import {
  createAgentSubmission,
  validateWebInvoice,
  getFoundersStatus,
  claimFoundersSlot,
  logAdminActivity,
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
    } = body;

    // Validate required fields
    if (!client_company_name || !client_email || !web_invoice_number) {
      return NextResponse.json(
        { error: 'Company name, email, and invoice number are required' },
        { status: 400 }
      );
    }

    // Check founders program status
    const foundersStatus = await getFoundersStatus();

    if (!foundersStatus.is_open) {
      return NextResponse.json(
        { error: 'Founders program is closed' },
        { status: 400 }
      );
    }

    if (foundersStatus.slots_used >= foundersStatus.total_slots) {
      return NextResponse.json(
        { error: 'No founders slots remaining' },
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

    // Claim a founders slot
    const slotNumber = await claimFoundersSlot();

    // Create submission (founders always get Blue Starter)
    const submission = await createAgentSubmission(admin.id, admin.name, {
      type: 'founders',
      clientCompanyName: client_company_name,
      clientEmail: client_email,
      clientPhone: client_phone,
      webInvoiceNumber: web_invoice_number,
      webPlanType: invoiceValidation.planType || 'unknown',
      crmPlanSelected: 'blue_starter', // Founders always get Starter
    });

    // Log activity
    const ip = request.headers.get('x-forwarded-for') || '';
    await logAdminActivity(
      admin.id,
      'created_founders_submission',
      'agent_submission',
      submission.id,
      { company: client_company_name, email: client_email, slotNumber },
      ip
    );

    return NextResponse.json({
      submission,
      founders_slot: slotNumber,
      slots_remaining: foundersStatus.total_slots - slotNumber,
    }, { status: 201 });
  } catch (error) {
    apiLogger.error({ msg: 'Error in POST /api/admin/submissions/founders', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create founders submission' },
      { status: 400 }
    );
  }
}

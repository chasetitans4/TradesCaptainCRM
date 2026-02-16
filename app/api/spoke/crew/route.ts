// =====================================================
// SPOKE CREW API
// /api/spoke/crew
//
// Per Spoke Spec Section 5:
// CRUD operations for contractor phone numbers.
//
// Endpoints:
// - GET: List contractor phones for a business
// - POST: Register new contractor phone
// - PATCH: Update contractor phone
// - DELETE: Deactivate contractor phone
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import {
  registerContractorPhone,
  updateContractorPhone,
  deactivateContractorPhone,
  getContractorPhones,
  verifyContractorPhone,
} from '@/lib/spoke/crew';
import type { ContractorRole } from '@/lib/spoke/types';

const crewLogger = smsLogger.child({ context: 'api.spoke.crew' });

// =====================================================
// GET - List contractor phones
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Fetch phones
    const phones = await getContractorPhones(profile.business_id, {
      includeInactive,
    });

    crewLogger.info({
      msg: 'Listed contractor phones',
      businessId: profile.business_id,
      count: phones.length,
      includeInactive,
    });

    return NextResponse.json({
      phones,
      count: phones.length,
    });

  } catch (error) {
    crewLogger.error({
      msg: 'Error listing contractor phones',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to list phones' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Register new contractor phone
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business and verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can add crew
    if (!['OWNER', 'ADMIN'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { phoneNumber, displayName, role = 'TECH' } = body;

    if (!phoneNumber || !displayName) {
      return NextResponse.json(
        { error: 'Missing phoneNumber or displayName' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: ContractorRole[] = ['OWNER', 'ADMIN', 'TECH'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Register phone
    const result = await registerContractorPhone({
      businessId: profile.business_id,
      phoneNumber,
      displayName,
      role,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    crewLogger.info({
      msg: 'Registered contractor phone',
      phoneId: result.phone?.id,
      displayName,
      businessId: profile.business_id,
      isNew: result.isNew,
    });

    return NextResponse.json({
      phone: result.phone,
      isNew: result.isNew,
    }, { status: result.isNew ? 201 : 200 });

  } catch (error) {
    crewLogger.error({
      msg: 'Error registering contractor phone',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to register phone' },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Update contractor phone
// =====================================================

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business and verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    if (!['OWNER', 'ADMIN'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { phoneId, displayName, role, isVerified } = body;

    if (!phoneId) {
      return NextResponse.json(
        { error: 'Missing phoneId' },
        { status: 400 }
      );
    }

    // Verify phone belongs to this business
    const adminSupabase = createAdminClient();
    const { data: phone } = await adminSupabase
      .from('contractor_phones')
      .select('business_id')
      .eq('id', phoneId)
      .single();

    if (!phone || phone.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Phone not found' }, { status: 404 });
    }

    // Update phone
    const result = await updateContractorPhone(phoneId, {
      displayName,
      role,
      isVerified,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    crewLogger.info({
      msg: 'Updated contractor phone',
      phoneId,
      updates: { displayName, role, isVerified },
    });

    return NextResponse.json({ phone: result.phone });

  } catch (error) {
    crewLogger.error({
      msg: 'Error updating contractor phone',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to update phone' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Deactivate contractor phone
// =====================================================

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business and verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    if (!['OWNER', 'ADMIN'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const phoneId = searchParams.get('phoneId');

    if (!phoneId) {
      return NextResponse.json(
        { error: 'Missing phoneId' },
        { status: 400 }
      );
    }

    // Verify phone belongs to this business
    const adminSupabase = createAdminClient();
    const { data: phone } = await adminSupabase
      .from('contractor_phones')
      .select('business_id')
      .eq('id', phoneId)
      .single();

    if (!phone || phone.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Phone not found' }, { status: 404 });
    }

    // Deactivate phone
    const result = await deactivateContractorPhone(phoneId, 'Admin deactivation');

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    crewLogger.info({
      msg: 'Deactivated contractor phone',
      phoneId,
      businessId: profile.business_id,
    });

    return NextResponse.json({
      success: true,
      phone: result.phone,
    });

  } catch (error) {
    crewLogger.error({
      msg: 'Error deactivating contractor phone',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to deactivate phone' },
      { status: 500 }
    );
  }
}

// =====================================================
// DIGITAL SIGNATURES API
// POST /api/signatures - Capture a signature
// GET /api/signatures?entityType=xxx&entityId=xxx - Get signature
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { captureSignature, getSignature } from '@/lib/signatures';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const signatureId = searchParams.get('id');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (signatureId) {
      const signature = await getSignature(signatureId);
      return NextResponse.json(signature);
    }

    if (entityType && entityId) {
      const supabase = await createServerClient();
      const { data } = await supabase
        .from('signatures')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching signature:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch signature' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entityType, entityId, signatureData, signerName, signerEmail, agreementText, customerId } = body;

    if (!entityType || !entityId || !signatureData || !signerName) {
      return NextResponse.json(
        { error: 'entityType, entityId, signatureData, and signerName are required' },
        { status: 400 }
      );
    }

    const signatureId = await captureSignature({
      businessId: profile.business_id,
      entityType,
      entityId,
      signatureData,
      signerName,
      signerEmail,
      agreementText,
      customerId,
    });

    return NextResponse.json({ id: signatureId, success: true });
  } catch (error: any) {
    console.error('Error capturing signature:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to capture signature' },
      { status: 500 }
    );
  }
}

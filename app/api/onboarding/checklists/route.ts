// =====================================================
// SERVICE ONBOARDING CHECKLISTS API
// GET /api/onboarding/checklists - Get checklist for a plan or client
// POST /api/onboarding/checklists - Initialize checklist for client
// PATCH /api/onboarding/checklists - Update checklist item
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getChecklistForPlan,
  getClientChecklistStatus,
  initializeClientChecklist,
  saveClientChecklistStatus,
  updateChecklistItem,
  updateChecklistSubItem,
} from '@/lib/onboarding/service-checklists';
import { PlanTrack, PlanTier } from '@/lib/pricing/plans';

// GET - Get checklist template or client status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const track = searchParams.get('track') as PlanTrack | null;
    const tier = searchParams.get('tier') as PlanTier | null;
    const hasGbpAddon = searchParams.get('gbp_addon') === 'true';

    // If client_id provided, return their checklist status
    if (clientId) {
      const status = await getClientChecklistStatus(clientId);
      if (!status) {
        return NextResponse.json(
          { error: 'Checklist not found for client' },
          { status: 404 }
        );
      }

      // Get the checklist template to merge with status
      const checklist = getChecklistForPlan(
        status.checklist_type as PlanTrack,
        tier || undefined,
        hasGbpAddon
      );

      return NextResponse.json({
        status,
        checklist,
      });
    }

    // Otherwise return the checklist template for the specified plan
    if (!track) {
      return NextResponse.json(
        { error: 'Either client_id or track is required' },
        { status: 400 }
      );
    }

    const checklist = getChecklistForPlan(track, tier || undefined, hasGbpAddon);
    return NextResponse.json({ checklist });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist' },
      { status: 500 }
    );
  }
}

// POST - Initialize checklist for a client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, track, tier, has_gbp_addon } = body;

    if (!client_id || !track) {
      return NextResponse.json(
        { error: 'client_id and track are required' },
        { status: 400 }
      );
    }

    // Check if client already has a checklist
    const existing = await getClientChecklistStatus(client_id);
    if (existing) {
      return NextResponse.json(
        { error: 'Client already has a checklist. Use PATCH to update.' },
        { status: 409 }
      );
    }

    // Initialize new checklist
    const status = initializeClientChecklist(
      client_id,
      track as PlanTrack,
      tier as PlanTier | undefined,
      has_gbp_addon
    );

    const saved = await saveClientChecklistStatus(status);

    return NextResponse.json({ status: saved }, { status: 201 });
  } catch (error) {
    console.error('Error creating checklist:', error);
    return NextResponse.json(
      { error: 'Failed to create checklist' },
      { status: 500 }
    );
  }
}

// PATCH - Update checklist item
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      client_id,
      item_id,
      sub_item_id,
      completed,
      completed_by,
      notes,
    } = body;

    if (!client_id || !item_id || completed === undefined) {
      return NextResponse.json(
        { error: 'client_id, item_id, and completed are required' },
        { status: 400 }
      );
    }

    let status;

    // Update sub-item if provided
    if (sub_item_id) {
      status = await updateChecklistSubItem(
        client_id,
        item_id,
        sub_item_id,
        completed
      );
    } else {
      // Update main item
      status = await updateChecklistItem(
        client_id,
        item_id,
        completed,
        completed_by,
        notes
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Checklist or item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error updating checklist:', error);
    return NextResponse.json(
      { error: 'Failed to update checklist' },
      { status: 500 }
    );
  }
}

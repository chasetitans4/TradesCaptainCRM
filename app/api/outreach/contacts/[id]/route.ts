import { NextRequest, NextResponse } from 'next/server';
import {
  getContact,
  getContactWithRelations,
  updateContact,
  updateContactStatus,
  assignContactToAgent,
  markContactConverted,
  updateContactScore,
} from '@/lib/outreach/contacts';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/outreach/contacts/[id]
 * Get a specific contact
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeRelations = searchParams.get('include_relations') === 'true';

    const contact = includeRelations
      ? await getContactWithRelations(id)
      : await getContact(id);

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error getting contact:', error);
    return NextResponse.json(
      { error: 'Failed to get contact' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/outreach/contacts/[id]
 * Update a contact
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'update_status': {
        const result = await updateContactStatus(id, data.status);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case 'assign_agent': {
        const result = await assignContactToAgent(
          id,
          data.agent_id,
          data.assigned_by
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case 'convert': {
        const result = await markContactConverted(
          id,
          data.client_id,
          data.plan
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      case 'update_score': {
        const result = await updateContactScore(
          id,
          data.score,
          data.breakdown
        );

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true });
      }

      default: {
        // General update
        const result = await updateContact(id, data);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          contact: result.contact,
        });
      }
    }
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

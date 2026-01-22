// =====================================================
// SINGLE CALL API ROUTES
// GET /api/calls/[id] - Get a single call
// PATCH /api/calls/[id] - Update a call
// DELETE /api/calls/[id] - Delete a call
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/permissions/check-permission';
import { getCallLog, updateCallLog, deleteCallLog } from '@/lib/calls';
import { apiLogger } from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const call = await getCallLog(id);

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    return NextResponse.json(call);
  } catch (error) {
    apiLogger.error({ error, context: 'Error in GET /api/calls/[id]' });
    return NextResponse.json(
      { error: 'Failed to fetch call' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const call = await updateCallLog(id, body);

    return NextResponse.json(call);
  } catch (error) {
    apiLogger.error({ error, context: 'Error in PATCH /api/calls/[id]' });
    return NextResponse.json(
      { error: 'Failed to update call' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's role to check permissions
    // session.user.role should be available
    if (session.user.role !== 'owner' && session.user.role !== 'admin' && session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await deleteCallLog(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'Error in DELETE /api/calls/[id]' });
    return NextResponse.json(
      { error: 'Failed to delete call' },
      { status: 500 }
    );
  }
}

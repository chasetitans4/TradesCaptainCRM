import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from '@/lib/permissions/check-permission';
import {
  getBookingRequest,
  confirmBookingRequest,
  declineBookingRequest,
  convertToJob,
  cancelBookingRequest,
  updateBookingNotes,
} from '@/lib/booking/requests';
import { logApiError } from '@/lib/logger';

// GET /api/booking/requests/[id] - Get single booking request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await getBookingRequest(id);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = session.user.role === 'admin' || session.user.role === 'super_admin';
    const userBusinessId = session.user.businessId;

    if (!isAdmin && userBusinessId !== booking.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ booking });
  } catch (error: any) {
    logApiError('GET', '/api/booking/requests/[id]', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}

// POST /api/booking/requests/[id] - Update booking request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Verify user has access to this booking
    const booking = await getBookingRequest(id);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check permissions
    const isAdmin = session.user.role === 'admin' || session.user.role === 'super_admin';
    const userBusinessId = session.user.businessId;

    if (!isAdmin && userBusinessId !== booking.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let result;

    switch (action) {
      case 'confirm':
        if (!data.confirmedDate || !data.confirmedTime) {
          return NextResponse.json(
            { error: 'Confirmed date and time are required' },
            { status: 400 }
          );
        }
        result = await confirmBookingRequest(
          id,
          session.user.id,
          data.confirmedDate,
          data.confirmedTime
        );
        break;

      case 'decline':
        result = await declineBookingRequest(id, data.reason || 'Unable to accommodate request');
        break;

      case 'convert':
        result = await convertToJob(id, session.user.id, {
          assignedTo: data.assignedTo,
          estimatedDuration: data.estimatedDuration,
          notes: data.notes,
        });
        break;

      case 'cancel':
        result = await cancelBookingRequest(id, data.reason);
        break;

      case 'updateNotes':
        await updateBookingNotes(id, data.notes);
        result = { success: true };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Fetch updated booking
    const updatedBooking = await getBookingRequest(id);

    const response: Record<string, any> = {
      success: true,
      booking: updatedBooking,
    };
    if ('jobId' in result && result.jobId) {
      response.jobId = result.jobId;
    }
    return NextResponse.json(response);
  } catch (error: any) {
    logApiError('POST', '/api/booking/requests/[id]', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

// DELETE /api/booking/requests/[id] - Cancel booking request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const booking = await getBookingRequest(id);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (userData?.business_id !== booking.businessId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await cancelBookingRequest(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logApiError('DELETE', '/api/booking/requests/[id]', error);
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
  }
}

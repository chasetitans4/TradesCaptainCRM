import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots, getSlotsForDate, isSlotAvailable, getAvailabilitySummary } from '@/lib/booking/slots';
import { getBookingSettingsBySlug } from '@/lib/booking/settings';

// GET /api/booking/slots - Get available booking slots (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const businessId = searchParams.get('businessId');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const summary = searchParams.get('summary');

    let targetBusinessId = businessId;

    // Get business ID from slug if provided
    if (slug && !businessId) {
      const result = await getBookingSettingsBySlug(slug);
      if (!result) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      targetBusinessId = result.settings.businessId;
    }

    if (!targetBusinessId) {
      return NextResponse.json(
        { error: 'Business ID or slug is required' },
        { status: 400 }
      );
    }

    // Return availability summary
    if (summary === 'true') {
      const result = await getAvailabilitySummary(targetBusinessId);
      return NextResponse.json(result);
    }

    // Return slots for specific date
    if (date) {
      const slots = await getSlotsForDate(targetBusinessId, new Date(date));
      return NextResponse.json({ slots });
    }

    // Return slots for date range
    const result = await getAvailableSlots(
      targetBusinessId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching booking slots:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/booking/slots - Check if a specific slot is available
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, slug, dateTime, duration } = body;

    let targetBusinessId = businessId;

    if (slug && !businessId) {
      const result = await getBookingSettingsBySlug(slug);
      if (!result) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 });
      }
      targetBusinessId = result.settings.businessId;
    }

    if (!targetBusinessId) {
      return NextResponse.json(
        { error: 'Business ID or slug is required' },
        { status: 400 }
      );
    }

    if (!dateTime) {
      return NextResponse.json(
        { error: 'DateTime is required' },
        { status: 400 }
      );
    }

    const result = await isSlotAvailable(
      targetBusinessId,
      new Date(dateTime),
      duration
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error checking slot availability:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =====================================================
// CALENDAR AVAILABILITY CHECK
// GET /api/calendar/availability?date=2024-01-15&duration=60&time=14:00
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getAvailableSlots,
  isTimeSlotAvailable,
  suggestNextAvailableSlot,
} from '@/lib/calendar';
import { getServerUserProfile } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const date = request.nextUrl.searchParams.get('date');
    const duration = request.nextUrl.searchParams.get('duration') || '60';
    const checkTime = request.nextUrl.searchParams.get('time');
    const userId = request.nextUrl.searchParams.get('user_id') || profile.id;

    if (!date) {
      return NextResponse.json(
        { error: 'Missing date param' },
        { status: 400 }
      );
    }

    const durationMinutes = parseInt(duration, 10);
    const targetDate = new Date(date);

    // If checking a specific time
    if (checkTime) {
      const [hours, minutes] = checkTime.split(':').map(Number);
      targetDate.setHours(hours, minutes, 0, 0);

      const available = await isTimeSlotAvailable(
        userId,
        targetDate,
        durationMinutes
      );

      if (!available) {
        // Suggest next available slot
        const nextSlot = await suggestNextAvailableSlot(
          userId,
          targetDate,
          durationMinutes
        );
        return NextResponse.json({
          available: false,
          suggested: nextSlot
            ? {
                start: nextSlot.start.toISOString(),
                end: nextSlot.end.toISOString(),
              }
            : null,
        });
      }

      return NextResponse.json({ available: true });
    }

    // Return all available slots for the day
    const slots = await getAvailableSlots({
      user_id: userId,
      date: targetDate,
      duration_minutes: durationMinutes,
    });

    return NextResponse.json({
      slots: slots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}

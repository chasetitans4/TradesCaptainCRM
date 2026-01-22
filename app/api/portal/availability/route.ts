// =====================================================
// PORTAL AVAILABILITY API
// GET /api/portal/availability - Get available time slots
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { apiLogger } from '@/lib/logger';

interface TimeSlot {
  time: string;
  label: string;
  available: boolean;
}

interface DayAvailability {
  date: string;
  dayName: string;
  dayNumber: number;
  month: string;
  slots: TimeSlot[];
  isToday: boolean;
  isPast: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Default time slots (business can customize this)
const DEFAULT_TIME_SLOTS = [
  { time: '08:00', label: '8:00 AM' },
  { time: '09:00', label: '9:00 AM' },
  { time: '10:00', label: '10:00 AM' },
  { time: '11:00', label: '11:00 AM' },
  { time: '13:00', label: '1:00 PM' },
  { time: '14:00', label: '2:00 PM' },
  { time: '15:00', label: '3:00 PM' },
  { time: '16:00', label: '4:00 PM' },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get('businessId');
  const startStr = searchParams.get('start');
  const endStr = searchParams.get('end');

  if (!businessId) {
    return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
  }

  // Verify customer authentication
  const cookieStore = await cookies();
  const customerToken = cookieStore.get(`portal_token_${businessId}`)?.value;

  if (!customerToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // Verify the customer token
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('portal_token', customerToken)
      .eq('business_id', businessId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse date range
    const startDate = startStr ? new Date(startStr) : new Date();
    const endDate = endStr ? new Date(endStr) : new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    // Get business settings for scheduling
    const { data: settings } = await supabase
      .from('business_settings')
      .select('scheduling_config, business_hours')
      .eq('business_id', businessId)
      .single();

    const schedulingConfig = settings?.scheduling_config || {};
    const businessHours = settings?.business_hours || {
      monday: { open: '08:00', close: '17:00' },
      tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' },
      thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '17:00' },
      saturday: null,
      sunday: null,
    };

    // Get existing jobs in the date range to determine availability
    const { data: existingJobs } = await supabase
      .from('jobs')
      .select('scheduled_date, scheduled_time, estimated_duration')
      .eq('business_id', businessId)
      .gte('scheduled_date', startDate.toISOString().split('T')[0])
      .lte('scheduled_date', endDate.toISOString().split('T')[0])
      .not('status', 'in', '("completed","cancelled")');

    // Get technician count for capacity calculation
    const { count: technicianCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .in('role', ['admin', 'technician']);

    const capacity = technicianCount || 1;

    // Build availability for each day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const availability: DayAvailability[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      const dayHours = businessHours[dayName];

      const isPast = currentDate < today;
      const isToday =
        currentDate.getDate() === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear();

      // Get jobs for this day
      const dayJobs = (existingJobs || []).filter(
        (job) => job.scheduled_date === dateStr
      );

      // Generate time slots
      const slots: TimeSlot[] = [];

      if (dayHours && !isPast) {
        const timeSlots = schedulingConfig.time_slots || DEFAULT_TIME_SLOTS;

        for (const slot of timeSlots) {
          // Count jobs at this time
          const jobsAtTime = dayJobs.filter(
            (job) => job.scheduled_time === slot.time
          ).length;

          // A slot is available if we have capacity
          const available = jobsAtTime < capacity;

          // For today, also check if the time has passed
          let isAvailable = available;
          if (isToday) {
            const [hours, minutes] = slot.time.split(':').map(Number);
            const slotTime = new Date();
            slotTime.setHours(hours, minutes, 0, 0);
            if (slotTime <= new Date()) {
              isAvailable = false;
            }
          }

          slots.push({
            time: slot.time,
            label: slot.label,
            available: isAvailable,
          });
        }
      }

      availability.push({
        date: dateStr,
        dayName: DAY_NAMES[dayOfWeek],
        dayNumber: currentDate.getDate(),
        month: MONTH_NAMES[currentDate.getMonth()],
        slots,
        isToday,
        isPast,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      availability,
      businessHours: {
        start: businessHours.monday?.open || '08:00',
        end: businessHours.monday?.close || '17:00',
      },
    });
  } catch (error) {
    apiLogger.error({ error, context: 'get portal availability' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get availability' },
      { status: 500 }
    );
  }
}

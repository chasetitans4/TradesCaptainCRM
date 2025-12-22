# Calendar Integration with Nylas - Implementation Guide

## Overview

Add full calendar integration to Trades Captain CRM using **Nylas** as a unified calendar API. This provides two-way sync for all major calendar providers with a single integration.

**All users get the same experience:**
- Jobs sync TO their calendar (instant)
- Personal events sync FROM their calendar into the app
- AI can check real availability across all calendars

---

## Why Nylas

| Feature | Google-Only Approach | Nylas |
|---------|---------------------|-------|
| Google Calendar | ✓ Full sync | ✓ Full sync |
| Apple iCloud | ✗ ICS only (one-way) | ✓ Full sync |
| Outlook/Microsoft 365 | ✗ Not supported | ✓ Full sync |
| Single integration | ✗ Multiple APIs | ✓ One API |
| Maintenance | Higher | Lower |
| Cost | Free | ~$0.75/user/mo |

**Cost impact:** At $399/mo per customer, Nylas is <0.2% of revenue.

---

## Features Summary

| Feature | All Calendar Providers |
|---------|----------------------|
| Jobs appear on their calendar | ✓ Instant via API |
| Personal events visible in app | ✓ |
| AI can check full availability | ✓ |
| AI can schedule/reschedule | ✓ |
| Drive time between jobs | ✓ |
| Blocked breaks/lunch | ✓ |

---

## Nylas Setup

### 1. Create Nylas Account
- Sign up at https://www.nylas.com
- Create an application
- Get your Application ID and Client Secret
- Configure redirect URI: `https://yourdomain.com/api/auth/nylas/callback`

### 2. Nylas Pricing Tier
- Start with **Essentials** plan (~$0.50-1.00/connected account/month)
- Includes: Calendar read/write, authentication
- Scales automatically with usage

---

## Environment Variables

```env
# Nylas
NYLAS_CLIENT_ID=your_nylas_client_id
NYLAS_CLIENT_SECRET=your_nylas_client_secret  
NYLAS_API_KEY=your_nylas_api_key
NYLAS_API_URI=https://api.us.nylas.com

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Database Schema

```sql
-- Calendar connections via Nylas
CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nylas_grant_id TEXT NOT NULL,           -- Nylas grant ID for this connection
  provider TEXT NOT NULL,                  -- 'google', 'icloud', 'microsoft'
  email TEXT NOT NULL,                     -- Connected email address
  calendar_id TEXT,                        -- Primary calendar ID to sync to
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)                          -- One calendar connection per user
);

-- Track which jobs are synced to external calendar
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_calendar_event_id TEXT;

-- Scheduling settings per business
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS drive_time_enabled BOOLEAN DEFAULT true;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS drive_time_default_minutes INTEGER DEFAULT 30;

-- Working hours per business (or per user for technicians)
CREATE TABLE IF NOT EXISTS working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = business default
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_working_day BOOLEAN DEFAULT true,
  start_time TIME DEFAULT '08:00',
  end_time TIME DEFAULT '17:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, user_id, day_of_week)
);

-- Schedule blocks (lunch, breaks, personal time)
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = applies to all
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  specific_date DATE,                      -- For one-time blocks
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (day_of_week IS NOT NULL OR specific_date IS NOT NULL)
);

-- RLS Policies
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar connection" ON calendar_connections
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view business working hours" ON working_hours
  FOR SELECT USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners/admins can manage working hours" ON working_hours
  FOR ALL USING (business_id IN (
    SELECT business_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Users can view business schedule blocks" ON schedule_blocks
  FOR SELECT USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own schedule blocks" ON schedule_blocks
  FOR ALL USING (
    user_id = auth.uid() OR
    (user_id IS NULL AND business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
  );
```

---

## Scheduling Settings

### Drive Time Settings
```typescript
interface DriveTimeSettings {
  enabled: boolean;
  default_minutes: number;        // Default buffer between jobs (e.g., 30)
}
```

### Break/Lunch Blocks
```typescript
interface ScheduleBlock {
  id: string;
  day_of_week: number;           // 0 = Sunday, 1 = Monday, etc.
  start_time: string;            // "12:00"
  end_time: string;              // "13:00"
  label: string;                 // "Lunch", "School pickup", etc.
  is_recurring: boolean;         // Every week or one-time
  specific_date?: string;        // If one-time, which date
}
```

### Working Hours
```typescript
interface WorkingHours {
  day_of_week: number;
  is_working_day: boolean;
  start_time: string;            // "08:00"
  end_time: string;              // "17:00"
}
```

---

## Nylas Integration Library

### `/lib/nylas/client.ts` - Nylas Client Setup
```typescript
import Nylas from 'nylas';

export const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI,
});

export const nylasConfig = {
  clientId: process.env.NYLAS_CLIENT_ID!,
  clientSecret: process.env.NYLAS_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/nylas/callback`,
};
```

### `/lib/nylas/auth.ts` - Authentication
```typescript
import { nylas, nylasConfig } from './client';

// Generate OAuth URL for calendar connection
export function getAuthUrl(userId: string, provider?: string): string {
  const authUrl = nylas.auth.urlForOAuth2({
    clientId: nylasConfig.clientId,
    redirectUri: nylasConfig.redirectUri,
    state: userId, // Pass user ID to callback
    provider: provider, // Optional: 'google', 'icloud', 'microsoft'
  });
  return authUrl;
}

// Exchange code for grant (called in callback)
export async function exchangeCodeForGrant(code: string): Promise<{
  grantId: string;
  email: string;
  provider: string;
}> {
  const response = await nylas.auth.exchangeCodeForToken({
    clientId: nylasConfig.clientId,
    clientSecret: nylasConfig.clientSecret,
    redirectUri: nylasConfig.redirectUri,
    code,
  });
  
  return {
    grantId: response.grantId,
    email: response.email,
    provider: response.provider,
  };
}

// Revoke access (disconnect calendar)
export async function revokeGrant(grantId: string): Promise<void> {
  await nylas.grants.destroy({ grantId });
}
```

### `/lib/nylas/calendar.ts` - Calendar Operations
```typescript
import { nylas } from './client';
import { createClient } from '@/lib/supabase/server';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  busy: boolean;
}

// Get user's Nylas grant ID
async function getGrantId(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('calendar_connections')
    .select('nylas_grant_id')
    .eq('user_id', userId)
    .single();
  
  return data?.nylas_grant_id || null;
}

// List user's calendars
export async function listCalendars(userId: string) {
  const grantId = await getGrantId(userId);
  if (!grantId) return [];
  
  const calendars = await nylas.calendars.list({ identifier: grantId });
  return calendars.data;
}

// Get events for a date range
export async function getCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const grantId = await getGrantId(userId);
  if (!grantId) return [];
  
  const events = await nylas.events.list({
    identifier: grantId,
    queryParams: {
      start: Math.floor(startDate.getTime() / 1000),
      end: Math.floor(endDate.getTime() / 1000),
      expandRecurring: true,
    },
  });
  
  return events.data.map(event => ({
    id: event.id,
    title: event.title || 'Busy',
    description: event.description,
    location: event.location,
    start: new Date((event.when as any).startTime * 1000),
    end: new Date((event.when as any).endTime * 1000),
    busy: event.busy !== false,
  }));
}

// Create event (for syncing jobs)
export async function createCalendarEvent(
  userId: string,
  job: {
    id: string;
    title: string;
    description?: string;
    scheduled_date: string;
    scheduled_time?: string;
    estimated_duration?: number;
    customer: {
      name: string;
      phone?: string;
      address?: string;
    };
  }
): Promise<string | null> {
  const grantId = await getGrantId(userId);
  if (!grantId) return null;
  
  // Get user's primary calendar
  const supabase = createClient();
  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('calendar_id')
    .eq('user_id', userId)
    .single();
  
  if (!connection?.calendar_id) return null;
  
  const startTime = combineDateAndTime(job.scheduled_date, job.scheduled_time || '09:00');
  const endTime = addHours(startTime, job.estimated_duration || 1);
  
  const event = await nylas.events.create({
    identifier: grantId,
    requestBody: {
      calendarId: connection.calendar_id,
      title: `${job.title} - ${job.customer.name}`,
      description: [
        job.description,
        '',
        `Customer: ${job.customer.name}`,
        job.customer.phone ? `Phone: ${job.customer.phone}` : '',
        '',
        `View in Trades Captain: ${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.id}`,
      ].filter(Boolean).join('\n'),
      location: job.customer.address,
      when: {
        startTime: Math.floor(startTime.getTime() / 1000),
        endTime: Math.floor(endTime.getTime() / 1000),
      },
      busy: true,
    },
  });
  
  return event.data.id;
}

// Update event
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  job: {
    id: string;
    title: string;
    description?: string;
    scheduled_date: string;
    scheduled_time?: string;
    estimated_duration?: number;
    customer: {
      name: string;
      phone?: string;
      address?: string;
    };
  }
): Promise<void> {
  const grantId = await getGrantId(userId);
  if (!grantId) return;
  
  const supabase = createClient();
  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('calendar_id')
    .eq('user_id', userId)
    .single();
  
  if (!connection?.calendar_id) return;
  
  const startTime = combineDateAndTime(job.scheduled_date, job.scheduled_time || '09:00');
  const endTime = addHours(startTime, job.estimated_duration || 1);
  
  await nylas.events.update({
    identifier: grantId,
    eventId,
    requestBody: {
      calendarId: connection.calendar_id,
      title: `${job.title} - ${job.customer.name}`,
      description: [
        job.description,
        '',
        `Customer: ${job.customer.name}`,
        job.customer.phone ? `Phone: ${job.customer.phone}` : '',
        '',
        `View in Trades Captain: ${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.id}`,
      ].filter(Boolean).join('\n'),
      location: job.customer.address,
      when: {
        startTime: Math.floor(startTime.getTime() / 1000),
        endTime: Math.floor(endTime.getTime() / 1000),
      },
    },
  });
}

// Delete event
export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<void> {
  const grantId = await getGrantId(userId);
  if (!grantId) return;
  
  await nylas.events.destroy({
    identifier: grantId,
    eventId,
  });
}

// Helper functions
function combineDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
```

### `/lib/nylas/sync.ts` - Job Sync Logic
```typescript
import { 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent 
} from './calendar';
import { createClient } from '@/lib/supabase/server';

export async function syncJobToCalendar(
  job: JobWithCustomer, 
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  const supabase = createClient();
  
  // Get assigned user's calendar connection
  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', job.assigned_user_id)
    .single();
  
  // If no calendar connected, skip silently
  if (!connection || !connection.sync_enabled) {
    return;
  }
  
  switch (action) {
    case 'create':
      const eventId = await createCalendarEvent(job.assigned_user_id, {
        id: job.id,
        title: job.title,
        description: job.description,
        scheduled_date: job.scheduled_date,
        scheduled_time: job.scheduled_time,
        estimated_duration: job.estimated_duration,
        customer: job.customer,
      });
      
      if (eventId) {
        await supabase
          .from('jobs')
          .update({ external_calendar_event_id: eventId })
          .eq('id', job.id);
      }
      break;
      
    case 'update':
      if (job.external_calendar_event_id) {
        await updateCalendarEvent(job.assigned_user_id, job.external_calendar_event_id, {
          id: job.id,
          title: job.title,
          description: job.description,
          scheduled_date: job.scheduled_date,
          scheduled_time: job.scheduled_time,
          estimated_duration: job.estimated_duration,
          customer: job.customer,
        });
      }
      break;
      
    case 'delete':
      if (job.external_calendar_event_id) {
        await deleteCalendarEvent(job.assigned_user_id, job.external_calendar_event_id);
      }
      break;
  }
}

// Call this when job is created
export async function onJobCreated(job: JobWithCustomer) {
  await syncJobToCalendar(job, 'create');
}

// Call this when job is updated
export async function onJobUpdated(job: JobWithCustomer) {
  await syncJobToCalendar(job, 'update');
}

// Call this when job is deleted/cancelled
export async function onJobDeleted(job: JobWithCustomer) {
  await syncJobToCalendar(job, 'delete');
}
```

---

## Availability Checking

### `/lib/calendar/availability.ts`
```typescript
import { getCalendarEvents } from '@/lib/nylas/calendar';
import { createClient } from '@/lib/supabase/server';

interface TimeSlot {
  start: Date;
  end: Date;
}

interface AvailabilityOptions {
  user_id: string;
  date: Date;
  duration_minutes: number;
  include_drive_time?: boolean;
}

export async function getAvailableSlots(options: AvailabilityOptions): Promise<TimeSlot[]> {
  const { user_id, date, duration_minutes, include_drive_time = true } = options;
  const supabase = createClient();
  
  // 1. Get working hours for this day
  const dayOfWeek = date.getDay();
  const { data: workingHours } = await supabase
    .from('working_hours')
    .select('*')
    .eq('user_id', user_id)
    .eq('day_of_week', dayOfWeek)
    .single();
  
  // Fall back to business default if no user-specific hours
  if (!workingHours) {
    const { data: user } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user_id)
      .single();
    
    const { data: businessHours } = await supabase
      .from('working_hours')
      .select('*')
      .eq('business_id', user.business_id)
      .is('user_id', null)
      .eq('day_of_week', dayOfWeek)
      .single();
    
    if (!businessHours?.is_working_day) {
      return []; // Not a working day
    }
  } else if (!workingHours.is_working_day) {
    return []; // Not a working day
  }
  
  const hours = workingHours || { start_time: '08:00', end_time: '17:00' };
  
  // 2. Collect all blocked time slots
  const blockedSlots: TimeSlot[] = [];
  
  // 2a. Get existing jobs from database
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const { data: jobs } = await supabase
    .from('jobs')
    .select('scheduled_time, estimated_duration')
    .eq('assigned_user_id', user_id)
    .eq('scheduled_date', date.toISOString().split('T')[0])
    .in('status', ['scheduled', 'in_progress']);
  
  // Get drive time setting
  const { data: user } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', user_id)
    .single();
  
  const { data: business } = await supabase
    .from('businesses')
    .select('drive_time_enabled, drive_time_default_minutes')
    .eq('id', user.business_id)
    .single();
  
  const driveTimeMinutes = include_drive_time && business?.drive_time_enabled 
    ? (business.drive_time_default_minutes || 30) 
    : 0;
  
  jobs?.forEach(job => {
    if (!job.scheduled_time) return;
    
    const start = combineDateAndTime(date, job.scheduled_time);
    const durationHours = job.estimated_duration || 1;
    const end = addMinutes(start, durationHours * 60);
    
    blockedSlots.push({
      start: addMinutes(start, -driveTimeMinutes),
      end: addMinutes(end, driveTimeMinutes),
    });
  });
  
  // 2b. Get schedule blocks (breaks, lunch)
  const { data: blocks } = await supabase
    .from('schedule_blocks')
    .select('*')
    .or(`user_id.eq.${user_id},user_id.is.null`)
    .or(`day_of_week.eq.${dayOfWeek},specific_date.eq.${date.toISOString().split('T')[0]}`);
  
  blocks?.forEach(block => {
    blockedSlots.push({
      start: combineDateAndTime(date, block.start_time),
      end: combineDateAndTime(date, block.end_time),
    });
  });
  
  // 2c. Get external calendar events (Nylas)
  const externalEvents = await getCalendarEvents(user_id, startOfDay, endOfDay);
  
  externalEvents.forEach(event => {
    if (event.busy) {
      blockedSlots.push({
        start: event.start,
        end: event.end,
      });
    }
  });
  
  // 3. Calculate available slots
  const workStart = combineDateAndTime(date, hours.start_time);
  const workEnd = combineDateAndTime(date, hours.end_time);
  
  return findAvailableSlots(workStart, workEnd, blockedSlots, duration_minutes);
}

export async function isTimeSlotAvailable(
  user_id: string,
  start: Date,
  duration_minutes: number
): Promise<boolean> {
  const slots = await getAvailableSlots({
    user_id,
    date: start,
    duration_minutes,
  });
  
  return slots.some(slot => 
    slot.start <= start && 
    addMinutes(start, duration_minutes) <= slot.end
  );
}

export async function suggestNextAvailableSlot(
  user_id: string,
  after: Date,
  duration_minutes: number,
  maxDaysToCheck: number = 14
): Promise<TimeSlot | null> {
  let currentDate = new Date(after);
  
  for (let i = 0; i < maxDaysToCheck; i++) {
    const slots = await getAvailableSlots({
      user_id,
      date: currentDate,
      duration_minutes,
    });
    
    // Find first slot that's after the requested time
    const validSlot = slots.find(slot => slot.start >= after);
    if (validSlot) {
      return {
        start: validSlot.start,
        end: addMinutes(validSlot.start, duration_minutes),
      };
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }
  
  return null;
}

// Helper functions
function findAvailableSlots(
  workStart: Date,
  workEnd: Date,
  blocked: TimeSlot[],
  durationMinutes: number
): TimeSlot[] {
  // Sort blocked slots by start time
  const sorted = [...blocked].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  const available: TimeSlot[] = [];
  let current = workStart;
  
  for (const block of sorted) {
    // If there's a gap before this block
    if (block.start > current) {
      const gapMinutes = (block.start.getTime() - current.getTime()) / 60000;
      if (gapMinutes >= durationMinutes) {
        available.push({
          start: current,
          end: block.start,
        });
      }
    }
    
    // Move current to end of this block (or stay if we're already past it)
    if (block.end > current) {
      current = block.end;
    }
  }
  
  // Check for time after all blocks
  if (current < workEnd) {
    const gapMinutes = (workEnd.getTime() - current.getTime()) / 60000;
    if (gapMinutes >= durationMinutes) {
      available.push({
        start: current,
        end: workEnd,
      });
    }
  }
  
  return available;
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}
```

---

## API Routes

### `/app/api/auth/nylas/route.ts` - Start OAuth
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/nylas/auth';
import { getCurrentUserProfile } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserProfile();
  if (!user) {
    return NextResponse.redirect('/login');
  }
  
  // Optional: Get preferred provider from query
  const provider = request.nextUrl.searchParams.get('provider'); // google, icloud, microsoft
  
  const authUrl = getAuthUrl(user.id, provider || undefined);
  
  return NextResponse.redirect(authUrl);
}
```

### `/app/api/auth/nylas/callback/route.ts` - OAuth Callback
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForGrant } from '@/lib/nylas/auth';
import { listCalendars } from '@/lib/nylas/calendar';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const userId = request.nextUrl.searchParams.get('state');
  
  if (!code || !userId) {
    return NextResponse.redirect('/settings/calendar?error=missing_params');
  }
  
  try {
    // Exchange code for grant
    const { grantId, email, provider } = await exchangeCodeForGrant(code);
    
    // Get primary calendar
    const calendars = await listCalendars(userId);
    const primaryCalendar = calendars.find(c => c.isPrimary) || calendars[0];
    
    // Save connection to database
    const supabase = createClient();
    await supabase
      .from('calendar_connections')
      .upsert({
        user_id: userId,
        nylas_grant_id: grantId,
        provider,
        email,
        calendar_id: primaryCalendar?.id,
        sync_enabled: true,
      });
    
    return NextResponse.redirect('/settings/calendar?success=connected');
  } catch (error) {
    console.error('Nylas OAuth error:', error);
    return NextResponse.redirect('/settings/calendar?error=oauth_failed');
  }
}
```

### `/app/api/calendar/disconnect/route.ts` - Disconnect Calendar
```typescript
import { NextResponse } from 'next/server';
import { revokeGrant } from '@/lib/nylas/auth';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/lib/supabase/server';

export async function POST() {
  const user = await getCurrentUserProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const supabase = createClient();
  
  // Get connection
  const { data: connection } = await supabase
    .from('calendar_connections')
    .select('nylas_grant_id')
    .eq('user_id', user.id)
    .single();
  
  if (connection?.nylas_grant_id) {
    // Revoke Nylas grant
    await revokeGrant(connection.nylas_grant_id);
  }
  
  // Delete from database
  await supabase
    .from('calendar_connections')
    .delete()
    .eq('user_id', user.id);
  
  return NextResponse.json({ success: true });
}
```

### `/app/api/calendar/events/route.ts` - Get Events
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvents } from '@/lib/nylas/calendar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const start = request.nextUrl.searchParams.get('start');
  const end = request.nextUrl.searchParams.get('end');
  
  if (!start || !end) {
    return NextResponse.json({ error: 'Missing start/end params' }, { status: 400 });
  }
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  // Get jobs from database
  const supabase = createClient();
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, customer:customers(name, phone)')
    .eq('assigned_user_id', user.id)
    .gte('scheduled_date', start.split('T')[0])
    .lte('scheduled_date', end.split('T')[0])
    .in('status', ['scheduled', 'in_progress']);
  
  // Get schedule blocks
  const { data: blocks } = await supabase
    .from('schedule_blocks')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`);
  
  // Get external calendar events
  const externalEvents = await getCalendarEvents(user.id, startDate, endDate);
  
  // Format all events uniformly
  const events = [
    // Jobs
    ...(jobs || []).map(job => ({
      id: job.id,
      type: 'job',
      title: `${job.title} - ${job.customer?.name || 'Customer'}`,
      start: combineDateAndTime(job.scheduled_date, job.scheduled_time || '09:00'),
      end: addHours(
        combineDateAndTime(job.scheduled_date, job.scheduled_time || '09:00'),
        job.estimated_duration || 1
      ),
      color: '#3b82f6', // Blue
      editable: true,
      job_id: job.id,
      customer: job.customer,
    })),
    
    // Schedule blocks (generate recurring instances)
    ...(blocks || []).flatMap(block => {
      if (block.is_recurring) {
        return generateRecurringInstances(block, startDate, endDate);
      }
      return [{
        id: block.id,
        type: 'break',
        title: block.label,
        start: combineDateAndTime(block.specific_date, block.start_time),
        end: combineDateAndTime(block.specific_date, block.end_time),
        color: '#f97316', // Orange
        editable: false,
      }];
    }),
    
    // External calendar events
    ...externalEvents.map(event => ({
      id: event.id,
      type: 'personal',
      title: event.title,
      start: event.start,
      end: event.end,
      color: '#6b7280', // Gray
      editable: false,
      source: 'external',
    })),
  ];
  
  return NextResponse.json(events);
}
```

### `/app/api/calendar/availability/route.ts` - Check Availability
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots, isTimeSlotAvailable, suggestNextAvailableSlot } from '@/lib/calendar/availability';
import { getCurrentUserProfile } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const user = await getCurrentUserProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const date = request.nextUrl.searchParams.get('date');
  const duration = request.nextUrl.searchParams.get('duration') || '60';
  const checkTime = request.nextUrl.searchParams.get('time');
  
  if (!date) {
    return NextResponse.json({ error: 'Missing date param' }, { status: 400 });
  }
  
  const durationMinutes = parseInt(duration, 10);
  const targetDate = new Date(date);
  
  // If checking a specific time
  if (checkTime) {
    const [hours, minutes] = checkTime.split(':').map(Number);
    targetDate.setHours(hours, minutes, 0, 0);
    
    const available = await isTimeSlotAvailable(user.id, targetDate, durationMinutes);
    
    if (!available) {
      // Suggest next available
      const nextSlot = await suggestNextAvailableSlot(user.id, targetDate, durationMinutes);
      return NextResponse.json({ 
        available: false, 
        suggested: nextSlot,
      });
    }
    
    return NextResponse.json({ available: true });
  }
  
  // Return all available slots for the day
  const slots = await getAvailableSlots({
    user_id: user.id,
    date: targetDate,
    duration_minutes: durationMinutes,
  });
  
  return NextResponse.json({ slots });
}
```

---

## AI Scheduling Integration

Add to `/lib/twilio/ai-responder.ts`:

```typescript
// Add scheduling functions for AI to call
const schedulingFunctions = [
  {
    name: 'check_availability',
    description: 'Check if a specific date and time is available for scheduling',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        time: { type: 'string', description: 'Time in HH:MM format (24-hour)' },
        duration_hours: { type: 'number', description: 'Estimated job duration in hours', default: 1 },
      },
      required: ['date', 'time'],
    },
  },
  {
    name: 'get_available_slots',
    description: 'Get all available time slots for a specific date',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        duration_hours: { type: 'number', description: 'Minimum slot duration needed in hours', default: 1 },
      },
      required: ['date'],
    },
  },
  {
    name: 'find_next_available',
    description: 'Find the next available time slot after a given date',
    parameters: {
      type: 'object',
      properties: {
        after_date: { type: 'string', description: 'Find availability after this date (YYYY-MM-DD)' },
        duration_hours: { type: 'number', description: 'Required duration in hours', default: 1 },
      },
      required: ['after_date'],
    },
  },
  {
    name: 'schedule_appointment',
    description: 'Schedule a new job/appointment with a customer',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        time: { type: 'string', description: 'Time in HH:MM format' },
        service_description: { type: 'string', description: 'What service is needed' },
        duration_hours: { type: 'number', description: 'Estimated duration' },
        customer_name: { type: 'string' },
        customer_address: { type: 'string' },
        customer_phone: { type: 'string' },
        notes: { type: 'string', description: 'Additional notes about the job' },
      },
      required: ['date', 'time', 'service_description'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: 'Move an existing appointment to a new date/time',
    parameters: {
      type: 'object',
      properties: {
        job_id: { type: 'string', description: 'ID of the job to reschedule' },
        new_date: { type: 'string', description: 'New date in YYYY-MM-DD format' },
        new_time: { type: 'string', description: 'New time in HH:MM format' },
        notify_customer: { type: 'boolean', description: 'Send confirmation SMS', default: true },
      },
      required: ['job_id', 'new_date', 'new_time'],
    },
  },
];

// System prompt additions for scheduling
const schedulingSystemPrompt = `
## Scheduling Guidelines

When handling appointment requests:
1. ALWAYS check availability before confirming any time
2. Account for drive time between appointments (configurable buffer)
3. Only schedule during working hours
4. If the requested time isn't available, offer 2-3 alternatives
5. Confirm the full details: date, time, address, service needed
6. After scheduling, let them know they'll receive a reminder

Example scheduling flow:
- Customer: "Can I get someone out Tuesday afternoon?"
- You: Check get_available_slots for Tuesday
- You: "I have openings Tuesday at 1:00 PM, 2:30 PM, or 4:00 PM. Which works best?"
- Customer: "2:30 works"
- You: Check check_availability for Tuesday 2:30 PM
- You: Call schedule_appointment
- You: "You're all set for Tuesday at 2:30 PM! We'll send a reminder the day before."
`;
```

---

## UI Pages

### `/app/(dashboard)/calendar/page.tsx` - Full Calendar View
- Day / Week / Month toggle
- Color-coded events:
  - Blue: Jobs (editable)
  - Gray: Personal events from external calendar (read-only)
  - Orange: Breaks/lunch (read-only)
- Tap job to view details
- Tap empty slot to create job
- Pull to refresh

### `/app/(dashboard)/settings/calendar/page.tsx` - Calendar Settings

**Sections:**

1. **Calendar Connection**
   ```
   ┌─────────────────────────────────────────┐
   │ 📅 Connected Calendar                   │
   │                                         │
   │ ✓ Google Calendar                       │
   │   john@gmail.com                        │
   │   Last synced: 2 minutes ago            │
   │                                         │
   │   [Disconnect]                          │
   └─────────────────────────────────────────┘
   
   -- OR if not connected --
   
   ┌─────────────────────────────────────────┐
   │ 📅 Connect Your Calendar                │
   │                                         │
   │ Sync your jobs and see your personal    │
   │ events all in one place.                │
   │                                         │
   │ [Connect Google Calendar]               │
   │ [Connect Apple iCloud]                  │
   │ [Connect Outlook]                       │
   └─────────────────────────────────────────┘
   ```

2. **Working Hours**
   ```
   ┌─────────────────────────────────────────┐
   │ 🕐 Working Hours                        │
   │                                         │
   │ Monday    [✓] 8:00 AM - 5:00 PM        │
   │ Tuesday   [✓] 8:00 AM - 5:00 PM        │
   │ Wednesday [✓] 8:00 AM - 5:00 PM        │
   │ Thursday  [✓] 8:00 AM - 5:00 PM        │
   │ Friday    [✓] 8:00 AM - 5:00 PM        │
   │ Saturday  [ ] Off                       │
   │ Sunday    [ ] Off                       │
   └─────────────────────────────────────────┘
   ```

3. **Breaks & Blocked Time**
   ```
   ┌─────────────────────────────────────────┐
   │ ☕ Breaks & Blocked Time                │
   │                                         │
   │ Lunch                                   │
   │ Mon-Fri, 12:00 PM - 1:00 PM      [Edit]│
   │                                         │
   │ School Pickup                           │
   │ Mon/Wed/Fri, 3:00 PM - 3:30 PM  [Edit] │
   │                                         │
   │ [+ Add Break]                           │
   └─────────────────────────────────────────┘
   ```

4. **Drive Time**
   ```
   ┌─────────────────────────────────────────┐
   │ 🚗 Drive Time Buffer                    │
   │                                         │
   │ Add buffer time between jobs for travel │
   │                                         │
   │ [✓] Enable drive time                   │
   │                                         │
   │ Default buffer: [30] minutes            │
   └─────────────────────────────────────────┘
   ```

---

## Package Dependencies

```json
{
  "dependencies": {
    "nylas": "^7.0.0",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.1.0"
  }
}
```

---

## Implementation Order

1. **Database migrations** - Add all tables/columns
2. **Nylas client setup** - `/lib/nylas/client.ts`
3. **OAuth flow** - Connect/disconnect routes
4. **Working hours & breaks UI** - Settings page
5. **Calendar sync** - Push jobs to external calendar
6. **Calendar read** - Pull personal events
7. **Availability checking** - Core logic
8. **Full calendar UI** - Day/week/month views
9. **AI integration** - Add scheduling functions
10. **Drive time logic** - Buffer calculations

---

## Testing Checklist

- [ ] Connect Google Calendar via Nylas
- [ ] Connect iCloud Calendar via Nylas
- [ ] Connect Outlook via Nylas
- [ ] Disconnect calendar works
- [ ] Jobs appear on external calendar (instant)
- [ ] Job updates sync to external calendar
- [ ] Job deletion removes external event
- [ ] Personal events appear in app calendar
- [ ] Working hours save correctly
- [ ] Breaks/blocks create and display
- [ ] Availability check respects all constraints
- [ ] Availability check includes external calendar events
- [ ] AI can check availability
- [ ] AI can schedule appointments
- [ ] AI can reschedule appointments
- [ ] AI suggests alternatives when unavailable
- [ ] Drive time buffer works correctly

---

## Example AI Scheduling Conversation

```
Customer: "Can I get someone out Thursday around 2pm?"

AI: [calls check_availability("2024-01-18", "14:00", 1)]
    → Returns: { available: false, suggested: { start: "2024-01-18T15:30:00" } }

AI: "Thursday at 2pm isn't available - I have another appointment finishing up then. 
     How about 3:30pm Thursday, or I have morning slots available Friday?"

Customer: "3:30 Thursday works"

AI: [calls check_availability("2024-01-18", "15:30", 1)]
    → Returns: { available: true }

AI: [calls schedule_appointment({
      date: "2024-01-18",
      time: "15:30",
      service_description: "Service call",
      customer_name: "John Smith",
      customer_phone: "+15551234567"
    })]
    → Creates job, syncs to calendar

AI: "Perfect! You're scheduled for Thursday, January 18th at 3:30 PM. 
     I have your address as 123 Main St - is that correct?"

Customer: "Yes that's right"

AI: "Great! You'll get a reminder the day before. If anything changes, just text back 
     or call us at (555) 123-4567. See you Thursday!"
```

---

Good luck! The Nylas approach gives all users the same great experience regardless of which calendar they use.
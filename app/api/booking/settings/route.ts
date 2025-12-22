import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getBookingSettings,
  upsertBookingSettings,
  initializeBookingSettings,
  generateBookingSlug,
  isSlugAvailable,
  getBusinessServices,
} from '@/lib/booking/settings';

// GET /api/booking/settings - Get booking settings for current business
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData } = await supabase
      .from('users')
      .select('business_id, businesses(name)')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    let settings = await getBookingSettings(userData.business_id);

    // Initialize settings if they don't exist
    if (!settings) {
      const businessName = (userData.businesses as any)?.name || 'My Business';
      settings = await initializeBookingSettings(userData.business_id, businessName, user.email || undefined);
    }

    // Get available services
    const services = await getBusinessServices(userData.business_id);

    return NextResponse.json({
      settings,
      availableServices: services,
    });
  } catch (error: any) {
    console.error('Error fetching booking settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/booking/settings - Update booking settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    // Handle different actions
    if (action === 'generateSlug') {
      const slug = await generateBookingSlug(data.businessName);
      return NextResponse.json({ slug });
    }

    if (action === 'checkSlug') {
      const available = await isSlugAvailable(data.slug, userData.business_id);
      return NextResponse.json({ available });
    }

    // Update settings
    const settings = await upsertBookingSettings(userData.business_id, data);

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error updating booking settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

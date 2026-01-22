// =====================================================
// RECURRING JOBS API
// GET /api/recurring-jobs - List recurring job templates
// POST /api/recurring-jobs - Create a new recurring job template
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const isActive = searchParams.get('active') !== 'false';

    let query = supabase
      .from('recurring_job_templates')
      .select(`
        *,
        customer:customers(id, name, phone, address_line1, city),
        assigned_user:users!assigned_to(id, name),
        equipment:customer_equipment(id, brand, model_number, serial_number)
      `)
      .eq('business_id', userData.business_id)
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (isActive) {
      query = query.eq('is_active', true);
    }

    const { data: templates, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ templates });
  } catch (error) {
    apiLogger.error({
      msg: 'Error fetching recurring job templates',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch recurring jobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    // Only owners, admins, and dispatchers can create recurring jobs
    if (!['owner', 'admin', 'dispatcher'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      customerId,
      title,
      description,
      serviceType,
      estimatedDurationMinutes,
      price,
      frequency,
      intervalCount = 1,
      dayOfWeek,
      dayOfMonth,
      monthOfYear,
      preferredTime,
      timeWindowStart,
      timeWindowEnd,
      assignedTo,
      locationId,
      autoGenerate = true,
      generateDaysAhead = 14,
      requireConfirmation = false,
      serviceAgreementId,
      equipmentId,
    } = body;

    // Validate required fields
    if (!customerId || !title || !frequency) {
      return NextResponse.json(
        { error: 'customerId, title, and frequency are required' },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannually', 'annually'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}` },
        { status: 400 }
      );
    }

    // Calculate next generation date
    const nextGenerationDate = new Date();
    nextGenerationDate.setDate(nextGenerationDate.getDate() + 1);

    const { data: template, error } = await supabase
      .from('recurring_job_templates')
      .insert({
        business_id: userData.business_id,
        customer_id: customerId,
        title,
        description,
        service_type: serviceType,
        estimated_duration_minutes: estimatedDurationMinutes,
        price,
        frequency,
        interval_count: intervalCount,
        day_of_week: dayOfWeek,
        day_of_month: dayOfMonth,
        month_of_year: monthOfYear,
        preferred_time: preferredTime,
        time_window_start: timeWindowStart,
        time_window_end: timeWindowEnd,
        assigned_to: assignedTo,
        location_id: locationId,
        auto_generate: autoGenerate,
        generate_days_ahead: generateDaysAhead,
        require_confirmation: requireConfirmation,
        service_agreement_id: serviceAgreementId,
        equipment_id: equipmentId,
        next_generation_date: nextGenerationDate.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    apiLogger.info({
      msg: 'Recurring job template created',
      templateId: template.id,
      customerId,
      frequency,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    apiLogger.error({
      msg: 'Error creating recurring job template',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to create recurring job' }, { status: 500 });
  }
}

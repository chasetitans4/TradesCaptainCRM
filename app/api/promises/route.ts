// =====================================================
// PROMISE KEEPER API
// GET /api/promises - Get user's promises/reminders
// POST /api/promises - Create a new promise
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUserProfile } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const jobId = searchParams.get('jobId');
    const dueToday = searchParams.get('dueToday') === 'true';
    const overdue = searchParams.get('overdue') === 'true';

    const supabase = await createClient();

    let query = supabase
      .from('follow_up_reminders')
      .select(`
        *,
        customer:customers(id, name, phone),
        job:jobs(id, title, status)
      `)
      .eq('organization_id', profile.business_id)
      .or(`created_by.eq.${profile.id},assigned_to.eq.${profile.id}`);

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    } else if (dueToday) {
      query = query.eq('due_date', new Date().toISOString().split('T')[0]);
      query = query.in('status', ['pending', 'due']);
    } else if (overdue) {
      query = query.lt('due_date', new Date().toISOString().split('T')[0]);
      query = query.in('status', ['pending', 'due', 'overdue']);
    }

    // Filter by customer
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    // Filter by job
    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    // Order by due date
    query = query.order('due_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching promises:', error);
      return NextResponse.json(
        { error: 'Failed to fetch promises' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/promises:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      jobId,
      description,
      sourceNote,
      dueDate,
      dueTime,
      assignedTo,
    } = body;

    if (!customerId || !description || !dueDate) {
      return NextResponse.json(
        { error: 'customerId, description, and dueDate are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('follow_up_reminders')
      .insert({
        organization_id: profile.business_id,
        created_by: profile.id,
        assigned_to: assignedTo || profile.id,
        customer_id: customerId,
        job_id: jobId || null,
        description,
        source_note: sourceNote || null,
        due_date: dueDate,
        due_time: dueTime || null,
        status: 'pending',
      })
      .select(`
        *,
        customer:customers(id, name, phone),
        job:jobs(id, title, status)
      `)
      .single();

    if (error) {
      console.error('Error creating promise:', error);
      return NextResponse.json(
        { error: 'Failed to create promise' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in POST /api/promises:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

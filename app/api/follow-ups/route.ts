// =====================================================
// FOLLOW-UPS API
// GET /api/follow-ups - List all follow-ups
// POST /api/follow-ups - Create a new follow-up
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const entityType = searchParams.get('entity_type');
    const priority = searchParams.get('priority');

    let query = supabase
      .from('follow_ups')
      .select(`
        *,
        assignee:users!follow_ups_assigned_to_fkey(full_name)
      `)
      .eq('business_id', profile.business_id)
      .order('scheduled_date', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType);
    }

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    const { data: follow_ups, error } = await query;

    if (error) {
      console.error('Error fetching follow-ups:', error);
      return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 });
    }

    // Enrich with entity data
    const enrichedFollowUps = await enrichFollowUps(supabase, follow_ups || []);

    return NextResponse.json({ follow_ups: enrichedFollowUps });
  } catch (error) {
    console.error('Error in GET /api/follow-ups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    const { data: follow_up, error } = await supabase
      .from('follow_ups')
      .insert({
        business_id: profile.business_id,
        entity_type: body.entity_type,
        entity_id: body.entity_id,
        follow_up_type: body.follow_up_type,
        scheduled_date: body.scheduled_date,
        scheduled_time: body.scheduled_time || null,
        notes: body.notes || null,
        priority: body.priority || 'medium',
        status: 'pending',
        assigned_to: body.assigned_to || profile.id,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating follow-up:', error);
      return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 });
    }

    return NextResponse.json({ follow_up }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/follow-ups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to enrich follow-ups with entity data
async function enrichFollowUps(supabase: any, followUps: any[]) {
  if (followUps.length === 0) return [];

  // Group by entity type
  const byType: Record<string, any[]> = {};
  for (const fu of followUps) {
    if (!byType[fu.entity_type]) byType[fu.entity_type] = [];
    byType[fu.entity_type].push(fu);
  }

  const entityMap: Record<string, any> = {};

  // Fetch entities for each type
  for (const [type, items] of Object.entries(byType)) {
    const ids = items.map((i) => i.entity_id);
    const table = getTableName(type);
    const nameField = getNameField(type);

    const { data: entities } = await supabase
      .from(table)
      .select(`id, ${nameField}, phone, email`)
      .in('id', ids);

    for (const entity of entities || []) {
      entityMap[entity.id] = {
        id: entity.id,
        name: entity[nameField],
        phone: entity.phone,
        email: entity.email,
      };
    }
  }

  return followUps.map((fu) => ({
    ...fu,
    entity: entityMap[fu.entity_id] || null,
  }));
}

function getTableName(entityType: string): string {
  switch (entityType) {
    case 'customer':
      return 'customers';
    case 'job':
      return 'jobs';
    case 'lead':
      return 'leads';
    case 'invoice':
      return 'invoices';
    case 'quote':
      return 'quotes';
    default:
      return 'customers';
  }
}

function getNameField(entityType: string): string {
  switch (entityType) {
    case 'customer':
    case 'lead':
      return 'name';
    case 'job':
      return 'service_type';
    case 'invoice':
      return 'invoice_number';
    case 'quote':
      return 'quote_number';
    default:
      return 'name';
  }
}

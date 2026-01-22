// =====================================================
// FOLLOW-UPS API
// GET /api/follow-ups - List all follow-ups
// POST /api/follow-ups - Create a new follow-up
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

import { getServerSession } from '@/lib/permissions/check-permission';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let businessId = session.user.businessId;

    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      const queryBusinessId = searchParams.get('businessId');
      if (queryBusinessId) businessId = queryBusinessId;
    }

    if (!businessId) {
       // If no business context, return empty list or error
       // For admins without business selection, return empty
       if (session.user.role === 'admin' || session.user.role === 'super_admin') {
          return NextResponse.json({ follow_ups: [] });
       }
       return NextResponse.json({ error: 'User business not found' }, { status: 404 });
    }

    const status = searchParams.get('status');
    const entityType = searchParams.get('entity_type');
    const priority = searchParams.get('priority');

    let query = supabase
      .from('follow_ups')
      .select('*')
      .eq('business_id', businessId)
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
      apiLogger.error({ message: 'Error fetching follow-ups', error });
      return NextResponse.json({ error: 'Failed to fetch follow-ups' }, { status: 500 });
    }

    // Enrich with entity data
    let enrichedFollowUps = await enrichFollowUps(supabase, follow_ups || []);

    // Enrich with assignee data manually to avoid ambiguous join issues
    if (enrichedFollowUps.length > 0) {
      const userIds = [...new Set(enrichedFollowUps.map((fu) => fu.assigned_to).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds);
        
        const userMap = new Map(users?.map((u) => [u.id, u]) || []);
        
        enrichedFollowUps = enrichedFollowUps.map((fu) => ({
          ...fu,
          assignee: fu.assigned_to ? userMap.get(fu.assigned_to) : null,
        }));
      }
    }

    return NextResponse.json({ follow_ups: enrichedFollowUps });
  } catch (error) {
    apiLogger.error({ message: 'Error in GET /api/follow-ups', error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let businessId = session.user.businessId;
    const body = await request.json();

    // If admin, allow overriding businessId from body
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      if (body.businessId) {
        businessId = body.businessId;
      }
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
    }

    const {
      entity_type,
      entity_id,
      description,
      scheduled_date,
      priority,
      assigned_to,
    } = body;

    if (!entity_type || !entity_id || !description || !scheduled_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: follow_up, error } = await supabase
      .from('follow_ups')
      .insert({
        business_id: businessId,
        entity_type,
        entity_id,
        description,
        scheduled_date,
        priority: priority || 'medium',
        assigned_to: assigned_to || session.user.id,
        status: 'pending',
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      apiLogger.error({ message: 'Error creating follow-up', error });
      return NextResponse.json(
        { error: 'Failed to create follow-up' },
        { status: 500 }
      );
    }

    return NextResponse.json(follow_up, { status: 201 });
  } catch (error) {
    apiLogger.error({ message: 'Error in POST /api/follow-ups', error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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

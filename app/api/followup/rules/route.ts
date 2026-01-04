import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFollowUpRules, createFollowUpRule } from '@/lib/followup/engine';
import { apiLogger } from '@/lib/logger';

// GET /api/followup/rules - Get follow-up rules
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const triggerType = searchParams.get('triggerType') as any;
    const isActive = searchParams.get('isActive');

    const rules = await getFollowUpRules(userData.business_id, {
      triggerType: triggerType || undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    return NextResponse.json({ rules });
  } catch (error) {
    apiLogger.error({ message: 'Error fetching follow-up rules', error });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch follow-up rules' }, { status: 500 });
  }
}

// POST /api/followup/rules - Create follow-up rule
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

    // Validate required fields
    if (!body.name || !body.triggerType || !body.actionType) {
      return NextResponse.json(
        { error: 'Name, trigger type, and action type are required' },
        { status: 400 }
      );
    }

    const rule = await createFollowUpRule(userData.business_id, {
      name: body.name,
      description: body.description || null,
      triggerType: body.triggerType,
      delayHours: body.delayHours || 24,
      actionType: body.actionType,
      messageTemplate: body.messageTemplate || null,
      emailSubject: body.emailSubject || null,
      emailTemplate: body.emailTemplate || null,
      taskTitle: body.taskTitle || null,
      taskAssignedTo: body.taskAssignedTo || null,
      conditions: body.conditions || null,
      maxAttempts: body.maxAttempts || 3,
      stopOnResponse: body.stopOnResponse !== false,
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder || 0,
    });

    return NextResponse.json({ rule });
  } catch (error) {
    apiLogger.error({ message: 'Error creating follow-up rule', error });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create follow-up rule' }, { status: 500 });
  }
}

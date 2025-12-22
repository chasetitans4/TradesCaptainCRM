import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateFollowUpRule, deleteFollowUpRule } from '@/lib/followup/engine';

// PUT /api/followup/rules/[id] - Update follow-up rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this rule
    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    const { data: rule } = await supabase
      .from('follow_up_rules')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!rule || rule.business_id !== userData?.business_id) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    const body = await request.json();

    const updated = await updateFollowUpRule(id, {
      name: body.name,
      description: body.description,
      triggerType: body.triggerType,
      delayHours: body.delayHours,
      actionType: body.actionType,
      messageTemplate: body.messageTemplate,
      emailSubject: body.emailSubject,
      emailTemplate: body.emailTemplate,
      taskTitle: body.taskTitle,
      taskAssignedTo: body.taskAssignedTo,
      conditions: body.conditions,
      maxAttempts: body.maxAttempts,
      stopOnResponse: body.stopOnResponse,
      isActive: body.isActive,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({ rule: updated });
  } catch (error: any) {
    console.error('Error updating follow-up rule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/followup/rules/[id] - Delete follow-up rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this rule
    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    const { data: rule } = await supabase
      .from('follow_up_rules')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!rule || rule.business_id !== userData?.business_id) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    await deleteFollowUpRule(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting follow-up rule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

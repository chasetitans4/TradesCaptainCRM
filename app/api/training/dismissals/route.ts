import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/training/dismissals
 * Get user's training dismissals
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all dismissals for user
    const { data: dismissals, error } = await supabase
      .from('training_dismissals')
      .select('*')
      .eq('user_id', user.id)
      .order('dismissed_at', { ascending: false });

    if (error) {
      console.error('[Training Dismissals] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch dismissals' }, { status: 500 });
    }

    return NextResponse.json(dismissals || []);
  } catch (error) {
    console.error('[Training Dismissals] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/training/dismissals
 * Create a new training dismissal
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      dismissal_type,
      module_id,
      tip_id,
      show_again_after,
    } = body;

    if (!dismissal_type) {
      return NextResponse.json({ error: 'dismissal_type is required' }, { status: 400 });
    }

    // Validate dismissal_type
    const validTypes = ['module', 'all_training', 'contextual_tip', 'feature_tour'];
    if (!validTypes.includes(dismissal_type)) {
      return NextResponse.json({ error: 'Invalid dismissal_type' }, { status: 400 });
    }

    // Create dismissal
    const { data, error } = await supabase
      .from('training_dismissals')
      .upsert({
        user_id: user.id,
        dismissal_type,
        module_id: module_id || null,
        tip_id: tip_id || null,
        show_again_after: show_again_after || null,
        dismissed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,dismissal_type,COALESCE(module_id, \'\'),COALESCE(tip_id, \'\')',
      })
      .select()
      .single();

    if (error) {
      console.error('[Training Dismissals] Create error:', error);
      return NextResponse.json({ error: 'Failed to create dismissal' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Training Dismissals] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/training/dismissals
 * Remove a training dismissal (reset)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dismissalType = searchParams.get('type');
    const moduleId = searchParams.get('module_id');

    if (!dismissalType) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    // Build query
    let query = supabase
      .from('training_dismissals')
      .delete()
      .eq('user_id', user.id)
      .eq('dismissal_type', dismissalType);

    if (moduleId) {
      query = query.eq('module_id', moduleId);
    }

    const { error } = await query;

    if (error) {
      console.error('[Training Dismissals] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete dismissal' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Training Dismissals] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

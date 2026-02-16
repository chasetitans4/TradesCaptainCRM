import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/training/progress
 * Get user's training progress
 *
 * GTS v1.3: Preferences (voice_muted) now stored in user_training table
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all progress records for user (includes voice_muted and completed_courses)
    const { data: progress, error } = await supabase
      .from('user_training')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Training Progress] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    // Extract preferences from progress records (voice_muted, completed_courses)
    const firstRecord = progress?.[0];
    const voiceMuted = firstRecord?.voice_muted ?? false;
    const completedCourses = firstRecord?.completed_courses ?? [];

    return NextResponse.json({
      progress: progress || [],
      voiceMuted,
      completedCourses,
    });
  } catch (error) {
    console.error('[Training Progress] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/training/progress
 * Update user's training progress for a specific module
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      module_id,
      current_step_index,
      status,
      total_time_seconds,
    } = body;

    if (!module_id) {
      return NextResponse.json({ error: 'module_id is required' }, { status: 400 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      user_id: user.id,
      business_id: userData.business_id,
      module_id,
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    };

    if (current_step_index !== undefined) {
      updateData.current_step_index = current_step_index;
    }

    if (status) {
      updateData.status = status;
      if (status === 'in_progress' && !body.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (total_time_seconds !== undefined) {
      updateData.total_time_seconds = total_time_seconds;
    }

    // Upsert progress
    const { data, error } = await supabase
      .from('user_training')
      .upsert(updateData, {
        onConflict: 'user_id,module_id',
      })
      .select()
      .single();

    if (error) {
      console.error('[Training Progress] Update error:', error);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Training Progress] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

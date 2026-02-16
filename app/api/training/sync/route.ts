import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/training/sync
 * Sync training progress from localStorage to database
 * Called on page unload/visibility change
 *
 * GTS v1.3: Preferences now stored in user_training table (voice_muted column)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // Silently accept for anonymous users - progress tracked locally
      return NextResponse.json({ ok: true, anonymous: true });
    }

    // Get user's business
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.business_id) {
      return NextResponse.json({ ok: true, no_business: true });
    }

    // Parse request body
    let body: {
      completedModules?: string[];
      completedCourses?: string[];
      lastPosition?: string | null;
      voiceMuted?: boolean;
    };

    try {
      body = await request.json();
    } catch {
      // Handle sendBeacon which sends as text
      const text = await request.text();
      body = JSON.parse(text);
    }

    const {
      completedModules = [],
      completedCourses = [],
      lastPosition,
      voiceMuted = false,
    } = body;

    // Upsert progress for each completed module
    if (completedModules.length > 0) {
      for (const moduleKey of completedModules) {
        const [courseId, moduleId] = moduleKey.split('/');
        if (!courseId || !moduleId) continue;

        const fullModuleId = `${courseId}/${moduleId}`;

        await supabase
          .from('user_training')
          .upsert({
            user_id: user.id,
            business_id: userData.business_id,
            module_id: fullModuleId,
            status: 'completed',
            completed_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
            voice_muted: voiceMuted,
            completed_courses: completedCourses,
          }, {
            onConflict: 'user_id,module_id',
          });
      }
    }

    // Update last position if provided (in-progress training)
    if (lastPosition) {
      const [courseId, moduleId, stepIndex] = lastPosition.split('/');
      if (courseId && moduleId) {
        const fullModuleId = `${courseId}/${moduleId}`;

        await supabase
          .from('user_training')
          .upsert({
            user_id: user.id,
            business_id: userData.business_id,
            module_id: fullModuleId,
            current_step_index: parseInt(stepIndex || '0', 10),
            status: 'in_progress',
            last_synced_at: new Date().toISOString(),
            voice_muted: voiceMuted,
            completed_courses: completedCourses,
          }, {
            onConflict: 'user_id,module_id',
          });
      }
    }

    // If no modules but we have voice preference or completed courses, create a baseline record
    if (completedModules.length === 0 && !lastPosition && (completedCourses.length > 0 || voiceMuted)) {
      await supabase
        .from('user_training')
        .upsert({
          user_id: user.id,
          business_id: userData.business_id,
          module_id: '_preferences',
          status: 'not_started',
          last_synced_at: new Date().toISOString(),
          voice_muted: voiceMuted,
          completed_courses: completedCourses,
        }, {
          onConflict: 'user_id,module_id',
        });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Training Sync] Error:', error);
    // Return success anyway - localStorage is source of truth
    return NextResponse.json({ ok: true, error: 'sync_failed' });
  }
}

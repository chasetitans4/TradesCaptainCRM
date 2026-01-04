// =====================================================
// AI NEXT ACTION DISMISS API
// POST /api/ai/next-action/dismiss - Track dismissed suggestions
// Used to improve future AI suggestions
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { suggestion_type } = body;

    // For now, just log the dismissal
    // In the future, this could be stored to learn user preferences
    console.log(
      `[AI Next Action] User ${profile.id} dismissed suggestion type: ${suggestion_type}`
    );

    // Could store in a dismissals table for ML improvements:
    // await supabase.from('ai_suggestion_dismissals').insert({
    //   user_id: profile.id,
    //   suggestion_type,
    //   dismissed_at: new Date().toISOString(),
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking dismissal:', error);
    return NextResponse.json(
      { error: 'Failed to track dismissal' },
      { status: 500 }
    );
  }
}

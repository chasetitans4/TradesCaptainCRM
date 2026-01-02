// =====================================================
// ADMIN SUPPORT - AI ISSUES API
// GET /api/admin/support/ai-issues - Get AI issues
// POST /api/admin/support/ai-issues - Report new AI issue
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher, requireAdminOrHigher } from '@/lib/admin/auth';
import {
  getAIIssues,
  reportAIIssue,
  resolveAIIssue,
} from '@/lib/admin/nevermiss-support';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const issues = await getAIIssues(status, limit);

    // Group by status for summary
    const summary = {
      open: issues.filter((i) => i.status === 'open').length,
      reviewing: issues.filter((i) => i.status === 'reviewing').length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
      wont_fix: issues.filter((i) => i.status === 'wont_fix').length,
    };

    return NextResponse.json({
      issues,
      summary,
      count: issues.length,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/support/ai-issues:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get AI issues' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversation_id, issue_type, description } = body;

    if (!conversation_id || !issue_type || !description) {
      return NextResponse.json(
        { error: 'conversation_id, issue_type, and description are required' },
        { status: 400 }
      );
    }

    const validIssueTypes = [
      'wrong_response',
      'wrong_business_name',
      'wrong_services',
      'wrong_tone',
      'hallucination',
      'gave_price',
      'loop',
      'emergency_missed',
      'inappropriate',
      'other',
    ];

    if (!validIssueTypes.includes(issue_type)) {
      return NextResponse.json(
        { error: `Invalid issue_type. Must be one of: ${validIssueTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const issue = await reportAIIssue(
      conversation_id,
      issue_type,
      description,
      admin.email || admin.id
    );

    return NextResponse.json({
      success: true,
      issue,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/support/ai-issues:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to report AI issue' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdminOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { issue_id, status, resolution_notes } = body;

    if (!issue_id || !status) {
      return NextResponse.json(
        { error: 'issue_id and status are required' },
        { status: 400 }
      );
    }

    if (!['resolved', 'wont_fix'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be resolved or wont_fix' },
        { status: 400 }
      );
    }

    const success = await resolveAIIssue(issue_id, status, resolution_notes || '');

    return NextResponse.json({
      success,
      issue_id,
      status,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/support/ai-issues:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve AI issue' },
      { status: 500 }
    );
  }
}

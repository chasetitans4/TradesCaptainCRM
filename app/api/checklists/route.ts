// =====================================================
// JOB CHECKLISTS API
// GET /api/checklists?jobId=xxx - Get checklists for a job
// GET /api/checklists/templates - Get checklist templates
// POST /api/checklists - Apply checklist to job
// POST /api/checklists/templates - Create template
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  createChecklistTemplate,
  getChecklistTemplates,
  applyChecklistToJob,
  getJobChecklists,
  getChecklistProgress,
} from '@/lib/checklists';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const templates = searchParams.get('templates') === 'true';
    const jobType = searchParams.get('jobType');

    if (templates) {
      const templateList = await getChecklistTemplates(profile.business_id, jobType || undefined);
      return NextResponse.json(templateList);
    }

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const checklists = await getJobChecklists(jobId);
    const progress = await getChecklistProgress(jobId);

    return NextResponse.json({ checklists, progress });
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching checklists' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch checklists' },
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
    const { action, jobId, templateId, name, items, jobType } = body;

    if (action === 'createTemplate') {
      if (!name || !items || !Array.isArray(items)) {
        return NextResponse.json(
          { error: 'name and items are required for template creation' },
          { status: 400 }
        );
      }

      const template = await createChecklistTemplate(
        profile.business_id,
        name,
        items,
        { jobTypes: jobType ? [jobType] : undefined }
      );

      return NextResponse.json(template);
    }

    // Default action: apply template to job
    if (!jobId || !templateId) {
      return NextResponse.json(
        { error: 'jobId and templateId are required' },
        { status: 400 }
      );
    }

    const checklist = await applyChecklistToJob(jobId, templateId);

    return NextResponse.json(checklist);
  } catch (error) {
    apiLogger.error({ error, context: 'Error with checklist' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process checklist request' },
      { status: 500 }
    );
  }
}

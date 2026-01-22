// =====================================================
// BATCH LEAD UPLOAD API
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, getServerSession } from '@/lib/permissions/check-permission';
import { createLeadsBatch, getActiveAgents } from '@/lib/admin/leads';
import { parseLeadFile, normalizeRawLead } from '@/lib/admin/csv-parser';
import { BatchUploadInput, FormattedLeadData } from '@/lib/admin/types';
import { checkBatchOperationRateLimit } from '@/lib/rate-limit';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LEADS_PER_BATCH = 1000;

/**
 * POST /api/admin/leads/batch
 * Upload leads in batch
 */
export async function POST(request: NextRequest) {
  try {
    await checkPermission('manage_admin_leads');
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit batch operations - 10 per minute per admin
  const rateLimit = await checkBatchOperationRateLimit(session.user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many batch operations. Please wait before uploading more leads.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          'Retry-After': (rateLimit.retryAfter || 60).toString(),
        },
      }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    let leads: FormattedLeadData[];
    let assignmentStrategy: BatchUploadInput['assignment_strategy'] = 'manual';
    let agentId: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const strategyParam = formData.get('assignment_strategy') as string | null;
      const agentIdParam = formData.get('agent_id') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      const fileContent = await file.text();
      const rawLeads = parseLeadFile(fileContent);

      if (rawLeads.length > MAX_LEADS_PER_BATCH) {
        return NextResponse.json(
          { error: `Too many leads. Maximum ${MAX_LEADS_PER_BATCH} per batch` },
          { status: 400 }
        );
      }

      leads = rawLeads.map(normalizeRawLead);
      assignmentStrategy = (strategyParam as BatchUploadInput['assignment_strategy']) || 'manual';
      agentId = agentIdParam || undefined;
    } else {
      // Handle JSON body
      const body = await request.json() as BatchUploadInput;

      if (!body.leads || !Array.isArray(body.leads)) {
        return NextResponse.json({ error: 'Invalid request: leads array required' }, { status: 400 });
      }

      if (body.leads.length > MAX_LEADS_PER_BATCH) {
        return NextResponse.json(
          { error: `Too many leads. Maximum ${MAX_LEADS_PER_BATCH} per batch` },
          { status: 400 }
        );
      }

      leads = body.leads;
      assignmentStrategy = body.assignment_strategy || 'manual';
      agentId = body.agent_id;
    }

    // Validate assignment strategy
    if (assignmentStrategy === 'manual' && !agentId) {
      return NextResponse.json(
        { error: 'Agent ID required for manual assignment strategy' },
        { status: 400 }
      );
    }

    // Execute batch upload
    const result = await createLeadsBatch(leads, {
      assignmentStrategy,
      agentId,
      uploadedBy: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Batch upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload leads' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/leads/batch
 * Get available agents for assignment
 */
export async function GET() {
  try {
    await checkPermission('manage_admin_leads');
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const agents = await getActiveAgents();

    return NextResponse.json({
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.full_name,
        email: agent.email,
        role: agent.role,
      })),
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

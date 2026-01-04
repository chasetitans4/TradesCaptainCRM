// =====================================================
// ADMIN DOCUMENTS API
// GET /api/admin/documents - Get templates
// =====================================================

import { NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getDocumentTemplates } from '@/lib/admin/documents';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await getDocumentTemplates();

    return NextResponse.json({ templates });
  } catch (error) {
    apiLogger.error({
      msg: 'Get templates error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// =====================================================
// ADMIN CLIENT DOCUMENTS API
// GET /api/admin/documents/clients/[clientId] - Get client docs
// POST /api/admin/documents/clients/[clientId] - Upload doc
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getClientDocuments, uploadDocument } from '@/lib/admin/documents';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const documents = await getClientDocuments(clientId);

    return NextResponse.json({ documents });
  } catch (error) {
    apiLogger.error({
      msg: 'Get client documents error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = await params;
    const body = await request.json();

    const { document_type, category, file_name, file_size, storage_path, notes } = body;

    if (!document_type || !file_name || !storage_path) {
      return NextResponse.json(
        { error: 'document_type, file_name, and storage_path are required' },
        { status: 400 }
      );
    }

    // uploadDocument signature: (clientId, agentId, input)
    const document = await uploadDocument(
      clientId,
      admin.id,
      {
        name: file_name,
        document_type,
        category: category || 'other',
        file_path: storage_path,
        file_size_bytes: file_size || 0,
        description: notes,
      }
    );

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Upload document error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  }
}

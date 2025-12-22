// =====================================================
// DOCUMENT BY ID API
// GET /api/documents/[id] - Get document details
// PATCH /api/documents/[id] - Update document metadata
// DELETE /api/documents/[id] - Delete document
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getDocument, updateDocument, deleteDocument, copyDocument } from '@/lib/documents';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Handle copy action
    if (body.action === 'copy') {
      const { targetEntityType, targetEntityId } = body;
      if (!targetEntityType || !targetEntityId) {
        return NextResponse.json(
          { error: 'targetEntityType and targetEntityId are required for copy' },
          { status: 400 }
        );
      }
      const newDoc = await copyDocument(id, targetEntityType, targetEntityId, profile.id);
      return NextResponse.json(newDoc);
    }

    const document = await updateDocument(id, {
      name: body.name,
      description: body.description,
      tags: body.tags,
      documentType: body.documentType,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
    });

    return NextResponse.json(document);
  } catch (error: any) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await deleteDocument(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}

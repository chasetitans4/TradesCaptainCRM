// =====================================================
// DOCUMENT STORAGE API
// GET /api/documents - Get documents
// POST /api/documents - Upload document
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  uploadDocument,
  getDocuments,
  searchDocuments,
  getExpiringDocuments,
  getExpiredDocuments,
  getStorageStats,
} from '@/lib/documents';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as any;
    const entityId = searchParams.get('entityId');
    const documentType = searchParams.get('documentType') as any;
    const search = searchParams.get('search');
    const expiring = searchParams.get('expiring') === 'true';
    const expired = searchParams.get('expired') === 'true';
    const stats = searchParams.get('stats') === 'true';
    const withinDays = parseInt(searchParams.get('withinDays') || '30');

    if (stats) {
      const storageStats = await getStorageStats(profile.business_id);
      return NextResponse.json(storageStats);
    }

    if (expiring) {
      const expiringDocs = await getExpiringDocuments(profile.business_id, withinDays);
      return NextResponse.json(expiringDocs);
    }

    if (expired) {
      const expiredDocs = await getExpiredDocuments(profile.business_id);
      return NextResponse.json(expiredDocs);
    }

    if (search) {
      const results = await searchDocuments(profile.business_id, search, {
        documentType,
        entityType,
      });
      return NextResponse.json(results);
    }

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    const documents = await getDocuments(entityType, entityId, documentType);
    return NextResponse.json(documents);
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch documents' },
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as any;
    const entityId = formData.get('entityId') as string;
    const documentType = formData.get('documentType') as any;
    const name = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;
    const tags = formData.get('tags') as string | null;
    const expirationDate = formData.get('expirationDate') as string | null;

    if (!file || !entityType || !entityId || !documentType) {
      return NextResponse.json(
        { error: 'file, entityType, entityId, and documentType are required' },
        { status: 400 }
      );
    }

    const document = await uploadDocument({
      businessId: profile.business_id,
      entityType,
      entityId,
      file,
      documentType,
      name: name || undefined,
      description: description || undefined,
      tags: tags ? JSON.parse(tags) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      uploadedBy: profile.id,
    });

    return NextResponse.json(document);
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// =====================================================
// DOCUMENT STORAGE API
// GET /api/documents - Get documents
// POST /api/documents - Upload document
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile, createAdminClient } from '@/lib/supabase/server';
import { getPortalSession } from '@/lib/portal/session';
import { apiLogger } from '@/lib/logger';
import {
  uploadDocument,
  getDocuments,
  searchDocuments,
  getExpiringDocuments,
  getExpiredDocuments,
  getStorageStats,
} from '@/lib/documents';
import { SupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    let profile = await getServerUserProfile();
    let businessId: string | undefined;
    let supabaseClient: SupabaseClient | undefined;

    if (profile) {
      businessId = profile.business_id;
    } else {
      // Check for portal session
      const portalSession = await getPortalSession();
      if (portalSession) {
        businessId = portalSession.businessId;
        // Use admin client for portal users to bypass RLS (since they use custom JWT)
        supabaseClient = createAdminClient();
      }
    }

    if (!businessId) {
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
      const storageStats = await getStorageStats(businessId, supabaseClient);
      return NextResponse.json(storageStats);
    }

    if (expiring) {
      const expiringDocs = await getExpiringDocuments(businessId, withinDays, supabaseClient);
      return NextResponse.json(expiringDocs);
    }

    if (expired) {
      const expiredDocs = await getExpiredDocuments(businessId, supabaseClient);
      return NextResponse.json(expiredDocs);
    }

    if (search) {
      const results = await searchDocuments(
        businessId,
        search,
        {
          documentType,
          entityType,
        },
        supabaseClient
      );
      return NextResponse.json(results);
    }

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    const documents = await getDocuments(entityType, entityId, documentType, supabaseClient);
    return NextResponse.json(documents);
  } catch (error) {
    apiLogger.error({ error, route: 'GET /api/documents' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let profile = await getServerUserProfile();
    let businessId: string | undefined;
    let supabaseClient: SupabaseClient | undefined;

    if (profile) {
      businessId = profile.business_id;
    } else {
      // Check for portal session
      const portalSession = await getPortalSession();
      if (portalSession) {
        businessId = portalSession.businessId;
        // Use admin client for portal users
        supabaseClient = createAdminClient();
      }
    }

    if (!businessId) {
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

    const document = await uploadDocument(
      {
        businessId,
        entityType,
        entityId,
        file,
        documentType,
        name: name || undefined,
        description: description || undefined,
        tags: tags ? JSON.parse(tags) : undefined,
        expirationDate: expirationDate ? new Date(expirationDate) : undefined,
        uploadedBy: profile?.id, // Optional now
      },
      supabaseClient
    );

    return NextResponse.json(document);
  } catch (error) {
    apiLogger.error({ error, route: 'POST /api/documents' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  }
}

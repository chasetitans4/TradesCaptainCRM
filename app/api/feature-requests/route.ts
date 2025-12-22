// =====================================================
// FEATURE REQUESTS API
// POST /api/feature-requests - Create new feature request
// GET /api/feature-requests - List feature requests
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  createFeatureRequest,
  getFeatureRequests,
  getFeatureRequestStats,
} from '@/lib/feature-requests';
import type { FeatureRequestStatus, FeatureRequestCategory, FeatureRequestSource } from '@/lib/admin/types';

// POST - Create a new feature request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      use_case,
      category,
      // Submitter info
      source,
      submitter_id,
      submitter_name,
      submitter_email,
      business_name,
      crm_account_id,
    } = body;

    // Validate required fields
    if (!title || !description || !category) {
      return NextResponse.json(
        { error: 'Title, description, and category are required' },
        { status: 400 }
      );
    }

    if (!submitter_id || !submitter_name || !submitter_email || !source) {
      return NextResponse.json(
        { error: 'Submitter information is required' },
        { status: 400 }
      );
    }

    const featureRequest = await createFeatureRequest(
      { title, description, use_case, category },
      {
        source,
        submitter_id,
        submitter_name,
        submitter_email,
        business_name,
        crm_account_id,
      }
    );

    return NextResponse.json({ feature_request: featureRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating feature request:', error);
    return NextResponse.json(
      { error: 'Failed to create feature request' },
      { status: 500 }
    );
  }
}

// GET - List feature requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as FeatureRequestStatus | null;
    const category = searchParams.get('category') as FeatureRequestCategory | null;
    const source = searchParams.get('source') as FeatureRequestSource | null;
    const submitter_id = searchParams.get('submitter_id');
    const search = searchParams.get('search');
    const includeStats = searchParams.get('include_stats') === 'true';

    const filters: {
      status?: FeatureRequestStatus;
      category?: FeatureRequestCategory;
      source?: FeatureRequestSource;
      submitter_id?: string;
      search?: string;
    } = {};

    if (status) filters.status = status;
    if (category) filters.category = category;
    if (source) filters.source = source;
    if (submitter_id) filters.submitter_id = submitter_id;
    if (search) filters.search = search;

    const featureRequests = await getFeatureRequests(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    const response: { feature_requests: typeof featureRequests; stats?: Awaited<ReturnType<typeof getFeatureRequestStats>> } = {
      feature_requests: featureRequests,
    };

    if (includeStats) {
      response.stats = await getFeatureRequestStats();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature requests' },
      { status: 500 }
    );
  }
}

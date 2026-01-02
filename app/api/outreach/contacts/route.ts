import { NextRequest, NextResponse } from 'next/server';
import { getContacts, createContact } from '@/lib/outreach/contacts';
import type { OutreachContactFilters } from '@/types/outreach';

/**
 * GET /api/outreach/contacts
 * Get contacts with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters: OutreachContactFilters = {};

    const status = searchParams.get('status');
    if (status) {
      filters.status = status.split(',') as OutreachContactFilters['status'];
    }

    const source = searchParams.get('source');
    if (source) {
      filters.source = source.split(',') as OutreachContactFilters['source'];
    }

    const interestLevel = searchParams.get('interest_level');
    if (interestLevel) {
      filters.interest_level = interestLevel.split(',') as OutreachContactFilters['interest_level'];
    }

    const agentId = searchParams.get('agent_id');
    if (agentId) {
      filters.assigned_agent_id = agentId;
    }

    const campaignId = searchParams.get('campaign_id');
    if (campaignId) {
      filters.campaign_id = campaignId;
    }

    const overflow = searchParams.get('overflow');
    if (overflow !== null) {
      filters.overflow_to_admin = overflow === 'true';
    }

    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    if (startDate && endDate) {
      filters.date_range = { start: startDate, end: endDate };
    }

    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '25');

    const result = await getContacts(filters, page, pageSize);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting contacts:', error);
    return NextResponse.json(
      { error: 'Failed to get contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outreach/contacts
 * Create a new contact
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      phone,
      name,
      company_name,
      email,
      trade,
      city,
      state,
      source,
      source_campaign,
      source_details,
      referrer_client_id,
      campaign_id,
      consent,
    } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const result = await createContact(
      {
        phone,
        name,
        company_name,
        email,
        trade,
        city,
        state,
        source: source || 'MANUAL',
        source_campaign,
        source_details,
        referrer_client_id,
        campaign_id,
      },
      consent
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, contact: result.contact },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      contact: result.contact,
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}

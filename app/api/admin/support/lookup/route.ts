// =====================================================
// ADMIN SUPPORT - CUSTOMER LOOKUP API
// GET /api/admin/support/lookup - Search for customers
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/permissions/check-permission';
import {
  lookupCustomerByPhone,
  lookupCustomerByEmail,
  lookupCustomerByName,
} from '@/lib/admin/leads-captain-support';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    await checkPermission('view_admin_support');

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'auto';

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    let results;

    // Auto-detect search type
    if (type === 'auto') {
      // Check if it looks like a phone number
      const isPhone = /^\+?[\d\s\-().]+$/.test(query) && query.replace(/\D/g, '').length >= 7;
      // Check if it looks like an email
      const isEmail = query.includes('@');

      if (isPhone) {
        results = await lookupCustomerByPhone(query);
      } else if (isEmail) {
        results = await lookupCustomerByEmail(query);
      } else {
        results = await lookupCustomerByName(query);
      }
    } else if (type === 'phone') {
      results = await lookupCustomerByPhone(query);
    } else if (type === 'email') {
      results = await lookupCustomerByEmail(query);
    } else if (type === 'name') {
      results = await lookupCustomerByName(query);
    } else {
      return NextResponse.json(
        { error: 'Invalid search type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      results,
      count: results.length,
      query,
      type,
    });
  } catch (error) {
    apiLogger.error({ msg: 'Error in GET /api/admin/support/lookup', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search customers' },
      { status: 500 }
    );
  }
}

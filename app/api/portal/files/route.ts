import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { getCustomerDocuments, getDocumentsByCategory, getDocumentCategories } from '@/lib/portal/documents';
import { apiLogger } from '@/lib/logger';

// GET /api/portal/files - Get customer's shared files/documents
export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const groupBy = searchParams.get('groupBy');

    if (groupBy === 'category') {
      const documentsByCategory = await getDocumentsByCategory(
        session.customerId,
        session.businessId
      );
      const categories = await getDocumentCategories(
        session.customerId,
        session.businessId
      );
      return NextResponse.json({ documentsByCategory, categories });
    }

    const documents = await getCustomerDocuments(
      session.customerId,
      session.businessId,
      category || undefined
    );

    return NextResponse.json({ documents });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal files GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { getDocumentDetails, getDocumentDownloadUrl } from '@/lib/portal/documents';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// GET /api/portal/files/[fileId] - Get file details or download URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'download') {
      const downloadInfo = await getDocumentDownloadUrl(
        fileId,
        session.customerId,
        session.businessId
      );

      if (!downloadInfo) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      // Log the download
      await logPortalActivity({
        customerId: session.customerId,
        businessId: session.businessId,
        action: 'file_downloaded',
        details: { fileId },
        request,
      });

      return NextResponse.json(downloadInfo);
    }

    const document = await getDocumentDetails(
      fileId,
      session.customerId,
      session.businessId
    );

    if (!document) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal file details GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}

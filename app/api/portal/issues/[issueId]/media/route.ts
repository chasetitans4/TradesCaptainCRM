import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { addIssueMedia, deleteIssueMedia, getIssueMediaUploadUrl, validateMediaFile } from '@/lib/portal/issues';
import { apiLogger } from '@/lib/logger';
import { logPortalActivity } from '@/lib/portal/audit';

// GET /api/portal/issues/[issueId]/media - Get upload URL for media
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueId } = await params;
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    const contentType = searchParams.get('contentType');

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      );
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'File type not allowed. Supported: JPEG, PNG, GIF, WebP, MP4, MOV, WebM' },
        { status: 400 }
      );
    }

    const uploadInfo = await getIssueMediaUploadUrl(
      issueId,
      session.customerId,
      session.businessId,
      fileName,
      contentType
    );

    if (!uploadInfo) {
      return NextResponse.json(
        { error: 'Cannot upload media to this issue' },
        { status: 400 }
      );
    }

    return NextResponse.json(uploadInfo);
  } catch (error) {
    apiLogger.error({
      msg: 'Portal issue media upload URL GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get upload URL' }, { status: 500 });
  }
}

// POST /api/portal/issues/[issueId]/media - Confirm media upload
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueId } = await params;
    const body = await request.json();
    const { fileUrl, fileName, fileType, fileSize, thumbnailUrl } = body;

    if (!fileUrl || !fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileUrl, fileName, and fileType are required' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    const result = await addIssueMedia(
      issueId,
      session.customerId,
      session.businessId,
      {
        fileUrl,
        fileName,
        fileType,
        fileSize: fileSize || 0,
        thumbnailUrl,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'issue_media_uploaded',
      details: { issueId, fileType },
      request,
    });

    return NextResponse.json({
      success: true,
      mediaId: result.mediaId,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal issue media POST error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to add media' }, { status: 500 });
  }
}

// DELETE /api/portal/issues/[issueId]/media - Delete media from issue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { issueId } = await params;
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'mediaId is required' },
        { status: 400 }
      );
    }

    const result = await deleteIssueMedia(
      issueId,
      mediaId,
      session.customerId,
      session.businessId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Log the activity
    await logPortalActivity({
      customerId: session.customerId,
      businessId: session.businessId,
      action: 'issue_media_deleted',
      details: { issueId, mediaId },
      request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal issue media DELETE error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { analyzePhotoForInvoice, type PhotoType } from '@/lib/technician/photo-to-invoice';
import { logger } from '@/lib/logger';

const analyzeLogger = logger.child({ context: 'technician.analyze-receipt' });

/**
 * POST /api/technician/analyze-receipt
 * Analyze a photo (receipt/parts/damage) and extract invoice line items
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUserProfile();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const jobId = formData.get('jobId') as string;
    const photoType = (formData.get('photoType') as PhotoType) || 'receipt';

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an image.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // If jobId provided, verify access
    if (jobId) {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('id, assigned_user_id, business_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      // Verify technician is assigned (or is owner/admin)
      if (job.assigned_user_id !== user.id && user.role === 'technician') {
        return NextResponse.json(
          { error: 'You are not assigned to this job' },
          { status: 403 }
        );
      }
    }

    // Convert file to base64 for analysis
    const arrayBuffer = await photo.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = photo.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Get business type from user's business
    let businessType = 'general';
    if (user.business_id) {
      const { data: business } = await supabase
        .from('businesses')
        .select('trade_type')
        .eq('id', user.business_id)
        .single();

      if (business?.trade_type) {
        businessType = business.trade_type;
      }
    }

    // Analyze the photo
    const startTime = Date.now();
    const result = await analyzePhotoForInvoice(dataUrl, photoType, businessType);
    const latencyMs = Date.now() - startTime;

    analyzeLogger.info({
      msg: 'Photo analyzed',
      userId: user.id,
      jobId,
      photoType,
      success: result.success,
      itemCount: result.items.length,
      confidence: result.confidence,
      latencyMs,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to analyze photo',
        },
        { status: 422 }
      );
    }

    // Optionally store the photo for audit trail
    let photoUrl: string | undefined;
    if (jobId && user.business_id) {
      try {
        const buffer = Buffer.from(arrayBuffer);
        const timestamp = Date.now();
        const fileName = `receipt-photos/${user.business_id}/${jobId}/${user.id}-${timestamp}.${getExtension(mimeType)}`;

        const { error: uploadError } = await supabase.storage
          .from('job-media')
          .upload(fileName, buffer, {
            contentType: mimeType,
            cacheControl: '3600',
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('job-media')
            .getPublicUrl(fileName);
          photoUrl = urlData.publicUrl;
        }
      } catch (uploadErr) {
        // Non-fatal: log and continue without storing
        analyzeLogger.warn({
          msg: 'Failed to store receipt photo',
          error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
        });
      }
    }

    return NextResponse.json({
      success: true,
      items: result.items,
      vendor: result.vendor,
      receiptTotal: result.receiptTotal,
      taxAmount: result.taxAmount,
      photoType: result.photoType,
      confidence: result.confidence,
      photoUrl,
    });
  } catch (error) {
    analyzeLogger.error({
      msg: 'Error analyzing receipt',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return extensions[mimeType] || 'jpg';
}

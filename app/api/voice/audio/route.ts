/**
 * VOICE AUDIO UPLOAD API
 * POST /api/voice/audio - Upload greeting audio files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

const audioLogger = apiLogger.child({ context: 'api.voice.audio' });

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    // Only owners and admins can upload audio
    if (!['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string; // 'greeting' or 'after_hours'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!['greeting', 'after_hours'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type. Must be greeting or after_hours' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 10MB' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Must be audio file' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'mp3';
    const filename = `${userData.business_id}/${type}_${Date.now()}.${ext}`;

    // Upload to Supabase storage using admin client for storage operations
    const adminClient = createAdminClient();
    const { error: uploadError } = await adminClient.storage
      .from('voice-greetings')
      .upload(filename, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      audioLogger.error({
        msg: 'Failed to upload audio file',
        error: uploadError.message,
        businessId: userData.business_id,
      });
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = adminClient.storage
      .from('voice-greetings')
      .getPublicUrl(filename);

    audioLogger.info({
      msg: 'Audio file uploaded',
      businessId: userData.business_id,
      type,
      filename,
    });

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    audioLogger.error({
      msg: 'Error uploading audio',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Failed to upload audio' },
      { status: 500 }
    );
  }
}

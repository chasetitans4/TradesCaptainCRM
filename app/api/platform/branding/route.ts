import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Public endpoint to get platform branding (logo, colors, name)
 * No authentication required - this is public branding info
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value')
      .in('key', ['platform_branding', 'platform_name']);

    if (error) {
      console.error('Error fetching platform branding:', error);
      // Return empty branding on error - don't expose internal errors
      return NextResponse.json({ branding: null });
    }

    // Convert array to object
    const settings = data.reduce((acc: Record<string, any>, curr: { key: string; value: any }) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({
      branding: settings.platform_branding || null,
      platformName: settings.platform_name || 'Trades Captain'
    });
  } catch (error) {
    console.error('Error fetching platform branding:', error);
    return NextResponse.json({ branding: null });
  }
}

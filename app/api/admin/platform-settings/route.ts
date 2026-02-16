import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/admin/auth';
import { z } from 'zod';

const updateSchema = z.object({
  key: z.string(),
  value: z.any(),
});

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*');

    if (error) {
      throw error;
    }

    // Convert array to object for easier consumption
    const settings = data.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error fetching platform settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || !['super_admin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { key, value } = updateSchema.parse(body);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .update({ 
        value,
        updated_at: new Date().toISOString(),
        updated_by: session.adminId
      })
      .eq('key', key)
      .select()
      .single();

    if (error) {
      // If not found, try inserting (though the migration seeds it)
      if (error.code === 'PGRST116') {
         const { data: insertData, error: insertError } = await supabase
          .from('platform_settings')
          .insert({
            key,
            value,
            updated_by: session.adminId
          })
          .select()
          .single();
          
         if (insertError) throw insertError;
         return NextResponse.json({ setting: insertData });
      }
      throw error;
    }

    return NextResponse.json({ setting: data });
  } catch (error: any) {
    console.error('Error updating platform settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

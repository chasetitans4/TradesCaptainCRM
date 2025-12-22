import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  getPromotions,
  getPromotion,
  validatePromoCode,
  applyPromotion,
  getPromotionStats,
  getActivePromotions,
  getPromotionReport,
} from '@/lib/promotions';

// GET /api/promotions - Get promotions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const promotionId = searchParams.get('id');
    const code = searchParams.get('code');
    const active = searchParams.get('active');
    const report = searchParams.get('report');
    const stats = searchParams.get('stats');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    // Validate a code
    if (code) {
      const customerId = searchParams.get('customerId');
      const orderValue = searchParams.get('orderValue');
      const serviceType = searchParams.get('serviceType');

      const validation = await validatePromoCode(userData.business_id, code, {
        customerId: customerId || undefined,
        orderValue: orderValue ? parseFloat(orderValue) : undefined,
        serviceType: serviceType || undefined,
      });

      return NextResponse.json(validation);
    }

    // Get single promotion
    if (promotionId) {
      if (stats === 'true') {
        const promotionStats = await getPromotionStats(promotionId);
        return NextResponse.json({ stats: promotionStats });
      }

      const promotion = await getPromotion(promotionId);
      return NextResponse.json({ promotion });
    }

    // Get active promotions only
    if (active === 'true') {
      const promotions = await getActivePromotions(userData.business_id);
      return NextResponse.json({ promotions });
    }

    // Get report
    if (report === 'true') {
      const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = searchParams.get('endDate') || new Date().toISOString();
      const reportData = await getPromotionReport(userData.business_id, startDate, endDate);
      return NextResponse.json({ report: reportData });
    }

    // Get all promotions
    const promotions = await getPromotions(userData.business_id, includeInactive);
    return NextResponse.json({ promotions });
  } catch (error: any) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/promotions - Promotion actions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!userData?.business_id) {
      return NextResponse.json({ error: 'No business found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, promotionId, ...data } = body;

    let result;

    switch (action) {
      case 'create':
        if (!data.code || !data.name || !data.discountType || data.discountValue === undefined) {
          return NextResponse.json(
            { error: 'Code, name, discount type, and discount value are required' },
            { status: 400 }
          );
        }
        result = await createPromotion(userData.business_id, data);
        break;

      case 'update':
        if (!promotionId) {
          return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
        }
        result = await updatePromotion(promotionId, data);
        break;

      case 'delete':
        if (!promotionId) {
          return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
        }
        result = await deletePromotion(promotionId);
        break;

      case 'apply':
        if (!promotionId || !data.customerId || data.discountAmount === undefined) {
          return NextResponse.json(
            { error: 'Promotion ID, customer ID, and discount amount are required' },
            { status: 400 }
          );
        }
        result = await applyPromotion(promotionId, data.customerId, data.discountAmount, {
          invoiceId: data.invoiceId,
          jobId: data.jobId,
        });
        break;

      default:
        // Default to create if no action specified
        if (!body.code || !body.name || !body.discountType || body.discountValue === undefined) {
          return NextResponse.json(
            { error: 'Code, name, discount type, and discount value are required' },
            { status: 400 }
          );
        }
        result = await createPromotion(userData.business_id, body);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error with promotion action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =====================================================
// FOLLOW-UP REMINDERS CRON JOB
// POST /api/cron/follow-ups - Generate automated follow-up reminders
// GET /api/cron/follow-ups - Check cron status
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateAllFollowUps } from '@/lib/automation/follow-up-triggers';
import { logger } from '@/lib/logger';

const cronLogger = logger.child({ context: 'cron.follow-ups' });

// Verify the request is from our cron service (Vercel, etc.)
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If no secret is configured, allow in development
  if (!cronSecret && process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check authorization header
  if (authHeader && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

// GET - Check cron status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'follow-up-reminders',
    status: 'active',
    description: 'Generates automated follow-up reminders for quotes, leads, and invoices',
    schedule: 'Daily at 8:00 AM UTC',
  });
}

// POST - Run the cron job
export async function POST(request: NextRequest) {
  // Verify auth
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  cronLogger.info({ msg: 'Starting follow-up reminders cron job' });

  const supabase = createAdminClient();

  try {
    // Get all active businesses
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('is_active', true);

    if (businessesError) {
      throw businessesError;
    }

    if (!businesses || businesses.length === 0) {
      cronLogger.info({ msg: 'No active businesses found' });
      return NextResponse.json({ message: 'No active businesses', processed: 0 });
    }

    // Process each business
    const results = [];
    for (const business of businesses) {
      try {
        // Get business-specific settings if they exist
        const { data: settings } = await supabase
          .from('business_settings')
          .select('follow_up_config')
          .eq('business_id', business.id)
          .single();

        const config = settings?.follow_up_config || {};

        // Skip if follow-ups are disabled for this business
        if (config.enabled === false) {
          cronLogger.info({
            msg: 'Follow-ups disabled for business',
            businessId: business.id,
            businessName: business.name,
          });
          continue;
        }

        const result = await generateAllFollowUps(business.id, config);

        results.push({
          businessId: business.id,
          businessName: business.name,
          ...result,
        });

        cronLogger.info({
          msg: 'Generated follow-ups for business',
          businessId: business.id,
          businessName: business.name,
          ...result,
        });
      } catch (businessError) {
        cronLogger.error({
          msg: 'Error processing business',
          businessId: business.id,
          error: businessError instanceof Error ? { message: businessError.message } : { message: String(businessError) },
        });
        results.push({
          businessId: business.id,
          businessName: business.name,
          error: businessError instanceof Error ? businessError.message : 'Unknown error',
        });
      }
    }

    const totalCreated = results.reduce((sum, r) => sum + ((r as any).total || 0), 0);

    cronLogger.info({
      msg: 'Follow-up reminders cron job completed',
      businessesProcessed: businesses.length,
      totalRemindersCreated: totalCreated,
    });

    return NextResponse.json({
      success: true,
      processed: businesses.length,
      totalRemindersCreated: totalCreated,
      results,
    });
  } catch (error) {
    cronLogger.error({
      msg: 'Follow-up reminders cron job failed',
      error: error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron job failed' },
      { status: 500 }
    );
  }
}

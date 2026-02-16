// =====================================================
// JOB BRIEFING API
// GET /api/jobs/[id]/briefing - Get job briefing data
//
// Per CIL Spec Section 2.1:
// Optimized query for Job Briefing Card
// Returns customer, alerts, history, equipment, agreement
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import type {
  JobBriefingData,
  JobBriefingAlert,
  JobHistoryItem,
  EquipmentItem,
} from '@/components/jobs/job-briefing-card';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const supabase = await createClient();

    // Fetch job with customer data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        type,
        status,
        scheduled_start,
        scheduled_end,
        description,
        customer_id,
        customers (
          id,
          name,
          phone,
          email,
          address,
          city,
          state,
          zip,
          latitude,
          longitude,
          access_notes,
          internal_notes,
          tags,
          tier
        )
      `)
      .eq('id', jobId)
      .eq('organization_id', profile.business_id)
      .single();

    if (jobError) {
      if (jobError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      console.error('Error fetching job:', jobError);
      return NextResponse.json(
        { error: 'Failed to fetch job' },
        { status: 500 }
      );
    }

    const customer = job.customers as any;
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found for job' },
        { status: 404 }
      );
    }

    // Fetch service history (last 3 completed jobs for this customer)
    const { data: historyData } = await supabase
      .from('jobs')
      .select('id, completed_at, type, title')
      .eq('customer_id', customer.id)
      .eq('status', 'completed')
      .neq('id', jobId)
      .order('completed_at', { ascending: false })
      .limit(3);

    const history: JobHistoryItem[] = (historyData || []).map((h: any) => ({
      id: h.id,
      date: h.completed_at,
      type: h.type || h.title,
      summary: h.title,
    }));

    // Fetch outstanding balance
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('total, paid_amount')
      .eq('customer_id', customer.id)
      .in('status', ['sent', 'overdue', 'partial']);

    const outstandingBalance = (invoicesData || []).reduce(
      (sum: number, inv: any) => sum + ((inv.total || 0) - (inv.paid_amount || 0)),
      0
    );

    // Fetch equipment for this customer
    const { data: equipmentData } = await supabase
      .from('equipment')
      .select('id, name, type, install_date')
      .eq('customer_id', customer.id)
      .eq('status', 'active');

    const equipment: EquipmentItem[] = (equipmentData || []).map((e: any) => {
      const installDate = e.install_date ? new Date(e.install_date) : null;
      const age = installDate
        ? Math.floor(
            (Date.now() - installDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          )
        : undefined;

      return {
        id: e.id,
        name: e.name,
        type: e.type,
        age,
      };
    });

    // Fetch active maintenance agreement
    const { data: agreementData } = await supabase
      .from('service_agreements')
      .select('id, name, status, next_service_date, end_date')
      .eq('customer_id', customer.id)
      .in('status', ['active', 'expiring'])
      .order('end_date', { ascending: true })
      .limit(1)
      .single();

    // Generate alerts
    const alerts: JobBriefingAlert[] = [];

    // Access code
    if (customer.access_notes) {
      const codeMatch = customer.access_notes.match(/\b(\d{4,6})\b/);
      if (codeMatch) {
        alerts.push({
          type: 'access_code',
          icon: '🔑',
          label: 'Access code',
          value: `Code: ${codeMatch[1]}`,
        });
      }
    }

    // Pet warning
    const tags = customer.tags || [];
    if (tags.includes('has_dog') || tags.includes('has_pet')) {
      alerts.push({
        type: 'pet',
        icon: '🐕',
        label: 'Has dog',
      });
    }

    // Outstanding payment
    if (outstandingBalance > 0) {
      alerts.push({
        type: 'payment',
        icon: '⚠️',
        label: 'Outstanding balance',
        value: `Outstanding: $${Math.round(outstandingBalance)}`,
      });
    }

    // Office note
    if (customer.internal_notes) {
      const preview = customer.internal_notes.substring(0, 50);
      alerts.push({
        type: 'office_note',
        icon: '📝',
        label: 'Office note',
        value: preview + (customer.internal_notes.length > 50 ? '...' : ''),
      });
    }

    // VIP
    if (customer.tier === 'vip') {
      alerts.push({
        type: 'vip',
        icon: '⭐',
        label: 'VIP Customer',
      });
    }

    // First visit
    if (history.length === 0) {
      alerts.push({
        type: 'first_visit',
        icon: '🆕',
        label: 'First visit',
      });
    }

    // Build response
    const briefingData: JobBriefingData = {
      job: {
        id: job.id,
        title: job.title,
        type: job.type,
        status: job.status,
        scheduledStart: job.scheduled_start,
        scheduledEnd: job.scheduled_end,
        description: job.description,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zip: customer.zip,
        latitude: customer.latitude,
        longitude: customer.longitude,
        accessNotes: customer.access_notes,
        internalNotes: customer.internal_notes,
        tags: customer.tags,
        tier: customer.tier,
      },
      alerts,
      history,
      equipment,
      agreement: agreementData
        ? {
            id: agreementData.id,
            name: agreementData.name,
            status: agreementData.status as 'active' | 'expiring' | 'expired',
            nextServiceDate: agreementData.next_service_date,
            expiresAt: agreementData.end_date,
          }
        : undefined,
      outstandingBalance: outstandingBalance > 0 ? outstandingBalance : undefined,
    };

    return NextResponse.json(briefingData);
  } catch (error) {
    console.error('Error in GET /api/jobs/[id]/briefing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

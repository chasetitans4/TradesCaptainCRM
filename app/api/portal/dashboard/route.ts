import { NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/session';
import {
  getCustomerDashboardSummary,
  getCustomerAppointments,
  getCustomerInvoices,
  getCustomerQuotes
} from '@/lib/portal/data';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getMaintenanceReminders, getExpiringWarranties, getCustomerEquipment } from '@/lib/portal/equipment';
import { getPendingEstimates } from '@/lib/portal/estimates';
import { getPrimaryMembership, checkMembershipRenewal } from '@/lib/portal/membership';
import { getReferralProgram, getCustomerReferralStats } from '@/lib/portal/referrals';
import { getCustomerIssueReports } from '@/lib/portal/issues';

// GET /api/portal/dashboard - Get customer dashboard data
export async function GET() {
  try {
    const session = await requirePortalSession();
    const supabase = createAdminClient();

    const [summary, appointments, invoices, quotes] = await Promise.all([
      getCustomerDashboardSummary(session.customerId),
      getCustomerAppointments(session.customerId),
      getCustomerInvoices(session.customerId),
      getCustomerQuotes(session.customerId)
    ]);

    // Get customer profile for property card
    const { data: customerProfile } = await supabase
      .from('customers')
      .select('name, email, phone, address:address_line1, city, state, zip')
      .eq('id', session.customerId)
      .single();

    // Get service history (completed and recent jobs)
    const { data: serviceHistory } = await supabase
      .from('jobs')
      .select(`
        id,
        title:service_type,
        description,
        status,
        scheduled_date,
        completed_at,
        assigned_user:users(name)
      `)
      .eq('customer_id', session.customerId)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('scheduled_date', { ascending: false })
      .limit(10);

    // Check for active/in-progress jobs
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select(`
        id,
        title:service_type,
        status,
        assigned_user:users(name),
        metadata
      `)
      .eq('customer_id', session.customerId)
      .in('status', ['in_progress', 'en_route', 'on_site'])
      .limit(1);

    const activeJob = activeJobs?.[0];
    const activeStatus = activeJob ? {
      hasActiveJob: true,
      currentJob: {
        id: activeJob.id,
        title: activeJob.title,
        status: activeJob.status,
        technician: (activeJob.assigned_user as any)?.name,
        eta: (activeJob.metadata as any)?.eta,
      },
      technicianEnRoute: activeJob.status === 'en_route' || (activeJob.metadata as any)?.technician_status === 'en_route',
    } : {
      hasActiveJob: false,
    };

    const nextAppointment = appointments.length > 0 ? appointments[0] : null;

    // Format service history for timeline
    const formattedServiceHistory = serviceHistory?.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
      scheduled_date: job.scheduled_date,
      completed_at: job.completed_at,
      technician: (job.assigned_user as any)?.name,
    })) || [];

    // Fetch trades-specific data in parallel
    const [
      equipment,
      reminders,
      expiringWarranties,
      pendingEstimates,
      membership,
      referralProgram,
      referralStats,
      openIssues,
    ] = await Promise.all([
      getCustomerEquipment(session.customerId, session.businessId),
      getMaintenanceReminders(session.customerId, session.businessId),
      getExpiringWarranties(session.customerId, session.businessId, 90),
      getPendingEstimates(session.customerId, session.businessId),
      getPrimaryMembership(session.customerId, session.businessId),
      getReferralProgram(session.businessId),
      getCustomerReferralStats(session.customerId, session.businessId),
      getCustomerIssueReports(session.customerId, session.businessId, 'submitted', 5),
    ]);

    // Check membership renewal (needs membership id from above)
    const renewalInfo = membership
      ? await checkMembershipRenewal(membership.id, session.customerId, session.businessId)
      : null;

    // Build trades features summary
    const tradesFeatures = {
      equipment: {
        total: equipment.length,
        needingService: reminders.length,
        expiringWarranties: expiringWarranties.length,
      },
      estimates: {
        pending: pendingEstimates.length,
      },
      membership: membership ? {
        active: true,
        tier: membership.membership_tier,
        expiresAt: membership.end_date,
        needsRenewal: renewalInfo?.needsRenewal || false,
      } : null,
      referrals: referralProgram ? {
        available: true,
        totalReferrals: referralStats.totalReferrals,
        pendingRewards: referralStats.pendingEarnings,
      } : null,
      issues: {
        open: openIssues.length,
      },
    };

    // Build action items (things requiring customer attention)
    const actionItems = [];

    if (pendingEstimates.length > 0) {
      actionItems.push({
        type: 'estimate',
        priority: 'high',
        message: `You have ${pendingEstimates.length} estimate${pendingEstimates.length > 1 ? 's' : ''} awaiting your review`,
        link: '/portal/estimates',
      });
    }

    if (renewalInfo?.needsRenewal) {
      actionItems.push({
        type: 'membership',
        priority: 'medium',
        message: 'Your membership is expiring soon',
        link: '/portal/membership',
      });
    }

    if (reminders.length > 0) {
      const urgentReminders = reminders.filter(r => {
        const dueDate = new Date(r.due_date);
        const daysDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysDue <= 7;
      });
      if (urgentReminders.length > 0) {
        actionItems.push({
          type: 'maintenance',
          priority: 'medium',
          message: `${urgentReminders.length} equipment item${urgentReminders.length > 1 ? 's' : ''} due for service soon`,
          link: '/portal/equipment',
        });
      }
    }

    return NextResponse.json({
      customer: {
        name: session.customerName,
        email: session.email,
      },
      business: {
        name: session.businessName,
      },
      summary,
      nextAppointment,
      recentInvoices: invoices,
      pendingQuotes: quotes,
      customerProfile,
      serviceHistory: formattedServiceHistory,
      activeStatus,
      // Trades business features
      tradesFeatures,
      actionItems,
      upcomingReminders: reminders,
      expiringWarranties,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Portal authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    apiLogger.error({ error, context: 'Portal dashboard error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

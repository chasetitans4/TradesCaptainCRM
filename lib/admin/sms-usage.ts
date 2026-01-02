// =====================================================
// SMS USAGE MONITOR LIBRARY
// Track SMS soft caps and usage for agents
// Version: 5.8
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import type { ClientSmsUsageSummary } from './types';

// SMS pricing tiers (per message)
const SMS_TIERS = {
  included: 500, // Messages included in base plan
  tier1_limit: 1000,
  tier1_price: 0.03, // $0.03/message for 501-1000
  tier2_limit: 2000,
  tier2_price: 0.025, // $0.025/message for 1001-2000
  tier3_price: 0.02, // $0.02/message for 2000+
};

// =====================================================
// GET SMS USAGE FOR PORTFOLIO
// =====================================================

export async function getSmsUsageForAgent(agentId: string): Promise<{
  clients: ClientSmsUsageSummary[];
  summary: {
    total_clients: number;
    over_cap: number;
    near_cap: number;
    under_cap: number;
    total_messages: number;
    total_overage_revenue: number;
  };
}> {
  const supabase = createAdminClient();

  const { data: clients } = await supabase
    .from('crm_accounts')
    .select('*')
    .eq('agent_id', agentId)
    .eq('status', 'active');

  const allClients = clients || [];
  const clientUsage: ClientSmsUsageSummary[] = [];
  let totalMessages = 0;
  let totalOverage = 0;
  let overCap = 0;
  let nearCap = 0;
  let underCap = 0;

  for (const client of allClients) {
    // Get SMS usage for current billing period
    const billingStart = new Date();
    billingStart.setDate(1);
    billingStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('sms_messages')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', client.business_id)
      .gte('sent_at', billingStart.toISOString());

    const messagesUsed = count || 0;
    const softCap = client.sms_soft_cap || 500;
    const usagePercent = Math.round((messagesUsed / softCap) * 100);
    const overCurrent = messagesUsed > softCap ? messagesUsed - softCap : 0;

    // Calculate overage cost
    const overageCost = calculateOverageCost(messagesUsed, softCap);
    totalMessages += messagesUsed;
    totalOverage += overageCost;

    // Categorize
    if (usagePercent >= 100) {
      overCap++;
    } else if (usagePercent >= 80) {
      nearCap++;
    } else {
      underCap++;
    }

    clientUsage.push({
      client_id: client.id,
      client_name: client.business_name,
      plan_type: client.plan_type,
      soft_cap: softCap,
      messages_used: messagesUsed,
      usage_percent: usagePercent,
      overage_count: overCurrent,
      overage_cost: overageCost,
      last_alert_sent: null,
      recommended_upgrade: getRecommendedUpgrade(usagePercent, client.plan_type),
    });
  }

  // Sort by usage percent descending
  clientUsage.sort((a, b) => b.usage_percent - a.usage_percent);

  return {
    clients: clientUsage,
    summary: {
      total_clients: allClients.length,
      over_cap: overCap,
      near_cap: nearCap,
      under_cap: underCap,
      total_messages: totalMessages,
      total_overage_revenue: totalOverage,
    },
  };
}

// =====================================================
// CALCULATE OVERAGE COST
// =====================================================

function calculateOverageCost(messagesUsed: number, softCap: number): number {
  if (messagesUsed <= softCap) return 0;

  const overage = messagesUsed - softCap;
  let cost = 0;

  if (overage <= 500) {
    // Tier 1: $0.03/message
    cost = overage * SMS_TIERS.tier1_price;
  } else if (overage <= 1500) {
    // First 500 at tier 1, rest at tier 2
    cost = 500 * SMS_TIERS.tier1_price + (overage - 500) * SMS_TIERS.tier2_price;
  } else {
    // First 500 tier 1, next 1000 tier 2, rest tier 3
    cost =
      500 * SMS_TIERS.tier1_price +
      1000 * SMS_TIERS.tier2_price +
      (overage - 1500) * SMS_TIERS.tier3_price;
  }

  return Math.round(cost * 100) / 100;
}

// =====================================================
// GET RECOMMENDED UPGRADE
// =====================================================

function getRecommendedUpgrade(
  usagePercent: number,
  currentPlan: string
): string | null {
  if (usagePercent < 80) return null;

  const upgrades: Record<string, string> = {
    starter: 'nevermiss',
    nevermiss: 'gold',
    gold: 'custom',
  };

  return upgrades[currentPlan] || null;
}

// =====================================================
// GET SMS USAGE ALERTS
// =====================================================

export async function getSmsUsageAlerts(agentId: string): Promise<
  {
    client_id: string;
    client_name: string;
    alert_type: 'near_cap' | 'over_cap' | 'excessive';
    usage_percent: number;
    message: string;
    action: string;
  }[]
> {
  const { clients } = await getSmsUsageForAgent(agentId);
  const alerts: {
    client_id: string;
    client_name: string;
    alert_type: 'near_cap' | 'over_cap' | 'excessive';
    usage_percent: number;
    message: string;
    action: string;
  }[] = [];

  for (const client of clients) {
    if (client.usage_percent >= 150) {
      alerts.push({
        client_id: client.client_id,
        client_name: client.client_name,
        alert_type: 'excessive',
        usage_percent: client.usage_percent,
        message: `${client.client_name} is at ${client.usage_percent}% of SMS cap!`,
        action: 'Contact client immediately about plan upgrade',
      });
    } else if (client.usage_percent >= 100) {
      alerts.push({
        client_id: client.client_id,
        client_name: client.client_name,
        alert_type: 'over_cap',
        usage_percent: client.usage_percent,
        message: `${client.client_name} has exceeded SMS soft cap`,
        action: 'Discuss upgrade options with client',
      });
    } else if (client.usage_percent >= 80) {
      alerts.push({
        client_id: client.client_id,
        client_name: client.client_name,
        alert_type: 'near_cap',
        usage_percent: client.usage_percent,
        message: `${client.client_name} is approaching SMS cap (${client.usage_percent}%)`,
        action: 'Proactively reach out about usage',
      });
    }
  }

  return alerts;
}

// =====================================================
// UPDATE CLIENT SMS CAP
// =====================================================

export async function updateClientSmsCap(
  clientId: string,
  newCap: number
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('crm_accounts')
    .update({ sms_soft_cap: newCap })
    .eq('id', clientId);
}

// =====================================================
// GET CLIENT SMS HISTORY
// =====================================================

export async function getClientSmsHistory(
  clientId: string,
  months: number = 6
): Promise<
  {
    month: string;
    messages_sent: number;
    soft_cap: number;
    overage: number;
  }[]
> {
  const supabase = createAdminClient();

  // Get client's business_id
  const { data: client } = await supabase
    .from('crm_accounts')
    .select('business_id, sms_soft_cap')
    .eq('id', clientId)
    .single();

  if (!client) return [];

  const history: {
    month: string;
    messages_sent: number;
    soft_cap: number;
    overage: number;
  }[] = [];

  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const { count } = await supabase
      .from('sms_messages')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', client.business_id)
      .gte('sent_at', monthStart.toISOString())
      .lte('sent_at', monthEnd.toISOString());

    const messagesSent = count || 0;
    const softCap = client.sms_soft_cap || 500;

    history.push({
      month: monthStart.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      }),
      messages_sent: messagesSent,
      soft_cap: softCap,
      overage: Math.max(0, messagesSent - softCap),
    });
  }

  return history;
}

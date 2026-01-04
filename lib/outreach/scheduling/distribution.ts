// =====================================================
// OUTREACH SCHEDULING - DISTRIBUTION SETTINGS & AGENT SELECTION
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type {
  CallDistributionSettings,
  OutreachContact,
} from '@/types/outreach';
import { isSlotAvailable } from '../availability';
import {
  DEFAULT_BUFFER_MINUTES,
  DEFAULT_CALL_DURATION,
  DEFAULT_MAX_BUSINESS_DAYS,
  DEFAULT_MIN_NOTICE_HOURS,
} from './constants';

// =====================================================
// GET DISTRIBUTION SETTINGS
// =====================================================

export async function getDistributionSettings(): Promise<CallDistributionSettings> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('call_distribution_settings')
    .select('*')
    .limit(1)
    .single();

  if (!data) {
    // Return defaults
    return {
      id: '',
      distribution_method: 'round_robin',
      buffer_minutes: DEFAULT_BUFFER_MINUTES,
      call_duration_minutes: DEFAULT_CALL_DURATION,
      max_advance_business_days: DEFAULT_MAX_BUSINESS_DAYS,
      min_notice_hours: DEFAULT_MIN_NOTICE_HOURS,
      skip_at_capacity: true,
      prioritize_hot_leads: true,
      blackout_saturday: true,
      blackout_sunday: true,
      overflow_to_admin: true,
      overflow_distribution_mode: 'manual',
      overflow_auto_assign_time: null,
      overflow_auto_assign_on_availability: true,
      overflow_notification: 'immediate',
      overflow_ai_message: null,
      weekend_request_ai_message: null,
      created_at: '',
      updated_at: '',
    };
  }

  return data;
}

// =====================================================
// AGENT SELECTION
// =====================================================

export interface AgentSelectionResult {
  agent_id: string | null;
  reason: string;
}

export async function selectAgentForCall(
  scheduledAt: Date,
  settings: CallDistributionSettings,
  _contact: OutreachContact
): Promise<AgentSelectionResult> {
  const supabase = await createClient();

  // Get all active agents with distribution weights
  const { data: agents } = await supabase
    .from('admin_users')
    .select(`
      id,
      name,
      timezone,
      agent_distribution_weights (
        weight_percent,
        max_daily_calls,
        current_daily_calls,
        last_assigned_at,
        is_active
      )
    `)
    .eq('role', 'agent')
    .eq('is_active', true);

  if (!agents || agents.length === 0) {
    return { agent_id: null, reason: 'no_active_agents' };
  }

  // Filter to agents who are available at this time
  const availableAgents: Array<{
    id: string;
    name: string;
    weight: number;
    dailyCalls: number;
    maxCalls: number;
    lastAssigned: Date | null;
  }> = [];

  for (const agent of agents) {
    // Check if agent is available
    const isAvailable = await isSlotAvailable(
      agent.id,
      scheduledAt,
      settings.call_duration_minutes,
      settings.buffer_minutes
    );

    if (!isAvailable) continue;

    const weights = (agent.agent_distribution_weights as any)?.[0];
    const currentCalls = weights?.current_daily_calls || 0;
    const maxCalls = weights?.max_daily_calls || 10;

    // Check capacity
    if (settings.skip_at_capacity && currentCalls >= maxCalls) {
      continue;
    }

    availableAgents.push({
      id: agent.id,
      name: agent.name,
      weight: weights?.weight_percent || 100,
      dailyCalls: currentCalls,
      maxCalls: maxCalls,
      lastAssigned: weights?.last_assigned_at ? new Date(weights.last_assigned_at) : null,
    });
  }

  if (availableAgents.length === 0) {
    return { agent_id: null, reason: 'all_agents_unavailable_or_at_capacity' };
  }

  // Select based on distribution method
  let selectedAgent: (typeof availableAgents)[0] | null = null;

  switch (settings.distribution_method) {
    case 'round_robin':
      // Select agent who was assigned longest ago
      availableAgents.sort((a, b) => {
        if (!a.lastAssigned) return -1;
        if (!b.lastAssigned) return 1;
        return a.lastAssigned.getTime() - b.lastAssigned.getTime();
      });
      selectedAgent = availableAgents[0];
      break;

    case 'weighted':
      // Weighted random selection
      const totalWeight = availableAgents.reduce((sum, a) => sum + a.weight, 0);
      let random = Math.random() * totalWeight;

      for (const agent of availableAgents) {
        random -= agent.weight;
        if (random <= 0) {
          selectedAgent = agent;
          break;
        }
      }
      selectedAgent = selectedAgent || availableAgents[0];
      break;

    case 'least_busy':
      // Select agent with fewest calls today
      availableAgents.sort((a, b) => a.dailyCalls - b.dailyCalls);
      selectedAgent = availableAgents[0];
      break;

    case 'availability_first':
    default:
      // Just pick the first available
      selectedAgent = availableAgents[0];
      break;
  }

  if (!selectedAgent) {
    return { agent_id: null, reason: 'selection_failed' };
  }

  return {
    agent_id: selectedAgent.id,
    reason: `${settings.distribution_method}: ${selectedAgent.name}`,
  };
}

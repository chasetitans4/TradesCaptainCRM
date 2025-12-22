// =====================================================
// AGENT PERFORMANCE TRACKING SYSTEM
// Minimum: 6 sales per calendar quarter (after 30-day ramp-up)
// =====================================================

export type AgentStatus = 'active' | 'warned' | 'terminated';
export type Quarter = 1 | 2 | 3 | 4;

export interface Agent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  start_date: string; // Date contract signed
  ramp_up_end_date: string; // start_date + 30 days
  warning_count: number; // Resets January 1
  last_warning_date?: string;
  last_warning_quarter?: string; // e.g., "2025-Q3"
  status: AgentStatus;
  termination_date?: string;
  termination_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentQuarterlyPerformance {
  id: string;
  agent_id: string;
  year: number;
  quarter: Quarter;
  sales_count: number;
  quota: number; // Usually 6, may be pro-rated
  met_quota: boolean;
  warning_issued: boolean;
  warning_date?: string;
  is_prorated: boolean;
  prorated_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface PerformanceCheckResult {
  agent_id: string;
  agent_name: string;
  year: number;
  quarter: Quarter;
  sales_count: number;
  quota: number;
  met_quota: boolean;
  action_required: 'none' | 'warning' | 'termination_review';
  warning_count_after: number;
  is_in_ramp_up: boolean;
  message: string;
}

// =====================================================
// CONSTANTS
// =====================================================

export const QUARTERLY_SALES_QUOTA = 6;
export const RAMP_UP_DAYS = 30;
export const MAX_WARNINGS_PER_YEAR = 1; // 2nd violation = termination review

// Quarter date ranges
export const QUARTERS: Record<Quarter, { start: string; end: string }> = {
  1: { start: '01-01', end: '03-31' },
  2: { start: '04-01', end: '06-30' },
  3: { start: '07-01', end: '09-30' },
  4: { start: '10-01', end: '12-31' },
};

// =====================================================
// IN-MEMORY STORAGE (Replace with Supabase in production)
// =====================================================

const agents: Map<string, Agent> = new Map();
const quarterlyPerformance: Map<string, AgentQuarterlyPerformance> = new Map();

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getCurrentQuarter(): { year: number; quarter: Quarter } {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  let quarter: Quarter;
  if (month <= 3) quarter = 1;
  else if (month <= 6) quarter = 2;
  else if (month <= 9) quarter = 3;
  else quarter = 4;

  return { year, quarter };
}

export function getQuarterDates(year: number, quarter: Quarter): { start: Date; end: Date } {
  const q = QUARTERS[quarter];
  return {
    start: new Date(`${year}-${q.start}`),
    end: new Date(`${year}-${q.end}T23:59:59`),
  };
}

export function calculateRampUpEndDate(startDate: string): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + RAMP_UP_DAYS);
  return date.toISOString().split('T')[0];
}

export function isInRampUp(agent: Agent): boolean {
  const now = new Date();
  const rampUpEnd = new Date(agent.ramp_up_end_date);
  return now < rampUpEnd;
}

export function calculateProratedQuota(
  startDate: string,
  rampUpEndDate: string,
  quarterEnd: Date
): { quota: number; reason: string } {
  const rampUpEnd = new Date(rampUpEndDate);

  // If ramp-up ends after quarter, no quota for this quarter
  if (rampUpEnd > quarterEnd) {
    return { quota: 0, reason: 'In ramp-up period for entire quarter' };
  }

  // Calculate months remaining after ramp-up
  const rampUpMonth = rampUpEnd.getMonth();
  const quarterEndMonth = quarterEnd.getMonth();
  const monthsRemaining = quarterEndMonth - rampUpMonth + 1;

  let quota: number;
  if (monthsRemaining >= 3) {
    quota = 6; // Full quarter
  } else if (monthsRemaining === 2) {
    quota = 4;
  } else {
    quota = 2;
  }

  return {
    quota,
    reason: `Pro-rated: ${monthsRemaining} month(s) remaining after ramp-up`,
  };
}

// =====================================================
// AGENT CRUD OPERATIONS
// =====================================================

export async function createAgent(input: {
  name: string;
  email: string;
  phone?: string;
  start_date: string;
}): Promise<Agent> {
  const id = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();

  const agent: Agent = {
    id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    start_date: input.start_date,
    ramp_up_end_date: calculateRampUpEndDate(input.start_date),
    warning_count: 0,
    status: 'active',
    created_at: now,
    updated_at: now,
  };

  agents.set(id, agent);
  return agent;
}

export async function getAgent(id: string): Promise<Agent | null> {
  return agents.get(id) || null;
}

export async function getAllAgents(): Promise<Agent[]> {
  return Array.from(agents.values());
}

export async function getActiveAgents(): Promise<Agent[]> {
  return Array.from(agents.values()).filter(a => a.status === 'active' || a.status === 'warned');
}

export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent | null> {
  const agent = agents.get(id);
  if (!agent) return null;

  const updated = {
    ...agent,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  agents.set(id, updated);
  return updated;
}

// =====================================================
// QUARTERLY PERFORMANCE TRACKING
// =====================================================

export async function recordSale(agentId: string): Promise<AgentQuarterlyPerformance | null> {
  const agent = await getAgent(agentId);
  if (!agent) return null;

  const { year, quarter } = getCurrentQuarter();
  const perfKey = `${agentId}_${year}_Q${quarter}`;

  let perf = quarterlyPerformance.get(perfKey);
  const now = new Date().toISOString();

  if (!perf) {
    const { end: quarterEnd } = getQuarterDates(year, quarter);
    const { quota, reason } = calculateProratedQuota(
      agent.start_date,
      agent.ramp_up_end_date,
      quarterEnd
    );

    perf = {
      id: perfKey,
      agent_id: agentId,
      year,
      quarter,
      sales_count: 0,
      quota,
      met_quota: false,
      warning_issued: false,
      is_prorated: quota !== QUARTERLY_SALES_QUOTA,
      prorated_reason: quota !== QUARTERLY_SALES_QUOTA ? reason : undefined,
      created_at: now,
      updated_at: now,
    };
  }

  perf.sales_count++;
  perf.met_quota = perf.sales_count >= perf.quota;
  perf.updated_at = now;

  quarterlyPerformance.set(perfKey, perf);
  return perf;
}

export async function getAgentQuarterlyPerformance(
  agentId: string,
  year: number,
  quarter: Quarter
): Promise<AgentQuarterlyPerformance | null> {
  const perfKey = `${agentId}_${year}_Q${quarter}`;
  return quarterlyPerformance.get(perfKey) || null;
}

export async function getAllQuarterlyPerformance(
  year: number,
  quarter: Quarter
): Promise<AgentQuarterlyPerformance[]> {
  return Array.from(quarterlyPerformance.values()).filter(
    p => p.year === year && p.quarter === quarter
  );
}

// =====================================================
// QUARTERLY PERFORMANCE CHECK
// =====================================================

export async function runQuarterlyPerformanceCheck(
  year: number,
  quarter: Quarter
): Promise<PerformanceCheckResult[]> {
  const results: PerformanceCheckResult[] = [];
  const activeAgents = await getActiveAgents();
  const { end: quarterEnd } = getQuarterDates(year, quarter);
  const now = new Date();

  for (const agent of activeAgents) {
    // Check if agent was in ramp-up for entire quarter
    const rampUpEnd = new Date(agent.ramp_up_end_date);
    if (rampUpEnd > quarterEnd) {
      results.push({
        agent_id: agent.id,
        agent_name: agent.name,
        year,
        quarter,
        sales_count: 0,
        quota: 0,
        met_quota: true,
        action_required: 'none',
        warning_count_after: agent.warning_count,
        is_in_ramp_up: true,
        message: `Exempt - in ramp-up period until ${agent.ramp_up_end_date}`,
      });
      continue;
    }

    // Get or create performance record
    let perf = await getAgentQuarterlyPerformance(agent.id, year, quarter);
    if (!perf) {
      const { quota, reason } = calculateProratedQuota(
        agent.start_date,
        agent.ramp_up_end_date,
        quarterEnd
      );
      perf = {
        id: `${agent.id}_${year}_Q${quarter}`,
        agent_id: agent.id,
        year,
        quarter,
        sales_count: 0,
        quota,
        met_quota: false,
        warning_issued: false,
        is_prorated: quota !== QUARTERLY_SALES_QUOTA,
        prorated_reason: reason,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      quarterlyPerformance.set(perf.id, perf);
    }

    perf.met_quota = perf.sales_count >= perf.quota;

    if (perf.met_quota) {
      results.push({
        agent_id: agent.id,
        agent_name: agent.name,
        year,
        quarter,
        sales_count: perf.sales_count,
        quota: perf.quota,
        met_quota: true,
        action_required: 'none',
        warning_count_after: agent.warning_count,
        is_in_ramp_up: false,
        message: `Met quota: ${perf.sales_count}/${perf.quota} sales`,
      });
    } else {
      // Did not meet quota
      let action_required: 'warning' | 'termination_review';
      let warning_count_after: number;
      let message: string;

      if (agent.warning_count === 0) {
        // First violation - issue warning
        action_required = 'warning';
        warning_count_after = 1;
        message = `First violation: ${perf.sales_count}/${perf.quota} sales. Warning issued.`;

        // Update agent
        await updateAgent(agent.id, {
          warning_count: 1,
          last_warning_date: now.toISOString(),
          last_warning_quarter: `${year}-Q${quarter}`,
          status: 'warned',
        });

        // Update performance record
        perf.warning_issued = true;
        perf.warning_date = now.toISOString();
      } else {
        // Second violation - termination review
        action_required = 'termination_review';
        warning_count_after = agent.warning_count + 1;
        message = `Second violation: ${perf.sales_count}/${perf.quota} sales. Previous warning: ${agent.last_warning_quarter}. TERMINATION REVIEW REQUIRED.`;
      }

      perf.updated_at = now.toISOString();
      quarterlyPerformance.set(perf.id, perf);

      results.push({
        agent_id: agent.id,
        agent_name: agent.name,
        year,
        quarter,
        sales_count: perf.sales_count,
        quota: perf.quota,
        met_quota: false,
        action_required,
        warning_count_after,
        is_in_ramp_up: false,
        message,
      });
    }
  }

  return results;
}

// =====================================================
// YEARLY WARNING RESET
// =====================================================

export async function resetYearlyWarnings(): Promise<number> {
  let count = 0;
  const allAgents = await getAllAgents();

  for (const agent of allAgents) {
    if (agent.warning_count > 0 && agent.status !== 'terminated') {
      await updateAgent(agent.id, {
        warning_count: 0,
        status: 'active',
      });
      count++;
    }
  }

  return count;
}

// =====================================================
// TERMINATION
// =====================================================

export async function terminateAgent(
  agentId: string,
  reason: string
): Promise<Agent | null> {
  return updateAgent(agentId, {
    status: 'terminated',
    termination_date: new Date().toISOString(),
    termination_reason: reason,
  });
}

// =====================================================
// DASHBOARD DATA
// =====================================================

export interface PerformanceDashboardData {
  year: number;
  quarter: Quarter;
  total_active_agents: number;
  meeting_quota: number;
  below_quota: number;
  in_ramp_up: number;
  agents_below_quota: {
    agent: Agent;
    performance: AgentQuarterlyPerformance | null;
    warning_status: 'none' | 'first_warning' | 'second_strike';
  }[];
  agents_in_ramp_up: {
    agent: Agent;
    days_remaining: number;
  }[];
}

export async function getPerformanceDashboard(
  year: number,
  quarter: Quarter
): Promise<PerformanceDashboardData> {
  const activeAgents = await getActiveAgents();
  const { end: quarterEnd } = getQuarterDates(year, quarter);
  const now = new Date();

  let meeting_quota = 0;
  let below_quota = 0;
  let in_ramp_up = 0;

  const agents_below_quota: PerformanceDashboardData['agents_below_quota'] = [];
  const agents_in_ramp_up: PerformanceDashboardData['agents_in_ramp_up'] = [];

  for (const agent of activeAgents) {
    const rampUpEnd = new Date(agent.ramp_up_end_date);

    // Check if in ramp-up
    if (now < rampUpEnd) {
      in_ramp_up++;
      const daysRemaining = Math.ceil((rampUpEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      agents_in_ramp_up.push({ agent, days_remaining: daysRemaining });
      continue;
    }

    // Get performance
    const perf = await getAgentQuarterlyPerformance(agent.id, year, quarter);
    const quota = perf?.quota || QUARTERLY_SALES_QUOTA;
    const sales = perf?.sales_count || 0;

    if (sales >= quota) {
      meeting_quota++;
    } else {
      below_quota++;
      let warning_status: 'none' | 'first_warning' | 'second_strike' = 'none';
      if (agent.warning_count >= 1) {
        warning_status = agent.last_warning_quarter === `${year}-Q${quarter}`
          ? 'first_warning'
          : 'second_strike';
      }
      agents_below_quota.push({ agent, performance: perf, warning_status });
    }
  }

  return {
    year,
    quarter,
    total_active_agents: activeAgents.length,
    meeting_quota,
    below_quota,
    in_ramp_up,
    agents_below_quota,
    agents_in_ramp_up,
  };
}

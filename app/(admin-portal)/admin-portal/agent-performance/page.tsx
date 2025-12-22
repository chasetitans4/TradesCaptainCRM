'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Mail,
  ChevronRight,
  Shield,
  FileText,
} from 'lucide-react';
import {
  getCurrentQuarter,
  getPerformanceDashboard,
  type PerformanceDashboardData,
  type Agent,
  type AgentQuarterlyPerformance,
  QUARTERLY_SALES_QUOTA,
} from '@/lib/agents/performance';

export default function AgentPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<PerformanceDashboardData | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(
    getCurrentQuarter().quarter as 1 | 2 | 3 | 4
  );

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedQuarter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // In production, this would be an API call
      const data = await getPerformanceDashboard(selectedYear, selectedQuarter);
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuarterLabel = (q: number) => `Q${q}`;
  const meetingQuotaPercent = dashboardData
    ? Math.round((dashboardData.meeting_quota / Math.max(1, dashboardData.total_active_agents - dashboardData.in_ramp_up)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Agent Performance</h1>
              <p className="text-sm text-gray-500">
                {getQuarterLabel(selectedQuarter)} {selectedYear} • Minimum {QUARTERLY_SALES_QUOTA} sales/quarter
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Quarter Selector */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              {([1, 2, 3, 4] as const).map(q => (
                <button
                  key={q}
                  onClick={() => setSelectedQuarter(q)}
                  className={cn(
                    'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    selectedQuarter === q
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  Q{q}
                </button>
              ))}
            </div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {[2025, 2024, 2023].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="card p-8 text-center">
            <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Loading performance data...</p>
          </div>
        ) : dashboardData ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{dashboardData.total_active_agents}</p>
                <p className="text-sm text-gray-500">Total Active Agents</p>
              </div>
              <div className="card p-4 text-center bg-green-50">
                <p className="text-3xl font-bold text-green-700">{dashboardData.meeting_quota}</p>
                <p className="text-sm text-green-600">Meeting Quota ({meetingQuotaPercent}%)</p>
              </div>
              <div className="card p-4 text-center bg-red-50">
                <p className="text-3xl font-bold text-red-700">{dashboardData.below_quota}</p>
                <p className="text-sm text-red-600">Below Quota</p>
              </div>
              <div className="card p-4 text-center bg-blue-50">
                <p className="text-3xl font-bold text-blue-700">{dashboardData.in_ramp_up}</p>
                <p className="text-sm text-blue-600">In Ramp-Up Period</p>
              </div>
            </div>

            {/* Agents Below Quota */}
            {dashboardData.agents_below_quota.length > 0 && (
              <div className="card overflow-hidden border-red-200">
                <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h2 className="font-semibold text-red-900">
                    Agents Below Quota ({dashboardData.agents_below_quota.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {dashboardData.agents_below_quota.map(({ agent, performance, warning_status }) => (
                    <div key={agent.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            warning_status === 'second_strike' ? 'bg-red-100' :
                            warning_status === 'first_warning' ? 'bg-yellow-100' : 'bg-gray-100'
                          )}>
                            {warning_status === 'second_strike' ? (
                              <XCircle className="h-5 w-5 text-red-600" />
                            ) : warning_status === 'first_warning' ? (
                              <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            ) : (
                              <Users className="h-5 w-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{agent.name}</h3>
                              {warning_status === 'second_strike' && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                  2ND STRIKE
                                </span>
                              )}
                              {warning_status === 'first_warning' && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                                  WARNING
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{agent.email}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span className="text-red-600 font-medium">
                                Sales: {performance?.sales_count || 0} / {performance?.quota || QUARTERLY_SALES_QUOTA}
                              </span>
                              {performance?.is_prorated && (
                                <span className="text-gray-500">
                                  (Pro-rated: {performance.prorated_reason})
                                </span>
                              )}
                            </div>
                            {agent.last_warning_quarter && (
                              <p className="text-xs text-gray-400 mt-1">
                                Previous warning: {agent.last_warning_quarter}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Mail className="h-4 w-4 mr-1" />
                            Contact
                          </Button>
                          {warning_status === 'second_strike' && (
                            <Button size="sm" className="bg-red-600 hover:bg-red-700">
                              <FileText className="h-4 w-4 mr-1" />
                              Terminate
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agents in Ramp-Up */}
            {dashboardData.agents_in_ramp_up.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h2 className="font-semibold text-blue-900">
                    Agents in Ramp-Up Period ({dashboardData.agents_in_ramp_up.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {dashboardData.agents_in_ramp_up.map(({ agent, days_remaining }) => (
                    <div key={agent.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{agent.name}</h3>
                          <p className="text-sm text-gray-500">Started {agent.start_date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-blue-600">{days_remaining} days remaining</p>
                        <p className="text-xs text-gray-500">Exempt from quota</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Rules */}
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Performance Requirements</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Quarterly Quota</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>6 sales per calendar quarter required</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                      <span>First 30 days exempt (ramp-up period)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                      <span>Pro-rated for mid-quarter starts</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Enforcement</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <span>1st violation: Written warning</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <span>2nd violation (same year): Termination review</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <RefreshCw className="h-4 w-4 text-gray-500 mt-0.5" />
                      <span>Warnings reset January 1st each year</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {dashboardData.agents_below_quota.length === 0 && dashboardData.agents_in_ramp_up.length === 0 && (
              <div className="card p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">All agents meeting quota!</h3>
                <p className="text-gray-500">No performance issues to review for {getQuarterLabel(selectedQuarter)} {selectedYear}</p>
              </div>
            )}
          </>
        ) : (
          <div className="card p-8 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No data available</h3>
            <p className="text-gray-500">No agent performance data found for this period</p>
          </div>
        )}
      </div>
    </div>
  );
}

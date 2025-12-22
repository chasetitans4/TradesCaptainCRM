'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Target,
  Building2,
  MoreVertical,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';

interface Agent {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  status: string;
  hire_date?: string;
  commission_rate: number;
  last_login_at?: string;
  created_at: string;
  stats?: {
    activeLeads: number;
    totalDeals: number;
    commissionsPending: number;
    commissionsPaidYtd: number;
  };
}

const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  agent: 'bg-green-100 text-green-700',
  support: 'bg-gray-100 text-gray-700',
  finance: 'bg-yellow-100 text-yellow-700',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  suspended: 'bg-red-100 text-red-700',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  useEffect(() => {
    fetchAgents();
  }, [roleFilter]);

  async function fetchAgents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);

      const res = await fetch(`/api/admin/agents?${params}`);
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredAgents = agents.filter(agent =>
    agent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Agents</h1>
          <p className="text-gray-500">Manage team members and their performance</p>
        </div>
        <button
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Roles</option>
          <option value="agent">Agents</option>
          <option value="admin">Admins</option>
          <option value="finance">Finance</option>
          <option value="support">Support</option>
        </select>
        <button
          onClick={fetchAgents}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-200">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No agents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-medium text-primary">
                      {agent.full_name?.charAt(0) || 'A'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{agent.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[agent.role]}`}>
                        {agent.role.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[agent.status]}`}>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {agent.email}
                </div>
                {agent.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {agent.phone}
                  </div>
                )}
                {agent.hire_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    Hired {format(new Date(agent.hire_date), 'MMM d, yyyy')}
                  </div>
                )}
              </div>

              {agent.role === 'agent' && (
                <>
                  <div className="border-t border-gray-100 my-4" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Target className="h-4 w-4" />
                        Active Leads
                      </div>
                      <div className="font-medium text-gray-900 mt-1">
                        {agent.stats?.activeLeads || 0}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Building2 className="h-4 w-4" />
                        Total Deals
                      </div>
                      <div className="font-medium text-gray-900 mt-1">
                        {agent.stats?.totalDeals || 0}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <DollarSign className="h-4 w-4" />
                        Pending
                      </div>
                      <div className="font-medium text-gray-900 mt-1">
                        ${agent.stats?.commissionsPending?.toLocaleString() || 0}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <DollarSign className="h-4 w-4" />
                        Paid YTD
                      </div>
                      <div className="font-medium text-green-600 mt-1">
                        ${agent.stats?.commissionsPaidYtd?.toLocaleString() || 0}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

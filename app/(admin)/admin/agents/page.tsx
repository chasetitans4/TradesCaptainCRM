'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Users,
  Plus,
  Search,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Mail,
  Phone,
  MoreVertical,
  Eye,
  Edit,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminPageHeader } from '@/components/admin/page-header';
import { useOptimizedFetch } from '@/lib/hooks/use-optimized-fetch';

// Dynamic import for modal - only loaded when opened
const AddAgentModal = dynamic(
  () => import('@/components/admin/add-agent-modal').then(mod => ({ default: mod.AddAgentModal })),
  { ssr: false }
);

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
  super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  agent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  support: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  finance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AgentsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Memoized fetcher function
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams();
    if (roleFilter) params.append('role', roleFilter);

    const res = await fetch(`/api/admin/agents?${params}`);
    if (!res.ok) throw new Error('Failed to fetch agents');
    const data = await res.json();
    return (data.agents || []) as Agent[];
  }, [roleFilter]);

  // Use optimized fetch with caching and revalidation
  const {
    data: agents = [],
    error: fetchError,
    isLoading: loading,
    isValidating,
    refetch,
  } = useOptimizedFetch<Agent[]>(
    `admin-agents-${roleFilter}`,
    fetcher,
    {
      staleTime: 60000, // Cache for 1 minute
      refetchOnFocus: true,
      deps: [roleFilter],
    }
  );

  const error = fetchError?.message || null;

  // Memoize filtered agents to avoid recalculating on every render
  const filteredAgents = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return agents.filter(agent =>
      agent.full_name.toLowerCase().includes(search) ||
      agent.email.toLowerCase().includes(search)
    );
  }, [agents, searchTerm]);

  return (
    <div className="p-6 space-y-6">
      <AdminPageHeader
        title="Sales Agents"
        description="Manage team members and their performance"
        icon={Users}
        actions={
          <Button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Agent
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="">All Roles</option>
            <option value="agent">Agents</option>
            <option value="admin">Admins</option>
            <option value="finance">Finance</option>
            <option value="support">Support</option>
          </select>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isValidating}
            className="flex items-center gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            {isValidating ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Agents Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p>No agents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-medium text-primary">
                        {agent.full_name?.charAt(0) || 'A'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{agent.full_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={`${roleColors[agent.role]} border-0 font-normal`}
                        >
                          {agent.role.replace('_', ' ')}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`${statusColors[agent.status]} border-0 font-normal`}
                        >
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/admin/agents/${agent.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/admin/agents/${agent.id}/edit`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Agent
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600 focus:text-red-600">
                        <UserX className="h-4 w-4 mr-2" />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground/70" />
                    {agent.email}
                  </div>
                  {agent.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground/70" />
                      {agent.phone}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Agent Modal */}
      <AddAgentModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => {
          setAddModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}

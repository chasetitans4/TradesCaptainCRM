'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Briefcase,
  Target,
  ArrowLeft,
  Edit,
  Save,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Agent {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  status: string;
  commission_rate: number;
  hire_date?: string;
  created_at: string;
  stats: {
    activeLeads: number;
    totalDeals: number;
    commissionsPending: number;
    commissionsPaidYtd: number;
  };
  recentLeads: any[];
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { loading: authLoading, user: currentUser } = useAdminAuth();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Agent>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAgent();
  }, [id]);

  async function fetchAgent() {
    try {
      const res = await fetch(`/api/admin/agents/${id}`);
      if (!res.ok) throw new Error('Failed to fetch agent');
      const data = await res.json();
      setAgent(data.agent);
      setFormData({
        full_name: data.agent.full_name,
        phone: data.agent.phone,
        status: data.agent.status,
        commission_rate: data.agent.commission_rate,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/agents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to update agent');
      const data = await res.json();
      setAgent({ ...agent!, ...data.agent });
      setEditing(false);
    } catch (error) {
      alert('Failed to update agent');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agent) {
    return <div>Agent not found</div>;
  }

  const canEdit = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  return (
    <div className="flex flex-col h-full bg-background p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/agents')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{agent.full_name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" /> {agent.email}
            <span className="mx-1">•</span>
            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
              {agent.status}
            </Badge>
          </div>
        </div>
        {canEdit && !editing && (
          <Button onClick={() => setEditing(true)}>
            <Edit className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Commission Rate (decimal)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.commission_rate || 0}
                onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agent.stats.activeLeads}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agent.stats.totalDeals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Comm.</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${agent.stats.commissionsPending.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid YTD</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${agent.stats.commissionsPaidYtd.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="leads" className="flex-1">
        <TabsList>
          <TabsTrigger value="leads">Recent Leads</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>
        <TabsContent value="leads" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.recentLeads && agent.recentLeads.length > 0 ? (
                <div className="space-y-4">
                  {agent.recentLeads.map((lead: any) => (
                    <div key={lead.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium">{lead.company_name}</div>
                        <div className="text-sm text-muted-foreground">{lead.contact_name}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{lead.status}</Badge>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(lead.created_at), 'MMM d')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No recent leads found.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Phone</div>
                  <div>{agent.phone || 'Not provided'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Hire Date</div>
                  <div>{agent.hire_date ? format(new Date(agent.hire_date), 'MMM d, yyyy') : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Role</div>
                  <div className="capitalize">{agent.role.replace('_', ' ')}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Commission Rate</div>
                  <div>{(agent.commission_rate * 100).toFixed(0)}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

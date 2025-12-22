'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  MoreHorizontal,
  Loader2,
  AlertCircle,
  User,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface FollowUp {
  id: string;
  entity_type: 'lead' | 'customer' | 'job' | 'quote' | 'invoice';
  entity_id: string;
  follow_up_type: 'call' | 'email' | 'sms' | 'visit' | 'other';
  scheduled_date: string;
  scheduled_time?: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'cancelled' | 'rescheduled';
  completed_at?: string;
  outcome?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  // Joined data
  entity?: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  assignee?: {
    full_name: string;
  };
}

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [activeTab, setActiveTab] = useState('today');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const [formData, setFormData] = useState({
    entity_type: 'lead' as 'lead' | 'customer' | 'job' | 'quote' | 'invoice',
    entity_id: '',
    follow_up_type: 'call' as 'call' | 'email' | 'sms' | 'visit' | 'other',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assigned_to: '',
  });

  useEffect(() => {
    loadFollowUps();
  }, []);

  async function loadFollowUps() {
    try {
      const response = await fetch('/api/follow-ups');
      if (response.ok) {
        const data = await response.json();
        setFollowUps(data.follow_ups || []);
      }
    } catch (error) {
      console.error('Error loading follow-ups:', error);
      setError('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }

  const openNewDialog = () => {
    setEditingFollowUp(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData({
      entity_type: 'lead',
      entity_id: '',
      follow_up_type: 'call',
      scheduled_date: tomorrow.toISOString().split('T')[0],
      scheduled_time: '09:00',
      notes: '',
      priority: 'medium',
      assigned_to: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (followUp: FollowUp) => {
    setEditingFollowUp(followUp);
    setFormData({
      entity_type: followUp.entity_type,
      entity_id: followUp.entity_id,
      follow_up_type: followUp.follow_up_type,
      scheduled_date: followUp.scheduled_date.split('T')[0],
      scheduled_time: followUp.scheduled_time || '',
      notes: followUp.notes || '',
      priority: followUp.priority,
      assigned_to: followUp.assigned_to || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        scheduled_time: formData.scheduled_time || null,
        notes: formData.notes || null,
        assigned_to: formData.assigned_to || null,
      };

      const response = await fetch(
        editingFollowUp ? `/api/follow-ups/${editingFollowUp.id}` : '/api/follow-ups',
        {
          method: editingFollowUp ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save follow-up');
      }

      setIsDialogOpen(false);
      loadFollowUps();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (followUpId: string, outcome?: string) => {
    try {
      await fetch(`/api/follow-ups/${followUpId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });
      loadFollowUps();
    } catch (error) {
      console.error('Error completing follow-up:', error);
    }
  };

  const handleCancel = async (followUpId: string) => {
    if (!confirm('Are you sure you want to cancel this follow-up?')) return;

    try {
      await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      loadFollowUps();
    } catch (error) {
      console.error('Error cancelling follow-up:', error);
    }
  };

  const handleReschedule = async (followUpId: string, newDate: string) => {
    try {
      await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_date: newDate, status: 'rescheduled' }),
      });
      loadFollowUps();
    } catch (error) {
      console.error('Error rescheduling follow-up:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'visit':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={colors[priority]}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'rescheduled':
        return <Badge className="bg-blue-100 text-blue-800">Rescheduled</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getEntityLink = (followUp: FollowUp) => {
    const routes: Record<string, string> = {
      lead: '/leads',
      customer: '/customers',
      job: '/jobs',
      quote: '/quotes',
      invoice: '/invoices',
    };
    return `${routes[followUp.entity_type]}/${followUp.entity_id}`;
  };

  // Filter and sort follow-ups
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const filterFollowUps = (items: FollowUp[]) => {
    return items.filter((fu) => {
      if (filterType !== 'all' && fu.follow_up_type !== filterType) return false;
      if (filterPriority !== 'all' && fu.priority !== filterPriority) return false;
      return true;
    });
  };

  const pendingFollowUps = followUps.filter((fu) => fu.status === 'pending');
  const todayFollowUps = filterFollowUps(
    pendingFollowUps.filter((fu) => {
      const date = new Date(fu.scheduled_date);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    })
  );
  const overdueFollowUps = filterFollowUps(
    pendingFollowUps.filter((fu) => {
      const date = new Date(fu.scheduled_date);
      date.setHours(0, 0, 0, 0);
      return date < today;
    })
  );
  const upcomingFollowUps = filterFollowUps(
    pendingFollowUps.filter((fu) => {
      const date = new Date(fu.scheduled_date);
      date.setHours(0, 0, 0, 0);
      return date > today;
    })
  );
  const completedFollowUps = filterFollowUps(
    followUps.filter((fu) => fu.status === 'completed')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Follow-ups</h1>
          <p className="text-muted-foreground">
            Manage scheduled follow-ups for leads, customers, and jobs
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Follow-up
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueFollowUps.length}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayFollowUps.length}</p>
                <p className="text-sm text-muted-foreground">Due Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingFollowUps.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedFollowUps.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="call">Calls</SelectItem>
            <SelectItem value="email">Emails</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="visit">Visits</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overdue" className="relative">
            Overdue
            {overdueFollowUps.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                {overdueFollowUps.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="today">Today ({todayFollowUps.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcomingFollowUps.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="overdue" className="space-y-4">
          <FollowUpList
            followUps={overdueFollowUps}
            onEdit={openEditDialog}
            onComplete={handleComplete}
            onCancel={handleCancel}
            getTypeIcon={getTypeIcon}
            getPriorityBadge={getPriorityBadge}
            getStatusBadge={getStatusBadge}
            getEntityLink={getEntityLink}
            emptyMessage="No overdue follow-ups"
            emptyIcon={<CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />}
          />
        </TabsContent>

        <TabsContent value="today" className="space-y-4">
          <FollowUpList
            followUps={todayFollowUps}
            onEdit={openEditDialog}
            onComplete={handleComplete}
            onCancel={handleCancel}
            getTypeIcon={getTypeIcon}
            getPriorityBadge={getPriorityBadge}
            getStatusBadge={getStatusBadge}
            getEntityLink={getEntityLink}
            emptyMessage="No follow-ups scheduled for today"
            emptyIcon={<Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
          />
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <FollowUpList
            followUps={upcomingFollowUps}
            onEdit={openEditDialog}
            onComplete={handleComplete}
            onCancel={handleCancel}
            getTypeIcon={getTypeIcon}
            getPriorityBadge={getPriorityBadge}
            getStatusBadge={getStatusBadge}
            getEntityLink={getEntityLink}
            emptyMessage="No upcoming follow-ups"
            emptyIcon={<Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
          />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <FollowUpList
            followUps={completedFollowUps.slice(0, 20)}
            onEdit={openEditDialog}
            onComplete={handleComplete}
            onCancel={handleCancel}
            getTypeIcon={getTypeIcon}
            getPriorityBadge={getPriorityBadge}
            getStatusBadge={getStatusBadge}
            getEntityLink={getEntityLink}
            emptyMessage="No completed follow-ups"
            emptyIcon={<CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
            showStatus
          />
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFollowUp ? 'Edit Follow-up' : 'Schedule Follow-up'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select
                  value={formData.entity_type}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, entity_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Follow-up Type</Label>
                <Select
                  value={formData.follow_up_type}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, follow_up_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS/Text</SelectItem>
                    <SelectItem value="visit">Site Visit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, scheduled_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, scheduled_time: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) =>
                  setFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Add notes about this follow-up..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.scheduled_date}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingFollowUp ? 'Save Changes' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Follow-up List Component
function FollowUpList({
  followUps,
  onEdit,
  onComplete,
  onCancel,
  getTypeIcon,
  getPriorityBadge,
  getStatusBadge,
  getEntityLink,
  emptyMessage,
  emptyIcon,
  showStatus = false,
}: {
  followUps: FollowUp[];
  onEdit: (fu: FollowUp) => void;
  onComplete: (id: string, outcome?: string) => void;
  onCancel: (id: string) => void;
  getTypeIcon: (type: string) => React.ReactNode;
  getPriorityBadge: (priority: string) => React.ReactNode;
  getStatusBadge: (status: string) => React.ReactNode;
  getEntityLink: (fu: FollowUp) => string;
  emptyMessage: string;
  emptyIcon: React.ReactNode;
  showStatus?: boolean;
}) {
  if (followUps.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          {emptyIcon}
          <h3 className="text-lg font-medium mb-1">{emptyMessage}</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {followUps.map((followUp) => (
        <Card key={followUp.id}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-muted rounded-lg">
                {getTypeIcon(followUp.follow_up_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={getEntityLink(followUp)}
                    className="font-medium hover:underline"
                  >
                    {followUp.entity?.name || `${followUp.entity_type} #${followUp.entity_id.slice(0, 8)}`}
                  </Link>
                  {getPriorityBadge(followUp.priority)}
                  {showStatus && getStatusBadge(followUp.status)}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="capitalize">{followUp.follow_up_type}</span>
                  <span>
                    {new Date(followUp.scheduled_date).toLocaleDateString()}
                    {followUp.scheduled_time && ` at ${followUp.scheduled_time}`}
                  </span>
                  {followUp.assignee && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {followUp.assignee.full_name}
                    </span>
                  )}
                </div>
                {followUp.notes && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                    {followUp.notes}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {followUp.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onComplete(followUp.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(followUp)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => onCancel(followUp.id)}
                        >
                          Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
                <Link href={getEntityLink(followUp)}>
                  <Button variant="ghost" size="icon-sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

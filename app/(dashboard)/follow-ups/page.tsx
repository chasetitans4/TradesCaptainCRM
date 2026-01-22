'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Clock,
  CheckCircle,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { FollowUp, FollowUpFormData } from './_components/types';
import { INITIAL_FORM_DATA } from './_components/types';
import { StatsCards } from './_components/stats-cards';
import { FollowUpList } from './_components/follow-up-list';
import { FollowUpFormDialog } from './_components/follow-up-form-dialog';

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

  const [formData, setFormData] = useState<FollowUpFormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    loadFollowUps();
  }, []);

  async function loadFollowUps() {
    try {
      const response = await fetch('/api/follow-ups');
      if (!response.ok) {
        throw new Error(`Failed to load follow-ups: ${response.status}`);
      }
      const data = await response.json();
      setFollowUps(data.follow_ups || []);
    } catch (error) {
      console.error('Error loading follow-ups:', error instanceof Error ? error.message : 'Unknown error');
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
      ...INITIAL_FORM_DATA,
      scheduled_date: tomorrow.toISOString().split('T')[0],
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

      <StatsCards
        overdueCount={overdueFollowUps.length}
        todayCount={todayFollowUps.length}
        upcomingCount={upcomingFollowUps.length}
        completedCount={completedFollowUps.length}
      />

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
            emptyMessage="No completed follow-ups"
            emptyIcon={<CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />}
            showStatus
          />
        </TabsContent>
      </Tabs>

      <FollowUpFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        editingFollowUp={editingFollowUp}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

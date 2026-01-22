'use client';

// =====================================================
// SALES PIPELINE PAGE
// Kanban-style lead tracking
// Version: 5.8
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Settings, LayoutGrid, Loader2 } from 'lucide-react';
import { PipelineKanban, LeadDetail, TasksPanel } from '@/components/admin/pipeline';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import { AdminPageHeader } from '@/components/admin/page-header';

interface Lead {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source: string | null;
  interested_plan: string | null;
  interested_track: string | null;
  estimated_value_cents: number | null;
  notes: string | null;
  stage: string;
  stage_changed_at: string;
  days_in_stage?: number;
  lost_reason: string | null;
  created_at: string;
  next_task?: any;
}

interface Task {
  id: string;
  task_type: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  lead?: Lead;
}

interface Activity {
  id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
}

export default function PipelinePage() {
  const { loading: authLoading, isAuthorized } = useAgentOrHigher();
  const [stages, setStages] = useState<Record<string, Lead[]>>({});
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leadTasks, setLeadTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Auth gating handled after hooks

  // Fetch pipeline data
  const fetchPipeline = useCallback(async () => {
    try {
      if (!isAuthorized) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const [pipelineRes, overdueRes, todayRes] = await Promise.all([
        fetch('/api/pipeline'),
        fetch('/api/pipeline/tasks?type=overdue'),
        fetch('/api/pipeline/tasks?type=today'),
      ]);

      if (pipelineRes.ok) {
        const data = await pipelineRes.json();
        setStages(data.stages || {});
      }

      if (overdueRes.ok) {
        const data = await overdueRes.json();
        setOverdueTasks(data.tasks || []);
      }

      if (todayRes.ok) {
        const data = await todayRes.json();
        setTodayTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch pipeline:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  // Fetch lead detail
  const fetchLeadDetail = useCallback(async (leadId: string) => {
    try {
      if (!isAuthorized) return;
      setDetailLoading(true);
      const [leadRes, activitiesRes, tasksRes] = await Promise.all([
        fetch(`/api/pipeline/leads/${leadId}`),
        fetch(`/api/pipeline/leads/${leadId}/activities`),
        fetch(`/api/pipeline/leads/${leadId}/tasks?include_completed=true`),
      ]);

      if (leadRes.ok) {
        const data = await leadRes.json();
        setSelectedLead(data);
      }

      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.activities || []);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setLeadTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch lead detail:', error);
    } finally {
      setDetailLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchLeadDetail(selectedLeadId);
    }
  }, [selectedLeadId, fetchLeadDetail]);

  if (authLoading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId);
  };

  const handleBackToKanban = () => {
    setSelectedLeadId(null);
    setSelectedLead(null);
    setActivities([]);
    setLeadTasks([]);
  };

  const handleLeadMove = async (leadId: string, newStage: string) => {
    try {
      const res = await fetch(`/api/pipeline/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move_stage', stage: newStage }),
      });

      if (res.ok) {
        fetchPipeline();
      }
    } catch (error) {
      console.error('Failed to move lead:', error);
    }
  };

  const handleStageChange = async (stage: string, lostReason?: string) => {
    if (!selectedLeadId) return;

    try {
      const res = await fetch(`/api/pipeline/leads/${selectedLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move_stage',
          stage,
          lost_reason: lostReason,
        }),
      });

      if (res.ok) {
        fetchLeadDetail(selectedLeadId);
        fetchPipeline();
      }
    } catch (error) {
      console.error('Failed to change stage:', error);
    }
  };

  const handleLogActivity = async (type: string, description: string) => {
    if (!selectedLeadId) return;

    try {
      const res = await fetch(`/api/pipeline/leads/${selectedLeadId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_type: type, description }),
      });

      if (res.ok) {
        fetchLeadDetail(selectedLeadId);
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  const handleCreateTask = async (task: {
    task_type: string;
    description: string;
    due_date: string;
  }) => {
    if (!selectedLeadId) return;

    try {
      const res = await fetch(`/api/pipeline/leads/${selectedLeadId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });

      if (res.ok) {
        fetchLeadDetail(selectedLeadId);
        fetchPipeline();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/pipeline/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });

      if (res.ok) {
        if (selectedLeadId) {
          fetchLeadDetail(selectedLeadId);
        }
        fetchPipeline();
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleAddNote = async (note: string) => {
    if (!selectedLeadId || !selectedLead) return;

    try {
      const existingNotes = selectedLead.notes || '';
      const newNotes = existingNotes
        ? `${existingNotes}\n\n${new Date().toLocaleString()}: ${note}`
        : `${new Date().toLocaleString()}: ${note}`;

      const res = await fetch(`/api/pipeline/leads/${selectedLeadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });

      if (res.ok) {
        fetchLeadDetail(selectedLeadId);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  // Show lead detail view
  if (selectedLeadId && selectedLead) {
    return (
      <LeadDetail
        lead={selectedLead}
        activities={activities}
        tasks={leadTasks}
        loading={detailLoading}
        onBack={handleBackToKanban}
        onStageChange={handleStageChange}
        onLogActivity={handleLogActivity}
        onCreateTask={handleCreateTask}
        onCompleteTask={handleCompleteTask}
        onAddNote={handleAddNote}
      />
    );
  }

  // Main pipeline view
  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title="Sales Pipeline"
        description="Track leads, opportunities, and sales team performance."
        icon={LayoutGrid}
        actions={
          <div className="flex items-center gap-3">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Lead
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Kanban Board */}
        <div className="xl:col-span-3">
          <PipelineKanban
            stages={stages}
            loading={loading}
            onLeadClick={handleLeadClick}
            onLeadMove={handleLeadMove}
          />
        </div>

        {/* Tasks Sidebar */}
        <div className="xl:col-span-1">
          <TasksPanel
            overdue={overdueTasks}
            today={todayTasks}
            loading={loading}
            onCompleteTask={handleCompleteTask}
            onLeadClick={handleLeadClick}
          />
        </div>
      </div>

      {/* Lost Leads Link */}
      <div className="text-sm text-muted-foreground">
        Lost ({stages.lost?.length || 0}) —{' '}
        <button className="text-primary hover:underline">View Lost Leads</button>
      </div>
    </div>
  );
}

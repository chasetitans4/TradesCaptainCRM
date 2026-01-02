'use client';

// =====================================================
// PIPELINE KANBAN VIEW
// Drag-and-drop kanban board for leads
// Version: 5.8
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  Clock,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

interface PipelineTask {
  id: string;
  task_type: string;
  description: string | null;
  due_date: string;
}

interface PipelineLead {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  interested_plan: string | null;
  estimated_value_cents: number | null;
  stage: string;
  days_in_stage?: number;
  next_task?: PipelineTask | null;
}

interface PipelineKanbanProps {
  stages: Record<string, PipelineLead[]>;
  loading?: boolean;
  onLeadClick?: (leadId: string) => void;
  onLeadMove?: (leadId: string, newStage: string) => void;
}

const STAGE_CONFIG = {
  new: { label: 'New', color: 'bg-blue-500', icon: AlertCircle },
  contacted: { label: 'Contacted', color: 'bg-yellow-500', icon: Phone },
  qualified: { label: 'Qualified', color: 'bg-purple-500', icon: Mail },
  proposal: { label: 'Proposal', color: 'bg-orange-500', icon: FileText },
  won: { label: 'Won', color: 'bg-green-500', icon: Calendar },
};

export function PipelineKanban({
  stages,
  loading,
  onLeadClick,
  onLeadMove,
}: PipelineKanbanProps) {
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggedLead && onLeadMove) {
      onLeadMove(draggedLead, stage);
    }
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const formatPrice = (cents: number | null) => {
    if (!cents) return '$0';
    return '$' + Math.round(cents / 100).toLocaleString();
  };

  const getDaysInStageColor = (days: number = 0, stage: string) => {
    if (stage === 'won') return '';
    if (stage === 'new') {
      if (days >= 2) return 'text-destructive';
      if (days >= 1) return 'text-warning';
    } else if (stage === 'proposal') {
      if (days >= 7) return 'text-destructive';
      if (days >= 5) return 'text-warning';
    } else {
      if (days >= 5) return 'text-destructive';
      if (days >= 3) return 'text-warning';
    }
    return 'text-muted-foreground';
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'call':
        return <Phone className="h-3 w-3" />;
      case 'email':
        return <Mail className="h-3 w-3" />;
      case 'demo':
      case 'meeting':
        return <Calendar className="h-3 w-3" />;
      case 'proposal':
        return <FileText className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const stageOrder: Array<keyof typeof STAGE_CONFIG> = [
    'new',
    'contacted',
    'qualified',
    'proposal',
    'won',
  ];

  return (
    <div className="grid grid-cols-5 gap-4 min-h-[600px]">
      {stageOrder.map((stage) => {
        const config = STAGE_CONFIG[stage];
        const leads = stages[stage] || [];
        const totalValue = leads.reduce(
          (sum, l) => sum + (l.estimated_value_cents || 0),
          0
        );

        return (
          <div
            key={stage}
            className={`flex flex-col rounded-lg border ${
              dragOverStage === stage ? 'border-primary bg-primary/5' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
          >
            {/* Stage Header */}
            <div className="p-3 border-b bg-muted/50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${config.color}`} />
                  <span className="font-medium">{config.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {leads.length}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatPrice(totalValue)}/mo
              </p>
            </div>

            {/* Leads */}
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-2">
                {leads.map((lead) => (
                  <Card
                    key={lead.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      draggedLead === lead.id ? 'opacity-50' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => onLeadClick?.(lead.id)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="font-medium truncate">
                          {lead.company_name || lead.contact_name || 'Unnamed Lead'}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {formatPrice(lead.estimated_value_cents)}/mo
                          </span>
                          {lead.interested_plan && (
                            <Badge variant="outline" className="text-xs">
                              {lead.interested_plan
                                .split('_')
                                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(' ')}
                            </Badge>
                          )}
                        </div>

                        {/* Days in stage indicator */}
                        {lead.days_in_stage !== undefined && stage !== 'won' && (
                          <div
                            className={`text-xs flex items-center gap-1 ${getDaysInStageColor(
                              lead.days_in_stage,
                              stage
                            )}`}
                          >
                            <Clock className="h-3 w-3" />
                            {lead.days_in_stage} days
                          </div>
                        )}

                        {/* Next task */}
                        {lead.next_task && (
                          <div className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-1">
                            {getTaskIcon(lead.next_task.task_type)}
                            <span className="truncate">
                              {lead.next_task.description || lead.next_task.task_type}
                            </span>
                            <ChevronRight className="h-3 w-3 ml-auto" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {leads.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No leads
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

export default PipelineKanban;

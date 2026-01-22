'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { cn, formatRelativeDate, formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { Lead, Customer, LeadStatus } from '@/types';
import {
  User,
  Phone,
  MessageSquare,
  Clock,
  Briefcase,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';

interface LeadWithCustomer extends Lead {
  customer?: Pick<Customer, 'id' | 'name' | 'phone' | 'email'> | null;
}

interface LeadsKanbanProps {
  leads: LeadWithCustomer[];
  onLeadMove?: (leadId: string, newStatus: LeadStatus) => void;
  onRefresh?: () => void;
}

const KANBAN_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'new', label: 'New', color: 'bg-blue-500' },
  { status: 'contacted', label: 'Contacted', color: 'bg-purple-500' },
  { status: 'qualified', label: 'Qualified', color: 'bg-cyan-500' },
  { status: 'quoted', label: 'Quoted', color: 'bg-amber-500' },
  { status: 'won', label: 'Won', color: 'bg-green-500' },
  { status: 'lost', label: 'Lost', color: 'bg-gray-500' },
];

const URGENCY_COLORS: Record<string, string> = {
  emergency: 'bg-danger text-white',
  high: 'bg-warning text-white',
  normal: 'bg-info/10 text-info',
  low: 'bg-muted text-text-muted',
};

export function LeadsKanban({ leads, onLeadMove, onRefresh }: LeadsKanbanProps) {
  const { toast } = useToast();
  const [activeColumn, setActiveColumn] = useState(0);
  const [draggingLead, setDraggingLead] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Group leads by status
  const leadsByStatus: Record<LeadStatus, LeadWithCustomer[]> = {
    new: [],
    contacted: [],
    qualified: [],
    quoted: [],
    scheduled: [],
    won: [],
    lost: [],
  };

  leads.forEach((lead) => {
    if (leadsByStatus[lead.status]) {
      leadsByStatus[lead.status].push(lead);
    }
  });

  // Handle status update
  const updateLeadStatus = useCallback(async (leadId: string, newStatus: LeadStatus) => {
    setUpdating(leadId);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Lead updated',
          description: `Lead moved to ${newStatus}`,
        });
        onLeadMove?.(leadId, newStatus);
        onRefresh?.();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to update lead',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update lead status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
      setDraggingLead(null);
      setDragOverColumn(null);
    }
  }, [onLeadMove, onRefresh, toast]);

  // Drag and drop handlers
  const handleDragStart = (leadId: string) => {
    setDraggingLead(leadId);
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    if (draggingLead) {
      const lead = leads.find((l) => l.id === draggingLead);
      if (lead && lead.status !== newStatus) {
        updateLeadStatus(draggingLead, newStatus);
      } else {
        setDraggingLead(null);
        setDragOverColumn(null);
      }
    }
  };

  // Mobile: navigate between columns
  const navigateColumn = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && activeColumn > 0) {
      setActiveColumn(activeColumn - 1);
    } else if (direction === 'next' && activeColumn < KANBAN_COLUMNS.length - 1) {
      setActiveColumn(activeColumn + 1);
    }
  };

  // Move lead to adjacent column (mobile)
  const moveLeadMobile = (leadId: string, direction: 'prev' | 'next') => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const currentIndex = KANBAN_COLUMNS.findIndex((c) => c.status === lead.status);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < KANBAN_COLUMNS.length) {
      updateLeadStatus(leadId, KANBAN_COLUMNS[newIndex].status);
    }
  };

  return (
    <div className="h-full">
      {/* Mobile View - Single column with navigation */}
      <div className="md:hidden">
        {/* Column navigation */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigateColumn('prev')}
            disabled={activeColumn === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', KANBAN_COLUMNS[activeColumn].color)} />
            <span className="font-medium">
              {KANBAN_COLUMNS[activeColumn].label}
            </span>
            <Badge variant="secondary" className="ml-1">
              {leadsByStatus[KANBAN_COLUMNS[activeColumn].status].length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigateColumn('next')}
            disabled={activeColumn === KANBAN_COLUMNS.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Column dots indicator */}
        <div className="flex justify-center gap-1.5 py-2 bg-muted/30">
          {KANBAN_COLUMNS.map((col, idx) => (
            <button
              key={col.status}
              onClick={() => setActiveColumn(idx)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                idx === activeColumn ? col.color : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>

        {/* Active column leads */}
        <div className="px-4 py-3 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {leadsByStatus[KANBAN_COLUMNS[activeColumn].status].length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No leads in this stage</p>
            </div>
          ) : (
            leadsByStatus[KANBAN_COLUMNS[activeColumn].status].map((lead) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                isUpdating={updating === lead.id}
                onMoveLeft={activeColumn > 0 ? () => moveLeadMobile(lead.id, 'prev') : undefined}
                onMoveRight={activeColumn < KANBAN_COLUMNS.length - 1 ? () => moveLeadMobile(lead.id, 'next') : undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* Desktop View - Full kanban board */}
      <div className="hidden md:flex h-full overflow-x-auto gap-4 p-4">
        {KANBAN_COLUMNS.map((column) => (
          <div
            key={column.status}
            className={cn(
              'flex-shrink-0 w-72 flex flex-col bg-muted/30 rounded-xl border border-border',
              dragOverColumn === column.status && 'ring-2 ring-primary'
            )}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <div className={cn('w-3 h-3 rounded-full', column.color)} />
              <span className="font-medium text-sm">{column.label}</span>
              <Badge variant="secondary" className="ml-auto">
                {leadsByStatus[column.status].length}
              </Badge>
            </div>

            {/* Column content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {leadsByStatus[column.status].map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => handleDragStart(lead.id)}
                  className={cn(
                    'cursor-grab active:cursor-grabbing',
                    draggingLead === lead.id && 'opacity-50'
                  )}
                >
                  <KanbanCard
                    lead={lead}
                    isUpdating={updating === lead.id}
                    compact
                  />
                </div>
              ))}
              {leadsByStatus[column.status].length === 0 && (
                <div className="text-center py-6 text-text-muted text-sm">
                  <p>Drop leads here</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  lead: LeadWithCustomer;
  isUpdating?: boolean;
  compact?: boolean;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}

function KanbanCard({ lead, isUpdating, compact, onMoveLeft, onMoveRight }: KanbanCardProps) {
  const name = lead.customer?.name || lead.name || 'Unknown';
  const phone = lead.customer?.phone || lead.phone;

  return (
    <div
      className={cn(
        'card bg-background border border-border',
        compact ? 'p-3' : 'p-4',
        isUpdating && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className={cn(
            'shrink-0 rounded-full flex items-center justify-center',
            compact ? 'w-8 h-8' : 'w-10 h-10',
            lead.urgency ? URGENCY_COLORS[lead.urgency] : 'bg-primary/10 text-primary'
          )}
        >
          <User className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/leads/${lead.id}`}
            className="font-medium text-text truncate block hover:text-primary transition-colors"
          >
            {name}
          </Link>
          <p className={cn('text-text-muted truncate', compact ? 'text-xs' : 'text-sm')}>
            {lead.service_needed || 'No service specified'}
          </p>
        </div>
      </div>

      {/* Meta */}
      <div className={cn('flex items-center gap-3 text-text-muted', compact ? 'text-xs' : 'text-xs')}>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeDate(lead.created_at)}
        </span>
        {lead.source && (
          <span className="flex items-center gap-1 truncate">
            <Briefcase className="h-3 w-3" />
            {lead.source}
          </span>
        )}
      </div>

      {/* Actions */}
      {!compact && phone && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1 text-sm text-primary"
          >
            <Phone className="h-3.5 w-3.5" />
            {formatPhoneNumber(phone)}
          </a>
          <a
            href={`sms:${phone}`}
            className="flex items-center gap-1 text-sm text-primary"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Text
          </a>
        </div>
      )}

      {/* Mobile move buttons */}
      {(onMoveLeft || onMoveRight) && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveLeft}
            disabled={!onMoveLeft || isUpdating}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Move Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveRight}
            disabled={!onMoveRight || isUpdating}
            className="flex-1"
          >
            Move Forward
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default LeadsKanban;

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ClipboardList, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string | null;
  item_type: string;
  is_checked: boolean;
  checked_at: string | null;
}

interface JobChecklistProps {
  jobId: string;
  businessId: string;
  userId: string;
}

export function JobChecklist({ jobId, businessId, userId }: JobChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChecklist() {
      const supabase = createClient();

      // Try to load existing checklist items for this job
      const { data: existing } = await supabase
        .from('job_pre_checklist_items')
        .select('id, label, description, item_type, is_checked, checked_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (existing && existing.length > 0) {
        setItems(existing);
        setLoading(false);
        return;
      }

      // Fall back to template: find an active pre_job template for this business
      const { data: templates } = await supabase
        .from('checklist_templates')
        .select('id, items')
        .eq('business_id', businessId)
        .eq('checklist_type', 'pre_job')
        .eq('is_active', true)
        .limit(1);

      if (templates && templates.length > 0 && Array.isArray(templates[0].items)) {
        const templateItems = templates[0].items as Array<{ label: string; description?: string; item_type?: string }>;

        // Create checklist items from template
        const inserts = templateItems.map(item => ({
          job_id: jobId,
          label: item.label,
          description: item.description || null,
          item_type: item.item_type || 'check',
          is_checked: false,
        }));

        const { data: created } = await supabase
          .from('job_pre_checklist_items')
          .insert(inserts)
          .select('id, label, description, item_type, is_checked, checked_at');

        if (created) {
          setItems(created);
        }
      }

      setLoading(false);
    }

    loadChecklist();
  }, [jobId, businessId]);

  const handleToggle = async (itemId: string, checked: boolean) => {
    const supabase = createClient();

    // Optimistic update
    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, is_checked: checked, checked_at: checked ? new Date().toISOString() : null }
          : item
      )
    );

    await supabase
      .from('job_pre_checklist_items')
      .update({
        is_checked: checked,
        checked_at: checked ? new Date().toISOString() : null,
        checked_by: checked ? userId : null,
      })
      .eq('id', itemId);
  };

  if (loading || items.length === 0) return null;

  const completedCount = items.filter(i => i.is_checked).length;
  const totalCount = items.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="border-t border-border">
      <button
        className="w-full px-4 py-2.5 flex items-center gap-2 text-sm hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <ClipboardList className="h-4 w-4 text-primary" />
        <span className="font-medium text-text">Pre-Job Checklist</span>
        <span className={cn(
          'ml-auto text-xs font-medium px-2 py-0.5 rounded-full',
          completedCount === totalCount
            ? 'bg-success/10 text-success'
            : 'bg-muted text-text-muted'
        )}>
          {completedCount}/{totalCount}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Progress bar */}
      <div className="px-4">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              completedCount === totalCount ? 'bg-success' : 'bg-primary'
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className={`expandable ${expanded ? 'open' : ''}`}>
        <div className="px-4 py-2 space-y-1">
          {items.map(item => (
            <label
              key={item.id}
              className="flex items-start gap-4 py-3 cursor-pointer group active:bg-muted/20 rounded-lg px-2 -mx-2 transition-colors"
            >
              <button
                className={cn(
                  'mt-0.5 h-8 w-8 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors shadow-sm',
                  item.is_checked
                    ? 'bg-primary border-primary text-white'
                    : 'border-muted-foreground/40 group-hover:border-primary bg-background'
                )}
                onClick={(e) => {
                  e.preventDefault(); // Prevent double toggle from label
                  navigator.vibrate?.(10);
                  handleToggle(item.id, !item.is_checked);
                }}
              >
                {item.is_checked && <Check className="h-5 w-5 stroke-[3]" />}
              </button>
              <div className="flex-1 min-w-0 pt-1">
                <p className={cn(
                  'text-base font-medium leading-tight',
                  item.is_checked ? 'text-text-muted line-through' : 'text-text'
                )}>
                  {item.label}
                </p>
                {item.description && (
                  <p className="text-sm text-text-muted mt-1">{item.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

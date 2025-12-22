'use client';

import { useState } from 'react';
import { CheckSquare, Square, Camera, MessageSquare, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  photo_url?: string;
}

interface JobChecklist {
  id: string;
  template_name: string;
  items: ChecklistItem[];
  created_at: string;
}

interface JobChecklistProps {
  jobId: string;
  checklists: JobChecklist[];
  progress?: { total: number; completed: number; percentage: number };
  readOnly?: boolean;
  onUpdate?: () => void;
}

export function JobChecklist({
  jobId,
  checklists: initialChecklists,
  progress: initialProgress,
  readOnly = false,
  onUpdate,
}: JobChecklistProps) {
  const [checklists, setChecklists] = useState<JobChecklist[]>(initialChecklists);
  const [progress, setProgress] = useState(initialProgress || { total: 0, completed: 0, percentage: 0 });
  const [selectedItem, setSelectedItem] = useState<{ checklistId: string; item: ChecklistItem } | null>(null);
  const [itemNotes, setItemNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleToggleItem = async (checklistId: string, item: ChecklistItem) => {
    if (readOnly) return;

    // If completing an item and it requires additional info, show dialog
    if (!item.is_completed) {
      setSelectedItem({ checklistId, item });
      setItemNotes(item.notes || '');
      return;
    }

    // Uncompleting - just toggle
    await updateItem(checklistId, item.id, { isCompleted: false });
  };

  const updateItem = async (
    checklistId: string,
    itemId: string,
    updates: { isCompleted?: boolean; notes?: string; photoUrl?: string }
  ) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/checklists/${checklistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, ...updates }),
      });

      if (!response.ok) throw new Error('Failed to update item');

      // Update local state
      setChecklists(checklists.map(cl => {
        if (cl.id !== checklistId) return cl;
        return {
          ...cl,
          items: cl.items.map(i => {
            if (i.id !== itemId) return i;
            return {
              ...i,
              is_completed: updates.isCompleted ?? i.is_completed,
              notes: updates.notes ?? i.notes,
              photo_url: updates.photoUrl ?? i.photo_url,
              completed_at: updates.isCompleted ? new Date().toISOString() : undefined,
            };
          }),
        };
      }));

      // Update progress
      const allItems = checklists.flatMap(cl => cl.items);
      const completed = allItems.filter(i => i.is_completed).length + (updates.isCompleted ? 1 : -1);
      setProgress({
        total: allItems.length,
        completed,
        percentage: Math.round((completed / allItems.length) * 100),
      });

      setSelectedItem(null);
      setItemNotes('');
      onUpdate?.();
    } catch (error) {
      toast({ title: 'Failed to update checklist', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteItem = async () => {
    if (!selectedItem) return;

    await updateItem(selectedItem.checklistId, selectedItem.item.id, {
      isCompleted: true,
      notes: itemNotes || undefined,
    });
  };

  if (checklists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Job Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No checklist assigned to this job
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Job Checklist
          </CardTitle>
          <Badge variant={progress.percentage === 100 ? 'default' : 'outline'}>
            {progress.completed} / {progress.total}
          </Badge>
        </div>
        <Progress value={progress.percentage} className="mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {checklists.map((checklist) => (
            <div key={checklist.id}>
              <h4 className="font-medium mb-3">{checklist.template_name}</h4>
              <div className="space-y-2">
                {checklist.items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      item.is_completed ? 'bg-muted/50' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleToggleItem(checklist.id, item)}
                      disabled={readOnly}
                      className="mt-0.5"
                    >
                      {item.is_completed ? (
                        <CheckSquare className="h-5 w-5 text-green-500" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={item.is_completed ? 'line-through text-muted-foreground' : ''}>
                          {item.title}
                        </span>
                        {item.is_required && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      )}

                      {item.is_completed && item.completed_at && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(item.completed_at), 'MMM d, h:mm a')}
                          </span>
                          {item.notes && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {item.notes}
                            </span>
                          )}
                          {item.photo_url && (
                            <span className="flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              Photo attached
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Complete Item Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete: {selectedItem?.item.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedItem?.item.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedItem.item.description}
                </p>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Add any notes about this task..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
              <Button onClick={handleCompleteItem} disabled={submitting}>
                {submitting ? 'Saving...' : 'Mark Complete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

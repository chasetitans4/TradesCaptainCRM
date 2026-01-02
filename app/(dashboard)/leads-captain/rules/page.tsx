'use client';

// =====================================================
// LEADS CAPTAIN v2 RULES PAGE
// Visual rule builder for IF/THEN automation
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Plus,
  ArrowLeft,
  MoreVertical,
  Zap,
  GripVertical,
  Trash2,
  Edit,
  Copy,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { LeadsCaptainRule } from '@/types/leads-captain';

export default function LeadsCaptainRulesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<LeadsCaptainRule[]>([]);
  const [limits, setLimits] = useState<{ current: number; max: number; remaining: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<LeadsCaptainRule | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leads-captain/v2/rules?include_inactive=true');
      const data = await res.json();
      setRules(data.rules || []);
      setLimits(data.limits);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast.error('Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (rule: LeadsCaptainRule) => {
    try {
      await fetch(`/api/leads-captain/v2/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      });
      toast.success(`Rule ${rule.is_active ? 'disabled' : 'enabled'}`);
      fetchRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const deleteRule = async () => {
    if (!ruleToDelete) return;
    try {
      const res = await fetch(`/api/leads-captain/v2/rules/${ruleToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success('Rule deleted');
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete rule');
    }
  };

  const formatConditions = (rule: LeadsCaptainRule): string => {
    const conditions = rule.conditions.conditions;
    if (conditions.length === 0) return 'No conditions';

    const parts = conditions.slice(0, 2).map((c) => {
      if (c.field === 'intent') return `intent is ${c.value}`;
      if (c.field === 'time') return `${c.value}`;
      if (c.field === 'sentiment') return `sentiment is ${c.value}`;
      if (c.field === 'message_contains') {
        const val = Array.isArray(c.value) ? c.value[0] : c.value;
        return `message contains "${val}"`;
      }
      return `${c.field} ${c.operator} ${c.value}`;
    });

    const result = parts.join(` ${rule.conditions.operator} `);
    if (conditions.length > 2) {
      return `${result} (+${conditions.length - 2} more)`;
    }
    return result;
  };

  const formatActions = (rule: LeadsCaptainRule): string[] => {
    const actions: string[] = [];
    if (rule.actions.send_template) actions.push('Send template');
    if (rule.actions.send_text) actions.push('Send text');
    if (rule.actions.use_ai) actions.push('Use AI');
    if (rule.actions.do_not_respond) actions.push('No response');
    if (rule.actions.notify) actions.push('Notify');
    if (rule.actions.escalate_to_human) actions.push('Escalate');
    if (rule.actions.stop_ai) actions.push('Stop AI');
    return actions;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads-captain')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Automation Rules</h1>
            <p className="text-muted-foreground">
              Rules are evaluated in order - first match wins
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {limits && (
            <span className="text-sm text-muted-foreground">
              {limits.current} / {limits.max} rules
            </span>
          )}
          <Button
            onClick={() => toast.info('Rule builder coming soon!')}
            disabled={!!(limits && limits.remaining === 0)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Rules</CardTitle>
          <CardDescription>
            Drag to reorder priority. Lower priority number = higher priority.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No rules configured</p>
              <p className="text-sm">Add rules to automate responses</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    !rule.is_active ? 'opacity-50 bg-muted/50' : ''
                  }`}
                >
                  <div className="cursor-grab">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {rule.priority}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{rule.name}</span>
                      {rule.is_system && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          System
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      IF {formatConditions(rule)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {formatActions(rule).map((action) => (
                      <Badge key={action} variant="outline" className="whitespace-nowrap">
                        {action}
                      </Badge>
                    ))}
                  </div>

                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={() => toggleRule(rule)}
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast.info('Edit coming soon!')}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info('Duplicate coming soon!')}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      {!rule.is_system && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setRuleToDelete(rule);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{ruleToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteRule}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

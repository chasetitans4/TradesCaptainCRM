'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserWithBusiness } from '@/types';
import type { VoiceEmergencyRule, PhraseType } from '@/types/voice-receptionist';
import {
  ArrowLeft,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Check,
  Loader2,
  X,
  Zap,
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { value: 'water_leak', label: 'Water Leak / Flooding' },
  { value: 'gas_leak', label: 'Gas Leak' },
  { value: 'no_heat', label: 'No Heat' },
  { value: 'no_ac', label: 'No AC / Cooling' },
  { value: 'electrical_hazard', label: 'Electrical Hazard' },
  { value: 'security_breach', label: 'Security Issue' },
  { value: 'fire_damage', label: 'Fire Damage' },
  { value: 'custom', label: 'Custom Category' },
];

interface EditingRule {
  id?: string;
  category: string;
  customCategory?: string;
  is_enabled: boolean;
  caller_confirmation_enabled: boolean;
  keypad_override_enabled: boolean;
  escalation_wait_minutes: number;
  phrases: Array<{ phrase: string; phrase_type: PhraseType }>;
}

export default function EmergencyRulesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<VoiceEmergencyRule[]>([]);
  const { toast } = useToast();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EditingRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  // New phrase input
  const [newPhrase, setNewPhrase] = useState('');
  const [newPhraseType, setNewPhraseType] = useState<PhraseType>('optional');

  const loadData = useCallback(async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    try {
      const response = await fetch('/api/voice/emergency-rules');
      if (response.ok) {
        const data = await response.json();
        setRules(data.rules || []);
      }
    } catch (error) {
      toast({
        title: 'Failed to load emergency rules',
        description: 'Please try again',
        variant: 'destructive',
      });
    }

    setLoading(false);
  }, [router, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openNewRuleDialog() {
    setEditingRule({
      category: '',
      is_enabled: true,
      caller_confirmation_enabled: true,
      keypad_override_enabled: false,
      escalation_wait_minutes: 3,
      phrases: [],
    });
    setDialogOpen(true);
  }

  function openEditRuleDialog(rule: VoiceEmergencyRule) {
    setEditingRule({
      id: rule.id,
      category: rule.category,
      is_enabled: rule.is_enabled,
      caller_confirmation_enabled: rule.caller_confirmation_enabled,
      keypad_override_enabled: rule.keypad_override_enabled,
      escalation_wait_minutes: rule.escalation_wait_minutes,
      phrases: (rule.phrases || []).map((p) => ({
        phrase: p.phrase,
        phrase_type: p.phrase_type,
      })),
    });
    setDialogOpen(true);
  }

  function addPhrase() {
    if (!newPhrase.trim() || !editingRule) return;

    setEditingRule({
      ...editingRule,
      phrases: [
        ...editingRule.phrases,
        { phrase: newPhrase.trim(), phrase_type: newPhraseType },
      ],
    });
    setNewPhrase('');
  }

  function removePhrase(index: number) {
    if (!editingRule) return;

    setEditingRule({
      ...editingRule,
      phrases: editingRule.phrases.filter((_, i) => i !== index),
    });
  }

  async function saveRule() {
    if (!editingRule) return;

    const category =
      editingRule.category === 'custom' && editingRule.customCategory
        ? editingRule.customCategory.toLowerCase().replace(/\s+/g, '_')
        : editingRule.category;

    if (!category) {
      toast({
        title: 'Category required',
        description: 'Please select or enter a category',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const url = editingRule.id
        ? `/api/voice/emergency-rules/${editingRule.id}`
        : '/api/voice/emergency-rules';

      const method = editingRule.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          is_enabled: editingRule.is_enabled,
          caller_confirmation_enabled: editingRule.caller_confirmation_enabled,
          keypad_override_enabled: editingRule.keypad_override_enabled,
          escalation_wait_minutes: editingRule.escalation_wait_minutes,
          phrases: editingRule.phrases,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save rule');
      }

      toast({
        title: editingRule.id ? 'Rule updated' : 'Rule created',
        description: 'Emergency rule has been saved.',
      });

      setDialogOpen(false);
      setEditingRule(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Failed to save rule',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm('Are you sure you want to delete this emergency rule?')) return;

    setDeleting(ruleId);
    try {
      const response = await fetch(`/api/voice/emergency-rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      toast({
        title: 'Rule deleted',
        description: 'Emergency rule has been removed.',
      });

      loadData();
    } catch (error) {
      toast({
        title: 'Failed to delete rule',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  }

  async function initializeDefaults() {
    if (rules.length > 0) {
      if (!confirm('This will add default emergency rules. Existing rules will not be affected. Continue?')) {
        return;
      }
    }

    setInitializing(true);
    try {
      const response = await fetch('/api/voice/emergency-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize_defaults' }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize defaults');
      }

      toast({
        title: 'Default rules created',
        description: 'Emergency rules have been initialized with common scenarios.',
      });

      loadData();
    } catch (error) {
      toast({
        title: 'Failed to initialize defaults',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setInitializing(false);
    }
  }

  function formatCategory(category: string): string {
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  if (loading || !user) {
    return <EmergencyRulesSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Emergency Rules</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Info Card */}
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-text">Emergency Detection</p>
            <p className="text-sm text-text-muted mt-1">
              When these trigger phrases are detected, the AI will confirm with the caller
              and escalate to staff immediately, including outbound voice calls.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={openNewRuleDialog} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
          {rules.length === 0 && (
            <Button
              variant="outline"
              onClick={initializeDefaults}
              disabled={initializing}
            >
              {initializing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Rules List */}
        {rules.length === 0 ? (
          <div className="card p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <h3 className="font-semibold text-text mb-2">No Emergency Rules</h3>
            <p className="text-sm text-text-muted mb-4">
              Create rules to detect and handle emergency situations.
            </p>
            <Button variant="outline" onClick={initializeDefaults} disabled={initializing}>
              {initializing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Initialize Default Rules
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  'card p-4 border-l-4',
                  rule.is_enabled ? 'border-l-danger' : 'border-l-muted'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-text">
                        {formatCategory(rule.category)}
                      </h3>
                      {!rule.is_enabled && (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>

                    {rule.phrases && rule.phrases.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.phrases.slice(0, 3).map((phrase, i) => (
                          <Badge
                            key={i}
                            variant={phrase.phrase_type === 'required' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {phrase.phrase}
                          </Badge>
                        ))}
                        {rule.phrases.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{rule.phrases.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      {rule.caller_confirmation_enabled && (
                        <span>Asks confirmation</span>
                      )}
                      <span>
                        {rule.escalation_wait_minutes} min escalation wait
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditRuleDialog(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRule(rule.id)}
                      disabled={deleting === rule.id}
                    >
                      {deleting === rule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-danger" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule?.id ? 'Edit Emergency Rule' : 'New Emergency Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure when and how this emergency type is detected.
            </DialogDescription>
          </DialogHeader>

          {editingRule && (
            <div className="space-y-4 py-4">
              {/* Category */}
              <div>
                <Label>Emergency Category</Label>
                <Select
                  value={editingRule.category}
                  onValueChange={(value) =>
                    setEditingRule({ ...editingRule, category: value })
                  }
                  disabled={!!editingRule.id}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {editingRule.category === 'custom' && (
                  <Input
                    placeholder="Enter custom category name"
                    value={editingRule.customCategory || ''}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        customCategory: e.target.value,
                      })
                    }
                    className="mt-2"
                  />
                )}
              </div>

              {/* Enabled */}
              <div className="flex items-center justify-between">
                <Label>Enabled</Label>
                <Switch
                  checked={editingRule.is_enabled}
                  onCheckedChange={(checked) =>
                    setEditingRule({ ...editingRule, is_enabled: checked })
                  }
                />
              </div>

              {/* Caller Confirmation */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Caller Confirmation</Label>
                  <p className="text-xs text-text-muted">
                    Ask caller to confirm emergency
                  </p>
                </div>
                <Switch
                  checked={editingRule.caller_confirmation_enabled}
                  onCheckedChange={(checked) =>
                    setEditingRule({
                      ...editingRule,
                      caller_confirmation_enabled: checked,
                    })
                  }
                />
              </div>

              {/* Escalation Wait */}
              <div>
                <Label>Escalation Wait (minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={editingRule.escalation_wait_minutes}
                  onChange={(e) =>
                    setEditingRule({
                      ...editingRule,
                      escalation_wait_minutes: parseInt(e.target.value) || 3,
                    })
                  }
                  className="mt-1 w-24"
                />
              </div>

              {/* Trigger Phrases */}
              <div>
                <Label>Trigger Phrases</Label>
                <div className="mt-2 space-y-2">
                  {editingRule.phrases.map((phrase, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                    >
                      <Badge
                        variant={
                          phrase.phrase_type === 'required'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {phrase.phrase_type}
                      </Badge>
                      <span className="flex-1 text-sm">{phrase.phrase}</span>
                      <button
                        onClick={() => removePhrase(index)}
                        className="text-text-muted hover:text-danger"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add trigger phrase..."
                      value={newPhrase}
                      onChange={(e) => setNewPhrase(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addPhrase()}
                      className="flex-1"
                    />
                    <Select
                      value={newPhraseType}
                      onValueChange={(v) => setNewPhraseType(v as PhraseType)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required">Required</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={addPhrase}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-xs text-text-muted">
                    <strong>Required:</strong> Triggers emergency immediately.{' '}
                    <strong>Optional:</strong> Requires caller confirmation.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRule} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Rule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmergencyRulesSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-6 w-40 skeleton rounded" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-4">
        <div className="card p-4 h-24 skeleton" />
        <div className="card p-4 h-20 skeleton" />
        <div className="card p-4 h-20 skeleton" />
      </div>
    </div>
  );
}

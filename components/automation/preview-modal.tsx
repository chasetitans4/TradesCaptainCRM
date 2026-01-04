'use client';

// =====================================================
// AUTOMATION PREVIEW MODAL
// Shows preview of what automation will do before activation
// Per Section 3.3 - Block activation without preview confirmation
// =====================================================

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Zap,
  FileText,
  Clock,
  User,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  conditions: {
    operator: 'AND' | 'OR';
    conditions: Array<{
      field: string;
      operator: string;
      value: string | string[] | number | boolean;
    }>;
  };
  actions: {
    send_template?: string;
    send_text?: string;
    use_ai?: boolean;
    escalate_to_human?: boolean;
    do_not_respond?: boolean;
    set_hot_lead?: boolean;
    notify?: {
      recipients: string[];
      methods: string[];
    };
  };
}

interface PreviewScenario {
  trigger: string;
  incomingMessage: string;
  response: string;
  explanation: string;
  warnings: string[];
}

interface AutomationPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: AutomationRule;
  templateContent?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AutomationPreviewModal({
  open,
  onOpenChange,
  rule,
  templateContent,
  onConfirm,
  onCancel,
}: AutomationPreviewModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  // Generate example scenario based on rule conditions
  const generateScenario = (): PreviewScenario => {
    const trigger = describeConditions(rule.conditions);
    const incomingMessage = generateExampleMessage(rule.conditions);
    const response = templateContent || rule.actions.send_text || (rule.actions.use_ai ? '[AI-generated response]' : '[No response]');
    const explanation = describeActions(rule.actions);
    const warnings = getWarnings(rule);

    return { trigger, incomingMessage, response, explanation, warnings };
  };

  const scenario = generateScenario();

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Preview: {rule.name}
          </DialogTitle>
          <DialogDescription>
            Review what this automation will do before activating it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trigger Description */}
          <div className="rounded-lg border p-3 bg-muted/50">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">When triggered by:</p>
                <p className="text-sm text-muted-foreground">{scenario.trigger}</p>
              </div>
            </div>
          </div>

          {/* Example Conversation */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Example scenario:</p>

            {/* Incoming Message */}
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Customer sends:</p>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm">{scenario.incomingMessage}</p>
                </div>
              </div>
            </div>

            {/* Response */}
            {!rule.actions.do_not_respond && (
              <div className="flex gap-2 justify-end">
                <div className="flex-1 text-right">
                  <p className="text-xs text-muted-foreground mb-1">
                    {rule.actions.use_ai ? 'AI responds:' : 'Template responds:'}
                  </p>
                  <div className="rounded-lg bg-primary text-primary-foreground p-3 inline-block text-left">
                    <p className="text-sm">{scenario.response}</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {rule.actions.use_ai ? (
                    <Bot className="h-4 w-4 text-primary" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions Summary */}
          <div>
            <p className="text-sm font-medium mb-2">This rule will:</p>
            <ul className="space-y-1">
              {scenario.explanation.split('\n').filter(Boolean).map((action, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  {action}
                </li>
              ))}
            </ul>
          </div>

          {/* Warnings */}
          {scenario.warnings.length > 0 && (
            <div className="rounded-lg border-yellow-500/50 border bg-yellow-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    Review before activating:
                  </p>
                  <ul className="mt-1 space-y-1">
                    {scenario.warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-yellow-600 dark:text-yellow-400">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Audit Entry Preview */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Audit entry that will be created:
            </p>
            <div className="font-mono text-xs bg-background rounded p-2 overflow-x-auto">
              <pre className="text-muted-foreground">
{`{
  "trigger_event": "${rule.conditions.conditions[0]?.field || 'message_received'}",
  "rule_id": "${rule.id}",
  "actor_id": null,
  "consent_state_at_send": "[captured at send time]"
}`}
              </pre>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Activate Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions

function describeConditions(conditions: AutomationRule['conditions']): string {
  const parts = conditions.conditions.map((c) => {
    const field = formatFieldName(c.field);
    const op = formatOperator(c.operator);
    const value = Array.isArray(c.value) ? c.value.join(', ') : String(c.value);
    return `${field} ${op} "${value}"`;
  });

  return parts.join(` ${conditions.operator} `);
}

function formatFieldName(field: string): string {
  const names: Record<string, string> = {
    intent: 'Message intent',
    time: 'Time',
    message_contains: 'Message contains',
    sentiment: 'Sentiment',
    confidence: 'AI confidence',
    customer_status: 'Customer status',
    conversation_length: 'Conversation length',
    is_first_message: 'Is first message',
  };
  return names[field] || field;
}

function formatOperator(op: string): string {
  const operators: Record<string, string> = {
    equals: 'is',
    not_equals: 'is not',
    contains: 'contains',
    not_contains: 'does not contain',
    any: 'is any of',
    all: 'is all of',
    is: 'is',
    greater_than: 'is greater than',
    less_than: 'is less than',
  };
  return operators[op] || op;
}

function generateExampleMessage(conditions: AutomationRule['conditions']): string {
  // Generate a realistic example message based on conditions
  const intentCondition = conditions.conditions.find((c) => c.field === 'intent');
  const containsCondition = conditions.conditions.find((c) => c.field === 'message_contains');

  if (containsCondition) {
    const keyword = Array.isArray(containsCondition.value)
      ? containsCondition.value[0]
      : String(containsCondition.value);
    return `Hi, I need help with ${keyword}. Can someone call me back?`;
  }

  const examples: Record<string, string> = {
    new_lead: 'Hi, I saw your ad and I need a plumber. Do you do drain cleaning?',
    pricing: 'How much do you charge for a basic service call?',
    emergency: 'HELP! My pipe burst and water is everywhere!',
    schedule: 'Can I schedule an appointment for this Thursday?',
    availability: 'Are you available this weekend?',
  };

  const intent = String(intentCondition?.value || 'new_lead');
  return examples[intent] || 'Hi, I need some help with a service.';
}

function describeActions(actions: AutomationRule['actions']): string {
  const descriptions: string[] = [];

  if (actions.send_template) {
    descriptions.push('Send the configured template response');
  }
  if (actions.send_text) {
    descriptions.push('Send a custom text response');
  }
  if (actions.use_ai) {
    // Section 8.1: "AI sent this message" → "Suggested response (you approved)"
    descriptions.push('Draft a suggested response for your approval');
  }
  if (actions.do_not_respond) {
    descriptions.push('Do not send any response');
  }
  if (actions.escalate_to_human) {
    descriptions.push('Escalate to human for manual handling');
  }
  if (actions.set_hot_lead) {
    descriptions.push('Mark as hot lead for priority follow-up');
  }
  if (actions.notify?.recipients?.length) {
    descriptions.push(`Notify team via ${actions.notify.methods.join(', ')}`);
  }

  return descriptions.join('\n');
}

function getWarnings(rule: AutomationRule): string[] {
  const warnings: string[] = [];

  if (rule.actions.use_ai && !rule.actions.escalate_to_human) {
    // Section 8.1 compliant language
    warnings.push('Suggested responses are enabled without human escalation fallback');
  }

  const hasTimeCondition = rule.conditions.conditions.some((c) => c.field === 'time');
  if (!hasTimeCondition) {
    warnings.push('This rule will trigger at any time of day');
  }

  if (rule.actions.notify?.recipients?.length === 0) {
    warnings.push('No team notifications configured');
  }

  return warnings;
}

/**
 * Hook to require preview before rule activation
 */
export function useAutomationPreview() {
  const [previewRule, setPreviewRule] = useState<AutomationRule | null>(null);
  const [templateContent, setTemplateContent] = useState<string | undefined>();
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  const showPreview = (
    rule: AutomationRule,
    template?: string,
    onConfirm?: () => void
  ) => {
    setPreviewRule(rule);
    setTemplateContent(template);
    setOnConfirmCallback(() => onConfirm || null);
  };

  const hidePreview = () => {
    setPreviewRule(null);
    setTemplateContent(undefined);
    setOnConfirmCallback(null);
  };

  const handleConfirm = () => {
    onConfirmCallback?.();
    hidePreview();
  };

  return {
    previewRule,
    templateContent,
    showPreview,
    hidePreview,
    handleConfirm,
    isOpen: previewRule !== null,
  };
}

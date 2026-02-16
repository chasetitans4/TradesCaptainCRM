'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  calculateETA,
  createManualETA,
  getCurrentLocation,
  formatETA,
  QUICK_ETA_OPTIONS,
  type ETAResult,
  type Location,
} from '@/lib/location/eta-calculator';
import {
  Navigation,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Loader2,
  ChevronRight,
} from 'lucide-react';

/**
 * Message template variables
 */
export interface TemplateVariables {
  customerName: string;
  technicianName: string;
  companyName: string;
  jobAddress?: string;
  technicianPhone?: string;
  eta?: string;
  delayMinutes?: number;
  jobSummary?: string;
}

/**
 * Message template definition
 */
export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  requiresETA?: boolean;
  icon: React.ElementType;
}

/**
 * Pre-written templates per Constitution Section 3.12.2
 */
export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'on_my_way',
    name: 'On My Way',
    description: 'Let the customer know you\'re heading to them',
    template: 'Hi {customerName}, this is {technicianName} from {companyName}. I\'m on my way and should arrive {eta}.',
    requiresETA: true,
    icon: Navigation,
  },
  {
    id: 'running_late',
    name: 'Running Late',
    description: 'Notify customer about a delay',
    template: 'Hi {customerName}, I\'m running about {delayMinutes} minutes behind schedule. I\'ll be there as soon as I can. Sorry for the delay.',
    requiresETA: false,
    icon: Clock,
  },
  {
    id: 'arrived',
    name: 'Arrived',
    description: 'Let customer know you\'ve arrived',
    template: 'Hi {customerName}, I\'ve arrived at {jobAddress}. I\'m at the front door.',
    icon: CheckCircle,
  },
  {
    id: 'job_complete',
    name: 'Job Complete',
    description: 'Notify customer the work is done',
    template: 'Hi {customerName}, the work is complete. {jobSummary} Let me know if you have any questions.',
    icon: CheckCircle,
  },
  {
    id: 'need_access',
    name: 'Need Access',
    description: 'Request access to the property',
    template: 'Hi {customerName}, I\'m at {jobAddress} but couldn\'t get access. Please call me at {technicianPhone}.',
    icon: AlertCircle,
  },
];

/**
 * Fill template with variables
 */
export function fillTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let filled = template;

  // Replace all variables
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined) {
      filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
  });

  // Remove any unfilled variables
  filled = filled.replace(/\{[^}]+\}/g, '');

  // Clean up double spaces
  filled = filled.replace(/\s+/g, ' ').trim();

  return filled;
}

interface ETAMessageTemplatesProps {
  /** Template variables to fill */
  variables: Omit<TemplateVariables, 'eta' | 'delayMinutes'>;
  /** Destination coordinates for ETA calculation */
  destinationCoords?: Location;
  /** Callback when a message is ready to send */
  onSend: (message: string, templateId: string) => void;
  /** Additional class names */
  className?: string;
}

/**
 * ETA Message Templates Component
 *
 * Per Design Constitution Section 3.12.2:
 * - Pre-written templates eliminate typing
 * - Templates auto-fill with variables
 * - 2 taps max to send (template + send)
 */
export function ETAMessageTemplates({
  variables,
  destinationCoords,
  onSend,
  className,
}: ETAMessageTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [eta, setEta] = useState<ETAResult | null>(null);
  const [isCalculatingETA, setIsCalculatingETA] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [previewMessage, setPreviewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Calculate ETA when destination is available
  const calculateETAForTemplate = useCallback(async () => {
    if (!destinationCoords) return;

    setIsCalculatingETA(true);
    try {
      const result = await calculateETA(destinationCoords);
      setEta(result);
    } catch (error) {
      console.error('ETA calculation failed:', error);
    } finally {
      setIsCalculatingETA(false);
    }
  }, [destinationCoords]);

  // Update preview message when selection or variables change
  useEffect(() => {
    if (!selectedTemplate) {
      setPreviewMessage('');
      return;
    }

    const templateVars: TemplateVariables = {
      ...variables,
      eta: eta?.formattedETA || 'soon',
      delayMinutes,
    };

    const filled = fillTemplate(selectedTemplate.template, templateVars);
    setPreviewMessage(filled);
  }, [selectedTemplate, variables, eta, delayMinutes]);

  // Handle template selection
  const handleSelectTemplate = useCallback(
    async (template: MessageTemplate) => {
      setSelectedTemplate(template);

      // Calculate ETA if required and not already calculated
      if (template.requiresETA && !eta && destinationCoords) {
        await calculateETAForTemplate();
      }
    },
    [eta, destinationCoords, calculateETAForTemplate]
  );

  // Handle send
  const handleSend = useCallback(() => {
    if (!selectedTemplate || !previewMessage) return;

    setIsSending(true);
    onSend(previewMessage, selectedTemplate.id);

    // Reset after send
    setTimeout(() => {
      setIsSending(false);
      setSelectedTemplate(null);
    }, 500);
  }, [selectedTemplate, previewMessage, onSend]);

  // Handle manual ETA selection
  const handleManualETA = useCallback((minutes: number) => {
    const manualResult = createManualETA(minutes);
    setEta(manualResult);
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Template Selection */}
      {!selectedTemplate && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text-muted px-1">
            Quick Messages
          </h3>
          <div className="space-y-2">
            {MESSAGE_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={cn(
                    // Constitution touch target
                    'min-h-[50px] w-full',
                    'flex items-center gap-3 px-4 py-3',
                    'bg-background border border-border rounded-xl',
                    'active:scale-[0.98] transition-all',
                    'text-left'
                  )}
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text">{template.name}</p>
                    <p className="text-sm text-text-muted truncate">
                      {template.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-text-muted" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Template - ETA Selection */}
      {selectedTemplate?.requiresETA && !eta && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-muted">
            Select arrival time
          </h3>

          {/* Auto-calculate option */}
          {destinationCoords && (
            <Button
              onClick={calculateETAForTemplate}
              disabled={isCalculatingETA}
              className="w-full h-12"
              variant="outline"
            >
              {isCalculatingETA ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  Auto-calculate ETA
                </>
              )}
            </Button>
          )}

          {/* Quick ETA options */}
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ETA_OPTIONS.map((option) => (
              <Button
                key={option.minutes}
                onClick={() => handleManualETA(option.minutes)}
                variant="outline"
                className="h-11"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Running Late - Delay Selection */}
      {selectedTemplate?.id === 'running_late' && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-muted">
            How late will you be?
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {[10, 15, 20, 30].map((mins) => (
              <Button
                key={mins}
                onClick={() => setDelayMinutes(mins)}
                variant={delayMinutes === mins ? 'default' : 'outline'}
                className="h-11"
              >
                {mins} min
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Message Preview */}
      {selectedTemplate && (eta || !selectedTemplate.requiresETA) && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-muted">Preview</h3>
          <div className="p-4 bg-muted/50 rounded-xl text-text">
            {previewMessage}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTemplate(null);
                setEta(null);
              }}
              className="flex-1 h-12"
            >
              Back
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || !previewMessage}
              className="flex-1 h-12"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Quick Send ETA Button
 * One-tap component for sending "On My Way" with auto ETA
 */
interface QuickETAButtonProps {
  variables: Omit<TemplateVariables, 'eta'>;
  destinationCoords?: Location;
  onSend: (message: string) => void;
  className?: string;
}

export function QuickETAButton({
  variables,
  destinationCoords,
  onSend,
  className,
}: QuickETAButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleQuickSend = useCallback(async () => {
    setIsLoading(true);

    try {
      let etaString = 'soon';

      if (destinationCoords) {
        const eta = await calculateETA(destinationCoords);
        if (eta) {
          etaString = eta.formattedETA;
        }
      }

      const template = MESSAGE_TEMPLATES.find((t) => t.id === 'on_my_way');
      if (template) {
        const message = fillTemplate(template.template, {
          ...variables,
          eta: etaString,
        });
        onSend(message);
      }
    } catch (error) {
      console.error('Quick ETA send failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [variables, destinationCoords, onSend]);

  return (
    <Button
      onClick={handleQuickSend}
      disabled={isLoading}
      className={cn('gap-2', className)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Navigation className="h-4 w-4" />
      )}
      Send ETA
    </Button>
  );
}

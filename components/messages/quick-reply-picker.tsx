'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import {
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  ThumbsUp,
  MapPin,
  Phone,
  Star,
  AlertCircle,
  Send,
  X,
  ChevronRight,
} from 'lucide-react';

interface QuickReplyTemplate {
  id: string;
  label: string;
  message: string;
  icon: React.ReactNode;
  category: 'scheduling' | 'confirmation' | 'follow_up' | 'general';
}

const DEFAULT_TEMPLATES: QuickReplyTemplate[] = [
  // Scheduling
  {
    id: 'schedule_confirm',
    label: 'Confirm Appointment',
    message: "Hi! This is a reminder that your appointment is scheduled for [DATE] at [TIME]. Please reply YES to confirm or call us to reschedule. Thank you!",
    icon: <Calendar className="h-4 w-4" />,
    category: 'scheduling',
  },
  {
    id: 'on_the_way',
    label: 'On My Way',
    message: "Good news! Our technician is on the way and should arrive within 30 minutes. Please ensure someone is available to let them in.",
    icon: <MapPin className="h-4 w-4" />,
    category: 'scheduling',
  },
  {
    id: 'running_late',
    label: 'Running Late',
    message: "We apologize, but our technician is running about 15-20 minutes behind schedule. We appreciate your patience and will be there as soon as possible.",
    icon: <Clock className="h-4 w-4" />,
    category: 'scheduling',
  },
  {
    id: 'reschedule_offer',
    label: 'Offer to Reschedule',
    message: "We understand things come up! Would you like to reschedule your appointment? Reply with a date and time that works better for you, and we'll do our best to accommodate.",
    icon: <Calendar className="h-4 w-4" />,
    category: 'scheduling',
  },

  // Confirmation
  {
    id: 'job_complete',
    label: 'Job Complete',
    message: "Great news! The work at your property has been completed. Please let us know if you have any questions or concerns. Thank you for choosing us!",
    icon: <CheckCircle2 className="h-4 w-4" />,
    category: 'confirmation',
  },
  {
    id: 'quote_sent',
    label: 'Quote Sent',
    message: "We've sent your quote to your email. Please review it at your convenience and let us know if you have any questions. We're happy to discuss the details!",
    icon: <Send className="h-4 w-4" />,
    category: 'confirmation',
  },
  {
    id: 'payment_received',
    label: 'Payment Received',
    message: "Thank you! We've received your payment. A receipt has been sent to your email. We appreciate your business!",
    icon: <ThumbsUp className="h-4 w-4" />,
    category: 'confirmation',
  },

  // Follow Up
  {
    id: 'follow_up_quote',
    label: 'Follow Up on Quote',
    message: "Hi! Just checking in on the quote we sent over. Do you have any questions, or would you like to move forward with scheduling? We're here to help!",
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'follow_up',
  },
  {
    id: 'request_review',
    label: 'Request Review',
    message: "Thank you for choosing us! If you were happy with our service, we'd really appreciate a quick review. It helps other customers find us!",
    icon: <Star className="h-4 w-4" />,
    category: 'follow_up',
  },
  {
    id: 'maintenance_reminder',
    label: 'Maintenance Reminder',
    message: "Hi! It's time for your scheduled maintenance. Regular service helps keep your equipment running efficiently. Would you like to schedule an appointment?",
    icon: <AlertCircle className="h-4 w-4" />,
    category: 'follow_up',
  },

  // General
  {
    id: 'call_back',
    label: 'Will Call Back',
    message: "Thank you for reaching out! We'll give you a call shortly to discuss your needs in more detail. Talk to you soon!",
    icon: <Phone className="h-4 w-4" />,
    category: 'general',
  },
  {
    id: 'more_info',
    label: 'Need More Info',
    message: "Thanks for contacting us! To better assist you, could you provide a bit more detail about the issue you're experiencing?",
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'general',
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  scheduling: 'Scheduling',
  confirmation: 'Confirmation',
  follow_up: 'Follow Up',
  general: 'General',
};

interface QuickReplyPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (message: string) => void;
  customerName?: string;
}

export function QuickReplyPicker({
  open,
  onOpenChange,
  onSelect,
  customerName,
}: QuickReplyPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<QuickReplyTemplate | null>(null);

  const categories = Array.from(new Set(DEFAULT_TEMPLATES.map((t) => t.category)));

  const filteredTemplates = selectedCategory
    ? DEFAULT_TEMPLATES.filter((t) => t.category === selectedCategory)
    : DEFAULT_TEMPLATES;

  const handleSelectTemplate = (template: QuickReplyTemplate) => {
    setPreviewTemplate(template);
  };

  const handleConfirmTemplate = () => {
    if (!previewTemplate) return;

    // Replace placeholders with actual values if available
    let message = previewTemplate.message;
    if (customerName) {
      message = message.replace(/Hi!/g, `Hi ${customerName}!`);
    }

    onSelect(message);
    onOpenChange(false);
    setPreviewTemplate(null);
    setSelectedCategory(null);
  };

  const handleBack = () => {
    if (previewTemplate) {
      setPreviewTemplate(null);
    } else if (selectedCategory) {
      setSelectedCategory(null);
    }
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(selectedCategory || previewTemplate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-1"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </Button>
            )}
            <h3 className="text-lg font-semibold">
              {previewTemplate
                ? 'Preview Message'
                : selectedCategory
                  ? CATEGORY_LABELS[selectedCategory]
                  : 'Quick Replies'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              onOpenChange(false);
              setPreviewTemplate(null);
              setSelectedCategory(null);
            }}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Preview Mode */}
        {previewTemplate ? (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm whitespace-pre-wrap">{previewTemplate.message}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: You can edit this message after inserting it.
            </p>
            <Button onClick={handleConfirmTemplate} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Use This Reply
            </Button>
          </div>
        ) : selectedCategory ? (
          /* Templates in selected category */
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{template.label}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {template.message.substring(0, 60)}...
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          /* Category selection */
          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => {
              const categoryTemplates = DEFAULT_TEMPLATES.filter(
                (t) => t.category === category
              );
              const firstIcon = categoryTemplates[0]?.icon;

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:bg-muted hover:border-primary/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {firstIcon}
                  </div>
                  <span className="font-medium text-sm">{CATEGORY_LABELS[category]}</span>
                  <span className="text-xs text-muted-foreground">
                    {categoryTemplates.length} templates
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// Compact trigger button for inline use
interface QuickReplyButtonProps {
  onClick: () => void;
  className?: string;
}

export function QuickReplyButton({ onClick, className }: QuickReplyButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn('shrink-0', className)}
      title="Quick replies"
    >
      <MessageSquare className="h-5 w-5" />
    </Button>
  );
}

'use client';

// =====================================================
// GUIDANCE ALERT COMPONENT
// In-app guidance messages for user onboarding
// Version: 1.0
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Lightbulb, AlertTriangle, Trophy, Info, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type GuidanceMessage,
  shouldShowMessage,
  dismissMessage,
} from '@/lib/onboarding/guidance-messages';

interface GuidanceAlertProps {
  message: GuidanceMessage;
  leadName?: string; // For personalized messages
  className?: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
}

const TYPE_CONFIG = {
  welcome: {
    icon: Sparkles,
    bg: 'bg-primary/10 border-primary/20',
    iconColor: 'text-primary',
  },
  empty_state: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-500',
  },
  milestone: {
    icon: Trophy,
    bg: 'bg-green-50 border-green-200',
    iconColor: 'text-green-500',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50 border-yellow-200',
    iconColor: 'text-yellow-600',
  },
  tip: {
    icon: Lightbulb,
    bg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-500',
  },
  weekly: {
    icon: Info,
    bg: 'bg-indigo-50 border-indigo-200',
    iconColor: 'text-indigo-500',
  },
};

export function GuidanceAlert({
  message,
  leadName,
  className,
  onAction,
  onSecondaryAction,
}: GuidanceAlertProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const config = TYPE_CONFIG[message.type];
  const Icon = config.icon;

  useEffect(() => {
    if (message.showOnce) {
      setVisible(shouldShowMessage(message.id));
    } else {
      setVisible(true);
    }
  }, [message.id, message.showOnce]);

  const handleDismiss = () => {
    if (message.showOnce) {
      dismissMessage(message.id);
    }
    setVisible(false);
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (message.action?.href) {
      router.push(message.action.href);
    }
    if (message.showOnce) {
      dismissMessage(message.id);
    }
  };

  const handleSecondaryAction = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    } else if (message.secondaryAction?.href) {
      router.push(message.secondaryAction.href);
    }
  };

  if (!visible) return null;

  // Format message with lead name if provided
  const formattedMessage = leadName
    ? `${leadName} ${message.message}`
    : message.message;

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4',
        config.bg,
        className
      )}
    >
      <div className="flex gap-3">
        <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900">{message.title}</h4>
          <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
            {formattedMessage}
          </p>

          {(message.action || message.secondaryAction) && (
            <div className="flex gap-2 mt-3">
              {message.action && (
                <Button size="sm" onClick={handleAction}>
                  {message.action.label}
                </Button>
              )}
              {message.secondaryAction && (
                <Button size="sm" variant="outline" onClick={handleSecondaryAction}>
                  {message.secondaryAction.label}
                </Button>
              )}
            </div>
          )}
        </div>

        {message.dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Compact version for inline tips
export function GuidanceTip({
  message,
  className,
}: {
  message: GuidanceMessage;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message.showOnce) {
      setVisible(shouldShowMessage(message.id));
    } else {
      setVisible(true);
    }
  }, [message.id, message.showOnce]);

  const handleDismiss = () => {
    if (message.showOnce) {
      dismissMessage(message.id);
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm bg-amber-50 text-amber-800 rounded-lg px-3 py-2',
        className
      )}
    >
      <Lightbulb className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">
        <strong>{message.title}:</strong> {message.message}
      </span>
      {message.dismissible && (
        <button onClick={handleDismiss} className="flex-shrink-0 hover:text-amber-900">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Empty state with guidance
export function EmptyStateGuidance({
  message,
  icon,
  className,
}: {
  message: GuidanceMessage;
  icon?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  const handleAction = () => {
    if (message.action?.href) {
      router.push(message.action.href);
    }
  };

  const handleSecondaryAction = () => {
    if (message.secondaryAction?.href) {
      router.push(message.secondaryAction.href);
    }
  };

  return (
    <div className={cn('text-center py-12 px-6', className)}>
      {icon && (
        <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{message.title}</h3>
      <p className="text-gray-500 max-w-md mx-auto mb-6">{message.message}</p>
      <div className="flex justify-center gap-3">
        {message.action && (
          <Button onClick={handleAction}>{message.action.label}</Button>
        )}
        {message.secondaryAction && (
          <Button variant="outline" onClick={handleSecondaryAction}>
            {message.secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export default GuidanceAlert;

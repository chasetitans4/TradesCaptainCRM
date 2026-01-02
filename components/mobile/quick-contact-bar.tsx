'use client';

import { cn } from '@/lib/utils';
import { Phone, MessageSquare, Mail, MapPin, ExternalLink } from 'lucide-react';

interface QuickContactBarProps {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  className?: string;
  layout?: '2x2' | 'row';
}

/**
 * Quick contact actions grid (Call, Text, Email, Navigate)
 *
 * 2x2 grid layout for maximum touch targets on mobile.
 * Falls back to row layout if only a few options are available.
 */
export function QuickContactBar({
  phone,
  email,
  address,
  className,
  layout = '2x2',
}: QuickContactBarProps) {
  const actions = [
    phone && {
      icon: Phone,
      label: 'Call',
      href: `tel:${phone.replace(/\D/g, '')}`,
      color: 'bg-green-100 text-green-700 hover:bg-green-200',
    },
    phone && {
      icon: MessageSquare,
      label: 'Text',
      href: `sms:${phone.replace(/\D/g, '')}`,
      color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    },
    email && {
      icon: Mail,
      label: 'Email',
      href: `mailto:${email}`,
      color: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    },
    address && {
      icon: MapPin,
      label: 'Navigate',
      href: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
      color: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
      external: true,
    },
  ].filter(Boolean) as {
    icon: typeof Phone;
    label: string;
    href: string;
    color: string;
    external?: boolean;
  }[];

  if (actions.length === 0) {
    return null;
  }

  // Use row layout if we have 3 or fewer actions
  const useRowLayout = layout === 'row' || actions.length <= 3;

  return (
    <div
      className={cn(
        useRowLayout ? 'flex gap-2' : 'grid grid-cols-2 gap-2',
        className
      )}
    >
      {actions.map((action) => (
        <a
          key={action.label}
          href={action.href}
          target={action.external ? '_blank' : undefined}
          rel={action.external ? 'noopener noreferrer' : undefined}
          className={cn(
            'flex items-center justify-center gap-2',
            'p-4 rounded-xl transition-colors',
            'active:scale-95',
            'min-h-[56px]',
            useRowLayout && 'flex-1',
            action.color
          )}
        >
          <action.icon className="h-5 w-5" />
          <span className="font-medium text-sm">{action.label}</span>
          {action.external && <ExternalLink className="h-3 w-3 opacity-60" />}
        </a>
      ))}
    </div>
  );
}

/**
 * Inline contact buttons (smaller, for use within cards)
 */
interface InlineContactButtonsProps {
  phone?: string | null;
  email?: string | null;
  className?: string;
}

export function InlineContactButtons({
  phone,
  email,
  className,
}: InlineContactButtonsProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {phone && (
        <>
          <a
            href={`tel:${phone.replace(/\D/g, '')}`}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            aria-label="Call"
          >
            <Phone className="h-4 w-4 text-muted-foreground" />
          </a>
          <a
            href={`sms:${phone.replace(/\D/g, '')}`}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            aria-label="Send text message"
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </a>
        </>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          aria-label="Send email"
        >
          <Mail className="h-4 w-4 text-muted-foreground" />
        </a>
      )}
    </div>
  );
}

/**
 * Address link with map navigation
 */
interface AddressWithNavigateProps {
  address: string;
  className?: string;
}

export function AddressWithNavigate({
  address,
  className,
}: AddressWithNavigateProps) {
  return (
    <a
      href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        'hover:text-foreground transition-colors',
        className
      )}
    >
      <MapPin className="h-4 w-4 shrink-0" />
      <span className="truncate">{address}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </a>
  );
}

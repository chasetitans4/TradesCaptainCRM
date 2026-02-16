'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  DollarSign,
  Clock,
  MessageSquare,
  Target,
  ChevronRight,
} from 'lucide-react';

/**
 * Command Strip - Swipeable horizontal ribbon with insight cards
 * Per Product Constitution v2.0 Section 6.1:
 * - Rule-based insights ("2 jobs blocking payment")
 * - Max 3 cards visible
 * - Swipeable on mobile
 */

export interface CommandStripCard {
  id: string;
  type: 'warning' | 'info' | 'success' | 'action';
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

interface CommandStripProps {
  cards: CommandStripCard[];
  className?: string;
}

const typeStyles = {
  warning: 'bg-tc-warning-muted border-tc-warning/20 text-tc-warning',
  info: 'bg-tc-info-muted border-tc-info/20 text-tc-info',
  success: 'bg-tc-success-muted border-tc-success/20 text-tc-success',
  action: 'bg-tc-accent-muted border-tc-accent/20 text-tc-accent',
};

export function CommandStrip({ cards, className }: CommandStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (cards.length === 0) return null;

  // Limit to max 3 cards
  const displayCards = cards.slice(0, 3);

  return (
    <div className={cn('relative', className)}>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-4 px-4"
      >
        {displayCards.map((card) => {
          const CardWrapper = card.href ? Link : 'button';
          const wrapperProps = card.href
            ? { href: card.href }
            : { onClick: card.onClick, type: 'button' as const };

          return (
            <CardWrapper
              key={card.id}
              {...(wrapperProps as any)}
              className={cn(
                'flex-shrink-0 w-[280px] snap-start rounded-xl border p-4',
                'flex items-start gap-3 text-left transition-transform active:scale-[0.98]',
                typeStyles[card.type]
              )}
            >
              <div className="flex-shrink-0 p-2 rounded-lg bg-white/50">
                {card.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-text-primary truncate">
                  {card.title}
                </p>
                <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                  {card.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted flex-shrink-0 self-center" />
            </CardWrapper>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Helper to generate command strip cards from business data
 */
export function generateCommandStripCards(data: {
  overdueInvoices?: number;
  overdueAmount?: number;
  unreadMessages?: number;
  newLeads?: number;
  jobsBlockingPayment?: number;
}): CommandStripCard[] {
  const cards: CommandStripCard[] = [];

  // Jobs blocking payment
  if (data.jobsBlockingPayment && data.jobsBlockingPayment > 0) {
    cards.push({
      id: 'jobs-blocking',
      type: 'warning',
      icon: <AlertTriangle className="h-5 w-5" />,
      title: `${data.jobsBlockingPayment} job${data.jobsBlockingPayment > 1 ? 's' : ''} blocking payment`,
      description: 'Complete these to unlock invoicing',
      href: '/jobs?status=completed&filter=unpaid',
    });
  }

  // Overdue invoices
  if (data.overdueInvoices && data.overdueInvoices > 0) {
    cards.push({
      id: 'overdue-invoices',
      type: 'warning',
      icon: <DollarSign className="h-5 w-5" />,
      title: `${data.overdueInvoices} overdue invoice${data.overdueInvoices > 1 ? 's' : ''}`,
      description: data.overdueAmount
        ? `$${data.overdueAmount.toLocaleString()} outstanding`
        : 'Follow up to collect payment',
      href: '/invoices?status=overdue',
    });
  }

  // Unread messages
  if (data.unreadMessages && data.unreadMessages > 0) {
    cards.push({
      id: 'unread-messages',
      type: 'info',
      icon: <MessageSquare className="h-5 w-5" />,
      title: `${data.unreadMessages} unread message${data.unreadMessages > 1 ? 's' : ''}`,
      description: 'Customers waiting for your reply',
      href: '/messages',
    });
  }

  // New leads
  if (data.newLeads && data.newLeads > 0) {
    cards.push({
      id: 'new-leads',
      type: 'action',
      icon: <Target className="h-5 w-5" />,
      title: `${data.newLeads} new lead${data.newLeads > 1 ? 's' : ''}`,
      description: 'Respond quickly to win the job',
      href: '/leads?stage=new',
    });
  }

  return cards;
}

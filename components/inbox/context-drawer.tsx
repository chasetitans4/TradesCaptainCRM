'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusPill } from '@/components/ui/status-pill';
import {
  X,
  Briefcase,
  User,
  FileText,
  Receipt,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  UserPlus,
} from 'lucide-react';

interface LinkedEntity {
  type: 'job' | 'lead' | 'customer' | 'invoice' | 'quote';
  id: string;
  title: string;
  status?: string;
  statusType?: 'active' | 'success' | 'warning' | 'danger' | 'muted' | 'info' | 'default';
  amount?: number;
  date?: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface ContextDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerInfo | null;
  linkedEntities?: LinkedEntity[];
  nextAction?: {
    label: string;
    href: string;
    icon?: React.ElementType;
  };
}

/**
 * Context Drawer - Converged Inbox Component
 * Per Product Constitution Phase 4
 *
 * Slide-up drawer showing:
 * - Linked job/lead/customer
 * - Status and balance due
 * - Next recommended action
 * - Tap → navigates to entity detail
 */
export function ContextDrawer({
  open,
  onOpenChange,
  customer,
  linkedEntities = [],
  nextAction,
}: ContextDrawerProps) {
  // Animate in/out
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
    }
  }, [open]);

  const handleTransitionEnd = () => {
    if (!open) {
      setMounted(false);
    }
  };

  if (!mounted && !open) return null;

  const getEntityIcon = (type: LinkedEntity['type']) => {
    switch (type) {
      case 'job':
        return Briefcase;
      case 'lead':
        return UserPlus;
      case 'customer':
        return User;
      case 'invoice':
        return Receipt;
      case 'quote':
        return FileText;
      default:
        return Briefcase;
    }
  };

  const getEntityHref = (entity: LinkedEntity) => {
    switch (entity.type) {
      case 'job':
        return `/jobs/${entity.id}`;
      case 'lead':
        return `/leads/${entity.id}`;
      case 'customer':
        return `/customers/${entity.id}`;
      case 'invoice':
        return `/invoices/${entity.id}`;
      case 'quote':
        return `/quotes/${entity.id}`;
      default:
        return '#';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-2xl shadow-md transition-transform duration-300 ease-out',
          'max-h-[70vh] overflow-hidden',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
        onTransitionEnd={handleTransitionEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
          <h3 className="text-h3 font-semibold text-text">Context</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 -mr-2 text-text-muted hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(70vh-80px)] p-4 space-y-4">
          {/* Customer Section */}
          {customer && (
            <Link
              href={`/customers/${customer.id}`}
              className="block p-3 bg-surface-muted rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text">{customer.name}</p>
                    {customer.phone && (
                      <p className="text-sm text-text-muted">{customer.phone}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-text-muted" />
              </div>

              {/* Contact quick actions */}
              <div className="flex gap-2 mt-3">
                {customer.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = `tel:${customer.phone}`;
                    }}
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                )}
                {customer.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = `mailto:${customer.email}`;
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                )}
              </div>
            </Link>
          )}

          {/* Linked Entities */}
          {linkedEntities.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-muted mb-2">
                Linked Items
              </h4>
              <div className="space-y-2">
                {linkedEntities.map((entity) => {
                  const Icon = getEntityIcon(entity.type);
                  return (
                    <Link
                      key={`${entity.type}-${entity.id}`}
                      href={getEntityHref(entity)}
                      className="flex items-center justify-between p-3 bg-surface-muted rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-tc-accent-muted flex items-center justify-center">
                          <Icon className="h-4 w-4 text-tc-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-text text-sm">
                            {entity.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {entity.status && entity.statusType && (
                              <StatusPill
                                variant={entity.statusType}
                                size="sm"
                              >
                                {entity.status}
                              </StatusPill>
                            )}
                            {entity.amount !== undefined && (
                              <span className="text-xs text-text-muted font-semibold">
                                {formatCurrency(entity.amount)}
                              </span>
                            )}
                            {entity.date && (
                              <span className="text-xs text-text-muted">
                                {entity.date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-text-muted" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next Recommended Action */}
          {nextAction && (
            <div className="pt-2">
              <Link href={nextAction.href}>
                <Button className="w-full gap-2" data-primary-cta="true">
                  {nextAction.icon && <nextAction.icon className="h-5 w-5" />}
                  {nextAction.label}
                </Button>
              </Link>
            </div>
          )}

          {/* Empty state if no context */}
          {!customer && linkedEntities.length === 0 && (
            <div className="text-center py-6">
              <User className="h-10 w-10 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">
                No linked customer or items
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Wrench,
  ClipboardList,
  FileText,
  Receipt,
  Phone,
  MessageSquare,
  Navigation,
  PlayCircle,
  CheckCircle,
  StickyNote,
} from 'lucide-react';
import type { QuickActionItem, PrimaryCTAProps } from '@/components/mobile/quick-action-bar';
import type { JobStatus } from '@/types';

/**
 * Job Context for Quick Actions
 * Per Design Constitution Section 3.7.3 - Context-Action Mapping
 */
export type JobQuickActionContext = {
  jobId: string;
  jobStatus: JobStatus;
  customerId: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  /** Number of photos pending upload (for badge) */
  pendingPhotos?: number;
  /** Whether user can edit this job */
  canEdit: boolean;
};

export interface JobQuickActionsResult {
  /** Quick action items for the action bar */
  actions: QuickActionItem[];
  /** Primary CTA based on job status */
  primaryCTA?: PrimaryCTAProps;
}

/**
 * Hook to get Constitution-compliant quick actions based on job context
 *
 * Per Design Constitution Section 3.7.3 - Context-Action Mapping:
 *
 * | Context              | Available Quick Actions                    | Primary CTA      |
 * |----------------------|-------------------------------------------|------------------|
 * | Job (Not Started)    | Photos, Equipment, Quote                  | Start Job        |
 * | Job (In Progress)    | Photos, Parts, Equipment, Quote, Invoice  | Mark Complete    |
 * | Job (Complete)       | Photos, Invoice, Equipment                | View Invoice     |
 *
 * One-Tap Principle (Section 3.7.5):
 * - Take a photo: 1 tap (opens camera directly)
 * - Log a part: 1 tap (opens part entry modal)
 * - View equipment: 1 tap (opens equipment panel)
 * - Start a quote: 1 tap (opens quote builder)
 * - Send invoice: 1 tap (opens invoice preview)
 * - Mark complete: 1 tap (triggers completion flow)
 */
export function useJobQuickActions(
  context: JobQuickActionContext,
  callbacks: {
    onTakePhoto: () => void;
    onLogParts?: () => void;
    onViewEquipment?: () => void;
    onAddNote?: () => void;
    onStartJob?: () => void;
    onCompleteJob?: () => void;
    onUpdateStatus?: (status: JobStatus) => void;
  }
): JobQuickActionsResult {
  const router = useRouter();

  return useMemo(() => {
    const { jobId, jobStatus, customerId, customerPhone, customerAddress, pendingPhotos, canEdit } = context;
    const actions: QuickActionItem[] = [];
    let primaryCTA: PrimaryCTAProps | undefined;

    // Common actions available across most states
    const photoAction: QuickActionItem = {
      icon: Camera,
      label: 'Photos',
      onClick: callbacks.onTakePhoto,
      badge: pendingPhotos,
    };

    const equipmentAction: QuickActionItem = {
      icon: ClipboardList,
      label: 'Equipment',
      onClick: callbacks.onViewEquipment || (() => router.push(`/customers/${customerId}/equipment`)),
    };

    const quoteAction: QuickActionItem = {
      icon: FileText,
      label: 'Quote',
      onClick: () => router.push(`/quotes/new?job_id=${jobId}&customer_id=${customerId}`),
    };

    const invoiceAction: QuickActionItem = {
      icon: Receipt,
      label: 'Invoice',
      onClick: () => router.push(`/invoices/new?job_id=${jobId}&customer_id=${customerId}`),
    };

    const partsAction: QuickActionItem = {
      icon: Wrench,
      label: 'Parts',
      onClick: callbacks.onLogParts || (() => router.push(`/jobs/${jobId}/parts`)),
    };

    const noteAction: QuickActionItem = {
      icon: StickyNote,
      label: 'Notes',
      onClick: callbacks.onAddNote || (() => {}),
    };

    // Build actions based on job status
    // Per Design Constitution Section 3.7.3
    switch (jobStatus) {
      case 'scheduled':
        // Job Not Started: Photos, Equipment, Quote + Start Job CTA
        actions.push(photoAction, equipmentAction, quoteAction, noteAction);
        if (canEdit) {
          primaryCTA = {
            label: 'Start Job',
            icon: PlayCircle,
            onClick: callbacks.onStartJob || (() => callbacks.onUpdateStatus?.('in_progress')),
            variant: 'default',
          };
        }
        break;

      case 'in_progress':
        // Job In Progress: Photos, Parts, Equipment, Quote, Invoice + Mark Complete CTA
        actions.push(photoAction, partsAction, equipmentAction, noteAction);
        if (canEdit) {
          primaryCTA = {
            label: 'Mark Complete',
            icon: CheckCircle,
            onClick: callbacks.onCompleteJob || (() => callbacks.onUpdateStatus?.('completed')),
            variant: 'success',
          };
        }
        break;

      case 'completed':
        // Job Complete: Photos, Invoice, Equipment + View/Send Invoice CTA
        actions.push(photoAction, invoiceAction, equipmentAction, noteAction);
        primaryCTA = {
          label: 'Send Invoice',
          icon: Receipt,
          onClick: () => router.push(`/invoices/new?job_id=${jobId}&customer_id=${customerId}`),
          variant: 'default',
        };
        break;

      case 'cancelled':
      case 'no_show':
        // Cancelled/No Show: Limited actions (view only)
        actions.push(photoAction, noteAction);
        // No primary CTA for cancelled jobs
        break;

      default:
        // Fallback: basic actions
        actions.push(photoAction, equipmentAction);
    }

    return { actions, primaryCTA };
  }, [context, callbacks, router]);
}

/**
 * Hook for Customer Detail quick actions
 * Per Design Constitution Section 3.7.3
 */
export function useCustomerQuickActions(
  customerId: string,
  customerPhone?: string | null,
  customerEmail?: string | null,
  customerAddress?: string | null
): QuickActionItem[] {
  const router = useRouter();

  return useMemo(() => {
    const actions: QuickActionItem[] = [];

    // New Job - Primary action for customer context
    actions.push({
      icon: FileText,
      label: 'New Job',
      onClick: () => router.push(`/jobs/new?customer_id=${customerId}`),
    });

    // Call - if phone available
    if (customerPhone) {
      actions.push({
        icon: Phone,
        label: 'Call',
        onClick: () => window.location.href = `tel:${customerPhone}`,
      });
    }

    // Text - if phone available
    if (customerPhone) {
      actions.push({
        icon: MessageSquare,
        label: 'Text',
        onClick: () => window.location.href = `sms:${customerPhone}`,
      });
    }

    // Navigate - if address available
    if (customerAddress) {
      actions.push({
        icon: Navigation,
        label: 'Navigate',
        onClick: () => {
          const encoded = encodeURIComponent(customerAddress);
          // Try Apple Maps first (iOS), fallback to Google Maps
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          const url = isIOS
            ? `maps://maps.apple.com/?daddr=${encoded}`
            : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
          window.open(url, '_blank');
        },
      });
    }

    return actions;
  }, [customerId, customerPhone, customerEmail, customerAddress, router]);
}

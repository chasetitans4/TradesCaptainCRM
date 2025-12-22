'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontal,
  Trash2,
  Download,
  Archive,
  Tag,
  Send,
  UserPlus,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

export type BulkAction = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive';
  confirmTitle?: string;
  confirmDescription?: string;
  handler: (selectedIds: string[]) => Promise<void>;
};

interface BulkActionsProps {
  selectedIds: string[];
  actions: BulkAction[];
  onActionComplete?: () => void;
}

export function BulkActions({
  selectedIds,
  actions,
  onActionComplete,
}: BulkActionsProps) {
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: BulkAction) => {
    if (action.confirmTitle) {
      setConfirmAction(action);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: BulkAction) => {
    setLoading(true);
    try {
      await action.handler(selectedIds);
      onActionComplete?.();
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setLoading(false);
      setConfirmAction(null);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <MoreHorizontal className="h-4 w-4 mr-2" />
            )}
            Actions ({selectedIds.length})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {actions.map((action, index) => (
            <div key={action.id}>
              {index > 0 && action.variant === 'destructive' && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem
                onClick={() => handleAction(action)}
                className={action.variant === 'destructive' ? 'text-red-600' : ''}
              >
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.confirmTitle || 'Confirm Action'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirmDescription ||
                `This action will affect ${selectedIds.length} item(s). This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && executeAction(confirmAction)}
              disabled={loading}
              className={
                confirmAction?.variant === 'destructive'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =====================================================
// PRESET BULK ACTIONS
// =====================================================

/**
 * Create bulk delete action
 */
export function createBulkDeleteAction(
  entityName: string,
  deleteHandler: (ids: string[]) => Promise<void>
): BulkAction {
  return {
    id: 'delete',
    label: 'Delete Selected',
    icon: Trash2,
    variant: 'destructive',
    confirmTitle: `Delete ${entityName}s?`,
    confirmDescription: `Are you sure you want to delete the selected ${entityName.toLowerCase()}s? This action cannot be undone.`,
    handler: deleteHandler,
  };
}

/**
 * Create bulk export action
 */
export function createBulkExportAction(
  exportHandler: (ids: string[]) => Promise<void>
): BulkAction {
  return {
    id: 'export',
    label: 'Export Selected',
    icon: Download,
    handler: exportHandler,
  };
}

/**
 * Create bulk archive action
 */
export function createBulkArchiveAction(
  archiveHandler: (ids: string[]) => Promise<void>
): BulkAction {
  return {
    id: 'archive',
    label: 'Archive Selected',
    icon: Archive,
    confirmTitle: 'Archive items?',
    confirmDescription: 'The selected items will be archived and hidden from default views.',
    handler: archiveHandler,
  };
}

/**
 * Create bulk status update action
 */
export function createBulkStatusAction(
  status: string,
  statusLabel: string,
  updateHandler: (ids: string[], status: string) => Promise<void>
): BulkAction {
  return {
    id: `status-${status}`,
    label: `Mark as ${statusLabel}`,
    icon: status === 'completed' ? CheckCircle : status === 'cancelled' ? XCircle : Tag,
    handler: (ids) => updateHandler(ids, status),
  };
}

/**
 * Create bulk assign action
 */
export function createBulkAssignAction(
  assignHandler: (ids: string[]) => Promise<void>
): BulkAction {
  return {
    id: 'assign',
    label: 'Assign to...',
    icon: UserPlus,
    handler: assignHandler,
  };
}

/**
 * Create bulk send action (for messages, invoices, etc.)
 */
export function createBulkSendAction(
  sendHandler: (ids: string[]) => Promise<void>
): BulkAction {
  return {
    id: 'send',
    label: 'Send Selected',
    icon: Send,
    confirmTitle: 'Send to customers?',
    confirmDescription: 'The selected items will be sent to the associated customers.',
    handler: sendHandler,
  };
}

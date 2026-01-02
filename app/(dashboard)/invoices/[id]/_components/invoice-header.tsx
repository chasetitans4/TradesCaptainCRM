'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  XCircle,
  MoreVertical,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Invoice } from './types';
import { STATUS_CONFIG } from './types';

interface InvoiceHeaderProps {
  invoice: Invoice;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  onBack: () => void;
  onCopyLink: () => void;
  onVoid: () => void;
  onDelete: () => void;
}

export function InvoiceHeader({
  invoice,
  showMenu,
  setShowMenu,
  onBack,
  onCopyLink,
  onVoid,
  onDelete,
}: InvoiceHeaderProps) {
  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const isOverdue = invoice.status === 'overdue';
  const canEdit = invoice.status === 'draft';

  return (
    <div className="bg-card border-b border-border sticky top-0 z-10">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{invoice.invoice_number || 'Invoice'}</h1>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs px-2 py-0.5 rounded-full', statusConfig.color)}>
              {statusConfig.label}
            </span>
            {isOverdue && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Overdue
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] z-20">
              {canEdit && (
                <Link
                  href={`/invoices/${invoice.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm"
                >
                  <Edit className="h-4 w-4" />
                  Edit Invoice
                </Link>
              )}
              <button
                onClick={onCopyLink}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left"
              >
                <Copy className="h-4 w-4" />
                Copy Link
              </button>
              <a
                href={`/view/invoice/${invoice.access_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                Preview
              </a>
              <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left">
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              {!['paid', 'void', 'draft'].includes(invoice.status) && (
                <button
                  onClick={onVoid}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left text-amber-600"
                >
                  <XCircle className="h-4 w-4" />
                  Void Invoice
                </button>
              )}
              {canEdit && (
                <button
                  onClick={onDelete}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

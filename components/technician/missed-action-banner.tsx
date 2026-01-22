'use client';

import { Button } from '@/components/ui/button';
import type { Job, Customer, User } from '@/types';
import { AlertTriangle, FileText, X } from 'lucide-react';
import { useState } from 'react';

interface TechJob extends Job {
  customer: Pick<Customer, 'id' | 'name' | 'phone' | 'email' | 'address_line1' | 'city' | 'state' | 'zip'>;
  business: { id: string; name: string; phone?: string };
  assigned_user?: Pick<User, 'id' | 'name'> | null;
}

interface MissedActionBannerProps {
  job: TechJob;
  onSendInvoice: () => void;
}

export function MissedActionBanner({ job, onSendInvoice }: MissedActionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-start gap-3">
      <div className="p-2 rounded-full bg-warning/20 shrink-0">
        <AlertTriangle className="h-5 w-5 text-warning" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-text">Invoice not sent</p>
        <p className="text-sm text-text-muted truncate">
          {job.title || 'Completed job'} - {job.customer.name}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-9 border-warning/50 text-warning hover:bg-warning/10"
          onClick={onSendInvoice}
        >
          <FileText className="h-4 w-4 mr-1.5" />
          Send Now
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-muted-foreground"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

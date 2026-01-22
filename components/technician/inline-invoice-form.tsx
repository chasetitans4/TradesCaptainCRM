'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import type { TechJob } from './active-job-card';
import { PhotoInvoiceSheet } from './photo-invoice-sheet';
import { InlineSignature } from './inline-signature';
import {
  DollarSign,
  Send,
  Plus,
  Trash2,
  Loader2,
  Camera,
  PenLine,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface InlineInvoiceFormProps {
  jobId: string;
  job?: TechJob;
  onSent: (nextJobId?: string) => void;
  onSkip: () => void;
}

export function InlineInvoiceForm({
  jobId,
  job,
  onSent,
  onSkip,
}: InlineInvoiceFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [useLineItems, setUseLineItems] = useState(false);

  // Simple amount mode
  const [amount, setAmount] = useState<string>(
    job?.price?.toString() || ''
  );
  const [description, setDescription] = useState<string>(job?.title || '');

  // Line items mode
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID(),
      name: job?.title || 'Service',
      quantity: 1,
      unit_price: job?.price || 0,
    },
  ]);

  // Photo invoice sheet
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  // Signature capture
  const [showSignature, setShowSignature] = useState(false);
  const [signatureId, setSignatureId] = useState<string | null>(null);
  const [captureSignature, setCaptureSignature] = useState(false);

  // Calculate total
  const total = useLineItems
    ? lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    : parseFloat(amount) || 0;

  // Add line item
  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: crypto.randomUUID(), name: '', quantity: 1, unit_price: 0 },
    ]);
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  // Update line item
  const updateLineItem = (
    id: string,
    field: keyof LineItem,
    value: string | number
  ) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // Handle items from photo analysis
  const handlePhotoItems = (items: Omit<LineItem, 'id'>[]) => {
    const newItems = items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));

    if (useLineItems) {
      // Add to existing items
      setLineItems([...lineItems, ...newItems]);
    } else {
      // Switch to line items mode
      setUseLineItems(true);
      setLineItems(newItems);
    }

    toast({
      title: 'Items Added',
      description: `${items.length} item${items.length !== 1 ? 's' : ''} added from photo.`,
    });
  };

  // Handle signature captured
  const handleSignatureCaptured = (id: string, url: string) => {
    setSignatureId(id);
    setShowSignature(false);
    toast({
      title: 'Signature Captured',
      description: 'Customer signature has been saved.',
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (total <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const payload: {
        jobId: string;
        amount?: number;
        description?: string;
        lineItems?: Array<{ name: string; quantity: number; unit_price: number }>;
        sendImmediately: boolean;
        signatureId?: string;
      } = {
        jobId,
        sendImmediately: true,
        ...(signatureId && { signatureId }),
      };

      if (useLineItems) {
        payload.lineItems = lineItems.map((item) => ({
          name: item.name || 'Service',
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));
      } else {
        payload.amount = parseFloat(amount);
        payload.description = description;
      }

      const response = await fetch('/api/technician/quick-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create invoice');
      }

      toast({
        title: 'Invoice Sent!',
        description: `${data.invoiceNumber} sent to customer.`,
      });

      onSent(data.nextJobId);
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to send invoice.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Job Info Summary */}
      {job && (
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="font-medium text-text">{job.title || 'Service Call'}</p>
          <p className="text-sm text-text-muted">{job.customer.name}</p>
        </div>
      )}

      {/* Toggle between simple and line items */}
      <div className="flex items-center justify-between">
        <Label htmlFor="use-line-items" className="text-sm">
          Itemized Invoice
        </Label>
        <Switch
          id="use-line-items"
          checked={useLineItems}
          onCheckedChange={setUseLineItems}
        />
      </div>

      {useLineItems ? (
        /* Line Items Mode */
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={item.id} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) =>
                    updateLineItem(item.id, 'name', e.target.value)
                  }
                  className="h-10"
                />
                <div className="flex gap-2">
                  <div className="w-20">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(
                          item.id,
                          'quantity',
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="h-10"
                      min={1}
                    />
                  </div>
                  <div className="flex-1 relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price || ''}
                      onChange={(e) =>
                        updateLineItem(
                          item.id,
                          'unit_price',
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="h-10 pl-8"
                      step="0.01"
                      min={0}
                    />
                  </div>
                </div>
              </div>
              {lineItems.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-muted-foreground"
                  onClick={() => removeLineItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={addLineItem}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Item
          </Button>
        </div>
      ) : (
        /* Simple Amount Mode */
        <div className="space-y-3">
          <div>
            <Label htmlFor="amount">Amount</Label>
            <div className="relative mt-1.5">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 text-2xl pl-10 font-semibold"
                step="0.01"
                min={0}
                autoFocus
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Service description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 resize-none"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Photo to Invoice */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setPhotoSheetOpen(true)}
      >
        <Camera className="h-4 w-4 mr-1.5" />
        Scan Receipt/Parts Photo
      </Button>

      {/* Signature Toggle */}
      <div className="border rounded-lg">
        <button
          type="button"
          className={cn(
            'w-full flex items-center justify-between p-3 text-left transition-colors',
            captureSignature && 'bg-primary/5'
          )}
          onClick={() => {
            if (captureSignature) {
              setCaptureSignature(false);
              setShowSignature(false);
            } else {
              setCaptureSignature(true);
              setShowSignature(true);
            }
          }}
        >
          <div className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {signatureId ? 'Signature Captured ✓' : 'Capture Customer Signature'}
            </span>
          </div>
          {captureSignature ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showSignature && job && (
          <div className="border-t p-3">
            <InlineSignature
              customerName={job.customer.name}
              customerEmail={job.customer.email || undefined}
              entityType="invoice"
              entityId={jobId}
              onSigned={handleSignatureCaptured}
              onSkip={() => setShowSignature(false)}
            />
          </div>
        )}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between py-3 border-t border-border">
        <span className="text-lg font-medium">Total</span>
        <span className="text-2xl font-bold">
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-12"
          onClick={onSkip}
          disabled={isLoading}
        >
          Skip for Now
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12"
          disabled={isLoading || total <= 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              Send Invoice
            </>
          )}
        </Button>
      </div>

      {/* Photo Invoice Sheet */}
      <PhotoInvoiceSheet
        open={photoSheetOpen}
        onOpenChange={setPhotoSheetOpen}
        jobId={jobId}
        onItemsConfirmed={handlePhotoItems}
      />
    </form>
  );
}

'use client';

import { useState } from 'react';
import { Shield, Calendar, Phone, FileText, AlertTriangle, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInDays } from 'date-fns';

type WarrantyStatus = 'active' | 'expired' | 'claimed' | 'voided';
type WarrantyType = 'manufacturer' | 'extended' | 'labor' | 'parts';

interface Warranty {
  id: string;
  warranty_type: WarrantyType;
  provider: string;
  coverage_details: string;
  start_date: string;
  end_date: string;
  terms?: string;
  contact_info?: string;
  status: WarrantyStatus;
  equipment?: { model_number: string; serial_number?: string };
  coverage?: {
    isActive: boolean;
    daysRemaining: number;
    percentageRemaining: number;
  };
}

interface WarrantyCardProps {
  warranty: Warranty;
  onClaimCreated?: () => void;
  readOnly?: boolean;
}

const warrantyTypeLabels: Record<WarrantyType, string> = {
  manufacturer: 'Manufacturer Warranty',
  extended: 'Extended Warranty',
  labor: 'Labor Warranty',
  parts: 'Parts Warranty',
};

const statusColors: Record<WarrantyStatus, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800',
  claimed: 'bg-yellow-100 text-yellow-800',
  voided: 'bg-red-100 text-red-800',
};

export function WarrantyCard({ warranty, onClaimCreated, readOnly = false }: WarrantyCardProps) {
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [claimData, setClaimData] = useState({
    issueDescription: '',
    amountClaimed: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmitClaim = async () => {
    if (!claimData.issueDescription.trim()) {
      toast({ title: 'Please describe the issue', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/warranties/${warranty.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueDescription: claimData.issueDescription,
          amountClaimed: claimData.amountClaimed ? parseFloat(claimData.amountClaimed) : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create claim');

      toast({ title: 'Warranty claim submitted' });
      setShowClaimDialog(false);
      setClaimData({ issueDescription: '', amountClaimed: '' });
      onClaimCreated?.();
    } catch (error) {
      toast({ title: 'Failed to submit claim', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const daysRemaining = warranty.coverage?.daysRemaining || 0;
  const percentageRemaining = warranty.coverage?.percentageRemaining || 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-base">{warranty.provider}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {warrantyTypeLabels[warranty.warranty_type]}
                </p>
              </div>
            </div>
            <Badge className={statusColors[warranty.status]}>
              {warranty.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Coverage Details */}
          <p className="text-sm">{warranty.coverage_details}</p>

          {/* Equipment Info */}
          {warranty.equipment && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Equipment:</span>
              <Badge variant="outline">
                {warranty.equipment.model_number}
                {warranty.equipment.serial_number && ` (${warranty.equipment.serial_number})`}
              </Badge>
            </div>
          )}

          {/* Date Range */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(warranty.start_date), 'MMM d, yyyy')} -{' '}
                {format(new Date(warranty.end_date), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Coverage Progress */}
          {warranty.status === 'active' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Coverage Remaining</span>
                <span className="font-medium">
                  {daysRemaining} days ({percentageRemaining}%)
                </span>
              </div>
              <Progress value={percentageRemaining} className="h-2" />
              {daysRemaining <= 30 && (
                <div className="flex items-center gap-1 text-yellow-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Warranty expiring soon</span>
                </div>
              )}
            </div>
          )}

          {/* Contact Info */}
          {warranty.contact_info && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{warranty.contact_info}</span>
            </div>
          )}

          {/* Actions */}
          {!readOnly && warranty.status === 'active' && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowClaimDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              File Warranty Claim
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Claim Dialog */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Warranty Claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">{warranty.provider}</p>
              <p className="text-muted-foreground">{warranty.coverage_details}</p>
            </div>

            <div className="space-y-2">
              <Label>Describe the Issue *</Label>
              <Textarea
                value={claimData.issueDescription}
                onChange={(e) => setClaimData({ ...claimData, issueDescription: e.target.value })}
                placeholder="Describe the problem you're experiencing..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Estimated Claim Amount (optional)</Label>
              <Input
                type="number"
                value={claimData.amountClaimed}
                onChange={(e) => setClaimData({ ...claimData, amountClaimed: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClaimDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitClaim} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

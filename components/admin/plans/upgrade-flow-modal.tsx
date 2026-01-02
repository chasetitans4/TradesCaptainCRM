'use client';

// =====================================================
// UPGRADE FLOW MODAL
// Handles client upgrade process with commission info
// Version: 5.8.1
// =====================================================

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Star,
  Loader2,
} from 'lucide-react';

interface PlanPricing {
  id: string;
  plan_type: string;
  plan_name: string;
  monthly_price_cents: number;
}

interface PlanUpgradePath {
  price_difference_cents: number;
  is_recommended: boolean;
  benefits_summary: string | null;
  talking_point: string | null;
}

interface UpgradeOption {
  plan: PlanPricing;
  path: PlanUpgradePath;
  commission_upfront: number;
  commission_recurring: number;
}

interface UpgradeFlowModalProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  currentPlanType: string;
  currentPlanName: string;
  onUpgradeComplete?: (newPlanType: string) => void;
}

export function UpgradeFlowModal({
  open,
  onClose,
  clientId,
  clientName,
  currentPlanType,
  currentPlanName,
  onUpgradeComplete,
}: UpgradeFlowModalProps) {
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchUpgradeOptions();
    }
  }, [open, clientId]);

  async function fetchUpgradeOptions() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/clients/${clientId}/upgrade-options`);
      if (!res.ok) throw new Error('Failed to load upgrade options');
      const data = await res.json();
      setUpgradeOptions(data.upgrade_options || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade() {
    if (!selectedPlan) return;

    try {
      setSubmitting(true);
      // In a real implementation, this would call an upgrade API
      // For now, we'll simulate the upgrade
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onUpgradeComplete?.(selectedPlan);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedOption = upgradeOptions.find((opt) => opt.plan.plan_type === selectedPlan);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade: {clientName}</DialogTitle>
          <DialogDescription>
            Current Plan: {currentPlanName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <div className="text-destructive py-4">{error}</div>
        ) : upgradeOptions.length === 0 ? (
          <div className="text-text-muted py-4">
            No upgrade options available for this plan.
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-sm text-text-muted mb-4">
              Select an upgrade option for this client:
            </p>

            {upgradeOptions.map(({ plan, path, commission_upfront, commission_recurring }) => (
              <div
                key={plan.plan_type}
                onClick={() => setSelectedPlan(plan.plan_type)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.plan_type
                    ? 'border-primary bg-primary/5'
                    : path.is_recommended
                    ? 'border-warning/50 bg-warning/5 hover:border-warning'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {path.is_recommended && (
                        <Star className="h-4 w-4 text-warning fill-warning" />
                      )}
                      <span className="font-semibold">{plan.plan_name}</span>
                      <Badge variant="outline">
                        ${plan.monthly_price_cents / 100}/mo
                      </Badge>
                      <Badge variant={path.is_recommended ? 'default' : 'secondary'}>
                        +${path.price_difference_cents / 100}/mo
                      </Badge>
                    </div>

                    <p className="text-sm text-text-muted flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {path.benefits_summary}
                    </p>

                    {/* Commission Info */}
                    <div className="flex items-center gap-4 text-sm mt-2">
                      <span className="text-text-muted">Your Commission:</span>
                      <div className="flex items-center gap-1 text-success">
                        <DollarSign className="h-4 w-4" />
                        <strong>${commission_upfront.toFixed(0)}</strong> upfront
                      </div>
                      <span className="text-text-muted">+</span>
                      <div className="flex items-center gap-1">
                        <strong>${commission_recurring.toFixed(2)}</strong>/mo recurring
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    {selectedPlan === plan.plan_type ? (
                      <CheckCircle className="h-6 w-6 text-primary" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-muted" />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Selected Plan Summary */}
            {selectedOption && (
              <div className="bg-muted/50 rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-2">Upgrade Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">From</span>
                    <p className="font-medium">{currentPlanName}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">To</span>
                    <p className="font-medium">{selectedOption.plan.plan_name}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Price Increase</span>
                    <p className="font-medium text-primary">
                      +${selectedOption.path.price_difference_cents / 100}/mo
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted">Your Commission</span>
                    <p className="font-medium text-success">
                      ${selectedOption.commission_upfront.toFixed(0)} + ${selectedOption.commission_recurring.toFixed(2)}/mo
                    </p>
                  </div>
                </div>

                {selectedOption.path.talking_point && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-text-muted italic">
                      Talking point: &ldquo;{selectedOption.path.talking_point}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={!selectedPlan || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Proceed with Upgrade
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeFlowModal;

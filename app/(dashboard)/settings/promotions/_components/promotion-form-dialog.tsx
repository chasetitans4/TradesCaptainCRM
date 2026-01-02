'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Promotion, PromotionFormData } from './types';

interface PromotionFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingPromotion: Promotion | null;
  formData: PromotionFormData;
  setFormData: React.Dispatch<React.SetStateAction<PromotionFormData>>;
  onSave: () => void;
  saving: boolean;
}

export function PromotionFormDialog({
  isOpen,
  onClose,
  editingPromotion,
  formData,
  setFormData,
  onSave,
  saving,
}: PromotionFormDialogProps) {
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Promotion Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Summer Sale 2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Promo Code *</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                }
                placeholder="SUMMER20"
                className="uppercase"
              />
              <Button type="button" variant="outline" onClick={generateCode}>
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Describe the promotion..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value: 'percentage' | 'fixed' | 'free_service') =>
                  setFormData((prev) => ({ ...prev, discount_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage Off</SelectItem>
                  <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                  <SelectItem value="free_service">Free Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount_value">
                {formData.discount_type === 'percentage' ? 'Percentage *' : 'Amount *'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                value={formData.discount_value}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, discount_value: e.target.value }))
                }
                placeholder={formData.discount_type === 'percentage' ? '20' : '25.00'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_purchase">Min. Purchase</Label>
              <Input
                id="min_purchase"
                type="number"
                step="0.01"
                value={formData.min_purchase_amount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    min_purchase_amount: e.target.value,
                  }))
                }
                placeholder="100.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_discount">Max Discount</Label>
              <Input
                id="max_discount"
                type="number"
                step="0.01"
                value={formData.max_discount_amount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    max_discount_amount: e.target.value,
                  }))
                }
                placeholder="50.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, end_date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usage_limit">Usage Limit (leave blank for unlimited)</Label>
            <Input
              id="usage_limit"
              type="number"
              value={formData.usage_limit}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, usage_limit: e.target.value }))
              }
              placeholder="100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="services">Applicable Services (optional)</Label>
            <Input
              id="services"
              value={formData.applicable_services}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  applicable_services: e.target.value,
                }))
              }
              placeholder="AC Repair, Furnace Install"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to apply to all services. Separate with commas.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Promotion can be used</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public</Label>
              <p className="text-xs text-muted-foreground">
                Show on public booking page
              </p>
            </div>
            <Switch
              checked={formData.is_public}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_public: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || !formData.name || !formData.code || !formData.discount_value}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {editingPromotion ? 'Save Changes' : 'Create Promotion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

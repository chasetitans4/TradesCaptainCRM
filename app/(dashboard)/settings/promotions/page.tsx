'use client';

import { useEffect, useState } from 'react';
import {
  Percent,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  MoreHorizontal,
  Loader2,
  Calendar,
  Tag,
  Users,
  DollarSign,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Promotion {
  id: string;
  name: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed' | 'free_service';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  applicable_services?: string[];
  start_date?: string;
  end_date?: string;
  usage_limit?: number;
  usage_count: number;
  is_active: boolean;
  is_public: boolean;
  total_savings?: number;
}

export default function PromotionsSettingsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed' | 'free_service',
    discount_value: '',
    min_purchase_amount: '',
    max_discount_amount: '',
    applicable_services: '',
    start_date: '',
    end_date: '',
    usage_limit: '',
    is_active: true,
    is_public: false,
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  async function loadPromotions() {
    try {
      const response = await fetch('/api/promotions');
      if (response.ok) {
        const data = await response.json();
        setPromotions(data.promotions || []);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
      setError('Failed to load promotions');
    } finally {
      setLoading(false);
    }
  }

  const openNewPromotionDialog = () => {
    setEditingPromotion(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_purchase_amount: '',
      max_discount_amount: '',
      applicable_services: '',
      start_date: '',
      end_date: '',
      usage_limit: '',
      is_active: true,
      is_public: false,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormData({
      name: promo.name,
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value.toString(),
      min_purchase_amount: promo.min_purchase_amount?.toString() || '',
      max_discount_amount: promo.max_discount_amount?.toString() || '',
      applicable_services: promo.applicable_services?.join(', ') || '',
      start_date: promo.start_date?.split('T')[0] || '',
      end_date: promo.end_date?.split('T')[0] || '',
      usage_limit: promo.usage_limit?.toString() || '',
      is_active: promo.is_active,
      is_public: promo.is_public,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_purchase_amount: formData.min_purchase_amount
          ? parseFloat(formData.min_purchase_amount)
          : null,
        max_discount_amount: formData.max_discount_amount
          ? parseFloat(formData.max_discount_amount)
          : null,
        applicable_services: formData.applicable_services
          ? formData.applicable_services
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        is_active: formData.is_active,
        is_public: formData.is_public,
      };

      const response = await fetch(
        editingPromotion
          ? `/api/promotions/${editingPromotion.id}`
          : '/api/promotions',
        {
          method: editingPromotion ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save promotion');
      }

      setIsDialogOpen(false);
      loadPromotions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promoId: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      await fetch(`/api/promotions/${promoId}`, { method: 'DELETE' });
      loadPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getDiscountLabel = (promo: Promotion) => {
    switch (promo.discount_type) {
      case 'percentage':
        return `${promo.discount_value}% off`;
      case 'fixed':
        return `${formatCurrency(promo.discount_value)} off`;
      case 'free_service':
        return 'Free Service';
      default:
        return promo.discount_value.toString();
    }
  };

  const getStatusBadge = (promo: Promotion) => {
    const now = new Date();
    const start = promo.start_date ? new Date(promo.start_date) : null;
    const end = promo.end_date ? new Date(promo.end_date) : null;

    if (!promo.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    if (start && now < start) {
      return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
    }

    if (end && now > end) {
      return <Badge variant="secondary">Expired</Badge>;
    }

    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
      return <Badge variant="secondary">Limit Reached</Badge>;
    }

    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  const isPromoActive = (promo: Promotion) => {
    if (!promo.is_active) return false;
    const now = new Date();
    const start = promo.start_date ? new Date(promo.start_date) : null;
    const end = promo.end_date ? new Date(promo.end_date) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    if (promo.usage_limit && promo.usage_count >= promo.usage_limit) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activePromotions = promotions.filter(isPromoActive);
  const inactivePromotions = promotions.filter((p) => !isPromoActive(p));
  const totalUsage = promotions.reduce((sum, p) => sum + p.usage_count, 0);
  const totalSavings = promotions.reduce((sum, p) => sum + (p.total_savings || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promotions & Coupons</h1>
          <p className="text-muted-foreground">
            Create and manage discount codes and promotional offers
          </p>
        </div>
        <Button onClick={openNewPromotionDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Promotion
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Tag className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activePromotions.length}</p>
                <p className="text-sm text-muted-foreground">Active Promos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Percent className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{promotions.length}</p>
                <p className="text-sm text-muted-foreground">Total Promos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsage}</p>
                <p className="text-sm text-muted-foreground">Times Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalSavings)}</p>
                <p className="text-sm text-muted-foreground">Total Discounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active ({activePromotions.length})</TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactivePromotions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activePromotions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No active promotions</h3>
                <p className="text-muted-foreground mb-4">
                  Create a promotion to offer discounts to your customers
                </p>
                <Button onClick={openNewPromotionDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promotion
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activePromotions.map((promo) => (
                <PromotionCard
                  key={promo.id}
                  promo={promo}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  onCopyCode={copyCode}
                  copiedCode={copiedCode}
                  getDiscountLabel={getDiscountLabel}
                  getStatusBadge={getStatusBadge}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {inactivePromotions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No inactive promotions</h3>
                <p className="text-muted-foreground">
                  Expired or disabled promotions will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inactivePromotions.map((promo) => (
                <PromotionCard
                  key={promo.id}
                  promo={promo}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  onCopyCode={copyCode}
                  copiedCode={copiedCode}
                  getDiscountLabel={getDiscountLabel}
                  getStatusBadge={getStatusBadge}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  onValueChange={(value: any) =>
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
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.code || !formData.discount_value}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingPromotion ? 'Save Changes' : 'Create Promotion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Promotion Card Component
function PromotionCard({
  promo,
  onEdit,
  onDelete,
  onCopyCode,
  copiedCode,
  getDiscountLabel,
  getStatusBadge,
  formatCurrency,
}: {
  promo: Promotion;
  onEdit: (promo: Promotion) => void;
  onDelete: (id: string) => void;
  onCopyCode: (code: string) => void;
  copiedCode: string | null;
  getDiscountLabel: (promo: Promotion) => string;
  getStatusBadge: (promo: Promotion) => React.ReactNode;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{promo.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(promo)}
              {promo.is_public && (
                <Badge variant="outline" className="text-xs">
                  Public
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCopyCode(promo.code)}>
                {copiedCode === promo.code ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(promo)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete(promo.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Promo Code */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <code className="text-lg font-mono font-bold">{promo.code}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopyCode(promo.code)}
            >
              {copiedCode === promo.code ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Discount */}
          <div>
            <p className="text-2xl font-bold text-primary">{getDiscountLabel(promo)}</p>
            {promo.min_purchase_amount && (
              <p className="text-sm text-muted-foreground">
                Min. purchase: {formatCurrency(promo.min_purchase_amount)}
              </p>
            )}
          </div>

          {promo.description && (
            <p className="text-sm text-muted-foreground">{promo.description}</p>
          )}

          {/* Date Range */}
          {(promo.start_date || promo.end_date) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {promo.start_date && (
                <span>{new Date(promo.start_date).toLocaleDateString()}</span>
              )}
              {promo.start_date && promo.end_date && <span>-</span>}
              {promo.end_date && (
                <span>{new Date(promo.end_date).toLocaleDateString()}</span>
              )}
            </div>
          )}

          {/* Usage */}
          <div className="flex items-center justify-between pt-2 border-t text-sm">
            <span className="text-muted-foreground">
              Used {promo.usage_count}
              {promo.usage_limit ? ` / ${promo.usage_limit}` : ''} times
            </span>
            {promo.total_savings ? (
              <span className="text-muted-foreground">
                {formatCurrency(promo.total_savings)} saved
              </span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

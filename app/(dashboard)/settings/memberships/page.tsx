'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  services_included: string[];
  visits_per_year?: number;
  discount_percentage?: number;
  is_active: boolean;
  subscriber_count?: number;
  total_revenue?: number;
}

export default function MembershipsSettingsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    billing_cycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    services_included: '',
    visits_per_year: '',
    discount_percentage: '',
    is_active: true,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const response = await fetch('/api/memberships/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      setError('Failed to load membership plans');
    } finally {
      setLoading(false);
    }
  }

  const openNewPlanDialog = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      billing_cycle: 'monthly',
      services_included: '',
      visits_per_year: '',
      discount_percentage: '',
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      billing_cycle: plan.billing_cycle,
      services_included: plan.services_included?.join(', ') || '',
      visits_per_year: plan.visits_per_year?.toString() || '',
      discount_percentage: plan.discount_percentage?.toString() || '',
      is_active: plan.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        billing_cycle: formData.billing_cycle,
        services_included: formData.services_included
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        visits_per_year: formData.visits_per_year
          ? parseInt(formData.visits_per_year)
          : null,
        discount_percentage: formData.discount_percentage
          ? parseFloat(formData.discount_percentage)
          : null,
        is_active: formData.is_active,
      };

      const response = await fetch(
        editingPlan
          ? `/api/memberships/plans/${editingPlan.id}`
          : '/api/memberships/plans',
        {
          method: editingPlan ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save plan');
      }

      setIsDialogOpen(false);
      loadPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this membership plan?')) return;

    try {
      await fetch(`/api/memberships/plans/${planId}`, { method: 'DELETE' });
      loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getBillingLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly':
        return '/month';
      case 'quarterly':
        return '/quarter';
      case 'yearly':
        return '/year';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Membership Plans</h1>
          <p className="text-muted-foreground">
            Create and manage recurring membership plans for your customers
          </p>
        </div>
        <Button onClick={openNewPlanDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{plans.length}</p>
                <p className="text-sm text-muted-foreground">Active Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {plans.reduce((sum, p) => sum + (p.subscriber_count || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    plans.reduce((sum, p) => sum + (p.total_revenue || 0), 0)
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No membership plans yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first membership plan to offer recurring services
            </p>
            <Button onClick={openNewPlanDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {!plan.is_active && (
                      <Badge variant="secondary" className="mt-1">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(plan)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(plan.id)}
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
                  <div>
                    <p className="text-3xl font-bold">
                      {formatCurrency(plan.price)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {getBillingLabel(plan.billing_cycle)}
                      </span>
                    </p>
                  </div>

                  {plan.description && (
                    <p className="text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm">
                    {plan.visits_per_year && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {plan.visits_per_year} visits/year
                      </div>
                    )}
                    {plan.discount_percentage && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {plan.discount_percentage}% discount on services
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {plan.subscriber_count || 0} subscribers
                    </div>
                  </div>

                  {plan.services_included?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                        Included Services
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {plan.services_included.slice(0, 3).map((service) => (
                          <Badge key={service} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                        {plan.services_included.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{plan.services_included.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Edit Plan' : 'Create Membership Plan'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Annual Maintenance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe what's included..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="99.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_cycle">Billing Cycle</Label>
                <Select
                  value={formData.billing_cycle}
                  onValueChange={(value: any) =>
                    setFormData((prev) => ({ ...prev, billing_cycle: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visits">Visits/Year</Label>
                <Input
                  id="visits"
                  type="number"
                  value={formData.visits_per_year}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      visits_per_year: e.target.value,
                    }))
                  }
                  placeholder="2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount %</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      discount_percentage: e.target.value,
                    }))
                  }
                  placeholder="10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="services">Included Services</Label>
              <Input
                id="services"
                value={formData.services_included}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    services_included: e.target.value,
                  }))
                }
                placeholder="AC Tune-up, Filter Change, Priority Scheduling"
              />
              <p className="text-xs text-muted-foreground">
                Separate services with commas
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Plan is available for new subscribers
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_active: checked }))
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
              disabled={saving || !formData.name || !formData.price}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
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
import type { UserWithBusiness } from '@/types';
import {
  ArrowLeft,
  Save,
  Trash2,
  Wrench,
  Package,
  Truck,
  User as UserIcon,
  Calendar,
  DollarSign,
  AlertTriangle,
  History,
  Edit,
  X,
} from 'lucide-react';
import { TransactionHistory } from '@/components/inventory';
import { DocumentList } from '@/components/documents/document-list';
import { hasPermission } from '@/lib/permissions';

interface InventoryCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  category_id: string | null;
  status: string;
  condition: string | null;
  quantity: number;
  min_quantity: number | null;
  location: string | null;
  assigned_vehicle: string | null;
  assigned_to: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  warranty_expires: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  notes: string | null;
  photo_urls: string[] | null;
  specifications: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  category?: InventoryCategory;
  assigned_user?: { id: string; name: string };
}

interface UsageHistoryItem {
  job_id: string;
  job_title: string;
  quantity_used: number;
  notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'in_use', label: 'In Use' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
  { value: 'lost', label: 'Lost' },
];

const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

export default function InventoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const itemId = params.id as string;

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistoryItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);
    }
    loadUser();
  }, [router]);

  // Load item and categories
  const loadData = useCallback(async () => {
    try {
      const [itemRes, categoriesRes] = await Promise.all([
        fetch(`/api/inventory/${itemId}?includeHistory=true`),
        fetch('/api/inventory/categories'),
      ]);

      if (!itemRes.ok) {
        if (itemRes.status === 404) {
          toast({
            title: 'Not Found',
            description: 'Inventory item not found',
            variant: 'destructive',
          });
          router.push('/inventory');
          return;
        }
        throw new Error('Failed to fetch item');
      }

      const itemData = await itemRes.json();
      const categoriesData = await categoriesRes.json();

      setItem(itemData.item);
      setUsageHistory(itemData.usageHistory || []);
      setCategories(categoriesData.categories || []);
      setFormData(itemData.item);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load inventory item',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [itemId, router, toast]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          categoryId: formData.category_id,
          brand: formData.brand,
          model: formData.model,
          serialNumber: formData.serial_number,
          status: formData.status,
          condition: formData.condition,
          quantity: formData.quantity,
          minQuantity: formData.min_quantity,
          location: formData.location,
          assignedVehicle: formData.assigned_vehicle,
          purchaseDate: formData.purchase_date,
          purchasePrice: formData.purchase_price,
          currentValue: formData.current_value,
          warrantyExpires: formData.warranty_expires,
          lastMaintenance: formData.last_maintenance,
          nextMaintenance: formData.next_maintenance,
          notes: formData.notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to update');

      const data = await res.json();
      setItem(data.item);
      setEditing(false);
      toast({
        title: 'Saved',
        description: 'Item updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast({
        title: 'Deleted',
        description: 'Item has been retired',
      });
      router.push('/inventory');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  if (loading || !item) {
    return <DetailSkeleton />;
  }

  const isLowStock = item.min_quantity && item.quantity <= item.min_quantity;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{item.name}</h1>
            {item.brand && (
              <p className="text-muted-foreground">
                {item.brand} {item.model && `- ${item.model}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => {
                setEditing(false);
                setFormData(item);
              }}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Low stock warning */}
      {isLowStock && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">Low Stock Alert</p>
                <p className="text-sm text-orange-700">
                  Current quantity ({item.quantity}) is at or below minimum ({item.min_quantity})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <EditForm
                  formData={formData}
                  setFormData={setFormData}
                  categories={categories}
                />
              ) : (
                <ViewDetails item={item} />
              )}
            </CardContent>
          </Card>

          {/* Transaction History */}
          <TransactionHistory
            inventoryId={item.id}
            currentQuantity={item.quantity}
            onQuantityChange={(newQty) => {
              setItem({ ...item, quantity: newQty });
              setFormData({ ...formData, quantity: newQty });
            }}
          />

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentList
                entityType="business_inventory"
                entityId={item.id}
                readOnly={user ? !hasPermission(user.role, 'manage_inventory') : true}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={cn(
                  item.status === 'available' && 'bg-green-100 text-green-700',
                  item.status === 'in_use' && 'bg-blue-100 text-blue-700',
                  item.status === 'maintenance' && 'bg-orange-100 text-orange-700',
                  item.status === 'retired' && 'bg-gray-100 text-gray-500',
                )}>
                  {item.status.replace(/_/g, ' ')}
                </Badge>
                {item.condition && (
                  <Badge variant="outline">
                    {item.condition}
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">{item.quantity}</span>
                </div>
                {item.min_quantity && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Min Quantity</span>
                    <span className="font-medium">{item.min_quantity}</span>
                  </div>
                )}
                {item.location && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{item.location}</span>
                  </div>
                )}
                {item.assigned_vehicle && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="font-medium">{item.assigned_vehicle}</span>
                  </div>
                )}
                {item.assigned_user && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned To</span>
                    <span className="font-medium">{item.assigned_user.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Info */}
          {(item.purchase_price || item.current_value || item.warranty_expires) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {item.purchase_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchased</span>
                    <span className="font-medium">{formatDate(item.purchase_date)}</span>
                  </div>
                )}
                {item.purchase_price && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchase Price</span>
                    <span className="font-medium">${item.purchase_price.toFixed(2)}</span>
                  </div>
                )}
                {item.current_value && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Value</span>
                    <span className="font-medium">${item.current_value.toFixed(2)}</span>
                  </div>
                )}
                {item.warranty_expires && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Warranty Expires</span>
                    <span className={cn(
                      'font-medium',
                      new Date(item.warranty_expires) < new Date() && 'text-red-600'
                    )}>
                      {formatDate(item.warranty_expires)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Maintenance */}
          {(item.last_maintenance || item.next_maintenance) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {item.last_maintenance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Service</span>
                    <span className="font-medium">{formatDate(item.last_maintenance)}</span>
                  </div>
                )}
                {item.next_maintenance && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Service</span>
                    <span className={cn(
                      'font-medium',
                      new Date(item.next_maintenance) < new Date() && 'text-red-600'
                    )}>
                      {formatDate(item.next_maintenance)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retire this item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the item as retired. It will no longer appear in the main inventory list but can still be viewed in reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Retire Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ViewDetails({ item }: { item: InventoryItem }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <p className="text-sm text-muted-foreground">Name</p>
        <p className="font-medium">{item.name}</p>
      </div>
      {item.category && (
        <div>
          <p className="text-sm text-muted-foreground">Category</p>
          <p className="font-medium">{item.category.name}</p>
        </div>
      )}
      {item.brand && (
        <div>
          <p className="text-sm text-muted-foreground">Brand</p>
          <p className="font-medium">{item.brand}</p>
        </div>
      )}
      {item.model && (
        <div>
          <p className="text-sm text-muted-foreground">Model</p>
          <p className="font-medium">{item.model}</p>
        </div>
      )}
      {item.serial_number && (
        <div>
          <p className="text-sm text-muted-foreground">Serial Number</p>
          <p className="font-medium font-mono">{item.serial_number}</p>
        </div>
      )}
      {item.description && (
        <div className="md:col-span-2">
          <p className="text-sm text-muted-foreground">Description</p>
          <p className="font-medium">{item.description}</p>
        </div>
      )}
      {item.notes && (
        <div className="md:col-span-2">
          <p className="text-sm text-muted-foreground">Notes</p>
          <p className="font-medium">{item.notes}</p>
        </div>
      )}
    </div>
  );
}

function EditForm({
  formData,
  setFormData,
  categories,
}: {
  formData: Partial<InventoryItem>;
  setFormData: (data: Partial<InventoryItem>) => void;
  categories: { id: string; name: string }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.category_id || ''}
          onValueChange={(value) => setFormData({ ...formData, category_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="brand">Brand</Label>
        <Input
          id="brand"
          value={formData.brand || ''}
          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          value={formData.model || ''}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="serial_number">Serial Number</Label>
        <Input
          id="serial_number"
          value={formData.serial_number || ''}
          onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={formData.status || 'available'}
          onValueChange={(value) => setFormData({ ...formData, status: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="condition">Condition</Label>
        <Select
          value={formData.condition || ''}
          onValueChange={(value) => setFormData({ ...formData, condition: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            {CONDITION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          min={0}
          value={formData.quantity || 1}
          onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
        />
      </div>
      <div>
        <Label htmlFor="min_quantity">Min Quantity</Label>
        <Input
          id="min_quantity"
          type="number"
          min={0}
          value={formData.min_quantity || ''}
          onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || null })}
        />
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="assigned_vehicle">Assigned Vehicle</Label>
        <Input
          id="assigned_vehicle"
          value={formData.assigned_vehicle || ''}
          onChange={(e) => setFormData({ ...formData, assigned_vehicle: e.target.value })}
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 bg-muted rounded animate-pulse" />
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <div className="h-48 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="pt-6">
              <div className="h-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

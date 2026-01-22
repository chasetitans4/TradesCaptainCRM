'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import type { UserWithBusiness } from '@/types';
import {
  Plus,
  Search,
  Package,
  Wrench,
  AlertTriangle,
  Filter,
  RefreshCw,
  ChevronRight,
  Truck,
  User as UserIcon,
  Calendar,
  DollarSign,
  Box,
} from 'lucide-react';

interface InventoryCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  parent_category_id: string | null;
  is_default: boolean;
  children?: InventoryCategory[];
}

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  category_id: string | null;
  status: 'available' | 'in_use' | 'maintenance' | 'retired' | 'lost';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | null;
  quantity: number;
  min_quantity: number | null;
  location: string | null;
  assigned_vehicle: string | null;
  warranty_expires: string | null;
  next_maintenance: string | null;
  category?: InventoryCategory;
  assigned_user?: { id: string; name: string };
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  in_use: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  maintenance: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  retired: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  good: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  fair: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function InventoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);

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

  // Load inventory
  const loadInventory = useCallback(async () => {
    if (!user) return;

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (categoryFilter !== 'all') params.set('categoryId', categoryFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (showLowStock) params.set('lowStockOnly', 'true');

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load inventory',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, searchQuery, categoryFilter, statusFilter, showLowStock, toast]);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/categories?tree=true');
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadInventory();
      loadCategories();
    }
  }, [user, loadInventory, loadCategories]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadInventory();
  };

  // Flatten categories for dropdown
  const flattenCategories = (cats: InventoryCategory[], prefix = ''): { id: string; name: string }[] => {
    const result: { id: string; name: string }[] = [];
    cats.forEach(cat => {
      result.push({ id: cat.id, name: prefix + cat.name });
      if (cat.children?.length) {
        result.push(...flattenCategories(cat.children, prefix + '  '));
      }
    });
    return result;
  };

  const flatCategories = flattenCategories(categories);

  // Count low stock items
  const lowStockCount = items.filter(
    item => item.min_quantity && item.quantity <= item.min_quantity
  ).length;

  if (loading) {
    return <InventorySkeleton />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your tools, equipment, and supplies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
              </DialogHeader>
              <AddInventoryForm
                categories={flatCategories}
                onSuccess={() => {
                  setShowAddDialog(false);
                  loadInventory();
                  toast({
                    title: 'Success',
                    description: 'Item added to inventory',
                  });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alert for low stock */}
      {lowStockCount > 0 && !showLowStock && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Low Stock Alert</p>
                  <p className="text-sm text-orange-700">
                    {lowStockCount} item{lowStockCount > 1 ? 's' : ''} running low
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLowStock(true)}
              >
                View Items
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {flatCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="in_use">In Use</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
        {showLowStock && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLowStock(false)}
          >
            Clear Low Stock Filter
          </Button>
        )}
      </div>

      {/* Inventory Grid */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No inventory items
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all'
                ? 'No items match your filters'
                : 'Start by adding your tools and equipment'}
            </p>
            {!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <InventoryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function InventoryCard({ item }: { item: InventoryItem }) {
  const isLowStock = item.min_quantity && item.quantity <= item.min_quantity;

  return (
    <Link href={`/inventory/${item.id}`}>
      <Card className={cn(
        'hover:shadow-md transition-shadow cursor-pointer',
        isLowStock && 'border-orange-300'
      )}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{item.name}</h3>
                {item.brand && (
                  <p className="text-sm text-muted-foreground">
                    {item.brand} {item.model && `- ${item.model}`}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className={STATUS_COLORS[item.status]}>
              {item.status.replace(/_/g, ' ')}
            </Badge>
            {item.condition && (
              <Badge variant="outline" className={CONDITION_COLORS[item.condition]}>
                {item.condition}
              </Badge>
            )}
            {item.category && (
              <Badge variant="secondary">{item.category.name}</Badge>
            )}
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            {item.quantity > 1 && (
              <div className="flex items-center gap-2">
                <Box className="h-3.5 w-3.5" />
                <span className={isLowStock ? 'text-orange-600 font-medium' : ''}>
                  Qty: {item.quantity}
                  {item.min_quantity && ` (min: ${item.min_quantity})`}
                </span>
              </div>
            )}
            {item.location && (
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                <span>{item.location}</span>
              </div>
            )}
            {item.assigned_vehicle && (
              <div className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5" />
                <span>{item.assigned_vehicle}</span>
              </div>
            )}
            {item.assigned_user && (
              <div className="flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5" />
                <span>{item.assigned_user.name}</span>
              </div>
            )}
          </div>

          {isLowStock && (
            <div className="mt-3 p-2 bg-orange-50 rounded text-xs text-orange-700 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Low stock - reorder needed
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function AddInventoryForm({
  categories,
  onSuccess,
}: {
  categories: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    brand: '',
    model: '',
    serialNumber: '',
    quantity: 1,
    minQuantity: '',
    location: '',
    assignedVehicle: '',
    status: 'available',
    condition: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          minQuantity: formData.minQuantity ? parseInt(formData.minQuantity) : null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create item');
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to create item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., DeWalt Impact Driver"
            required
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.categoryId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
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
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="in_use">In Use</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
            placeholder="e.g., DeWalt"
          />
        </div>

        <div>
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
            placeholder="e.g., DCF887"
          />
        </div>

        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            value={formData.quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
          />
        </div>

        <div>
          <Label htmlFor="minQuantity">Min Quantity (reorder alert)</Label>
          <Input
            id="minQuantity"
            type="number"
            min={0}
            value={formData.minQuantity}
            onChange={(e) => setFormData(prev => ({ ...prev, minQuantity: e.target.value }))}
            placeholder="Leave empty if N/A"
          />
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            placeholder="e.g., Warehouse, Truck #1"
          />
        </div>

        <div>
          <Label htmlFor="condition">Condition</Label>
          <Select
            value={formData.condition}
            onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes..."
            rows={2}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={submitting || !formData.name}>
          {submitting ? 'Adding...' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
}

function InventorySkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex justify-between">
        <div>
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-28 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
        <div className="h-10 w-40 bg-muted rounded animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="h-24 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

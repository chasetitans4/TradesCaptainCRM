'use client';

import { useState } from 'react';
import { DollarSign, Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import type { PortalPriceItem } from '@/types/portal/lead-captain';

interface PriceListCardProps {
  items: PortalPriceItem[];
  businessId: string;
  onRefresh: () => void;
}

interface PriceFormData {
  service_name: string;
  price_min: string;
  price_max: string;
  price_note: string;
}

const emptyForm: PriceFormData = {
  service_name: '',
  price_min: '',
  price_max: '',
  price_note: '',
};

function formatPrice(min: number | null, max: number | null): string {
  if (min === null && max === null) return 'Contact for price';
  if (min !== null && max !== null) {
    if (min === max) return `$${min}`;
    return `$${min} - $${max}`;
  }
  if (min !== null) return `From $${min}`;
  return `Up to $${max}`;
}

export function PriceListCard({ items, businessId, onRefresh }: PriceListCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PriceFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAddDialog() {
    setFormData(emptyForm);
    setEditingId(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(item: PortalPriceItem) {
    setFormData({
      service_name: item.service_name,
      price_min: item.price_min?.toString() || '',
      price_max: item.price_max?.toString() || '',
      price_note: item.price_note || '',
    });
    setEditingId(item.id);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.service_name.trim()) {
      setError('Service name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body = {
        service_name: formData.service_name.trim(),
        price_min: formData.price_min ? parseFloat(formData.price_min) : null,
        price_max: formData.price_max ? parseFloat(formData.price_max) : null,
        price_note: formData.price_note.trim() || null,
      };

      const url = editingId
        ? `/api/portal/lead-captain/price-list/${editingId}?businessId=${businessId}`
        : `/api/portal/lead-captain/price-list?businessId=${businessId}`;

      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setDialogOpen(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `/api/portal/lead-captain/price-list/${deleteId}?businessId=${businessId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      setDeleteId(null);
      onRefresh();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Price List
              </CardTitle>
              <CardDescription>
                Services and prices the AI can share with leads
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Edit Service' : 'Add Service'}
                  </DialogTitle>
                  <DialogDescription>
                    Enter service details and pricing information
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-name">Service Name</Label>
                    <Input
                      id="service-name"
                      placeholder="e.g., Drain Cleaning"
                      value={formData.service_name}
                      onChange={(e) =>
                        setFormData({ ...formData, service_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price-min">Minimum Price ($)</Label>
                      <Input
                        id="price-min"
                        type="number"
                        placeholder="100"
                        value={formData.price_min}
                        onChange={(e) =>
                          setFormData({ ...formData, price_min: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price-max">Maximum Price ($)</Label>
                      <Input
                        id="price-max"
                        type="number"
                        placeholder="200"
                        value={formData.price_max}
                        onChange={(e) =>
                          setFormData({ ...formData, price_max: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price-note">Notes (optional)</Label>
                    <Input
                      id="price-note"
                      placeholder="e.g., Depends on complexity"
                      value={formData.price_note}
                      onChange={(e) =>
                        setFormData({ ...formData, price_note: e.target.value })
                      }
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : editingId ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {editingId ? 'Save Changes' : 'Add Service'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No services added yet</p>
              <p className="text-sm">Add services to help AI provide accurate pricing</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.service_name}
                    </TableCell>
                    <TableCell>
                      {formatPrice(item.price_min, item.price_max)}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.price_note || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the service from your price list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

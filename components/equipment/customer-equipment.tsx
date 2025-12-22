'use client';

import { useState } from 'react';
import { Plus, Settings, AlertTriangle, Calendar, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInDays } from 'date-fns';

interface Equipment {
  id: string;
  equipment_type: { name: string; manufacturer?: string };
  model_number: string;
  serial_number?: string;
  install_date?: string;
  warranty_expiration?: string;
  location?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'needs_service' | 'replaced';
}

interface CustomerEquipmentProps {
  customerId: string;
  initialEquipment?: Equipment[];
  equipmentTypes?: { id: string; name: string; manufacturer?: string }[];
  readOnly?: boolean;
}

export function CustomerEquipment({
  customerId,
  initialEquipment = [],
  equipmentTypes = [],
  readOnly = false,
}: CustomerEquipmentProps) {
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState({
    equipmentTypeId: '',
    modelNumber: '',
    serialNumber: '',
    installDate: '',
    warrantyExpiration: '',
    location: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      equipmentTypeId: '',
      modelNumber: '',
      serialNumber: '',
      installDate: '',
      warrantyExpiration: '',
      location: '',
      notes: '',
    });
  };

  const handleAdd = async () => {
    if (!formData.equipmentTypeId || !formData.modelNumber) {
      toast({ title: 'Equipment type and model number are required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          equipmentTypeId: formData.equipmentTypeId,
          modelNumber: formData.modelNumber,
          serialNumber: formData.serialNumber || undefined,
          installDate: formData.installDate || undefined,
          warrantyExpiration: formData.warrantyExpiration || undefined,
          location: formData.location || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to add equipment');

      const newEquipment = await response.json();
      setEquipment([...equipment, newEquipment]);
      setShowAddDialog(false);
      resetForm();
      toast({ title: 'Equipment added successfully' });
    } catch (error) {
      toast({ title: 'Failed to add equipment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingEquipment) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/equipment/${editingEquipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelNumber: formData.modelNumber,
          serialNumber: formData.serialNumber || undefined,
          warrantyExpiration: formData.warrantyExpiration || undefined,
          location: formData.location || undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to update equipment');

      const updated = await response.json();
      setEquipment(equipment.map(e => e.id === updated.id ? updated : e));
      setEditingEquipment(null);
      resetForm();
      toast({ title: 'Equipment updated successfully' });
    } catch (error) {
      toast({ title: 'Failed to update equipment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    try {
      const response = await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete equipment');

      setEquipment(equipment.filter(e => e.id !== id));
      toast({ title: 'Equipment deleted' });
    } catch (error) {
      toast({ title: 'Failed to delete equipment', variant: 'destructive' });
    }
  };

  const getWarrantyStatus = (expirationDate?: string) => {
    if (!expirationDate) return null;

    const daysUntil = differenceInDays(new Date(expirationDate), new Date());

    if (daysUntil < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (daysUntil <= 30) return { label: `${daysUntil} days left`, variant: 'warning' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    needs_service: 'bg-yellow-100 text-yellow-800',
    replaced: 'bg-blue-100 text-blue-800',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Equipment ({equipment.length})
          </CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {equipment.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No equipment registered for this customer
          </p>
        ) : (
          <div className="space-y-4">
            {equipment.map((item) => {
              const warrantyStatus = getWarrantyStatus(item.warranty_expiration);

              return (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{item.equipment_type?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.equipment_type?.manufacturer} - {item.model_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[item.status]}>
                        {item.status.replace('_', ' ')}
                      </Badge>
                      {!readOnly && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingEquipment(item);
                              setFormData({
                                equipmentTypeId: '',
                                modelNumber: item.model_number,
                                serialNumber: item.serial_number || '',
                                installDate: item.install_date || '',
                                warrantyExpiration: item.warranty_expiration || '',
                                location: item.location || '',
                                notes: item.notes || '',
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {item.serial_number && (
                      <div>
                        <span className="text-muted-foreground">Serial:</span>{' '}
                        {item.serial_number}
                      </div>
                    )}
                    {item.install_date && (
                      <div>
                        <span className="text-muted-foreground">Installed:</span>{' '}
                        {format(new Date(item.install_date), 'MMM d, yyyy')}
                      </div>
                    )}
                    {item.location && (
                      <div>
                        <span className="text-muted-foreground">Location:</span>{' '}
                        {item.location}
                      </div>
                    )}
                    {warrantyStatus && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-muted-foreground">Warranty:</span>{' '}
                        <Badge variant={warrantyStatus.variant === 'warning' ? 'outline' : warrantyStatus.variant}>
                          {warrantyStatus.label}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <p className="text-sm text-muted-foreground">{item.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog
          open={showAddDialog || !!editingEquipment}
          onOpenChange={(open) => {
            if (!open) {
              setShowAddDialog(false);
              setEditingEquipment(null);
              resetForm();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEquipment ? 'Edit Equipment' : 'Add Equipment'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!editingEquipment && (
                <div className="space-y-2">
                  <Label>Equipment Type *</Label>
                  <Select
                    value={formData.equipmentTypeId}
                    onValueChange={(v) => setFormData({ ...formData, equipmentTypeId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipmentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} {type.manufacturer && `(${type.manufacturer})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Model Number *</Label>
                  <Input
                    value={formData.modelNumber}
                    onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Install Date</Label>
                  <Input
                    type="date"
                    value={formData.installDate}
                    onChange={(e) => setFormData({ ...formData, installDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Warranty Expiration</Label>
                  <Input
                    type="date"
                    value={formData.warrantyExpiration}
                    onChange={(e) => setFormData({ ...formData, warrantyExpiration: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Basement, Rooftop, Kitchen"
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this equipment..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingEquipment(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingEquipment ? handleUpdate : handleAdd}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : editingEquipment ? 'Update' : 'Add Equipment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

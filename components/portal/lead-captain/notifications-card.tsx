'use client';

import { useState } from 'react';
import { Bell, Plus, Pencil, Trash2, Loader2, Check, User, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import type { PortalNotificationRecipient } from '@/types/portal/lead-captain';
import type { RecipientRole, NotificationTriggers } from '@/types/leads-captain';

interface NotificationsCardProps {
  recipients: PortalNotificationRecipient[];
  businessId: string;
  onRefresh: () => void;
}

interface RecipientFormData {
  recipient_name: string;
  recipient_phone: string;
  recipient_email: string;
  recipient_role: RecipientRole;
  notify_sms: boolean;
  notify_email: boolean;
  triggers: NotificationTriggers;
}

const emptyForm: RecipientFormData = {
  recipient_name: '',
  recipient_phone: '',
  recipient_email: '',
  recipient_role: 'owner',
  notify_sms: true,
  notify_email: true,
  triggers: {
    new_conversation: false,
    hot_lead: true,
    emergency: true,
    angry_customer: true,
    escalation: true,
    booking: false,
    every_message: false,
  },
};

const TRIGGER_LABELS: Record<keyof NotificationTriggers, { label: string; description: string }> = {
  new_conversation: { label: 'New Conversations', description: 'When a new lead starts messaging' },
  hot_lead: { label: 'Hot Leads', description: 'When a lead is marked as high priority' },
  emergency: { label: 'Emergencies', description: 'When an emergency is detected' },
  angry_customer: { label: 'Angry Customers', description: 'When negative sentiment is detected' },
  escalation: { label: 'Escalations', description: 'When AI escalates to human' },
  booking: { label: 'New Bookings', description: 'When appointments are scheduled' },
  every_message: { label: 'Every Message', description: 'All incoming messages' },
};

const ROLE_LABELS: Record<RecipientRole, string> = {
  owner: 'Owner',
  oncall: 'On Call',
  backup: 'Backup',
};

export function NotificationsCard({ recipients, businessId, onRefresh }: NotificationsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RecipientFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAddDialog() {
    setFormData(emptyForm);
    setEditingId(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(recipient: PortalNotificationRecipient) {
    setFormData({
      recipient_name: recipient.recipient_name,
      recipient_phone: recipient.recipient_phone || '',
      recipient_email: recipient.recipient_email || '',
      recipient_role: recipient.recipient_role,
      notify_sms: recipient.notify_sms,
      notify_email: recipient.notify_email,
      triggers: recipient.triggers,
    });
    setEditingId(recipient.id);
    setError(null);
    setDialogOpen(true);
  }

  function updateTrigger(key: keyof NotificationTriggers, value: boolean) {
    setFormData((prev) => ({
      ...prev,
      triggers: { ...prev.triggers, [key]: value },
    }));
  }

  async function handleSave() {
    if (!formData.recipient_name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.recipient_phone && !formData.recipient_email) {
      setError('At least one contact method is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const body = {
        recipient_name: formData.recipient_name.trim(),
        recipient_phone: formData.recipient_phone.trim() || null,
        recipient_email: formData.recipient_email.trim() || null,
        recipient_role: formData.recipient_role,
        notify_sms: formData.notify_sms,
        notify_email: formData.notify_email,
        triggers: formData.triggers,
      };

      const url = editingId
        ? `/api/portal/lead-captain/notifications/${editingId}?businessId=${businessId}`
        : `/api/portal/lead-captain/notifications?businessId=${businessId}`;

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
        `/api/portal/lead-captain/notifications/${deleteId}?businessId=${businessId}`,
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
                <Bell className="h-5 w-5" />
                Notification Recipients
              </CardTitle>
              <CardDescription>
                Who receives alerts about leads and conversations
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Edit Recipient' : 'Add Recipient'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure who receives notifications and when
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="John Smith"
                        value={formData.recipient_name}
                        onChange={(e) =>
                          setFormData({ ...formData, recipient_name: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={formData.recipient_phone}
                          onChange={(e) =>
                            setFormData({ ...formData, recipient_phone: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.recipient_email}
                          onChange={(e) =>
                            setFormData({ ...formData, recipient_email: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={formData.recipient_role}
                        onValueChange={(value) =>
                          setFormData({ ...formData, recipient_role: value as RecipientRole })
                        }
                      >
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="oncall">On Call</SelectItem>
                          <SelectItem value="backup">Backup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notification Methods */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label>Notification Methods</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">SMS</span>
                        </div>
                        <Switch
                          checked={formData.notify_sms}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, notify_sms: checked })
                          }
                          disabled={!formData.recipient_phone}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Email</span>
                        </div>
                        <Switch
                          checked={formData.notify_email}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, notify_email: checked })
                          }
                          disabled={!formData.recipient_email}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Triggers */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label>Notification Triggers</Label>
                    <div className="space-y-2">
                      {Object.entries(TRIGGER_LABELS).map(([key, { label, description }]) => (
                        <div key={key} className="flex items-center justify-between py-1">
                          <div>
                            <span className="text-sm font-medium">{label}</span>
                            <p className="text-xs text-gray-500">{description}</p>
                          </div>
                          <Switch
                            checked={formData.triggers[key as keyof NotificationTriggers]}
                            onCheckedChange={(checked) =>
                              updateTrigger(key as keyof NotificationTriggers, checked)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
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
                    {editingId ? 'Save Changes' : 'Add Recipient'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {recipients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notification recipients configured</p>
              <p className="text-sm">Add recipients to stay informed about leads</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{recipient.recipient_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {ROLE_LABELS[recipient.recipient_role]}
                        </Badge>
                        {!recipient.is_active && (
                          <Badge variant="outline" className="text-xs text-gray-500">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {recipient.recipient_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {recipient.recipient_phone}
                          </span>
                        )}
                        {recipient.recipient_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {recipient.recipient_email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(recipient)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(recipient.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Recipient?</AlertDialogTitle>
            <AlertDialogDescription>
              This person will no longer receive notifications. This action cannot be undone.
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
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

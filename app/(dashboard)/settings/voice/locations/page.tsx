'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DualContactSelector } from '@/components/voice/contact-selector';
import { BusinessHoursEditor, CompactHoursDisplay } from '@/components/voice/business-hours-editor';
import type { UserWithBusiness } from '@/types';
import {
  ArrowLeft,
  MapPin,
  Settings,
  Check,
  Loader2,
  Building2,
  Clock,
  Users,
  AlertTriangle,
  ChevronRight,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface BusinessLocation {
  id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  is_active: boolean;
  voice_override: VoiceOverride | null;
}

interface VoiceOverride {
  id: string;
  location_id: string;
  business_hours?: Record<string, { start: string; end: string } | null>;
  primary_contact_id?: string;
  backup_contact_id?: string;
  escalation_wait_minutes?: number;
  service_categories?: string[];
}

interface EditingOverride {
  location: BusinessLocation;
  business_hours: Record<string, { start: string; end: string } | null>;
  primary_contact_id: string;
  backup_contact_id: string;
  escalation_wait_minutes: number;
  use_custom_hours: boolean;
  use_custom_contacts: boolean;
  use_custom_escalation: boolean;
}

function LocationOverridesSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VoiceLocationOverridesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [editingOverride, setEditingOverride] = useState<EditingOverride | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<BusinessLocation | null>(null);

  const loadData = useCallback(async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    try {
      const response = await fetch('/api/voice/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      toast({
        title: 'Failed to load locations',
        description: 'Please try again',
        variant: 'destructive',
      });
    }

    setLoading(false);
  }, [router, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEditor = (location: BusinessLocation) => {
    const override = location.voice_override;
    setEditingOverride({
      location,
      business_hours: override?.business_hours || {},
      primary_contact_id: override?.primary_contact_id || '',
      backup_contact_id: override?.backup_contact_id || '',
      escalation_wait_minutes: override?.escalation_wait_minutes || 5,
      use_custom_hours: !!override?.business_hours && Object.keys(override.business_hours).length > 0,
      use_custom_contacts: !!(override?.primary_contact_id || override?.backup_contact_id),
      use_custom_escalation: override?.escalation_wait_minutes !== undefined,
    });
  };

  const saveOverride = async () => {
    if (!editingOverride) return;

    setSaving(true);
    try {
      const body: Partial<VoiceOverride> = {};

      if (editingOverride.use_custom_hours) {
        body.business_hours = editingOverride.business_hours;
      }

      if (editingOverride.use_custom_contacts) {
        body.primary_contact_id = editingOverride.primary_contact_id || undefined;
        body.backup_contact_id = editingOverride.backup_contact_id || undefined;
      }

      if (editingOverride.use_custom_escalation) {
        body.escalation_wait_minutes = editingOverride.escalation_wait_minutes;
      }

      const response = await fetch(`/api/voice/locations/${editingOverride.location.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save override');
      }

      toast({
        title: 'Override saved',
        description: `Voice settings for ${editingOverride.location.name} have been updated.`,
      });

      setEditingOverride(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Failed to save override',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteOverride = async (location: BusinessLocation) => {
    try {
      const response = await fetch(`/api/voice/locations/${location.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete override');
      }

      toast({
        title: 'Override removed',
        description: `${location.name} will now use global voice settings.`,
      });

      setDeleteConfirm(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Failed to remove override',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  if (loading || !user) {
    return <LocationOverridesSkeleton />;
  }

  const isOwner = user.role === 'owner';
  const isAdmin = user.role === 'admin';
  const canEdit = isOwner || isAdmin;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Location Voice Settings</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Info Card */}
        <section className="card p-4 bg-info/5 border-info/20">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-text">Per-Location Overrides</p>
              <p className="text-sm text-text-muted mt-1">
                Configure voice settings that are specific to each business location.
                These settings override the global defaults for calls to that location.
              </p>
            </div>
          </div>
        </section>

        {/* Locations List */}
        {locations.length === 0 ? (
          <section className="card p-8 text-center">
            <Building2 className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <h3 className="font-semibold text-text mb-2">No Locations Found</h3>
            <p className="text-sm text-text-muted mb-4">
              You haven&apos;t added any business locations yet. Add locations to configure
              per-location voice settings.
            </p>
            <Button onClick={() => router.push('/settings/locations')}>
              Add Locations
            </Button>
          </section>
        ) : (
          <section className="space-y-3">
            {locations.map((location) => {
              const hasOverride = location.voice_override !== null;

              return (
                <div
                  key={location.id}
                  className={cn(
                    'card p-4 cursor-pointer hover:border-primary/50 transition-colors',
                    hasOverride && 'border-l-4 border-l-primary'
                  )}
                  onClick={() => canEdit && openEditor(location)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-text">{location.name}</h3>
                        {hasOverride && (
                          <Badge variant="secondary" className="text-xs">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-muted mt-1">
                        {[location.address_line1, location.city, location.state]
                          .filter(Boolean)
                          .join(', ') || 'No address'}
                      </p>

                      {/* Override summary */}
                      {hasOverride && location.voice_override && (
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
                          {location.voice_override.business_hours &&
                           Object.keys(location.voice_override.business_hours).length > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Custom hours
                            </span>
                          )}
                          {(location.voice_override.primary_contact_id ||
                            location.voice_override.backup_contact_id) && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Custom contacts
                            </span>
                          )}
                          {location.voice_override.escalation_wait_minutes && (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {location.voice_override.escalation_wait_minutes}min escalation
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <ChevronRight className="h-5 w-5 text-text-muted" />
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={editingOverride !== null}
        onOpenChange={(open) => !open && setEditingOverride(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Voice Settings: {editingOverride?.location.name}
            </DialogTitle>
            <DialogDescription>
              Configure voice-specific settings for this location.
              Leave toggles off to use global defaults.
            </DialogDescription>
          </DialogHeader>

          {editingOverride && (
            <div className="space-y-6 py-4">
              {/* Custom Business Hours */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">Custom Business Hours</p>
                    <p className="text-xs text-text-muted">
                      Override global hours for this location
                    </p>
                  </div>
                  <Switch
                    checked={editingOverride.use_custom_hours}
                    onCheckedChange={(checked) =>
                      setEditingOverride({
                        ...editingOverride,
                        use_custom_hours: checked,
                      })
                    }
                  />
                </div>

                {editingOverride.use_custom_hours && (
                  <BusinessHoursEditor
                    value={editingOverride.business_hours}
                    onChange={(hours) =>
                      setEditingOverride({
                        ...editingOverride,
                        business_hours: hours,
                      })
                    }
                  />
                )}
              </div>

              {/* Custom Contacts */}
              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">Custom Contacts</p>
                    <p className="text-xs text-text-muted">
                      Override primary/backup contacts for this location
                    </p>
                  </div>
                  <Switch
                    checked={editingOverride.use_custom_contacts}
                    onCheckedChange={(checked) =>
                      setEditingOverride({
                        ...editingOverride,
                        use_custom_contacts: checked,
                      })
                    }
                  />
                </div>

                {editingOverride.use_custom_contacts && (
                  <DualContactSelector
                    primaryContactId={editingOverride.primary_contact_id || undefined}
                    backupContactId={editingOverride.backup_contact_id || undefined}
                    onPrimaryChange={(val) =>
                      setEditingOverride({
                        ...editingOverride,
                        primary_contact_id: val || '',
                      })
                    }
                    onBackupChange={(val) =>
                      setEditingOverride({
                        ...editingOverride,
                        backup_contact_id: val || '',
                      })
                    }
                  />
                )}
              </div>

              {/* Custom Escalation */}
              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">Custom Escalation Time</p>
                    <p className="text-xs text-text-muted">
                      Override escalation wait time for this location
                    </p>
                  </div>
                  <Switch
                    checked={editingOverride.use_custom_escalation}
                    onCheckedChange={(checked) =>
                      setEditingOverride({
                        ...editingOverride,
                        use_custom_escalation: checked,
                      })
                    }
                  />
                </div>

                {editingOverride.use_custom_escalation && (
                  <div>
                    <Label>Escalation Wait Time (minutes)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={editingOverride.escalation_wait_minutes}
                      onChange={(e) =>
                        setEditingOverride({
                          ...editingOverride,
                          escalation_wait_minutes: parseInt(e.target.value) || 5,
                        })
                      }
                      className="mt-1 w-32"
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                {editingOverride.location.voice_override && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteConfirm(editingOverride.location);
                      setEditingOverride(null);
                    }}
                    className="text-danger hover:text-danger"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Global
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  variant="outline"
                  onClick={() => setEditingOverride(null)}
                >
                  Cancel
                </Button>
                <Button onClick={saveOverride} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to Global Settings?</DialogTitle>
            <DialogDescription>
              This will remove all custom voice settings for{' '}
              <strong>{deleteConfirm?.name}</strong> and use the global defaults instead.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteOverride(deleteConfirm)}
            >
              Reset to Global
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/components/ui';
import {
  Car,
  MapPin,
  DollarSign,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Navigation,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface MileageEntry {
  id: string;
  trip_date: string;
  start_address?: string;
  end_address?: string;
  confirmed_miles?: number;
  status: string;
  arrived_at?: string;
  job?: { id: string; title: string };
  user?: { id: string; name: string };
}

interface MileageStats {
  totalMiles: number;
  totalTrips: number;
  avgMilesPerDay: number;
  reimbursementAmount: number;
  byTechnician?: Array<{
    userId: string;
    userName: string;
    miles: number;
    trips: number;
  }>;
}

export default function MileagePage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<MileageEntry[]>([]);
  const [stats, setStats] = useState<MileageStats | null>(null);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

  useEffect(() => {
    fetchData();
  }, [weekStart]);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const [entriesRes, statsRes] = await Promise.all([
        fetch(
          `/api/mileage?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
        ),
        fetch(
          `/api/mileage/stats?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
        ),
      ]);

      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setEntries(entriesData.entries || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error('Error fetching mileage data:', err);
      setError('Failed to load mileage data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-text">Mileage Tracking</h1>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Manual Entry
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <Alert variant="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium text-text">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            disabled={weekStart >= startOfWeek(new Date(), { weekStartsOn: 0 })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-text-muted mb-1">Total Miles</p>
              <p className="text-2xl font-bold text-text">
                {stats?.totalMiles?.toFixed(1) || '0'} mi
              </p>
              <p className="text-xs text-text-muted">{stats?.totalTrips || 0} trips</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-text-muted mb-1">Reimbursement</p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(stats?.reimbursementAmount || 0)}
              </p>
              <p className="text-xs text-text-muted">@ $0.67/mi</p>
            </CardContent>
          </Card>
        </div>

        {/* By Technician (if available) */}
        {stats?.byTechnician && stats.byTechnician.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Technician</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stats.byTechnician.map((tech) => (
                <div
                  key={tech.userId}
                  className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-text">{tech.userName}</p>
                    <p className="text-xs text-text-muted">{tech.trips} trips</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-text">{tech.miles.toFixed(1)} mi</p>
                    <p className="text-xs text-text-muted">
                      {formatCurrency(tech.miles * 0.67)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Trips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Trips</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {entries.length === 0 ? (
              <div className="py-8 text-center text-text-muted">
                <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No trips recorded this week</p>
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="px-4 py-3 border-b border-border last:border-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="font-medium text-text truncate">
                          {entry.end_address || entry.job?.title || 'Trip'}
                        </p>
                      </div>
                      {entry.job && (
                        <p className="text-xs text-text-muted mt-0.5 ml-6">
                          {entry.job.title}
                        </p>
                      )}
                      <p className="text-xs text-text-muted mt-0.5 ml-6">
                        {entry.arrived_at
                          ? format(new Date(entry.arrived_at), 'MMM d, h:mm a')
                          : format(new Date(entry.trip_date), 'MMM d')}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="font-semibold text-text">
                        {entry.confirmed_miles?.toFixed(1) || '0'} mi
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          entry.status === 'confirmed'
                            ? 'bg-success/10 text-success'
                            : entry.status === 'manual'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-text-muted'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Manual Entry Modal */}
      <AddMileageModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchData();
        }}
      />
    </div>
  );
}

function AddMileageModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tripDate: format(new Date(), 'yyyy-MM-dd'),
    startAddress: '',
    endAddress: '',
    miles: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/mileage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add entry');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Manual Mileage Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="tripDate">Trip Date</Label>
            <Input
              id="tripDate"
              type="date"
              value={formData.tripDate}
              onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startAddress">Start Address (optional)</Label>
            <Input
              id="startAddress"
              placeholder="e.g., Office, Home"
              value={formData.startAddress}
              onChange={(e) => setFormData({ ...formData, startAddress: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endAddress">End Address (optional)</Label>
            <Input
              id="endAddress"
              placeholder="e.g., Customer location"
              value={formData.endAddress}
              onChange={(e) => setFormData({ ...formData, endAddress: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="miles">Miles</Label>
            <Input
              id="miles"
              type="number"
              step="0.1"
              placeholder="0.0"
              value={formData.miles}
              onChange={(e) => setFormData({ ...formData, miles: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="What was this trip for?"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, User, Phone, CheckCircle, CalendarClock, Loader2, ChevronRight } from 'lucide-react';
import { CompactJobTimeline } from '@/components/portal/job-timeline';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddressLink } from '@/components/ui/address-link';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import { logger } from '@/lib/logger';
import { useDemoMode, getDemoAppointments, mergeWithDemoData } from '@/lib/portal/demo-data/use-demo-data';
const portalAppointmentsLogger = logger.child({ context: 'portal.appointments' });

interface Appointment {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  estimated_duration?: number;
  status: string;
  address?: string;
  assigned_user?: {
    id: string;
    name: string;
    phone?: string;
  };
}

export default function AppointmentsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const demoMode = useDemoMode();

  useEffect(() => {
    async function loadAppointments() {
      try {
        const response = await fetch(
          `/api/portal/appointments?businessId=${businessId}`
        );
        const data = await response.json();
        setUpcoming(data.upcoming || []);
        setHistory(data.history || []);
      } catch (error) {
        portalAppointmentsLogger.error({
          msg: 'Error loading appointments',
          businessId,
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
        });
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [businessId]);

  // Merge demo data with real data when demo mode is active
  const demoAppointments = getDemoAppointments();
  const displayUpcoming = mergeWithDemoData(upcoming, demoAppointments.upcoming as Appointment[], demoMode);
  const displayHistory = mergeWithDemoData(history, demoAppointments.history as Appointment[], demoMode);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
      case 'on_the_way':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canReschedule = (status: string) => {
    return ['scheduled', 'confirmed'].includes(status);
  };

  if (loading) {
    return <AppointmentsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <p className="text-gray-500">View your scheduled and past appointments</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({displayUpcoming.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({displayHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {displayUpcoming.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No upcoming appointments
                </h3>
                <p className="text-gray-500">
                  You don't have any scheduled appointments at the moment
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {displayUpcoming.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  canReschedule={canReschedule(appointment.status)}
                  onReschedule={() => setRescheduleAppointment(appointment)}
                  businessId={businessId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {displayHistory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No past appointments
                </h3>
                <p className="text-gray-500">
                  Your completed appointments will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {displayHistory.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  canReschedule={false}
                  businessId={businessId}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reschedule Sheet */}
      <RescheduleSheet
        appointment={rescheduleAppointment}
        businessId={businessId}
        onClose={() => setRescheduleAppointment(null)}
      />
    </div>
  );
}

function AppointmentCard({
  appointment,
  formatDate,
  getStatusColor,
  canReschedule,
  onReschedule,
  businessId,
}: {
  appointment: Appointment;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
  canReschedule: boolean;
  onReschedule?: () => void;
  businessId: string;
}) {
  const isActive = ['scheduled', 'confirmed', 'on_the_way', 'arrived', 'in_progress'].includes(appointment.status);

  return (
    <Card className={isActive ? 'border-blue-200' : ''}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status.replace('_', ' ')}
              </Badge>
            </div>

            {/* Compact Timeline for active appointments */}
            {isActive && (
              <div className="mb-3">
                <CompactJobTimeline currentStatus={appointment.status} />
              </div>
            )}

            {appointment.description && (
              <p className="text-gray-600 text-sm mb-3">{appointment.description}</p>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                {formatDate(appointment.scheduled_date)}
              </div>

              {appointment.scheduled_time && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {appointment.scheduled_time}
                  {appointment.estimated_duration && (
                    <span className="text-gray-400">
                      ({appointment.estimated_duration} min)
                    </span>
                  )}
                </div>
              )}

              {appointment.address && (
                <AddressLink
                  address={appointment.address}
                  className="flex items-center gap-2 text-sm text-gray-600"
                />
              )}

              {appointment.assigned_user && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>Technician: {appointment.assigned_user.name}</span>
                  {appointment.assigned_user.phone && (
                    <a
                      href={`tel:${appointment.assigned_user.phone}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Phone className="h-3 w-3" />
                      Call
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
              <Link href={`/portal/${businessId}/appointments/${appointment.id}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  View Details
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
              {canReschedule && onReschedule && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReschedule}
                  className="gap-2"
                >
                  <CalendarClock className="h-4 w-4" />
                  Request Reschedule
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RescheduleSheet({
  appointment,
  businessId,
  onClose,
}: {
  appointment: Appointment | null;
  businessId: string;
  onClose: () => void;
}) {
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when appointment changes
  useEffect(() => {
    if (appointment) {
      setPreferredDate('');
      setPreferredTime('');
      setReason('');
      setSuccess(false);
      setError(null);
    }
  }, [appointment]);

  const handleSubmit = async () => {
    if (!appointment || !preferredDate) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/portal/appointments/${appointment.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          preferredDate,
          preferredTime: preferredTime || undefined,
          reason: reason || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit reschedule request');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <BottomSheet
      open={!!appointment}
      onOpenChange={(open) => !open && onClose()}
      title="Request Reschedule"
      description={appointment?.title}
    >
      {success ? (
        <div className="py-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Request Submitted
          </h3>
          <p className="text-gray-500 mb-6">
            We've received your reschedule request. The business will contact you to confirm the new date and time.
          </p>
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Date *
            </label>
            <Input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              min={getMinDate()}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Time (optional)
            </label>
            <Input
              type="time"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              We'll do our best to accommodate your preference
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Let us know why you need to reschedule..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={!preferredDate || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function AppointmentsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="h-10 w-64 bg-gray-100 rounded animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-32 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

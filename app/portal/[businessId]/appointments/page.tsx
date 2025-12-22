'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
        console.error('Error loading appointments:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [businessId]);

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
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          {upcoming.length === 0 ? (
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
              {upcoming.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {history.length === 0 ? (
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
              {history.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AppointmentCard({
  appointment,
  formatDate,
  getStatusColor,
}: {
  appointment: Appointment;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">{appointment.title}</h3>
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status.replace('_', ' ')}
              </Badge>
            </div>

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
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {appointment.address}
                </div>
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
          </div>
        </div>
      </CardContent>
    </Card>
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

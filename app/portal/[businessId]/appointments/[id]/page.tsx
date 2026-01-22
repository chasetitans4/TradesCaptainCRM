'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddressLink } from '@/components/ui/address-link';
import { JobTimeline } from '@/components/portal/job-timeline';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  FileText,
  MessageSquare,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentDetail {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  estimated_duration?: number;
  status: string;
  address?: string;
  city?: string;
  notes?: string;
  assigned_user?: {
    id: string;
    name: string;
    phone?: string;
  };
  job_type?: string;
  timestamps?: {
    scheduled_at?: string;
    confirmed_at?: string;
    on_the_way_at?: string;
    arrived_at?: string;
    started_at?: string;
    completed_at?: string;
  };
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAppointment = async () => {
    try {
      const response = await fetch(
        `/api/portal/appointments/${appointmentId}?businessId=${businessId}`
      );
      if (response.ok) {
        const data = await response.json();
        setAppointment(data.appointment);
      } else if (response.status === 404) {
        router.push(`/portal/${businessId}/appointments`);
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAppointment();
    // Poll for updates every 30 seconds if job is active
    const interval = setInterval(() => {
      if (appointment && ['scheduled', 'confirmed', 'on_the_way', 'arrived', 'in_progress'].includes(appointment.status)) {
        loadAppointment();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [businessId, appointmentId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAppointment();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time?: string) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'on_the_way':
      case 'arrived':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Scheduled',
      confirmed: 'Confirmed',
      on_the_way: 'On the Way',
      arrived: 'Arrived',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
          <div className="bg-white rounded-xl p-6 space-y-4">
            <div className="h-6 w-3/4 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-gray-500">Appointment not found</p>
        <Link href={`/portal/${businessId}/appointments`}>
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Appointments
          </Button>
        </Link>
      </div>
    );
  }

  const isActive = ['scheduled', 'confirmed', 'on_the_way', 'arrived', 'in_progress'].includes(appointment.status);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/portal/${businessId}/appointments`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
            <p className="text-sm text-gray-500">
              {formatDate(appointment.scheduled_date)}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
        </Button>
      </div>

      {/* Status Banner */}
      {isActive && (
        <Card className="mb-4 border-blue-200 bg-blue-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <span className="text-sm font-medium text-blue-800">
                  {getStatusLabel(appointment.status)}
                </span>
              </div>
              <Badge className={getStatusColor(appointment.status)}>
                Live Tracking
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Card */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{appointment.title}</CardTitle>
              {appointment.job_type && (
                <p className="text-sm text-gray-500 capitalize mt-1">
                  {appointment.job_type.replace('_', ' ')}
                </p>
              )}
            </div>
            <Badge className={getStatusColor(appointment.status)}>
              {getStatusLabel(appointment.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>{formatDate(appointment.scheduled_date)}</span>
            {appointment.scheduled_time && (
              <>
                <Clock className="h-4 w-4 text-gray-400 ml-2" />
                <span>{formatTime(appointment.scheduled_time)}</span>
              </>
            )}
          </div>

          {/* Duration */}
          {appointment.estimated_duration && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>Estimated duration: {appointment.estimated_duration} minutes</span>
            </div>
          )}

          {/* Address */}
          {appointment.address && (
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <AddressLink
                address={appointment.address}
                city={appointment.city}
                className="text-blue-600 hover:underline"
              />
            </div>
          )}

          {/* Technician */}
          {appointment.assigned_user && (
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-gray-500 mb-2">Assigned Technician</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <span className="font-medium">{appointment.assigned_user.name}</span>
                </div>
                {appointment.assigned_user.phone && (
                  <a
                    href={`tel:${appointment.assigned_user.phone}`}
                    className="flex items-center gap-1 text-sm text-blue-600"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {appointment.description && (
            <div className="pt-3 border-t">
              <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700">{appointment.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Timeline */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Job Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <JobTimeline
            currentStatus={appointment.status}
            timestamps={appointment.timestamps}
            showAllSteps={appointment.status === 'completed'}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href={`/portal/${businessId}/messages`} className="flex-1">
          <Button variant="outline" className="w-full">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </Link>
        {appointment.status === 'completed' && (
          <Link href={`/portal/${businessId}/invoices`} className="flex-1">
            <Button className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              View Invoice
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

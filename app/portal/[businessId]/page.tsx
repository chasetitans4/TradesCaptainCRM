'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Receipt,
  FileText,
  Wrench,
  Clock,
  DollarSign,
  ArrowRight,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DashboardData {
  summary: {
    upcomingAppointments: number;
    unpaidInvoices: number;
    totalDue: number;
    activeEquipment: number;
    pendingRequests: number;
  };
  nextAppointment: any | null;
  recentInvoices: any[];
  pendingQuotes: any[];
}

export default function PortalDashboard() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch(`/api/portal/dashboard?businessId=${businessId}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [businessId]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load dashboard</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-500">Here's an overview of your account</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.summary.upcomingAppointments}</p>
                <p className="text-sm text-gray-500">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Receipt className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.summary.unpaidInvoices}</p>
                <p className="text-sm text-gray-500">Unpaid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(data.summary.totalDue)}</p>
                <p className="text-sm text-gray-500">Total Due</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wrench className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.summary.activeEquipment}</p>
                <p className="text-sm text-gray-500">Equipment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href={`/portal/${businessId}/request`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Plus className="h-5 w-5" />
                <span className="text-sm">Request Service</span>
              </Button>
            </Link>
            <Link href={`/portal/${businessId}/appointments`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Calendar className="h-5 w-5" />
                <span className="text-sm">View Schedule</span>
              </Button>
            </Link>
            <Link href={`/portal/${businessId}/invoices`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Receipt className="h-5 w-5" />
                <span className="text-sm">Pay Invoice</span>
              </Button>
            </Link>
            <Link href={`/portal/${businessId}/equipment`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Wrench className="h-5 w-5" />
                <span className="text-sm">My Equipment</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Next Appointment */}
      {data.nextAppointment && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Next Appointment</CardTitle>
            <Link href={`/portal/${businessId}/appointments`}>
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="p-2 bg-white rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{data.nextAppointment.title}</p>
                <p className="text-sm text-gray-600">
                  {formatDate(data.nextAppointment.scheduled_date)}
                  {data.nextAppointment.scheduled_time && (
                    <> at {data.nextAppointment.scheduled_time}</>
                  )}
                </p>
                {data.nextAppointment.assigned_user && (
                  <p className="text-sm text-gray-500 mt-1">
                    Technician: {data.nextAppointment.assigned_user.name}
                  </p>
                )}
              </div>
              <Badge variant="secondary">{data.nextAppointment.status}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Quotes */}
      {data.pendingQuotes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Pending Quotes</CardTitle>
              <Badge variant="secondary">{data.pendingQuotes.length}</Badge>
            </div>
            <Link href={`/portal/${businessId}/quotes`}>
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.pendingQuotes.slice(0, 3).map((quote: any) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">Quote #{quote.quote_number}</p>
                    <p className="text-sm text-gray-500">
                      Valid until {formatDate(quote.valid_until)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(quote.total)}</p>
                    <Link href={`/portal/${businessId}/quotes/${quote.id}`}>
                      <Button size="sm" className="mt-1">
                        Review
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      {data.recentInvoices.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
            <Link href={`/portal/${businessId}/invoices`}>
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentInvoices.slice(0, 5).map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">Invoice #{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-500">
                      {invoice.job?.title || 'Service'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(invoice.total)}</p>
                    <Badge
                      className={
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-16 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="h-32 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

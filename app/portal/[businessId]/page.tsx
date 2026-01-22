'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Receipt,
  Wrench,
  DollarSign,
  ArrowRight,
  Plus,
  AlertTriangle,
  AlertCircle,
  Clock,
  FileText,
  CheckCircle,
  MessageCircle,
  Phone,
  MapPin,
  Home,
  History,
  ShieldCheck,
  Gift,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logger } from '@/lib/logger';
const portalDashboardLogger = logger.child({ context: 'portal.dashboard' });

interface CustomerProfile {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface ServiceHistoryItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  scheduled_date?: string;
  completed_at?: string;
  technician?: string;
}

interface Appointment {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: string;
  assigned_user?: {
    id: string;
    name: string;
  };
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  total: number;
  due_date?: string;
  job?: {
    title: string;
  };
}

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  total: number;
  valid_until?: string;
}

interface DashboardData {
  summary: {
    upcomingAppointments: number;
    unpaidInvoices: number;
    totalDue: number;
    activeEquipment: number;
    pendingRequests: number;
  };
  nextAppointment: Appointment | null;
  recentInvoices: Invoice[];
  pendingQuotes: Quote[];
  overdueInvoices?: Invoice[];
  expiringQuotes?: Quote[];
  warrantyAlerts?: { id: string; message: string; equipment_id: string }[];
  unreadMessages?: number;
  customerProfile?: CustomerProfile;
  serviceHistory?: ServiceHistoryItem[];
  activeStatus?: {
    hasActiveJob: boolean;
    currentJob?: {
      id: string;
      title: string;
      status: string;
      technician?: string;
      eta?: string;
    };
    technicianEnRoute?: boolean;
  };
  actionItems?: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
    link: string;
  }>;
  tradesFeatures?: {
    equipment: {
      total: number;
      needingService: number;
      expiringWarranties: number;
    };
    estimates: {
      pending: number;
    };
    membership: {
      active: boolean;
      tier?: string;
      expiresAt?: string;
      needsRenewal?: boolean;
    } | null;
    referrals: {
      available: boolean;
      totalReferrals: number;
      pendingRewards: number;
    } | null;
    issues: {
      open: number;
    };
  };
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
        if (!response.ok) {
          throw new Error(`Dashboard load failed: ${response.status}`);
        }
        const result = await response.json();
        
        // CR-001: Validate response data structure
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid dashboard data received');
        }
        
        setData(result);
      } catch (error) {
        portalDashboardLogger.error({
          msg: 'Error loading dashboard',
          businessId,
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
        });
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

  // Check for alerts that need attention
  const hasOverdueInvoices = (data.overdueInvoices?.length || 0) > 0 ||
    data.recentInvoices.some(inv => inv.status === 'overdue');
  const hasExpiringQuotes = (data.expiringQuotes?.length || 0) > 0 ||
    data.pendingQuotes.some(q => {
      if (!q.valid_until) return false;
      const validUntil = new Date(q.valid_until);
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      return validUntil <= threeDaysFromNow && validUntil >= new Date();
    });
  const overdueAmount = data.recentInvoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Personalized Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{data.customerProfile?.name ? `, ${data.customerProfile.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-gray-500">Here's an overview of your account</p>
      </div>

      {/* Action Items Alert */}
      {data.actionItems && data.actionItems.length > 0 && (
        <div className="space-y-2">
          {data.actionItems.map((item, index) => (
            <Alert key={index} variant={item.priority === 'high' ? 'destructive' : 'default'} className={item.priority === 'high' ? 'border-red-200 bg-red-50 text-red-900' : 'border-blue-200 bg-blue-50 text-blue-900'}>
              {item.priority === 'high' ? <AlertTriangle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{item.priority === 'high' ? 'Action Required' : 'Notice'}</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{item.message}</span>
                <Link href={item.link.replace('/portal', `/portal/${businessId}`)}>
                  <Button variant="link" size="sm" className={item.priority === 'high' ? 'text-red-900 font-semibold' : 'text-blue-900 font-semibold'}>
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Trades Features Quick Access */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href={`/portal/${businessId}/equipment`}>
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Equipment</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.tradesFeatures?.equipment.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {data.tradesFeatures?.equipment.needingService || 0} need service
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/portal/${businessId}/membership`}>
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membership</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.tradesFeatures?.membership?.active ? 'Active' : 'None'}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.tradesFeatures?.membership?.tier || 'View plans'}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/portal/${businessId}/referrals`}>
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Referrals</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.tradesFeatures?.referrals?.pendingRewards || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Pending rewards
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/portal/${businessId}/documents`}>
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">View</div>
              <p className="text-xs text-muted-foreground">
                Contracts & Manuals
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Active Status Card - Shows current job status if any */}
      {data.activeStatus?.hasActiveJob && data.activeStatus.currentJob && (
        <Card className={`border-2 ${
          data.activeStatus.technicianEnRoute
            ? 'border-green-400 bg-gradient-to-r from-green-50 to-emerald-50'
            : 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${
                data.activeStatus.technicianEnRoute
                  ? 'bg-green-100'
                  : 'bg-blue-100'
              }`}>
                {data.activeStatus.technicianEnRoute ? (
                  <MapPin className="h-6 w-6 text-green-600 animate-pulse" />
                ) : (
                  <Wrench className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">
                    {data.activeStatus.technicianEnRoute
                      ? 'Technician En Route!'
                      : 'Service In Progress'}
                  </h3>
                  <Badge className={
                    data.activeStatus.technicianEnRoute
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }>
                    {data.activeStatus.currentJob.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-gray-700 font-medium">
                  {data.activeStatus.currentJob.title}
                </p>
                {data.activeStatus.currentJob.technician && (
                  <p className="text-sm text-gray-500 mt-1">
                    Technician: {data.activeStatus.currentJob.technician}
                  </p>
                )}
                {data.activeStatus.currentJob.eta && (
                  <p className="text-sm font-medium text-green-700 mt-2">
                    ETA: {data.activeStatus.currentJob.eta}
                  </p>
                )}
              </div>
              <Link href={`/portal/${businessId}/messages`}>
                <Button size="sm" variant="outline">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Message
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Alert Widgets - Only shown when relevant */}
      {(hasOverdueInvoices || hasExpiringQuotes || data.summary.totalDue > 0) && (
        <div className="space-y-3">
          {/* Overdue Invoice Alert */}
          {hasOverdueInvoices && overdueAmount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-red-900">Payment Overdue</p>
                    <p className="text-sm text-red-700">
                      You have {formatCurrency(overdueAmount)} in overdue invoices
                    </p>
                  </div>
                  <Link href={`/portal/${businessId}/invoices`}>
                    <Button size="sm" variant="destructive">
                      Pay Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expiring Quote Alert */}
          {hasExpiringQuotes && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-yellow-900">Quote Expiring Soon</p>
                    <p className="text-sm text-yellow-700">
                      You have quotes that will expire within 3 days
                    </p>
                  </div>
                  <Link href={`/portal/${businessId}/quotes`}>
                    <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                      Review Quotes
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Quotes Reminder */}
          {data.pendingQuotes.length > 0 && !hasExpiringQuotes && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">Quotes Awaiting Review</p>
                    <p className="text-sm text-blue-700">
                      You have {data.pendingQuotes.length} pending quote{data.pendingQuotes.length > 1 ? 's' : ''} to review
                    </p>
                  </div>
                  <Link href={`/portal/${businessId}/quotes`}>
                    <Button size="sm">
                      Review
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Link href={`/portal/${businessId}/emergency`}>
              <Button variant="destructive" className="w-full h-auto py-4 flex-col gap-2 bg-red-600 hover:bg-red-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">Emergency</span>
              </Button>
            </Link>
            <Link href={`/portal/${businessId}/request`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Plus className="h-5 w-5" />
                <span className="text-sm">Request Service</span>
              </Button>
            </Link>
            <Link href={`/portal/${businessId}/issues`}>
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">Report Issue</span>
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
              {data.pendingQuotes.slice(0, 3).map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">Quote #{quote.quote_number}</p>
                    {quote.valid_until && (
                      <p className="text-sm text-gray-500">
                        Valid until {formatDate(quote.valid_until)}
                      </p>
                    )}
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
              {data.recentInvoices.slice(0, 5).map((invoice) => (
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

      {/* Service History Timeline */}
      {data.serviceHistory && data.serviceHistory.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Service History
            </CardTitle>
            <Link href={`/portal/${businessId}/appointments`}>
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-6">
                {data.serviceHistory.slice(0, 5).map((item) => (
                  <div key={item.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                      item.status === 'completed'
                        ? 'bg-green-500'
                        : item.status === 'in_progress'
                        ? 'bg-blue-500'
                        : item.status === 'scheduled'
                        ? 'bg-yellow-500'
                        : 'bg-gray-300'
                    }`}>
                      {item.status === 'completed' && (
                        <CheckCircle className="h-3 w-3 text-white" />
                      )}
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">
                              {item.description}
                            </p>
                          )}
                          {item.technician && (
                            <p className="text-xs text-gray-500 mt-1">
                              Tech: {item.technician}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge className={
                            item.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : item.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }>
                            {item.status.replace(/_/g, ' ')}
                          </Badge>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(item.completed_at || item.scheduled_date || '')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property Profile Card */}
      {data.customerProfile && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5" />
              My Property
            </CardTitle>
            <Link href={`/portal/${businessId}/settings`}>
              <Button variant="ghost" size="sm">
                Edit
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">
                    {data.customerProfile.address ? (
                      <>
                        {data.customerProfile.address}
                        {data.customerProfile.city && (
                          <>, {data.customerProfile.city}</>
                        )}
                        {data.customerProfile.state && (
                          <>, {data.customerProfile.state}</>
                        )}
                        {data.customerProfile.zip && (
                          <> {data.customerProfile.zip}</>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">No address on file</span>
                    )}
                  </span>
                </div>
                {data.customerProfile.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{data.customerProfile.phone}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{data.summary.activeEquipment}</p>
                  <p className="text-xs text-gray-500">Equipment</p>
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {(data.serviceHistory?.filter(s => s.status === 'completed').length || 0)}
                  </p>
                  <p className="text-xs text-gray-500">Services Done</p>
                </div>
              </div>
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

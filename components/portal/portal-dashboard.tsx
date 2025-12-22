'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  FileText,
  Clock,
  DollarSign,
  Wrench,
  LogOut,
  User,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DashboardData {
  customer: {
    name: string;
    email: string;
  };
  business: {
    name: string;
  };
  upcomingAppointments: Array<{
    id: string;
    title: string;
    type: string;
    scheduledDate: string;
    scheduledTime: string;
    status: string;
  }>;
  openInvoices: Array<{
    id: string;
    invoiceNumber: string;
    total: number;
    dueDate: string;
    status: string;
  }>;
  recentJobs: Array<{
    id: string;
    title: string;
    completedDate: string;
  }>;
  stats: {
    totalJobs: number;
    totalSpent: number;
    unpaidAmount: number;
  };
}

interface PortalDashboardProps {
  onNavigate?: (view: string) => void;
  primaryColor?: string;
}

export function PortalDashboard({ onNavigate, primaryColor = '#2563eb' }: PortalDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/portal/dashboard');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/portal/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {data.customer.name.split(' ')[0]}!</h1>
          <p className="text-muted-foreground">{data.business.name} Customer Portal</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <Wrench className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.totalJobs}</p>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${data.stats.totalSpent.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${data.stats.unpaidAmount > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <FileText className={`h-5 w-5 ${data.stats.unpaidAmount > 0 ? 'text-orange-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">${data.stats.unpaidAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Button
          variant="outline"
          className="h-auto py-4 justify-start"
          onClick={() => onNavigate?.('service-request')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full" style={{ backgroundColor: `${primaryColor}20` }}>
              <Wrench className="h-5 w-5" style={{ color: primaryColor }} />
            </div>
            <div className="text-left">
              <p className="font-medium">Request Service</p>
              <p className="text-sm text-muted-foreground">Schedule a new appointment</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 ml-auto" />
        </Button>

        <Button
          variant="outline"
          className="h-auto py-4 justify-start"
          onClick={() => onNavigate?.('invoices')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium">Pay Invoice</p>
              <p className="text-sm text-muted-foreground">View and pay your invoices</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 ml-auto" />
        </Button>
      </div>

      <Separator />

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
            <CardDescription>Your scheduled services</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate?.('appointments')}
          >
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {data.upcomingAppointments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No upcoming appointments
            </p>
          ) : (
            <div className="space-y-3">
              {data.upcomingAppointments.slice(0, 3).map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Calendar className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{apt.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(apt.scheduledDate).toLocaleDateString()} at {apt.scheduledTime}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{apt.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Open Invoices */}
      {data.openInvoices.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Open Invoices</CardTitle>
              <CardDescription>Invoices awaiting payment</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.('invoices')}
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.openInvoices.slice(0, 3).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-orange-100">
                      <FileText className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Invoice #{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${invoice.total.toFixed(2)}</p>
                    <Button size="sm" style={{ backgroundColor: primaryColor }}>
                      Pay Now
                    </Button>
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

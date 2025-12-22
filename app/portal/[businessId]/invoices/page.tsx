'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Receipt,
  CreditCard,
  Download,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  due_date?: string;
  paid_at?: string;
  paid_amount?: number;
  payment_method?: string;
  created_at: string;
  job?: { title: string };
  payment_link?: string;
}

export default function InvoicesPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [unpaid, setUnpaid] = useState<Invoice[]>([]);
  const [paid, setPaid] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const response = await fetch(
          `/api/portal/invoices?businessId=${businessId}`
        );
        const data = await response.json();
        setUnpaid(data.unpaid || []);
        setPaid(data.paid || []);
      } catch (error) {
        console.error('Error loading invoices:', error);
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, [businessId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'sent':
      case 'viewed':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (loading) {
    return <InvoicesSkeleton />;
  }

  const totalDue = unpaid.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices & Payments</h1>
        <p className="text-gray-500">View and pay your invoices</p>
      </div>

      {/* Total Due Banner */}
      {totalDue > 0 && (
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Amount Due</p>
                <p className="text-3xl font-bold">{formatCurrency(totalDue)}</p>
                <p className="text-blue-100 text-sm mt-1">
                  {unpaid.length} unpaid invoice{unpaid.length !== 1 ? 's' : ''}
                </p>
              </div>
              <CreditCard className="h-12 w-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="unpaid">
        <TabsList>
          <TabsTrigger value="unpaid">
            Unpaid ({unpaid.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({paid.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unpaid" className="mt-4">
          {unpaid.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  All caught up!
                </h3>
                <p className="text-gray-500">
                  You don't have any unpaid invoices
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {unpaid.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  businessId={businessId}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          {paid.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No payment history
                </h3>
                <p className="text-gray-500">
                  Your paid invoices will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {paid.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  businessId={businessId}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvoiceCard({
  invoice,
  businessId,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusIcon,
}: {
  invoice: Invoice;
  businessId: string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">
                Invoice #{invoice.invoice_number}
              </h3>
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status}
              </Badge>
            </div>

            {invoice.job && (
              <p className="text-gray-600 text-sm mb-2">{invoice.job.title}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Created: {formatDate(invoice.created_at)}</span>
              {invoice.due_date && invoice.status !== 'paid' && (
                <span
                  className={
                    invoice.status === 'overdue' ? 'text-red-600 font-medium' : ''
                  }
                >
                  Due: {formatDate(invoice.due_date)}
                </span>
              )}
              {invoice.paid_at && (
                <span className="text-green-600">
                  Paid: {formatDate(invoice.paid_at)}
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(invoice.total)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Link href={`/view/invoice?id=${invoice.id}&portal=1`} target="_blank">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </Button>
              </Link>
              {invoice.status !== 'paid' && invoice.payment_link && (
                <a href={invoice.payment_link} target="_blank" rel="noopener">
                  <Button size="sm">
                    <CreditCard className="h-4 w-4 mr-1" />
                    Pay Now
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoicesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <Card>
        <CardContent className="py-6">
          <div className="h-20 bg-gray-100 rounded animate-pulse" />
        </CardContent>
      </Card>
      <div className="h-10 w-48 bg-gray-100 rounded animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-24 bg-gray-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

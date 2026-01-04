'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  ArrowLeft,
  Loader2,
  Check,
  ExternalLink,
  RefreshCw,
  Unlink,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface QuickBooksInfo {
  connected: boolean;
  companyName?: string;
  lastSyncAt?: string;
  syncSettings?: {
    syncCustomers: boolean;
    syncInvoices: boolean;
    syncPayments: boolean;
    syncExpenses: boolean;
    autoSyncEnabled: boolean;
  };
  syncStatus?: {
    customers: { total: number; synced: number; errors: number };
    invoices: { total: number; synced: number; errors: number };
    payments: { total: number; synced: number; errors: number };
    expenses: { total: number; synced: number; errors: number };
  };
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [quickbooks, setQuickbooks] = useState<QuickBooksInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchQuickBooksInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/quickbooks');
      if (res.ok) {
        const data = await res.json();
        setQuickbooks(data);
      }
    } catch (_error) {
      toast({ title: 'Failed to load QuickBooks info', description: 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (successParam === 'quickbooks_connected') {
      setSuccess('QuickBooks connected successfully!');
    } else if (errorParam) {
      setError(
        errorParam === 'quickbooks_denied'
          ? 'QuickBooks authorization was denied'
          : errorParam === 'quickbooks_failed'
          ? 'Failed to connect QuickBooks. Please try again.'
          : 'An error occurred'
      );
    }

    fetchQuickBooksInfo();
  }, [searchParams, fetchQuickBooksInfo]);

  async function connectQuickBooks() {
    try {
      const res = await fetch('/api/auth/quickbooks');
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to start QuickBooks connection');
      }
    } catch (_error) {
      toast({ title: 'Failed to connect QuickBooks', description: 'Please try again', variant: 'destructive' });
      setError('Failed to connect to QuickBooks');
    }
  }

  async function disconnectQuickBooks() {
    if (!confirm('Are you sure you want to disconnect QuickBooks?')) return;

    try {
      const res = await fetch('/api/quickbooks', { method: 'DELETE' });
      if (res.ok) {
        setQuickbooks({ connected: false });
        setSuccess('QuickBooks disconnected');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to disconnect');
      }
    } catch (_error) {
      toast({ title: 'Failed to disconnect QuickBooks', description: 'Please try again', variant: 'destructive' });
      setError('Failed to disconnect QuickBooks');
    }
  }

  async function syncNow() {
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch('/api/quickbooks/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        fetchQuickBooksInfo();
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (_error) {
      toast({ title: 'Failed to sync with QuickBooks', description: 'Please try again', variant: 'destructive' });
      setError('Failed to sync with QuickBooks');
    } finally {
      setSyncing(false);
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
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-text">Integrations</h1>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <Alert variant="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* QuickBooks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-xl">📗</span>
                QuickBooks Online
              </CardTitle>
              {quickbooks?.connected && (
                <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Connected
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickbooks?.connected ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-text">
                    <strong>Company:</strong> {quickbooks.companyName || 'Unknown'}
                  </p>
                  {quickbooks.lastSyncAt && (
                    <p className="text-sm text-text-muted">
                      Last synced: {new Date(quickbooks.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Sync Status */}
                {quickbooks.syncStatus && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-text-muted">Customers</p>
                      <p className="font-medium text-text">
                        {quickbooks.syncStatus.customers.synced}/{quickbooks.syncStatus.customers.total}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-text-muted">Invoices</p>
                      <p className="font-medium text-text">
                        {quickbooks.syncStatus.invoices.synced}/{quickbooks.syncStatus.invoices.total}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-text-muted">Payments</p>
                      <p className="font-medium text-text">
                        {quickbooks.syncStatus.payments.synced}/{quickbooks.syncStatus.payments.total}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <p className="text-text-muted">Expenses</p>
                      <p className="font-medium text-text">
                        {quickbooks.syncStatus.expenses.synced}/{quickbooks.syncStatus.expenses.total}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={syncNow}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Sync Now
                  </Button>
                  <Button variant="ghost" onClick={disconnectQuickBooks}>
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-text-muted">
                  Connect QuickBooks to sync customers, invoices, payments, and expenses.
                </p>
                <Button onClick={connectQuickBooks} className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect QuickBooks
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Calendar Integration Placeholder */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Calendar (Google/Outlook)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4">
              Sync jobs to your calendar so you never double-book.
            </p>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>

        {/* Stripe Integration Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Stripe Payments
              </CardTitle>
              <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full flex items-center gap-1">
                <Check className="h-3 w-3" />
                Active
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted mb-4">
              Accept credit card payments directly on invoices.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage in Stripe Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

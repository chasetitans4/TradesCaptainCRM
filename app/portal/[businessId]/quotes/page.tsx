'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
const portalQuotesLogger = logger.child({ context: 'portal.quotes' });

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  total: number;
  valid_until?: string;
  created_at: string;
  items?: any[];
}

export default function QuotesPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQuotes() {
      try {
        const response = await fetch(
          `/api/portal/quotes?businessId=${businessId}`
        );
        const data = await response.json();
        setQuotes(data || []);
      } catch (error) {
        portalQuotesLogger.error({
          msg: 'Error loading quotes',
          businessId,
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
        });
      } finally {
        setLoading(false);
      }
    }

    loadQuotes();
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
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'sent':
      case 'viewed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const validUntil = new Date(date);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return validUntil <= threeDaysFromNow && validUntil >= new Date();
  };

  const isExpired = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading) {
    return <QuotesSkeleton />;
  }

  const pendingQuotes = quotes.filter((q) => ['sent', 'viewed'].includes(q.status));
  const pastQuotes = quotes.filter((q) => !['sent', 'viewed'].includes(q.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <p className="text-gray-500">View and respond to quotes</p>
      </div>

      {/* Pending Quotes */}
      {pendingQuotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Pending Review</h2>
          {pendingQuotes.map((quote) => (
            <Card key={quote.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Quote #{quote.quote_number}
                      </h3>
                      <Badge className={getStatusColor(quote.status)}>
                        {quote.status}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-500 space-y-1">
                      <p>Created: {formatDate(quote.created_at)}</p>
                      {quote.valid_until && (
                        <p
                          className={
                            isExpired(quote.valid_until)
                              ? 'text-red-600 font-medium'
                              : isExpiringSoon(quote.valid_until)
                              ? 'text-yellow-600 font-medium'
                              : ''
                          }
                        >
                          {isExpired(quote.valid_until) ? (
                            <>
                              <AlertCircle className="inline h-3 w-3 mr-1" />
                              Expired: {formatDate(quote.valid_until)}
                            </>
                          ) : isExpiringSoon(quote.valid_until) ? (
                            <>
                              <Clock className="inline h-3 w-3 mr-1" />
                              Expires soon: {formatDate(quote.valid_until)}
                            </>
                          ) : (
                            <>Valid until: {formatDate(quote.valid_until)}</>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(quote.total)}
                    </p>
                    <Link href={`/view/quote?id=${quote.id}&portal=1`} target="_blank">
                      <Button className="mt-2">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Review Quote
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Past Quotes */}
      {pastQuotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Past Quotes</h2>
          {pastQuotes.map((quote) => (
            <Card key={quote.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Quote #{quote.quote_number}
                      </h3>
                      <Badge className={getStatusColor(quote.status)}>
                        {quote.status === 'accepted' && (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        )}
                        {quote.status === 'declined' && (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        {quote.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      Created: {formatDate(quote.created_at)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(quote.total)}
                    </p>
                    <Link href={`/view/quote?id=${quote.id}&portal=1`} target="_blank">
                      <Button variant="outline" size="sm" className="mt-2">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {quotes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No quotes</h3>
            <p className="text-gray-500">
              You don't have any quotes at the moment
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuotesSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
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

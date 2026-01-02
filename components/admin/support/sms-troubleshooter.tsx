'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  RefreshCw,
  Trash2,
  Search,
  TrendingUp,
} from 'lucide-react';

interface SmsFailure {
  id: string;
  to_number: string;
  error_code: string;
  error_message: string | null;
  created_at: string;
  error_explanation?: {
    meaning: string;
    fix: string;
  };
}

interface Suppression {
  id: string;
  phone: string;
  reason: string;
  is_active: boolean;
  suppressed_at: string;
}

interface SmsUsage {
  period_start: string;
  period_end: string;
  sms_sent: number;
  sms_limit: number;
}

interface SmsTroubleshooterProps {
  organizationId: string;
}

export function SmsTroubleshooter({ organizationId }: SmsTroubleshooterProps) {
  const [activeTab, setActiveTab] = useState<'failures' | 'suppression' | 'usage'>('failures');
  const [failures, setFailures] = useState<SmsFailure[]>([]);
  const [usage, setUsage] = useState<SmsUsage[]>([]);
  const [currentUsage, setCurrentUsage] = useState<{ percentage: number; isOver: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suppression check
  const [phoneToCheck, setPhoneToCheck] = useState('');
  const [suppressionResult, setSuppressionResult] = useState<{
    suppressions: Suppression[];
    is_suppressed: boolean;
  } | null>(null);
  const [checkingSupression, setCheckingSuppression] = useState(false);
  const [removingSupression, setRemovingSuppression] = useState(false);

  useEffect(() => {
    if (activeTab === 'failures') {
      fetchFailures();
    } else if (activeTab === 'usage') {
      fetchUsage();
    }
  }, [organizationId, activeTab]);

  const fetchFailures = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/support/sms?organization_id=${organizationId}&action=failures&hours=24`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch SMS failures');
      }

      const data = await response.json();
      setFailures(data.failures);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/support/sms?organization_id=${organizationId}&action=usage`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch SMS usage');
      }

      const data = await response.json();
      setUsage(data.usage);
      setCurrentUsage({
        percentage: data.usage_percentage,
        isOver: data.is_over_limit,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkSuppression = async () => {
    if (!phoneToCheck) return;

    setCheckingSuppression(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/support/sms?organization_id=${organizationId}&action=suppression&check_phone=${encodeURIComponent(phoneToCheck)}`
      );

      if (!response.ok) {
        throw new Error('Failed to check suppression status');
      }

      const data = await response.json();
      setSuppressionResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckingSuppression(false);
    }
  };

  const removeSuppression = async (phone: string) => {
    setRemovingSuppression(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/support/sms/suppression', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, organization_id: organizationId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove from suppression list');
      }

      // Refresh suppression check
      await checkSuppression();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRemovingSuppression(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          SMS Troubleshooting
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'failures' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('failures')}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Delivery Failures
          </Button>
          <Button
            variant={activeTab === 'suppression' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('suppression')}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Suppression Check
          </Button>
          <Button
            variant={activeTab === 'usage' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('usage')}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            SMS Usage
          </Button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Failures Tab */}
        {activeTab === 'failures' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Last 24 hours of delivery failures
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchFailures}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : failures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No delivery failures in the last 24 hours
              </div>
            ) : (
              <div className="space-y-2">
                {failures.map((failure) => (
                  <div
                    key={failure.id}
                    className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{failure.to_number}</span>
                          <Badge variant="danger">{failure.error_code}</Badge>
                        </div>
                        {failure.error_explanation && (
                          <div className="text-sm">
                            <strong>Issue:</strong> {failure.error_explanation.meaning}
                          </div>
                        )}
                        {failure.error_explanation && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Fix:</strong> {failure.error_explanation.fix}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(failure.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suppression Tab */}
        {activeTab === 'suppression' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Enter phone number to check (e.g., +15551234567)"
                  value={phoneToCheck}
                  onChange={(e) => setPhoneToCheck(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && checkSuppression()}
                  className="pl-10"
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button
                onClick={checkSuppression}
                disabled={checkingSupression || !phoneToCheck}
              >
                {checkingSupression ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-1" />
                    Check
                  </>
                )}
              </Button>
            </div>

            {suppressionResult && (
              <div
                className={`p-4 rounded-lg ${
                  suppressionResult.is_suppressed
                    ? 'bg-red-50 dark:bg-red-950/20'
                    : 'bg-green-50 dark:bg-green-950/20'
                }`}
              >
                {suppressionResult.is_suppressed ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">
                        This number is on the suppression list
                      </span>
                    </div>
                    {suppressionResult.suppressions.map((sup) => (
                      <div key={sup.id} className="flex items-center justify-between">
                        <div className="text-sm">
                          <div>Reason: {sup.reason}</div>
                          <div className="text-muted-foreground">
                            Suppressed: {formatDate(sup.suppressed_at)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSuppression(sup.phone)}
                          disabled={removingSupression}
                        >
                          {removingSupression ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                    <div className="text-xs text-muted-foreground">
                      Note: Customer can also text START to re-enable messages
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">
                      This number is NOT suppressed - messages can be sent
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {currentUsage && (
                  <div
                    className={`p-4 rounded-lg ${
                      currentUsage.isOver
                        ? 'bg-red-50 dark:bg-red-950/20'
                        : currentUsage.percentage > 80
                        ? 'bg-yellow-50 dark:bg-yellow-950/20'
                        : 'bg-green-50 dark:bg-green-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Current Period Usage</span>
                      <Badge
                        variant={
                          currentUsage.isOver
                            ? 'danger'
                            : currentUsage.percentage > 80
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {currentUsage.percentage}%
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          currentUsage.isOver
                            ? 'bg-red-500'
                            : currentUsage.percentage > 80
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(currentUsage.percentage, 100)}%` }}
                      />
                    </div>
                    {currentUsage.isOver && (
                      <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                        Over limit - consider suggesting an upgrade
                      </div>
                    )}
                  </div>
                )}

                {/* Usage History */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Usage History</h4>
                  {usage.map((period, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="text-sm">
                        {new Date(period.period_start).toLocaleDateString()} -{' '}
                        {new Date(period.period_end).toLocaleDateString()}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">{period.sms_sent}</span>
                        <span className="text-muted-foreground">
                          {' '}
                          / {period.sms_limit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';

interface SecurityEvent {
  id: string;
  eventType: string;
  metadata: Record<string, any> | null;
  ipAddress: string;
  userAgent: string;
  location: string | null;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

const eventDescriptions: Record<string, string> = {
  login_success: 'Signed in',
  login_failed: 'Failed sign-in attempt',
  logout: 'Signed out',
  password_change: 'Changed password',
  password_reset_request: 'Requested password reset',
  password_reset_complete: 'Reset password',
  '2fa_enabled': 'Enabled two-factor authentication',
  '2fa_disabled': 'Disabled two-factor authentication',
  '2fa_success': 'Verified two-factor code',
  '2fa_failed': 'Failed two-factor verification',
  backup_codes_generated: 'Generated backup codes',
  backup_codes_regenerated: 'Regenerated backup codes',
  pin_set: 'Set up PIN',
  pin_failed: 'Failed PIN verification',
  pin_disabled: 'Disabled PIN',
  session_revoked: 'Signed out from a device',
  all_sessions_revoked: 'Signed out from all devices',
  suspicious_activity: 'Suspicious activity detected',
  account_locked: 'Account locked',
  account_unlocked: 'Account unlocked',
  email_change: 'Changed email address',
};

function getRiskIcon(level: string) {
  switch (level) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'medium':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
}

function getRiskBadge(level: string) {
  const variants: Record<string, 'destructive' | 'outline' | 'secondary' | 'default'> = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'secondary',
    low: 'outline',
  };

  return (
    <Badge variant={variants[level] || 'outline'} className="text-xs capitalize">
      {level}
    </Badge>
  );
}

export function SecurityEvents() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>([]);

  const limit = 20;

  useEffect(() => {
    fetchEvents(true);
  }, [selectedRiskLevels]);

  const fetchEvents = async (reset = false) => {
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const params = new URLSearchParams({
        view: 'user',
        limit: limit.toString(),
        offset: currentOffset.toString(),
      });

      if (selectedRiskLevels.length > 0) {
        params.set('riskLevels', selectedRiskLevels.join(','));
      }

      const response = await fetch(`/api/auth/security-events?${params}`);
      const data = await response.json();

      if (reset) {
        setEvents(data.events || []);
        setOffset(limit);
      } else {
        setEvents((prev) => [...prev, ...(data.events || [])]);
        setOffset((prev) => prev + limit);
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to fetch security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRiskLevel = (level: string) => {
    setSelectedRiskLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Activity
          </CardTitle>
          <CardDescription>Recent security events on your account</CardDescription>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {selectedRiskLevels.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedRiskLevels.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={selectedRiskLevels.includes('critical')}
                onCheckedChange={() => toggleRiskLevel('critical')}
              >
                Critical
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedRiskLevels.includes('high')}
                onCheckedChange={() => toggleRiskLevel('high')}
              >
                High
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedRiskLevels.includes('medium')}
                onCheckedChange={() => toggleRiskLevel('medium')}
              >
                Medium
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={selectedRiskLevels.includes('low')}
                onCheckedChange={() => toggleRiskLevel('low')}
              >
                Low
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" onClick={() => fetchEvents(true)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 && !loading ? (
          <p className="text-muted-foreground text-center py-8">
            No security events found
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5">{getRiskIcon(event.riskLevel)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {eventDescriptions[event.eventType] || event.eventType}
                    </span>
                    {getRiskBadge(event.riskLevel)}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span>{event.ipAddress}</span>
                    {event.location && <span>• {event.location}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    {' • '}
                    {format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded-lg" />
                  </div>
                ))}
              </div>
            )}

            {hasMore && !loading && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fetchEvents(false)}
              >
                Load more
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

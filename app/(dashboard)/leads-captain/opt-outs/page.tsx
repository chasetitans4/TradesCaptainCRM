'use client';

// =====================================================
// LEADS CAPTAIN OPT-OUT MANAGEMENT PAGE
// TCPA-compliant opt-out tracking and management
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  ArrowLeft,
  Ban,
  CheckCircle,
  Search,
  Plus,
  Download,
  Shield,
  Phone,
  Calendar,
  User,
  AlertTriangle,
  Info,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface OptOutEvent {
  id: string;
  event_type: 'opt_out' | 'opt_back_in';
  phone: string;
  customer_name: string | null;
  reason: string | null;
  method: 'keyword' | 'manual' | 'api';
  actor: string;
  conversation_id: string | null;
  created_at: string;
  details: Record<string, any>;
}

export default function OptOutManagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<OptOutEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  // Manual entry dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addingOptOut, setAddingOptOut] = useState(false);
  const [newOptOut, setNewOptOut] = useState({
    phone: '',
    reason: '',
    action: 'opt_out' as 'opt_out' | 'opt_in',
  });

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '50',
      });
      if (eventTypeFilter !== 'all') {
        params.set('event_type', eventTypeFilter);
      }
      if (search) {
        params.set('search', search);
      }

      const res = await fetch(`/api/leads-captain/v2/opt-outs?${params}`);
      const data = await res.json();

      if (res.ok) {
        setEvents(data.events || []);
        setTotal(data.total || 0);
        setHasMore(data.has_more || false);
      } else {
        toast.error(data.error || 'Failed to load opt-out events');
      }
    } catch (error) {
      toast.error('Failed to load opt-out events');
    } finally {
      setLoading(false);
    }
  }, [page, eventTypeFilter, search]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSearch = () => {
    setPage(1);
    fetchEvents();
  };

  const handleAddOptOut = async () => {
    if (!newOptOut.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      setAddingOptOut(true);
      const res = await fetch('/api/leads-captain/v2/opt-outs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOptOut),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        setShowAddDialog(false);
        setNewOptOut({ phone: '', reason: '', action: 'opt_out' });
        fetchEvents();
      } else {
        toast.error(data.error || 'Failed to add opt-out');
      }
    } catch (error) {
      toast.error('Failed to add opt-out');
    } finally {
      setAddingOptOut(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const exportToCsv = () => {
    const headers = ['Date', 'Phone', 'Customer Name', 'Event Type', 'Method', 'Reason', 'Actor'];
    const rows = events.map((e) => [
      formatDate(e.created_at),
      e.phone,
      e.customer_name || '',
      e.event_type === 'opt_out' ? 'Opt-Out' : 'Opt Back In',
      e.method,
      e.reason || '',
      e.actor,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `opt-outs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads-captain')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Opt-Out Management</h1>
            <p className="text-sm text-muted-foreground">TCPA-compliant opt-out tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportToCsv} disabled={events.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Manual Entry
          </Button>
        </div>
      </div>

      {/* TCPA Compliance Info */}
      <Card className="mb-6 border-info/50 bg-info/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-info">TCPA Compliance</p>
              <p className="text-sm text-muted-foreground mt-1">
                All opt-out events are logged for compliance purposes. Customers who text STOP are
                automatically opted out. The standard 30-day safety period applies before opt-back-in
                is processed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
            </div>
            <Select value={eventTypeFilter} onValueChange={(v) => { setEventTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="opt_out">Opt-Outs</SelectItem>
                <SelectItem value="opt_back_in">Opt Back In</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleSearch}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Opt-Out Log
          </CardTitle>
          <CardDescription>
            {total} total events recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No opt-out events found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(event.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {event.phone}
                      </TableCell>
                      <TableCell>
                        {event.customer_name || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={event.event_type === 'opt_out' ? 'destructive' : 'success'}
                          className="gap-1"
                        >
                          {event.event_type === 'opt_out' ? (
                            <>
                              <Ban className="h-3 w-3" />
                              Opt-Out
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Opt Back In
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {event.method === 'keyword' && 'STOP Keyword'}
                          {event.method === 'manual' && 'Manual'}
                          {event.method === 'api' && 'API'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {event.reason || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.actor}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {(hasMore || page > 1) && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {Math.ceil(total / 50)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasMore}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Opt-Out Entry</DialogTitle>
            <DialogDescription>
              Manually record an opt-out or opt-back-in for a phone number.
              This is typically used when a customer requests to stop via phone call or email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={newOptOut.action}
                onValueChange={(v) => setNewOptOut({ ...newOptOut, action: v as 'opt_out' | 'opt_in' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opt_out">Opt-Out (Stop Messages)</SelectItem>
                  <SelectItem value="opt_in">Opt Back In (Resume Messages)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="+1 (555) 123-4567"
                value={newOptOut.phone}
                onChange={(e) => setNewOptOut({ ...newOptOut, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Customer called and requested to stop receiving messages..."
                value={newOptOut.reason}
                onChange={(e) => setNewOptOut({ ...newOptOut, reason: e.target.value })}
                rows={3}
              />
            </div>

            {newOptOut.action === 'opt_in' && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning">30-Day Safety Period</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    If this number opted out less than 30 days ago, the opt-back-in will be delayed
                    to comply with TCPA regulations.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOptOut} disabled={addingOptOut}>
              {addingOptOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {newOptOut.action === 'opt_out' ? (
                    <Ban className="h-4 w-4 mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {newOptOut.action === 'opt_out' ? 'Record Opt-Out' : 'Record Opt-In'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

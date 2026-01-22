'use client';

// =====================================================
// DAILY ROUTE SUMMARY PAGE
// Shows technician mileage, arrival pings, and stops
// Efficient lightweight data display for dispatch managers
// =====================================================

import { useState, useEffect } from 'react';
import { format, subDays, addDays } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Badge,
} from '@/components/ui';
import {
  Route,
  MapPin,
  Clock,
  Car,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  Users,
  Calendar,
  FileText,
} from 'lucide-react';

interface TechnicianSummary {
  userId: string;
  userName: string;
  totalMiles: number;
  totalDriveMinutes: number;
  arrivalPingsCount: number;
  stopsVisited: Array<{ address: string; jobId: string; arrivedAt: string }>;
  firstStopTime: string | null;
  lastStopTime: string | null;
}

interface DailySummary {
  date: string;
  technicians: TechnicianSummary[];
  totals: {
    totalMiles: number;
    totalDriveMinutes: number;
    totalArrivals: number;
    technicianCount: number;
  };
}

export default function DailyRouteSummaryPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTech, setExpandedTech] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  async function fetchSummary() {
    setLoading(true);
    setError(null);

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/routes/summary?date=${dateStr}&view=summary`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load summary');
      }

      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load route summary');
    } finally {
      setLoading(false);
    }
  }

  function handlePrevDay() {
    setSelectedDate(subDays(selectedDate, 1));
  }

  function handleNextDay() {
    const tomorrow = addDays(new Date(), 1);
    if (addDays(selectedDate, 1) <= tomorrow) {
      setSelectedDate(addDays(selectedDate, 1));
    }
  }

  function handleToday() {
    setSelectedDate(new Date());
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  function formatTime(isoString: string | null): string {
    if (!isoString) return '-';
    return format(new Date(isoString), 'h:mm a');
  }

  async function handleExportMileage() {
    const startDate = format(subDays(selectedDate, 30), 'yyyy-MM-dd');
    const endDate = format(selectedDate, 'yyyy-MM-dd');

    try {
      const res = await fetch(
        `/api/routes/summary?view=mileage&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();

      // Generate CSV
      const headers = ['Date', 'Technician', 'From', 'To', 'Miles', 'Purpose'];
      const rows = data.trips.map((t: any) => [
        t.date,
        t.userName,
        t.fromAddress || 'N/A',
        t.toAddress || 'N/A',
        t.distanceMiles.toFixed(2),
        t.purpose,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((r: string[]) => r.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mileage-report-${startDate}-to-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export mileage report');
    }
  }

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isFuture = selectedDate > new Date();

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Route className="h-7 w-7 text-primary" />
            Daily Route Summary
          </h1>
          <p className="text-text-muted mt-1">
            Track technician mileage and job arrivals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportMileage}>
            <Download className="h-4 w-4 mr-2" />
            Export Mileage (30 days)
          </Button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-text-muted" />
              <span className="font-semibold text-lg">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </span>
              {!isToday && (
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextDay}
              disabled={isFuture}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : summary && summary.technicians.length > 0 ? (
        <>
          {/* Summary Totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Car className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{summary.totals.totalMiles.toFixed(1)}</p>
                    <p className="text-sm text-text-muted">Total Miles</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatDuration(summary.totals.totalDriveMinutes)}
                    </p>
                    <p className="text-sm text-text-muted">Drive Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{summary.totals.totalArrivals}</p>
                    <p className="text-sm text-text-muted">Arrivals</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{summary.totals.technicianCount}</p>
                    <p className="text-sm text-text-muted">Technicians</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Technician Details */}
          <Card>
            <CardHeader>
              <CardTitle>Technician Routes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.technicians.map((tech) => (
                <div
                  key={tech.userId}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedTech(expandedTech === tech.userId ? null : tech.userId)
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {tech.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{tech.userName}</p>
                        <p className="text-sm text-text-muted">
                          {tech.arrivalPingsCount} stops
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-semibold">{tech.totalMiles.toFixed(1)} mi</p>
                        <p className="text-sm text-text-muted">
                          {formatDuration(tech.totalDriveMinutes)}
                        </p>
                      </div>
                      <div className="text-right text-sm text-text-muted">
                        <p>{formatTime(tech.firstStopTime)} - {formatTime(tech.lastStopTime)}</p>
                      </div>
                      <ChevronRight
                        className={`h-5 w-5 text-text-muted transition-transform ${
                          expandedTech === tech.userId ? 'rotate-90' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {expandedTech === tech.userId && tech.stopsVisited.length > 0 && (
                    <div className="border-t bg-muted/30 p-4">
                      <p className="text-sm font-medium text-text-muted mb-3">
                        Arrival Stops
                      </p>
                      <div className="space-y-2">
                        {tech.stopsVisited.map((stop, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-white rounded-lg border"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{stop.address}</p>
                              <p className="text-xs text-text-muted">
                                Arrived: {formatTime(stop.arrivedAt)}
                              </p>
                            </div>
                            <Badge variant="secondary" className="flex-shrink-0">
                              <MapPin className="h-3 w-3 mr-1" />
                              Pinged
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text mb-2">No Route Data</h3>
              <p className="text-text-muted">
                No technician arrivals recorded for this date.
                <br />
                Technicians can ping &quot;I&apos;m Here&quot; when they arrive at job sites.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-text-muted flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-muted">
              <p className="font-medium text-text">About Mileage Tracking</p>
              <p className="mt-1">
                Mileage is automatically logged when technicians ping arrival at job sites.
                Export reports for tax deductions and audit purposes. Data is calculated using
                driving routes for accuracy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

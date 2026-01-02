'use client';

// =====================================================
// NEVERMISS CLIENT LIST
// List of clients with SMS usage status
// Version: 5.8
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle, ArrowUpRight, AlertCircle } from 'lucide-react';

interface ClientSummary {
  client_id: string;
  client_name: string;
  plan_type: string;
  sms_used: number;
  sms_cap: number;
  leads_captured: number;
  status: 'healthy' | 'near_cap' | 'over_cap' | 'low_usage';
  usage_percentage: number;
}

interface ClientListProps {
  clients?: ClientSummary[];
  loading?: boolean;
  onClientSelect?: (clientId: string) => void;
  onSuggestUpgrade?: (clientId: string) => void;
}

export function NevermissClientList({
  clients,
  loading,
  onClientSelect,
  onSuggestUpgrade,
}: ClientListProps) {
  const [filter, setFilter] = useState<string>('all');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredClients = clients?.filter((c) =>
    filter === 'all' ? true : c.status === filter
  ) || [];

  const getStatusBadge = (status: ClientSummary['status']) => {
    switch (status) {
      case 'over_cap':
        return <Badge variant="destructive">Over Cap</Badge>;
      case 'near_cap':
        return <Badge variant="outline" className="border-warning text-warning">Near Cap</Badge>;
      case 'low_usage':
        return <Badge variant="secondary">Low Usage</Badge>;
      default:
        return <Badge variant="outline" className="border-success text-success">Healthy</Badge>;
    }
  };

  const getStatusIcon = (status: ClientSummary['status']) => {
    switch (status) {
      case 'over_cap':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'near_cap':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'low_usage':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <CheckCircle className="h-4 w-4 text-success" />;
    }
  };

  const formatPlanName = (planType: string) => {
    return planType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Clients by SMS Usage</CardTitle>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="over_cap">Over Cap</SelectItem>
            <SelectItem value="near_cap">Near Cap</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="low_usage">Low Usage</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>SMS Usage</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No clients found
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <TableRow
                  key={client.client_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onClientSelect?.(client.client_id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(client.status)}
                      <span className="font-medium">{client.client_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatPlanName(client.plan_type)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">
                        {client.sms_used.toLocaleString()} / {client.sms_cap.toLocaleString()}
                      </div>
                      <Progress
                        value={Math.min(client.usage_percentage, 100)}
                        className={`h-1.5 ${
                          client.status === 'over_cap'
                            ? '[&>div]:bg-destructive'
                            : client.status === 'near_cap'
                            ? '[&>div]:bg-warning'
                            : ''
                        }`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>{client.leads_captured}</TableCell>
                  <TableCell>{getStatusBadge(client.status)}</TableCell>
                  <TableCell className="text-right">
                    {(client.status === 'near_cap' || client.status === 'over_cap') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSuggestUpgrade?.(client.client_id);
                        }}
                      >
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        Upgrade
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default NevermissClientList;

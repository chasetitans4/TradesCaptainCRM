'use client';

import { useState } from 'react';
import { Calendar, RefreshCw, DollarSign, Clock, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInDays } from 'date-fns';

type AgreementStatus = 'active' | 'paused' | 'cancelled' | 'expired';
type ServiceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual';

interface ServiceAgreement {
  id: string;
  name: string;
  service_type: string;
  frequency: ServiceFrequency;
  price: number;
  start_date: string;
  end_date?: string;
  next_service_date?: string;
  status: AgreementStatus;
  auto_renew: boolean;
  customer?: { name: string };
  equipment?: { model_number: string }[];
}

interface ServiceAgreementCardProps {
  agreement: ServiceAgreement;
  onEdit?: () => void;
  onCancel?: () => void;
  showCustomer?: boolean;
}

const frequencyLabels: Record<ServiceFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Twice a Year',
  annual: 'Annual',
};

const statusColors: Record<AgreementStatus, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
};

export function ServiceAgreementCard({
  agreement,
  onEdit,
  onCancel,
  showCustomer = false,
}: ServiceAgreementCardProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { toast } = useToast();

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/agreements/${agreement.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by user' }),
      });

      if (!response.ok) throw new Error('Failed to cancel agreement');

      toast({ title: 'Agreement cancelled' });
      setShowCancelDialog(false);
      onCancel?.();
    } catch (error) {
      toast({ title: 'Failed to cancel agreement', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const daysUntilNextService = agreement.next_service_date
    ? differenceInDays(new Date(agreement.next_service_date), new Date())
    : null;

  const daysUntilExpiry = agreement.end_date
    ? differenceInDays(new Date(agreement.end_date), new Date())
    : null;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{agreement.name}</CardTitle>
              {showCustomer && agreement.customer && (
                <p className="text-sm text-muted-foreground">{agreement.customer.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[agreement.status]}>
                {agreement.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {agreement.status === 'active' && (
                    <DropdownMenuItem
                      onClick={() => setShowCancelDialog(true)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancel Agreement
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Frequency</p>
                <p className="text-sm font-medium">{frequencyLabels[agreement.frequency]}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="text-sm font-medium">${agreement.price.toLocaleString()}</p>
              </div>
            </div>

            {agreement.next_service_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Next Service</p>
                  <p className="text-sm font-medium">
                    {format(new Date(agreement.next_service_date), 'MMM d, yyyy')}
                  </p>
                  {daysUntilNextService !== null && daysUntilNextService <= 7 && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {daysUntilNextService === 0 ? 'Today' : `${daysUntilNextService} days`}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {agreement.end_date && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {agreement.auto_renew ? 'Renews' : 'Expires'}
                  </p>
                  <p className="text-sm font-medium">
                    {format(new Date(agreement.end_date), 'MMM d, yyyy')}
                  </p>
                  {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                    <Badge
                      variant={daysUntilExpiry <= 7 ? 'destructive' : 'outline'}
                      className="mt-1 text-xs"
                    >
                      {daysUntilExpiry} days left
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {agreement.equipment && agreement.equipment.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground mb-2">Covered Equipment</p>
              <div className="flex flex-wrap gap-2">
                {agreement.equipment.map((eq, idx) => (
                  <Badge key={idx} variant="secondary">
                    {eq.model_number}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {agreement.auto_renew && (
            <div className="mt-4">
              <Badge variant="outline" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Auto-renews
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Service Agreement?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the "{agreement.name}" agreement?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Agreement</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Agreement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

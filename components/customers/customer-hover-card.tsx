import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Phone, Mail, MapPin, Briefcase, DollarSign } from 'lucide-react';

interface CustomerHoverCardProps {
  customer: {
    id: string;
    name: string;
    email?: string;
    phone: string;
    address: string;
    totalJobs: number;
    totalSpent: number;
  };
  children: React.ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CustomerHoverCard({ customer, children }: CustomerHoverCardProps) {
  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold">{customer.name}</h4>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="w-3 h-3" />
                {customer.phone}
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{customer.address}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted">
              <Briefcase className="w-3 h-3" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jobs</p>
              <p className="font-medium">{customer.totalJobs}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted">
              <DollarSign className="w-3 h-3" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="font-medium text-green-600">
                {formatCurrency(customer.totalSpent)}
              </p>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

'use client';

import {
  Edit,
  Trash2,
  Copy,
  Check,
  MoreHorizontal,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Promotion } from './types';

interface PromotionCardProps {
  promo: Promotion;
  onEdit: (promo: Promotion) => void;
  onDelete: (id: string) => void;
  onCopyCode: (code: string) => void;
  copiedCode: string | null;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getDiscountLabel(promo: Promotion) {
  switch (promo.discount_type) {
    case 'percentage':
      return `${promo.discount_value}% off`;
    case 'fixed':
      return `${formatCurrency(promo.discount_value)} off`;
    case 'free_service':
      return 'Free Service';
    default:
      return promo.discount_value.toString();
  }
}

export function getStatusBadge(promo: Promotion) {
  const now = new Date();
  const start = promo.start_date ? new Date(promo.start_date) : null;
  const end = promo.end_date ? new Date(promo.end_date) : null;

  if (!promo.is_active) {
    return <Badge variant="secondary">Inactive</Badge>;
  }

  if (start && now < start) {
    return <Badge className="bg-blue-100 text-blue-800">Scheduled</Badge>;
  }

  if (end && now > end) {
    return <Badge variant="secondary">Expired</Badge>;
  }

  if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
    return <Badge variant="secondary">Limit Reached</Badge>;
  }

  return <Badge className="bg-green-100 text-green-800">Active</Badge>;
}

export function isPromoActive(promo: Promotion) {
  if (!promo.is_active) return false;
  const now = new Date();
  const start = promo.start_date ? new Date(promo.start_date) : null;
  const end = promo.end_date ? new Date(promo.end_date) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  if (promo.usage_limit && promo.usage_count >= promo.usage_limit) return false;
  return true;
}

export function PromotionCard({
  promo,
  onEdit,
  onDelete,
  onCopyCode,
  copiedCode,
}: PromotionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{promo.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(promo)}
              {promo.is_public && (
                <Badge variant="outline" className="text-xs">
                  Public
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCopyCode(promo.code)}>
                {copiedCode === promo.code ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(promo)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete(promo.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Promo Code */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <code className="text-lg font-mono font-bold">{promo.code}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopyCode(promo.code)}
            >
              {copiedCode === promo.code ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Discount */}
          <div>
            <p className="text-2xl font-bold text-primary">{getDiscountLabel(promo)}</p>
            {promo.min_purchase_amount && (
              <p className="text-sm text-muted-foreground">
                Min. purchase: {formatCurrency(promo.min_purchase_amount)}
              </p>
            )}
          </div>

          {promo.description && (
            <p className="text-sm text-muted-foreground">{promo.description}</p>
          )}

          {/* Date Range */}
          {(promo.start_date || promo.end_date) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {promo.start_date && (
                <span>{new Date(promo.start_date).toLocaleDateString()}</span>
              )}
              {promo.start_date && promo.end_date && <span>-</span>}
              {promo.end_date && (
                <span>{new Date(promo.end_date).toLocaleDateString()}</span>
              )}
            </div>
          )}

          {/* Usage */}
          <div className="flex items-center justify-between pt-2 border-t text-sm">
            <span className="text-muted-foreground">
              Used {promo.usage_count}
              {promo.usage_limit ? ` / ${promo.usage_limit}` : ''} times
            </span>
            {promo.total_savings ? (
              <span className="text-muted-foreground">
                {formatCurrency(promo.total_savings)} saved
              </span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

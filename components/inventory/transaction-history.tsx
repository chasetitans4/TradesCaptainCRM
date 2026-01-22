'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  History,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ChevronDown,
  Filter,
} from 'lucide-react';

type TransactionType = 'check_in' | 'check_out' | 'adjustment' | 'transfer' | 'usage' | 'restock' | 'return' | 'damaged' | 'lost';

interface Transaction {
  id: string;
  inventory_id: string;
  type: TransactionType;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  job_id?: string;
  job?: { id: string; title: string };
  notes?: string;
  performed_by?: string;
  performed_by_user?: { id: string; name: string };
  performed_at: string;
  created_at: string;
}

interface TransactionHistoryProps {
  inventoryId: string;
  currentQuantity: number;
  onQuantityChange?: (newQuantity: number) => void;
}

const TRANSACTION_TYPES: { value: TransactionType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { value: 'check_in', label: 'Check In', description: 'Add items to inventory', icon: <ArrowDownLeft className="h-4 w-4" />, color: 'bg-green-100 text-green-700' },
  { value: 'check_out', label: 'Check Out', description: 'Remove items from inventory', icon: <ArrowUpRight className="h-4 w-4" />, color: 'bg-blue-100 text-blue-700' },
  { value: 'restock', label: 'Restock', description: 'New inventory arrived', icon: <Package className="h-4 w-4" />, color: 'bg-green-100 text-green-700' },
  { value: 'usage', label: 'Job Usage', description: 'Used on a job', icon: <Wrench className="h-4 w-4" />, color: 'bg-orange-100 text-orange-700' },
  { value: 'return', label: 'Return', description: 'Items returned', icon: <RefreshCw className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'adjustment', label: 'Adjustment', description: 'Manual count adjustment', icon: <Plus className="h-4 w-4" />, color: 'bg-purple-100 text-purple-700' },
  { value: 'damaged', label: 'Damaged', description: 'Items damaged/unusable', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-red-100 text-red-700' },
  { value: 'lost', label: 'Lost', description: 'Items lost/missing', icon: <Minus className="h-4 w-4" />, color: 'bg-gray-100 text-gray-700' },
  { value: 'transfer', label: 'Transfer', description: 'Moved to another location', icon: <ArrowUpRight className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-700' },
];

export function TransactionHistory({ inventoryId, currentQuantity, onQuantityChange }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const loadTransactions = async (offset = 0, append = false) => {
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: offset.toString(),
      });
      if (filterType !== 'all') {
        params.set('type', filterType);
      }

      const response = await fetch(`/api/inventory/${inventoryId}/transactions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();

      if (append) {
        setTransactions((prev) => [...prev, ...data.transactions]);
      } else {
        setTransactions(data.transactions);
      }
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [inventoryId, filterType]);

  const handleTransactionAdded = (newQuantity: number) => {
    loadTransactions();
    onQuantityChange?.(newQuantity);
    setShowAddModal(false);
  };

  const getTypeConfig = (type: TransactionType) => {
    return TRANSACTION_TYPES.find((t) => t.value === type) || TRANSACTION_TYPES[0];
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Transaction History
          {total > 0 && (
            <Badge variant="secondary" className="ml-2">
              {total}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={filterType}
            onValueChange={(value) => setFilterType(value as TransactionType | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TRANSACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AddTransactionDialog
            inventoryId={inventoryId}
            currentQuantity={currentQuantity}
            open={showAddModal}
            onOpenChange={setShowAddModal}
            onSuccess={handleTransactionAdded}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No transactions recorded yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Record First Transaction
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const typeConfig = getTypeConfig(transaction.type);
              const isPositive = transaction.quantity > 0;

              return (
                <div
                  key={transaction.id}
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <div className={cn('p-2 rounded-lg', typeConfig.color)}>
                    {typeConfig.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{typeConfig.label}</span>
                      {transaction.job && (
                        <Link
                          href={`/jobs/${transaction.job.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          → {transaction.job.title}
                        </Link>
                      )}
                    </div>
                    {transaction.notes && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {transaction.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatDate(transaction.performed_at)}</span>
                      {transaction.performed_by_user && (
                        <span>by {transaction.performed_by_user.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        'text-lg font-semibold',
                        isPositive ? 'text-green-600' : 'text-red-600'
                      )}
                    >
                      {isPositive ? '+' : ''}{transaction.quantity}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {transaction.previous_quantity} → {transaction.new_quantity}
                    </p>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => loadTransactions(transactions.length, true)}
              >
                <ChevronDown className="h-4 w-4 mr-2" />
                Load More
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AddTransactionDialogProps {
  inventoryId: string;
  currentQuantity: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newQuantity: number) => void;
}

function AddTransactionDialog({
  inventoryId,
  currentQuantity,
  open,
  onOpenChange,
  onSuccess,
}: AddTransactionDialogProps) {
  const [type, setType] = useState<TransactionType>('check_in');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType = TRANSACTION_TYPES.find((t) => t.value === type);
  const isDeduction = ['check_out', 'usage', 'damaged', 'lost', 'transfer'].includes(type);
  const quantityValue = parseInt(quantity) || 0;
  const projectedQuantity = isDeduction
    ? currentQuantity - quantityValue
    : currentQuantity + quantityValue;

  const handleSubmit = async () => {
    if (!quantity || parseInt(quantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (projectedQuantity < 0) {
      setError(`Cannot reduce quantity below 0. Current: ${currentQuantity}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/inventory/${inventoryId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          quantity: parseInt(quantity),
          notes: notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record transaction');
      }

      // Reset form
      setType('check_in');
      setQuantity('1');
      setNotes('');
      onSuccess(data.newQuantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record transaction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Transaction</DialogTitle>
          <DialogDescription>
            Current quantity: <strong>{currentQuantity}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {TRANSACTION_TYPES.slice(0, 6).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-colors',
                    type === t.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <div className={cn('p-1.5 rounded', t.color)}>{t.icon}</div>
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
            </div>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              After transaction: <strong className={projectedQuantity < 0 ? 'text-red-600' : ''}>{projectedQuantity}</strong>
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant details..."
              rows={2}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || projectedQuantity < 0}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              'Record Transaction'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TransactionHistory;

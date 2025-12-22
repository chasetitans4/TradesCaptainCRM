'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import {
  Receipt,
  Plus,
  Camera,
  Upload,
  Loader2,
  Filter,
  Check,
  X,
  Calendar,
  DollarSign,
  Tag,
  Briefcase,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface ReceiptItem {
  id: string;
  image_url: string;
  amount?: number;
  vendor?: string;
  category?: string;
  description?: string;
  receipt_date: string;
  status: 'pending' | 'approved' | 'rejected';
  job?: { id: string; title: string };
  user?: { id: string; name: string };
}

const CATEGORIES = [
  { value: 'materials', label: 'Materials' },
  { value: 'tools', label: 'Tools & Equipment' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'meals', label: 'Meals' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'vehicle', label: 'Vehicle Expense' },
  { value: 'other', label: 'Other' },
];

export default function ReceiptsPage() {
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReceipts();
  }, [filterStatus, filterCategory]);

  async function fetchReceipts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterCategory !== 'all') params.set('category', filterCategory);

      const res = await fetch(`/api/receipts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch receipts');
      const data = await res.json();
      setReceipts(data.receipts || []);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = receipts.filter((r) => r.status === 'pending').length;
  const totalAmount = receipts
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-text">Receipts</h1>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <Alert variant="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-text-muted mb-1">Pending Review</p>
              <p className="text-xl font-bold text-warning">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-text-muted mb-1">Approved Total</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totalAmount)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Receipts List */}
        {receipts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-muted">No receipts found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Receipt
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {receipts.map((receipt) => (
              <ReceiptCard key={receipt.id} receipt={receipt} onUpdate={fetchReceipts} />
            ))}
          </div>
        )}
      </div>

      {/* Add Receipt Modal */}
      <AddReceiptModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchReceipts();
        }}
      />
    </div>
  );
}

function ReceiptCard({
  receipt,
  onUpdate,
}: {
  receipt: ReceiptItem;
  onUpdate: () => void;
}) {
  const statusColors = {
    pending: 'bg-warning/10 text-warning',
    approved: 'bg-success/10 text-success',
    rejected: 'bg-danger/10 text-danger',
  };

  const categoryLabel =
    CATEGORIES.find((c) => c.value === receipt.category)?.label || receipt.category || 'Uncategorized';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
            {receipt.image_url ? (
              <img
                src={receipt.image_url}
                alt="Receipt"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-text-muted" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-text">
                  {receipt.vendor || 'Unknown Vendor'}
                </p>
                <p className="text-sm text-text-muted">{categoryLabel}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${statusColors[receipt.status]}`}
              >
                {receipt.status}
              </span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-text-muted">
                {format(new Date(receipt.receipt_date), 'MMM d, yyyy')}
              </p>
              {receipt.amount && (
                <p className="font-semibold text-text">
                  {formatCurrency(receipt.amount)}
                </p>
              )}
            </div>

            {receipt.job && (
              <p className="text-xs text-primary mt-1">
                <Briefcase className="h-3 w-3 inline mr-1" />
                {receipt.job.title}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddReceiptModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vendor: '',
    amount: '',
    category: '',
    description: '',
    receiptDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/receipts/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload');
      }

      const data = await res.json();
      setImageUrl(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl) {
      setError('Please upload a receipt image');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          vendor: formData.vendor || null,
          amount: formData.amount || null,
          category: formData.category || null,
          description: formData.description || null,
          receiptDate: formData.receiptDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create receipt');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setImageUrl(null);
    setFormData({
      vendor: '',
      amount: '',
      category: '',
      description: '',
      receiptDate: format(new Date(), 'yyyy-MM-dd'),
    });
    setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); resetForm(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Receipt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Image Upload */}
          <div>
            <Label>Receipt Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {imageUrl ? (
              <div className="mt-2 relative">
                <img
                  src={imageUrl}
                  alt="Receipt preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 bg-white/80"
                  onClick={() => setImageUrl(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2 h-32"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Camera className="h-8 w-8 text-text-muted mb-2" />
                    <span className="text-sm text-text-muted">
                      Tap to take photo or upload
                    </span>
                  </div>
                )}
              </Button>
            )}
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              placeholder="e.g., Home Depot"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-8"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Receipt Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.receiptDate}
              onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Input
              id="description"
              placeholder="What was this for?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { onClose(); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving || !imageUrl}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

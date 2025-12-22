'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Label,
} from '@/components/ui';
import {
  Receipt,
  Loader2,
  Camera,
  Upload,
  X,
  Sparkles,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';

interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  is_billable: boolean;
  is_reimbursable: boolean;
}

interface OCRData {
  vendor?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  payment_method?: string;
  confidence?: string;
}

export default function NewExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<OCRData | null>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    vendor: '',
    description: '',
    amount: '',
    tax_amount: '',
    payment_method: 'personal_card',
    job_id: '',
    is_billable: false,
    is_reimbursable: true,
    notes: '',
  });

  const showCamera = searchParams.get('camera') === 'true';

  useEffect(() => {
    fetchCategories();
    fetchJobs();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/expense-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs?status=scheduled,in_progress&limit=50');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('ocr', 'true');

      const res = await fetch('/api/expenses/upload-receipt', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload receipt');
      }

      const data = await res.json();
      setReceiptUrl(data.file_url);

      if (data.ocr_data) {
        setOcrData(data.ocr_data);
        // Pre-fill form with OCR data
        setFormData((prev) => ({
          ...prev,
          vendor: data.ocr_data.vendor || prev.vendor,
          date: data.ocr_data.date || prev.date,
          amount: data.ocr_data.subtotal?.toString() || data.ocr_data.total?.toString() || prev.amount,
          tax_amount: data.ocr_data.tax?.toString() || prev.tax_amount,
          payment_method: data.ocr_data.payment_method || prev.payment_method,
        }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        category_id: formData.category_id,
        date: formData.date,
        vendor: formData.vendor || undefined,
        description: formData.description,
        amount: parseFloat(formData.amount),
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : 0,
        payment_method: formData.payment_method,
        job_id: formData.job_id || undefined,
        is_billable: formData.is_billable,
        is_reimbursable: formData.is_reimbursable,
        notes: formData.notes || undefined,
        receipt_url: receiptUrl,
        ocr_data: ocrData,
      };

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create expense');
      }

      router.push('/expenses');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getCategoryIcon(category: ExpenseCategory) {
    const iconMap: Record<string, string> = {
      Package: '📦',
      Wrench: '🔧',
      Hammer: '🔨',
      Fuel: '⛽',
      Car: '🚗',
      UtensilsCrossed: '🍴',
      ParkingCircle: '🅿️',
      Paperclip: '📎',
      FileCheck: '📋',
      Users: '👥',
      MoreHorizontal: '⋯',
    };
    return iconMap[category.icon || ''] || '📦';
  }

  const totalAmount = (parseFloat(formData.amount) || 0) + (parseFloat(formData.tax_amount) || 0);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-text">New Expense</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
          {error && (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Receipt Upload */}
          <Card>
            <CardContent className="py-4">
              {receiptUrl ? (
                <div className="relative">
                  <img
                    src={receiptUrl}
                    alt="Receipt"
                    className="w-full max-h-48 object-contain rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 bg-white/80"
                    onClick={() => {
                      setReceiptUrl(null);
                      setOcrData(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {ocrData && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg text-xs text-green-700 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Receipt scanned - {ocrData.confidence} confidence
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Receipt
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        // Open camera on mobile
                        if (fileInputRef.current) {
                          fileInputRef.current.setAttribute('capture', 'environment');
                          fileInputRef.current.click();
                        }
                      }}
                      disabled={uploading}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    JPG, PNG, or PDF up to 10MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor */}
          <div className="space-y-1.5">
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              placeholder="Home Depot, Shell Gas, etc."
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => {
                const category = categories.find((c) => c.id === value);
                setFormData({
                  ...formData,
                  category_id: value,
                  is_billable: category?.is_billable || false,
                  is_reimbursable: category?.is_reimbursable ?? true,
                });
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {getCategoryIcon(cat)} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount & Tax */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax">Tax</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  value={formData.tax_amount}
                  onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                />
              </div>
            </div>
          </div>

          {totalAmount > 0 && (
            <div className="text-right text-lg font-bold text-text">
              Total: ${totalAmount.toFixed(2)}
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="What did you purchase?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal_card">Personal Card</SelectItem>
                <SelectItem value="company_card">Company Card</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Link to Job */}
          <div className="space-y-1.5">
            <Label>Link to Job (optional)</Label>
            <Select
              value={formData.job_id}
              onValueChange={(value) => setFormData({ ...formData, job_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No job</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    #{job.id.slice(0, 8)} - {job.service_type}
                    {job.customer?.name && ` (${job.customer.name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_billable}
                onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Billable to customer</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_reimbursable}
                onChange={(e) => setFormData({ ...formData, is_reimbursable: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Reimbursable</span>
            </label>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none"
              rows={2}
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Receipt className="h-4 w-4 mr-2" />
            )}
            Save Expense
          </Button>
        </form>
      </div>
    </div>
  );
}

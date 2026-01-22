import { FileText, Send, Eye, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';

export interface InvoiceItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  is_taxable: boolean;
}

export interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  paid_at: string;
}

export interface PaymentPlanInstallment {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | string;
  paid_at?: string;
}

export interface PaymentPlan {
  id: string;
  invoice_id?: string;
  total_amount: number;
  down_payment?: number;
  number_of_installments: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | string;
  start_date: string;
  status: 'active' | 'completed' | 'cancelled' | string;
  installments: PaymentPlanInstallment[];
  created_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  notes: string | null;
  customer_notes: string | null;
  terms: string | null;
  due_date: string | null;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  access_token: string;
  stripe_payment_link_url: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  items: InvoiceItem[];
  payments: Payment[];
  quote?: {
    id: string;
    quote_number: string;
  } | null;
  job?: {
    id: string;
    title: string;
  } | null;
}

export const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-muted-foreground bg-muted' },
  sent: { label: 'Sent', icon: Send, color: 'text-blue-600 bg-blue-100' },
  viewed: { label: 'Viewed', icon: Eye, color: 'text-purple-600 bg-purple-100' },
  paid: { label: 'Paid', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  partial: { label: 'Partial', icon: DollarSign, color: 'text-amber-600 bg-amber-100' },
  overdue: { label: 'Overdue', icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
  void: { label: 'Void', icon: XCircle, color: 'text-gray-500 bg-gray-100' },
};

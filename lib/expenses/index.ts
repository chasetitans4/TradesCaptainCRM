// =====================================================
// EXPENSES & RECEIPT TRACKING LIBRARY
// Core functions for expense management
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

// =====================================================
// TYPES
// =====================================================

export interface ExpenseCategory {
  id: string;
  business_id: string;
  name: string;
  icon?: string;
  color?: string;
  is_taxable: boolean;
  is_reimbursable: boolean;
  is_billable: boolean;
  gl_code?: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Expense {
  id: string;
  business_id: string;
  user_id: string;
  category_id: string;
  date: string;
  vendor?: string;
  description: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method?: 'cash' | 'company_card' | 'personal_card' | 'check';
  card_last_four?: string;
  job_id?: string;
  customer_id?: string;
  vehicle_id?: string;
  is_billable: boolean;
  is_billed: boolean;
  invoice_id?: string;
  is_reimbursable: boolean;
  is_reimbursed: boolean;
  reimbursed_at?: string;
  reimbursed_amount?: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  receipt_url?: string;
  receipt_thumbnail_url?: string;
  ocr_extracted: boolean;
  ocr_data?: Record<string, any>;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  // Populated fields
  category?: ExpenseCategory;
  user?: { id: string; first_name: string; last_name: string; email: string };
  job?: { id: string; service_type: string; customer?: { name: string } };
  receipts?: ExpenseReceipt[];
}

export interface ExpenseReceipt {
  id: string;
  expense_id: string;
  file_url: string;
  thumbnail_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: string;
}

export interface ExpenseReport {
  id: string;
  business_id: string;
  user_id: string;
  title: string;
  period_start?: string;
  period_end?: string;
  total_amount: number;
  expense_count: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  expenses?: Expense[];
}

export interface OCRResult {
  vendor?: string;
  date?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  payment_method?: string;
  card_last_four?: string;
  line_items?: { description: string; amount: number }[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ExpenseFilters {
  userId?: string;
  categoryId?: string;
  jobId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  isReimbursable?: boolean;
  isBillable?: boolean;
  minAmount?: number;
  maxAmount?: number;
}

export interface ExpenseSettings {
  requireApproval: boolean;
  approvalThreshold: number;
  requireReceipt: boolean;
  receiptRequiredAbove: number;
  allowCustomCategories: boolean;
  reimbursementEnabled: boolean;
  defaultPaymentMethod: string;
  defaultMarkupPercent: number;
  ocrEnabled: boolean;
  ocrProvider: 'google' | 'aws' | 'openai';
  dailyLimit: number | null;
  monthlyLimit: number | null;
  requireJobLink: boolean;
  trackFuelByVehicle: boolean;
  requireOdometerForFuel: boolean;
}

// =====================================================
// DEFAULT CATEGORIES
// =====================================================

export const defaultExpenseCategories = [
  { name: 'Materials & Supplies', icon: 'Package', color: '#3B82F6', is_billable: true },
  { name: 'Parts', icon: 'Wrench', color: '#8B5CF6', is_billable: true },
  { name: 'Tools & Equipment', icon: 'Hammer', color: '#F59E0B', is_billable: false },
  { name: 'Fuel', icon: 'Fuel', color: '#EF4444', is_billable: false },
  { name: 'Vehicle Maintenance', icon: 'Car', color: '#6366F1', is_billable: false },
  { name: 'Meals', icon: 'UtensilsCrossed', color: '#10B981', is_billable: false },
  { name: 'Parking & Tolls', icon: 'ParkingCircle', color: '#06B6D4', is_billable: false },
  { name: 'Office Supplies', icon: 'Paperclip', color: '#84CC16', is_billable: false },
  { name: 'Permits & Licenses', icon: 'FileCheck', color: '#F97316', is_billable: true },
  { name: 'Subcontractor', icon: 'Users', color: '#EC4899', is_billable: true },
  { name: 'Other', icon: 'MoreHorizontal', color: '#6B7280', is_billable: false },
];

// =====================================================
// CATEGORY FUNCTIONS
// =====================================================

export async function getExpenseCategories(businessId: string): Promise<ExpenseCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createExpenseCategory(
  businessId: string,
  category: Partial<ExpenseCategory>
): Promise<ExpenseCategory> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      business_id: businessId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      is_taxable: category.is_taxable ?? true,
      is_reimbursable: category.is_reimbursable ?? true,
      is_billable: category.is_billable ?? false,
      gl_code: category.gl_code,
      is_system: false,
      is_active: true,
      sort_order: category.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateExpenseCategory(
  categoryId: string,
  updates: Partial<ExpenseCategory>
): Promise<ExpenseCategory> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expense_categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpenseCategory(categoryId: string): Promise<void> {
  const supabase = await createClient();

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('expense_categories')
    .update({ is_active: false })
    .eq('id', categoryId);

  if (error) throw error;
}

export async function initializeDefaultCategories(businessId: string): Promise<void> {
  const supabase = await createClient();

  const categories = defaultExpenseCategories.map((cat, index) => ({
    business_id: businessId,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    is_billable: cat.is_billable,
    is_taxable: true,
    is_reimbursable: true,
    is_system: true,
    is_active: true,
    sort_order: index,
  }));

  const { error } = await supabase
    .from('expense_categories')
    .insert(categories);

  if (error && !error.message.includes('duplicate')) throw error;
}

// =====================================================
// EXPENSE FUNCTIONS
// =====================================================

export async function createExpense(
  businessId: string,
  userId: string,
  expense: {
    categoryId: string;
    date: Date;
    vendor?: string;
    description: string;
    amount: number;
    taxAmount?: number;
    paymentMethod?: string;
    cardLastFour?: string;
    jobId?: string;
    customerId?: string;
    vehicleId?: string;
    isBillable?: boolean;
    isReimbursable?: boolean;
    notes?: string;
    tags?: string[];
    receiptUrl?: string;
    ocrData?: Record<string, any>;
  }
): Promise<Expense> {
  const supabase = await createClient();

  const taxAmount = expense.taxAmount || 0;
  const totalAmount = expense.amount + taxAmount;

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      business_id: businessId,
      user_id: userId,
      category_id: expense.categoryId,
      date: format(expense.date, 'yyyy-MM-dd'),
      vendor: expense.vendor,
      description: expense.description,
      amount: expense.amount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_method: expense.paymentMethod,
      card_last_four: expense.cardLastFour,
      job_id: expense.jobId,
      customer_id: expense.customerId,
      vehicle_id: expense.vehicleId,
      is_billable: expense.isBillable ?? false,
      is_reimbursable: expense.isReimbursable ?? true,
      notes: expense.notes,
      tags: expense.tags,
      receipt_url: expense.receiptUrl,
      ocr_extracted: !!expense.ocrData,
      ocr_data: expense.ocrData,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getExpenses(
  businessId: string,
  filters: ExpenseFilters = {},
  page: number = 1,
  limit: number = 50
): Promise<{ expenses: Expense[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(*),
      user:users!expenses_user_id_fkey(id, first_name, last_name, email),
      job:jobs(id, service_type, customer:customers(name)),
      receipts:expense_receipts(*)
    `, { count: 'exact' })
    .eq('business_id', businessId)
    .order('date', { ascending: false });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters.jobId) {
    query = query.eq('job_id', filters.jobId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.startDate) {
    query = query.gte('date', format(filters.startDate, 'yyyy-MM-dd'));
  }
  if (filters.endDate) {
    query = query.lte('date', format(filters.endDate, 'yyyy-MM-dd'));
  }
  if (filters.isReimbursable !== undefined) {
    query = query.eq('is_reimbursable', filters.isReimbursable);
  }
  if (filters.isBillable !== undefined) {
    query = query.eq('is_billable', filters.isBillable);
  }
  if (filters.minAmount !== undefined) {
    query = query.gte('total_amount', filters.minAmount);
  }
  if (filters.maxAmount !== undefined) {
    query = query.lte('total_amount', filters.maxAmount);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;
  return { expenses: data || [], total: count || 0 };
}

export async function getExpense(expenseId: string): Promise<Expense | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(*),
      user:users!expenses_user_id_fkey(id, first_name, last_name, email),
      job:jobs(id, service_type, customer:customers(name)),
      receipts:expense_receipts(*)
    `)
    .eq('id', expenseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function updateExpense(
  expenseId: string,
  updates: Partial<{
    categoryId: string;
    date: Date;
    vendor: string;
    description: string;
    amount: number;
    taxAmount: number;
    paymentMethod: string;
    cardLastFour: string;
    jobId: string;
    customerId: string;
    vehicleId: string;
    isBillable: boolean;
    isReimbursable: boolean;
    notes: string;
    tags: string[];
  }>
): Promise<Expense> {
  const supabase = await createClient();

  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
  if (updates.date !== undefined) dbUpdates.date = format(updates.date, 'yyyy-MM-dd');
  if (updates.vendor !== undefined) dbUpdates.vendor = updates.vendor;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.taxAmount !== undefined) dbUpdates.tax_amount = updates.taxAmount;
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.cardLastFour !== undefined) dbUpdates.card_last_four = updates.cardLastFour;
  if (updates.jobId !== undefined) dbUpdates.job_id = updates.jobId;
  if (updates.customerId !== undefined) dbUpdates.customer_id = updates.customerId;
  if (updates.vehicleId !== undefined) dbUpdates.vehicle_id = updates.vehicleId;
  if (updates.isBillable !== undefined) dbUpdates.is_billable = updates.isBillable;
  if (updates.isReimbursable !== undefined) dbUpdates.is_reimbursable = updates.isReimbursable;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags;

  // Recalculate total if amount or tax changed
  if (updates.amount !== undefined || updates.taxAmount !== undefined) {
    const { data: current } = await supabase
      .from('expenses')
      .select('amount, tax_amount')
      .eq('id', expenseId)
      .single();

    const amount = updates.amount ?? current?.amount ?? 0;
    const taxAmount = updates.taxAmount ?? current?.tax_amount ?? 0;
    dbUpdates.total_amount = amount + taxAmount;
  }

  const { data, error } = await supabase
    .from('expenses')
    .update(dbUpdates)
    .eq('id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;
}

// =====================================================
// RECEIPT FUNCTIONS
// =====================================================

export async function addReceipt(
  expenseId: string,
  receipt: {
    fileUrl: string;
    thumbnailUrl?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  }
): Promise<ExpenseReceipt> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expense_receipts')
    .insert({
      expense_id: expenseId,
      file_url: receipt.fileUrl,
      thumbnail_url: receipt.thumbnailUrl,
      file_name: receipt.fileName,
      file_size: receipt.fileSize,
      mime_type: receipt.mimeType,
    })
    .select()
    .single();

  if (error) throw error;

  // Update main expense receipt_url if first receipt
  await supabase
    .from('expenses')
    .update({ receipt_url: receipt.fileUrl })
    .eq('id', expenseId)
    .is('receipt_url', null);

  return data;
}

export async function deleteReceipt(receiptId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('expense_receipts')
    .delete()
    .eq('id', receiptId);

  if (error) throw error;
}

// =====================================================
// APPROVAL WORKFLOW
// =====================================================

export async function submitExpense(expenseId: string): Promise<Expense> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'submitted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveExpense(
  expenseId: string,
  approvedBy: string
): Promise<Expense> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function rejectExpense(
  expenseId: string,
  rejectedBy: string,
  reason?: string
): Promise<Expense> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkApproveExpenses(
  expenseIds: string[],
  approvedBy: string
): Promise<{ count: number }> {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from('expenses')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', expenseIds);

  if (error) throw error;
  return { count: count || 0 };
}

export async function bulkRejectExpenses(
  expenseIds: string[],
  rejectedBy: string,
  reason?: string
): Promise<{ count: number }> {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from('expenses')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .in('id', expenseIds);

  if (error) throw error;
  return { count: count || 0 };
}

// =====================================================
// REIMBURSEMENT
// =====================================================

export async function markReimbursed(
  expenseId: string,
  amount?: number
): Promise<Expense> {
  const supabase = await createClient();

  // Get the expense to use its total_amount if amount not specified
  const { data: expense } = await supabase
    .from('expenses')
    .select('total_amount')
    .eq('id', expenseId)
    .single();

  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'reimbursed',
      is_reimbursed: true,
      reimbursed_at: new Date().toISOString(),
      reimbursed_amount: amount ?? expense?.total_amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkMarkReimbursed(
  expenseIds: string[]
): Promise<{ count: number }> {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from('expenses')
    .update({
      status: 'reimbursed',
      is_reimbursed: true,
      reimbursed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .in('id', expenseIds);

  if (error) throw error;
  return { count: count || 0 };
}

export async function getPendingReimbursements(
  businessId: string,
  userId?: string
): Promise<{ expenses: Expense[]; totalAmount: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(*),
      user:users!expenses_user_id_fkey(id, first_name, last_name, email)
    `)
    .eq('business_id', businessId)
    .eq('is_reimbursable', true)
    .eq('is_reimbursed', false)
    .eq('status', 'approved')
    .order('date', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const totalAmount = (data || []).reduce((sum, exp) => sum + exp.total_amount, 0);

  return { expenses: data || [], totalAmount };
}

// =====================================================
// EXPENSE REPORTS
// =====================================================

export async function createExpenseReport(
  businessId: string,
  userId: string,
  report: {
    title: string;
    periodStart?: Date;
    periodEnd?: Date;
    expenseIds: string[];
    notes?: string;
  }
): Promise<ExpenseReport> {
  const supabase = await createClient();

  // Calculate totals from expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('total_amount')
    .in('id', report.expenseIds);

  const totalAmount = (expenses || []).reduce((sum, exp) => sum + exp.total_amount, 0);

  const { data, error } = await supabase
    .from('expense_reports')
    .insert({
      business_id: businessId,
      user_id: userId,
      title: report.title,
      period_start: report.periodStart ? format(report.periodStart, 'yyyy-MM-dd') : null,
      period_end: report.periodEnd ? format(report.periodEnd, 'yyyy-MM-dd') : null,
      total_amount: totalAmount,
      expense_count: report.expenseIds.length,
      notes: report.notes,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  // Link expenses to report
  if (report.expenseIds.length > 0) {
    const items = report.expenseIds.map((expenseId) => ({
      report_id: data.id,
      expense_id: expenseId,
    }));

    await supabase.from('expense_report_items').insert(items);
  }

  return data;
}

export async function submitExpenseReport(reportId: string): Promise<ExpenseReport> {
  const supabase = await createClient();

  // Update report status
  const { data, error } = await supabase
    .from('expense_reports')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;

  // Update linked expenses to submitted
  const { data: items } = await supabase
    .from('expense_report_items')
    .select('expense_id')
    .eq('report_id', reportId);

  if (items && items.length > 0) {
    const expenseIds = items.map((i) => i.expense_id);
    await supabase
      .from('expenses')
      .update({ status: 'submitted' })
      .in('id', expenseIds);
  }

  return data;
}

// =====================================================
// REPORTS & ANALYTICS
// =====================================================

export async function getExpenseSummary(
  businessId: string,
  startDate: Date,
  endDate: Date,
  userId?: string
): Promise<{
  totalAmount: number;
  expenseCount: number;
  byCategory: { category: string; amount: number; count: number }[];
  byEmployee: { employee: string; amount: number; count: number }[];
  pendingApproval: number;
  awaitingReimbursement: number;
}> {
  const supabase = await createClient();

  let query = supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(name),
      user:users!expenses_user_id_fkey(first_name, last_name)
    `)
    .eq('business_id', businessId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'));

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const expenses = data || [];

  // Calculate totals
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.total_amount, 0);
  const expenseCount = expenses.length;

  // Group by category
  const categoryMap = new Map<string, { amount: number; count: number }>();
  expenses.forEach((exp) => {
    const catName = exp.category?.name || 'Uncategorized';
    const current = categoryMap.get(catName) || { amount: 0, count: 0 };
    categoryMap.set(catName, {
      amount: current.amount + exp.total_amount,
      count: current.count + 1,
    });
  });
  const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));

  // Group by employee
  const employeeMap = new Map<string, { amount: number; count: number }>();
  expenses.forEach((exp) => {
    const empName = exp.user
      ? `${exp.user.first_name || ''} ${exp.user.last_name || ''}`.trim()
      : 'Unknown';
    const current = employeeMap.get(empName) || { amount: 0, count: 0 };
    employeeMap.set(empName, {
      amount: current.amount + exp.total_amount,
      count: current.count + 1,
    });
  });
  const byEmployee = Array.from(employeeMap.entries()).map(([employee, data]) => ({
    employee,
    ...data,
  }));

  // Pending approval count
  const pendingApproval = expenses.filter((e) => e.status === 'submitted').length;

  // Awaiting reimbursement amount
  const awaitingReimbursement = expenses
    .filter((e) => e.status === 'approved' && e.is_reimbursable && !e.is_reimbursed)
    .reduce((sum, exp) => sum + exp.total_amount, 0);

  return {
    totalAmount,
    expenseCount,
    byCategory,
    byEmployee,
    pendingApproval,
    awaitingReimbursement,
  };
}

export async function getJobExpenses(jobId: string): Promise<{
  expenses: Expense[];
  totalAmount: number;
  billableAmount: number;
  billedAmount: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(*),
      user:users!expenses_user_id_fkey(id, first_name, last_name)
    `)
    .eq('job_id', jobId)
    .order('date', { ascending: false });

  if (error) throw error;

  const expenses = data || [];
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.total_amount, 0);
  const billableAmount = expenses
    .filter((e) => e.is_billable && !e.is_billed)
    .reduce((sum, exp) => sum + exp.total_amount, 0);
  const billedAmount = expenses
    .filter((e) => e.is_billed)
    .reduce((sum, exp) => sum + exp.total_amount, 0);

  return { expenses, totalAmount, billableAmount, billedAmount };
}

export async function getExpenseExportData(
  businessId: string,
  startDate: Date,
  endDate: Date,
  filters: ExpenseFilters = {}
): Promise<Expense[]> {
  const { expenses } = await getExpenses(
    businessId,
    { ...filters, startDate, endDate },
    1,
    10000 // Large limit for export
  );
  return expenses;
}

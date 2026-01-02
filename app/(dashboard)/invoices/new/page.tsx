'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Loader2,
  User,
  Search,
  Package,
  DollarSign,
  Calendar,
  X,
  GripVertical,
} from 'lucide-react';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { formatPhoneNumber } from '@/lib/utils';
import type { UserWithBusiness, Customer } from '@/types';

// Partial customer type for search results
type CustomerSearchResult = Pick<Customer, 'id' | 'name' | 'phone' | 'email'> & { address?: string };

interface LineItem {
  id: string;
  saved_service_id: string | null;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  is_taxable: boolean;
}

interface SavedService {
  id: string;
  name: string;
  description: string | null;
  default_price: number | null;
  is_taxable: boolean;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer');
  const jobId = searchParams.get('job');
  const quoteId = searchParams.get('quote');

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerSearchResult[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(!customerId);

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [savedServices, setSavedServices] = useState<SavedService[]>([]);
  const [showServicePicker, setShowServicePicker] = useState(false);

  const [taxRate, setTaxRate] = useState(8.25);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [dueDays, setDueDays] = useState(30);
  const [dueDate, setDueDate] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Set due date based on due days
    const date = new Date();
    date.setDate(date.getDate() + dueDays);
    setDueDate(date.toISOString().split('T')[0]);
  }, [dueDays]);

  const loadData = async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    const supabase = createClient();

    // Load business settings
    const { data: business } = await supabase
      .from('businesses')
      .select('default_tax_rate, invoice_due_days, invoice_terms')
      .eq('id', profile.business_id)
      .single();

    if (business) {
      setTaxRate(business.default_tax_rate || 8.25);
      setDueDays(business.invoice_due_days || 30);
      setTerms(business.invoice_terms || '');
    }

    // Load saved services
    const { data: services } = await supabase
      .from('saved_services')
      .select('id, name, description, default_price, is_taxable')
      .eq('business_id', profile.business_id)
      .eq('is_active', true)
      .order('name');

    setSavedServices(services || []);

    // Load customer if provided
    if (customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customer) {
        setSelectedCustomer(customer);
        setShowCustomerSearch(false);
      }
    }

    // Load quote if converting from quote
    if (quoteId) {
      const { data: quote } = await supabase
        .from('quotes')
        .select(`
          *,
          customer:customers (*),
          items:quote_items (*)
        `)
        .eq('id', quoteId)
        .single();

      if (quote) {
        setSelectedCustomer(quote.customer);
        setShowCustomerSearch(false);
        setTaxRate(quote.tax_rate || 0);
        setDiscountAmount(quote.discount_amount || 0);
        setCustomerNotes(quote.customer_notes || '');

        if (quote.items && quote.items.length > 0) {
          setLineItems(
            quote.items.map((item: any) => ({
              id: crypto.randomUUID(),
              saved_service_id: item.saved_service_id,
              name: item.name,
              description: item.description || '',
              quantity: item.quantity,
              unit_price: item.unit_price,
              is_taxable: item.is_taxable,
            }))
          );
        }
      }
    }

    setLoading(false);
  };

  // Search customers
  useEffect(() => {
    if (!user || !customerSearch.trim()) {
      setCustomers([]);
      return;
    }

    const search = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, email, address')
        .eq('business_id', user.business_id)
        .or(`name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`)
        .limit(5);

      setCustomers(data || []);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [user, customerSearch]);

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxableAmount = lineItems
    .filter((item) => item.is_taxable)
    .reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = subtotal + taxAmount - discountAmount;

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        saved_service_id: null,
        name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        is_taxable: true,
      },
    ]);
  };

  const addFromService = (service: SavedService) => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        saved_service_id: service.id,
        name: service.name,
        description: service.description || '',
        quantity: 1,
        unit_price: service.default_price || 0,
        is_taxable: service.is_taxable,
      },
    ]);
    setShowServicePicker(false);
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(lineItems.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleSave = async (sendAfter: boolean = false) => {
    if (!user || !selectedCustomer || lineItems.length === 0) {
      alert('Please select a customer and add at least one line item');
      return;
    }

    if (sendAfter) {
      setSending(true);
    } else {
      setSaving(true);
    }

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          job_id: jobId,
          quote_id: quoteId,
          items: lineItems.map((item, index) => ({
            saved_service_id: item.saved_service_id,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            is_taxable: item.is_taxable,
            sort_order: index,
          })),
          tax_rate: taxRate,
          discount_amount: discountAmount,
          due_date: dueDate,
          customer_notes: customerNotes,
          terms: terms,
          notes: internalNotes,
          send_immediately: sendAfter,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/invoices/${data.invoice.id}`);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save invoice');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice');
    } finally {
      setSaving(false);
      setSending(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold flex-1">New Invoice</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Customer Selection */}
        <div className="bg-card rounded-xl border border-border p-4">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Customer *
          </label>

          {selectedCustomer && !showCustomerSearch ? (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPhoneNumber(selectedCustomer.phone || '')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerSearch(true);
                }}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {customers.length > 0 && (
                <div className="mt-2 border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowCustomerSearch(false);
                        setCustomerSearch('');
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPhoneNumber(customer.phone || '')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Line Items */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-muted-foreground">Line Items *</label>
            <div className="flex gap-2">
              {savedServices.length > 0 && (
                <button
                  onClick={() => setShowServicePicker(true)}
                  className="text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded transition-colors"
                >
                  + From Services
                </button>
              )}
              <button
                onClick={addLineItem}
                className="text-xs px-2 py-1 text-primary hover:bg-primary/10 rounded transition-colors"
              >
                + Custom
              </button>
            </div>
          </div>

          {lineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No items yet. Add line items above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-background border border-border rounded-lg p-3 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                        placeholder="Item name"
                        className="w-full px-3 py-2 bg-card border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                        placeholder="Description (optional)"
                        className="w-full px-3 py-2 bg-card border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      <div className="flex gap-2">
                        <div className="w-20">
                          <label className="text-xs text-muted-foreground">Qty</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(item.id, { quantity: parseFloat(e.target.value) || 0 })
                            }
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1.5 bg-card border border-input rounded text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground">Unit Price</label>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateLineItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })
                              }
                              min="0"
                              step="0.01"
                              className="w-full pl-6 pr-2 py-1.5 bg-card border border-input rounded text-sm"
                            />
                          </div>
                        </div>
                        <div className="w-24 text-right">
                          <label className="text-xs text-muted-foreground">Total</label>
                          <p className="py-1.5 font-medium text-sm">
                            ${(item.quantity * item.unit_price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.is_taxable}
                          onChange={(e) => updateLineItem(item.id, { is_taxable: e.target.checked })}
                          className="rounded"
                        />
                        Taxable
                      </label>
                    </div>
                    <button
                      onClick={() => removeLineItem(item.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        {lineItems.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Tax</span>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-16 px-2 py-1 bg-background border border-input rounded text-xs text-center"
                    step="0.01"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <span>${taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Discount</span>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-20 pl-6 pr-2 py-1 bg-background border border-input rounded text-xs"
                      step="0.01"
                    />
                  </div>
                </div>
                <span className="text-red-500">-${discountAmount.toFixed(2)}</span>
              </div>

              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Due Date & Terms */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={dueDays}
                  onChange={(e) => setDueDays(parseInt(e.target.value) || 30)}
                  className="w-16 px-3 py-2 bg-background border border-input rounded-lg text-center"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Payment Terms
            </label>
            <textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Payment terms and conditions..."
              className="w-full h-20 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Notes for Customer
            </label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="These notes will be visible to the customer..."
              className="w-full h-20 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Internal Notes
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Private notes (not visible to customer)..."
              className="w-full h-20 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 flex gap-3">
        <button
          onClick={() => handleSave(false)}
          disabled={saving || sending}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Save Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving || sending || !selectedCustomer?.phone}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          Save & Send
        </button>
      </div>

      {/* Service Picker Modal */}
      {showServicePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-card w-full rounded-t-2xl max-h-[70vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold">Add from Saved Services</h3>
              <button
                onClick={() => setShowServicePicker(false)}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(70vh-60px)]">
              {savedServices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No saved services yet
                </p>
              ) : (
                <div className="space-y-2">
                  {savedServices.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => addFromService(service)}
                      className="w-full flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <span className="font-medium text-primary">
                        ${service.default_price?.toFixed(2) || '0.00'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

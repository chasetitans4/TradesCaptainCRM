# Quotes & Invoices with Stripe - Implementation Guide

## Overview

Add professional quote and invoice generation to Trades Captain CRM with Stripe integration for online payments. This is a key revenue feature - tradespeople need to quickly send quotes from the field and get paid faster.

---

## Features Summary

### Quotes
- Create quotes with line items (labor, materials, flat-rate services)
- Saved services library (reusable line items with default pricing)
- Send quotes via SMS or email
- Customer can view quote on web (no login required)
- Customer can accept/decline quote online
- Convert accepted quotes to jobs and/or invoices
- Quote expiration dates
- PDF generation for printing

### Invoices
- Create invoices manually or from quotes/jobs
- Line items with tax calculation
- Send invoices via SMS or email
- **Stripe payment links** - customer pays online
- Payment status tracking (unpaid, partial, paid)
- Payment reminders (manual or automated)
- PDF generation
- Mark as paid manually (for cash/check)

---

## Database Schema

The schema already exists, but here it is for reference with any additions:

```sql
-- Saved services (reusable line items)
CREATE TABLE IF NOT EXISTS saved_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_price DECIMAL(10,2),
  price_type TEXT DEFAULT 'fixed', -- 'fixed', 'hourly', 'per_unit'
  unit_label TEXT, -- 'hour', 'sq ft', 'each', etc.
  category TEXT, -- 'labor', 'materials', 'service'
  is_taxable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  quote_number TEXT, -- Auto-generated: Q-0001
  
  status TEXT DEFAULT 'draft', -- draft, sent, viewed, accepted, declined, expired
  
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  
  notes TEXT, -- Internal notes
  customer_notes TEXT, -- Shown to customer
  terms TEXT, -- Terms and conditions
  
  valid_until DATE, -- Expiration date
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  
  -- For web viewing
  access_token TEXT UNIQUE, -- Random token for public URL
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote line items
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  saved_service_id UUID REFERENCES saved_services(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  is_taxable BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  invoice_number TEXT, -- Auto-generated: INV-0001
  
  status TEXT DEFAULT 'draft', -- draft, sent, viewed, paid, partial, overdue, void
  
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_due DECIMAL(10,2) DEFAULT 0,
  
  notes TEXT,
  customer_notes TEXT,
  terms TEXT,
  
  due_date DATE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Stripe
  stripe_payment_intent_id TEXT,
  stripe_payment_link_url TEXT,
  
  -- For web viewing
  access_token TEXT UNIQUE,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice line items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  saved_service_id UUID REFERENCES saved_services(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  is_taxable BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments (for tracking partial payments, multiple payment methods)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT, -- 'stripe', 'cash', 'check', 'other'
  
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  
  notes TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business settings for quotes/invoices
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS default_tax_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS quote_validity_days INTEGER DEFAULT 30;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invoice_due_days INTEGER DEFAULT 30;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS quote_terms TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS invoice_terms TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_quote_number INTEGER DEFAULT 1;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER DEFAULT 1;

-- Stripe Connect (for receiving payments)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;

-- RLS Policies
ALTER TABLE saved_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Add appropriate policies for each table...
```

---

## Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# For Stripe Connect (marketplace payouts)
STRIPE_CONNECT_CLIENT_ID=ca_xxx

# App URL (for payment links and webhooks)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Stripe Integration

### Payment Flow Options

**Option A: Stripe Payment Links (Simpler)**
- Generate a Stripe Payment Link for each invoice
- Customer clicks link, pays on Stripe-hosted page
- Webhook notifies app of payment
- No need for custom checkout UI

**Option B: Stripe Connect (Marketplace Model)**
- You (platform) facilitate payments to businesses
- Take a platform fee on each transaction
- More complex setup but enables revenue share

**Recommendation:** Start with **Payment Links** for simplicity. Add Connect later if you want to take a cut.

---

## Files to Create

### Library Files

**`/lib/stripe/client.ts`**
```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});
```

**`/lib/stripe/payment-links.ts`**
```typescript
import { stripe } from './client';

interface CreatePaymentLinkParams {
  invoiceId: string;
  amount: number; // In cents
  customerEmail: string;
  customerName: string;
  description: string;
  metadata: Record<string, string>;
}

export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<string> {
  const { amount, customerEmail, customerName, description, metadata } = params;
  
  // Create a price for this specific invoice
  const price = await stripe.prices.create({
    unit_amount: amount,
    currency: 'usd',
    product_data: {
      name: description,
    },
  });
  
  // Create payment link
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata,
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/pay/success?invoice_id=${params.invoiceId}`,
      },
    },
    customer_creation: 'if_required',
    phone_number_collection: { enabled: false },
    // Pre-fill customer email
    custom_fields: [],
  });
  
  return paymentLink.url;
}
```

**`/lib/quotes/index.ts`**
```typescript
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

// Generate quote number
export async function generateQuoteNumber(businessId: string): Promise<string> {
  const supabase = createClient();
  
  // Get and increment counter
  const { data: business } = await supabase
    .from('businesses')
    .select('next_quote_number')
    .eq('id', businessId)
    .single();
  
  const number = business?.next_quote_number || 1;
  
  await supabase
    .from('businesses')
    .update({ next_quote_number: number + 1 })
    .eq('id', businessId);
  
  return `Q-${String(number).padStart(4, '0')}`;
}

// Generate access token for public URL
export function generateAccessToken(): string {
  return randomBytes(32).toString('hex');
}

// Calculate quote totals
export function calculateQuoteTotals(
  items: { quantity: number; unit_price: number; is_taxable: boolean }[],
  taxRate: number,
  discountAmount: number = 0
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  
  const taxableAmount = items
    .filter(item => item.is_taxable)
    .reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = subtotal + taxAmount - discountAmount;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// Send quote via SMS
export async function sendQuoteViaSms(quoteId: string): Promise<void> {
  const supabase = createClient();
  
  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      *,
      customer:customers (name, phone),
      business:businesses (name, twilio_phone_number)
    `)
    .eq('id', quoteId)
    .single();
  
  if (!quote?.customer?.phone) {
    throw new Error('Customer has no phone number');
  }
  
  const quoteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/quote/${quote.access_token}`;
  
  const message = `Hi ${quote.customer.name}! ${quote.business.name} has sent you a quote for $${quote.total.toFixed(2)}. View and accept it here: ${quoteUrl}`;
  
  // Use existing SMS sending function
  await sendSMS(quote.customer.phone, message, quote.business_id);
  
  // Update sent_at
  await supabase
    .from('quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', quoteId);
}
```

**`/lib/invoices/index.ts`**
```typescript
// Similar functions for invoices
// generateInvoiceNumber, calculateInvoiceTotals, sendInvoiceViaSms, etc.
```

---

### API Routes

**`/app/api/quotes/route.ts`** - List/Create quotes
```typescript
// GET: List quotes with filters (status, customer, date range)
// POST: Create new quote
```

**`/app/api/quotes/[id]/route.ts`** - Get/Update/Delete quote
```typescript
// GET: Get quote with items
// PUT: Update quote
// DELETE: Delete quote (only if draft)
```

**`/app/api/quotes/[id]/send/route.ts`** - Send quote
```typescript
// POST: Send quote via SMS and/or email
// Updates status to 'sent'
```

**`/app/api/quotes/[id]/accept/route.ts`** - Accept quote (public)
```typescript
// POST: Customer accepts quote
// Body: { token: string, signature?: string }
// Updates status to 'accepted'
```

**`/app/api/quotes/[id]/convert/route.ts`** - Convert to job/invoice
```typescript
// POST: Convert accepted quote to job and/or invoice
// Body: { create_job: boolean, create_invoice: boolean }
```

**`/app/api/invoices/route.ts`** - List/Create invoices

**`/app/api/invoices/[id]/route.ts`** - Get/Update/Delete invoice

**`/app/api/invoices/[id]/send/route.ts`** - Send invoice

**`/app/api/invoices/[id]/payment-link/route.ts`** - Generate Stripe payment link
```typescript
// POST: Generate payment link for invoice
// Returns { url: string }
```

**`/app/api/invoices/[id]/record-payment/route.ts`** - Record manual payment
```typescript
// POST: Record cash/check payment
// Body: { amount: number, method: string, notes?: string }
```

**`/app/api/webhooks/stripe/route.ts`** - Stripe webhooks
```typescript
import { stripe } from '@/lib/stripe/client';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
  }
  
  return new Response('OK');
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata.invoice_id;
  if (!invoiceId) return;
  
  const supabase = createClient();
  
  // Record payment
  await supabase.from('payments').insert({
    invoice_id: invoiceId,
    business_id: paymentIntent.metadata.business_id,
    amount: paymentIntent.amount / 100,
    payment_method: 'stripe',
    stripe_payment_intent_id: paymentIntent.id,
    stripe_charge_id: paymentIntent.latest_charge as string,
  });
  
  // Update invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total, amount_paid')
    .eq('id', invoiceId)
    .single();
  
  const newAmountPaid = (invoice?.amount_paid || 0) + paymentIntent.amount / 100;
  const isPaid = newAmountPaid >= (invoice?.total || 0);
  
  await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      amount_due: (invoice?.total || 0) - newAmountPaid,
      status: isPaid ? 'paid' : 'partial',
      paid_at: isPaid ? new Date().toISOString() : null,
    })
    .eq('id', invoiceId);
  
  // Send confirmation SMS to customer
  // ...
}
```

**`/app/view/quote/[token]/page.tsx`** - Public quote view (no auth)
```typescript
// Customer-facing quote view
// Shows quote details, items, total
// Accept/Decline buttons
// No login required - uses access token
```

**`/app/view/invoice/[token]/page.tsx`** - Public invoice view
```typescript
// Customer-facing invoice view
// Shows invoice details, amount due
// "Pay Now" button links to Stripe
```

**`/app/pay/success/page.tsx`** - Payment success page
```typescript
// Thank you page after successful payment
// Shows confirmation, receipt link
```

---

### UI Pages

**`/app/(dashboard)/quotes/page.tsx`** - Quotes List
- Filter tabs: All, Draft, Sent, Accepted, Declined, Expired
- Search by customer name, quote number
- Sort by date, amount, status
- Quick actions: View, Send, Convert, Delete
- Shows: Quote #, Customer, Amount, Status, Date, Expiration

**`/app/(dashboard)/quotes/[id]/page.tsx`** - Quote Detail
- Header: Quote number, status badge, customer info
- Line items table with edit capability (if draft)
- Totals section (subtotal, tax, discount, total)
- Notes section
- Actions:
  - Edit (if draft)
  - Send via SMS/Email
  - Download PDF
  - Convert to Job
  - Convert to Invoice
  - Delete (if draft)
- Activity log (sent, viewed, accepted/declined timestamps)

**`/app/(dashboard)/quotes/new/page.tsx`** - Create Quote
**`/app/(dashboard)/quotes/[id]/edit/page.tsx`** - Edit Quote

Quote builder UI:
```
┌─────────────────────────────────────────────────────┐
│ New Quote                                           │
├─────────────────────────────────────────────────────┤
│ Customer: [Search or select customer]               │
│                                                     │
│ ─────────────────────────────────────────────────── │
│ LINE ITEMS                                          │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ AC System Diagnosis           $150.00    [x]    │ │
│ │ Qty: 1                                          │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Refrigerant Recharge          $85.00/lb  [x]    │ │
│ │ Qty: 3 lbs = $255.00                            │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [+ Add Line Item]  [+ Add from Saved Services]      │
│                                                     │
│ ─────────────────────────────────────────────────── │
│                          Subtotal:    $405.00       │
│                          Tax (8.25%): $33.41        │
│                          ─────────────────────      │
│                          Total:       $438.41       │
│                                                     │
│ ─────────────────────────────────────────────────── │
│ Valid Until: [Date picker - 30 days default]        │
│                                                     │
│ Notes for Customer:                                 │
│ [Text area]                                         │
│                                                     │
│ ─────────────────────────────────────────────────── │
│ [Save as Draft]              [Save & Send]          │
└─────────────────────────────────────────────────────┘
```

**`/app/(dashboard)/invoices/page.tsx`** - Invoices List
- Filter tabs: All, Draft, Sent, Paid, Overdue
- Shows: Invoice #, Customer, Amount, Amount Due, Status, Due Date
- Overdue invoices highlighted in red

**`/app/(dashboard)/invoices/[id]/page.tsx`** - Invoice Detail
- Similar to quote detail
- Payment history section
- "Send Payment Reminder" button
- "Record Payment" button (for cash/check)
- "Mark as Paid" button

**`/app/(dashboard)/invoices/new/page.tsx`** - Create Invoice
- Option to create from quote or scratch
- Similar line item builder

**`/app/(dashboard)/settings/services/page.tsx`** - Saved Services
- List of reusable line items
- Add/Edit/Delete services
- Categories, default prices, taxable toggle

---

### Components

**`/components/quotes/line-item-row.tsx`**
```typescript
// Editable line item row
// Name, description, qty, unit price, total
// Delete button
// Drag handle for reordering
```

**`/components/quotes/saved-service-picker.tsx`**
```typescript
// Modal/sheet to pick from saved services
// Search, filter by category
// Click to add to quote
```

**`/components/quotes/totals-section.tsx`**
```typescript
// Subtotal, tax, discount, total display
// Editable tax rate and discount
```

**`/components/invoices/payment-history.tsx`**
```typescript
// List of payments on an invoice
// Date, amount, method, Stripe link
```

**`/components/invoices/record-payment-sheet.tsx`**
```typescript
// Bottom sheet to record manual payment
// Amount, method dropdown, notes
```

---

## PDF Generation

Use `@react-pdf/renderer` for generating quote/invoice PDFs:

**`/lib/pdf/quote-pdf.tsx`**
```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export function QuotePDF({ quote, business, items }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header with business logo/name */}
        {/* Quote number, date, valid until */}
        {/* Customer info */}
        {/* Line items table */}
        {/* Totals */}
        {/* Terms and conditions */}
        {/* Signature line (if accepted) */}
      </Page>
    </Document>
  );
}
```

**`/app/api/quotes/[id]/pdf/route.ts`**
```typescript
import { renderToStream } from '@react-pdf/renderer';

export async function GET(request, { params }) {
  // Load quote data
  // Generate PDF
  // Return as download
}
```

---

## Permissions

Add to `/lib/permissions.ts`:

```typescript
// Quote permissions
'view_quotes',
'create_quotes',
'edit_quotes',
'delete_quotes',
'send_quotes',

// Invoice permissions
'view_invoices',
'create_invoices',
'edit_invoices',
'delete_invoices',
'send_invoices',
'record_payments',

// Services permissions
'manage_saved_services',

// Role assignments:
// owner: all
// admin: all
// technician: view_quotes, view_invoices (read-only)
```

---

## Package Dependencies

```json
{
  "dependencies": {
    "stripe": "^14.0.0",
    "@react-pdf/renderer": "^3.4.0"
  }
}
```

---

## Implementation Order

1. **Database migrations** - Ensure all tables exist
2. **Saved services CRUD** - Settings page for services
3. **Quote builder UI** - Create/edit quotes
4. **Quote list/detail pages** - View and manage quotes
5. **Public quote view** - Customer-facing page
6. **Quote sending** - SMS/email integration
7. **Quote acceptance** - Accept/decline flow
8. **Invoice builder** - Similar to quotes
9. **Stripe integration** - Payment links
10. **Webhook handler** - Process payments
11. **Payment recording** - Manual payments
12. **PDF generation** - Downloadable documents
13. **Quote-to-invoice conversion** - Workflow automation

---

## Testing Checklist

- [ ] Create quote with line items
- [ ] Add items from saved services
- [ ] Tax calculation works correctly
- [ ] Save quote as draft
- [ ] Send quote via SMS
- [ ] Customer can view quote (public URL)
- [ ] Customer can accept quote
- [ ] Customer can decline quote
- [ ] Convert quote to job
- [ ] Convert quote to invoice
- [ ] Create invoice manually
- [ ] Create invoice from quote
- [ ] Generate Stripe payment link
- [ ] Customer can pay via Stripe
- [ ] Webhook updates invoice status
- [ ] Record manual payment
- [ ] Mark invoice as paid
- [ ] PDF generation works
- [ ] Overdue invoice detection
- [ ] Technician has read-only access

---

## Example Flows

### Quote → Job → Invoice Flow
```
1. Create quote for customer ($500 AC repair)
2. Send quote via SMS
3. Customer views and accepts quote
4. Convert quote to job (scheduled for Tuesday)
5. Complete job
6. Convert to invoice (or auto-generate)
7. Send invoice with payment link
8. Customer pays via Stripe
9. Webhook marks invoice as paid
10. Send payment confirmation SMS
```

### Quick Invoice (No Quote)
```
1. Complete job
2. Create invoice directly from job detail page
3. Line items pre-populated from job
4. Adjust amounts if needed
5. Send invoice
6. Collect payment
```

---

Good luck! Start with the quote builder - that's the most complex UI piece.
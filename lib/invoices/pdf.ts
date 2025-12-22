// =====================================================
// INVOICE PDF GENERATION
// Generates printable HTML for invoices
// =====================================================

interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  // Business info
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessLogo?: string;
  // Customer info
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
  // Line items
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  // Totals
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  // Additional
  notes?: string;
  terms?: string;
  paymentLink?: string;
}

/**
 * Generate printable HTML for an invoice
 */
export function generateInvoicePdfHtml(data: InvoicePdfData): string {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const statusColors: Record<string, string> = {
    draft: '#6B7280',
    sent: '#3B82F6',
    viewed: '#8B5CF6',
    partial: '#F59E0B',
    paid: '#10B981',
    overdue: '#EF4444',
    void: '#6B7280',
  };

  const statusColor = statusColors[data.status] || '#6B7280';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${data.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      background: white;
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }

    .logo-section {
      flex: 1;
    }

    .logo {
      max-height: 60px;
      max-width: 200px;
    }

    .business-name {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }

    .business-info {
      color: #6b7280;
      font-size: 13px;
    }

    .invoice-title-section {
      text-align: right;
    }

    .invoice-title {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }

    .invoice-number {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: white;
      background-color: ${statusColor};
    }

    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }

    .info-block {
      flex: 1;
    }

    .info-block:last-child {
      text-align: right;
    }

    .info-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
    }

    .info-value {
      color: #111827;
    }

    .info-value strong {
      font-size: 16px;
      display: block;
      margin-bottom: 4px;
    }

    .dates-section {
      display: flex;
      gap: 40px;
      margin-bottom: 40px;
    }

    .date-item {
      display: flex;
      gap: 8px;
    }

    .date-label {
      color: #6b7280;
    }

    .date-value {
      font-weight: 600;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .items-table th {
      background-color: #f9fafb;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      border-bottom: 2px solid #e5e7eb;
    }

    .items-table th:last-child,
    .items-table td:last-child {
      text-align: right;
    }

    .items-table td {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
    }

    .item-description {
      font-weight: 500;
    }

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }

    .totals-table {
      width: 300px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .totals-row.total {
      font-size: 18px;
      font-weight: 700;
      border-bottom: 2px solid #111827;
      padding: 12px 0;
    }

    .totals-row.amount-due {
      font-size: 20px;
      font-weight: 700;
      color: ${data.amountDue > 0 ? '#EF4444' : '#10B981'};
      border-bottom: none;
      padding-top: 16px;
    }

    .notes-section {
      margin-bottom: 24px;
      padding: 16px;
      background-color: #f9fafb;
      border-radius: 8px;
    }

    .notes-title {
      font-weight: 600;
      margin-bottom: 8px;
    }

    .terms-section {
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .payment-section {
      text-align: center;
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;
    }

    .payment-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .payment-link {
      color: white;
      word-break: break-all;
      font-size: 12px;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .invoice-container {
        padding: 0;
      }

      .payment-section {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="logo-section">
        ${data.businessLogo ? `<img src="${data.businessLogo}" alt="${data.businessName}" class="logo">` : `<div class="business-name">${data.businessName}</div>`}
        <div class="business-info">
          ${data.businessAddress ? `<div>${data.businessAddress}</div>` : ''}
          ${data.businessPhone ? `<div>${data.businessPhone}</div>` : ''}
          ${data.businessEmail ? `<div>${data.businessEmail}</div>` : ''}
        </div>
      </div>
      <div class="invoice-title-section">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">${data.invoiceNumber}</div>
        <span class="status-badge">${data.status}</span>
      </div>
    </div>

    <div class="info-section">
      <div class="info-block">
        <div class="info-label">Bill To</div>
        <div class="info-value">
          <strong>${data.customerName}</strong>
          ${data.customerAddress ? `<div>${data.customerAddress}</div>` : ''}
          ${data.customerEmail ? `<div>${data.customerEmail}</div>` : ''}
          ${data.customerPhone ? `<div>${data.customerPhone}</div>` : ''}
        </div>
      </div>
      <div class="info-block">
        <div class="info-label">Invoice Details</div>
        <div class="info-value">
          <div><span class="date-label">Issue Date:</span> <span class="date-value">${data.issueDate}</span></div>
          <div><span class="date-label">Due Date:</span> <span class="date-value">${data.dueDate}</span></div>
        </div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.lineItems.map(item => `
          <tr>
            <td class="item-description">${item.description}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unitPrice)}</td>
            <td>${formatCurrency(item.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals-section">
      <div class="totals-table">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${formatCurrency(data.subtotal)}</span>
        </div>
        ${data.taxAmount && data.taxAmount > 0 ? `
          <div class="totals-row">
            <span>Tax${data.taxRate ? ` (${data.taxRate}%)` : ''}</span>
            <span>${formatCurrency(data.taxAmount)}</span>
          </div>
        ` : ''}
        ${data.discountAmount && data.discountAmount > 0 ? `
          <div class="totals-row">
            <span>Discount</span>
            <span>-${formatCurrency(data.discountAmount)}</span>
          </div>
        ` : ''}
        <div class="totals-row total">
          <span>Total</span>
          <span>${formatCurrency(data.total)}</span>
        </div>
        ${data.amountPaid > 0 ? `
          <div class="totals-row">
            <span>Amount Paid</span>
            <span>-${formatCurrency(data.amountPaid)}</span>
          </div>
        ` : ''}
        <div class="totals-row amount-due">
          <span>Amount Due</span>
          <span>${formatCurrency(data.amountDue)}</span>
        </div>
      </div>
    </div>

    ${data.notes ? `
      <div class="notes-section">
        <div class="notes-title">Notes</div>
        <div>${data.notes}</div>
      </div>
    ` : ''}

    ${data.terms ? `
      <div class="terms-section">
        <div class="notes-title">Terms & Conditions</div>
        <div>${data.terms}</div>
      </div>
    ` : ''}

    ${data.paymentLink && data.amountDue > 0 ? `
      <div class="payment-section">
        <div class="payment-title">Pay Online</div>
        <div class="payment-link">${data.paymentLink}</div>
      </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for your business!</p>
    </div>
  </div>

  <script>
    // Auto-print when opened with ?print=true
    if (window.location.search.includes('print=true')) {
      window.onload = function() {
        window.print();
      };
    }
  </script>
</body>
</html>
  `.trim();
}

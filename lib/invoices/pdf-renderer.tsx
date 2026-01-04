// =====================================================
// INVOICE PDF RENDERER
// Uses @react-pdf/renderer for actual PDF generation
// =====================================================

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register default font (system fonts won't work in PDF)
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2', fontWeight: 700 },
  ],
});

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  customerName: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes?: string;
  terms?: string;
}

const colors = {
  primary: '#2563eb',
  gray900: '#111827',
  gray700: '#374151',
  gray600: '#4b5563',
  gray500: '#6b7280',
  gray400: '#9ca3af',
  gray200: '#e5e7eb',
  gray100: '#f3f4f6',
  gray50: '#f9fafb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const statusColors: Record<string, string> = {
  draft: colors.gray500,
  sent: colors.primary,
  viewed: '#8b5cf6',
  partial: colors.warning,
  paid: colors.success,
  overdue: colors.danger,
  void: colors.gray500,
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: colors.gray700,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.gray200,
  },
  businessSection: {
    flex: 1,
  },
  businessName: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.gray900,
    marginBottom: 8,
  },
  businessInfo: {
    fontSize: 9,
    color: colors.gray500,
    lineHeight: 1.5,
  },
  invoiceSection: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.gray900,
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 12,
    color: colors.gray500,
    marginBottom: 8,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    fontSize: 8,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'white',
    alignSelf: 'flex-end',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  infoBlock: {
    flex: 1,
  },
  infoBlockRight: {
    flex: 1,
    textAlign: 'right',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: colors.gray500,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  infoValueName: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.gray900,
    marginBottom: 4,
  },
  infoValueText: {
    fontSize: 9,
    color: colors.gray600,
    lineHeight: 1.5,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.gray50,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: colors.gray200,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 600,
    textTransform: 'uppercase',
    color: colors.gray500,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tableCell: {
    fontSize: 10,
    color: colors.gray700,
  },
  tableCellDescription: {
    flex: 4,
  },
  tableCellQty: {
    flex: 1,
    textAlign: 'center',
  },
  tableCellPrice: {
    flex: 1.5,
    textAlign: 'right',
  },
  tableCellAmount: {
    flex: 1.5,
    textAlign: 'right',
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 30,
  },
  totalsTable: {
    width: 220,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  totalsRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.gray900,
  },
  totalsRowAmountDue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  totalsLabel: {
    fontSize: 10,
    color: colors.gray600,
  },
  totalsValue: {
    fontSize: 10,
    color: colors.gray900,
    fontWeight: 500,
  },
  totalsTotalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.gray900,
  },
  totalsTotalValue: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.gray900,
  },
  amountDueLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.gray900,
  },
  amountDueValue: {
    fontSize: 14,
    fontWeight: 700,
  },
  notesSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.gray50,
    borderRadius: 6,
  },
  notesSectionTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.gray900,
    marginBottom: 6,
  },
  notesSectionText: {
    fontSize: 9,
    color: colors.gray600,
    lineHeight: 1.5,
  },
  termsSection: {
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 6,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    color: colors.gray500,
  },
});

const formatCurrency = (amount: number): string => `$${amount.toFixed(2)}`;

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  const statusColor = statusColors[data.status] || colors.gray500;
  const amountDueColor = data.amountDue > 0 ? colors.danger : colors.success;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.businessSection}>
            <Text style={styles.businessName}>{data.businessName}</Text>
            <View style={styles.businessInfo}>
              {data.businessAddress && <Text>{data.businessAddress}</Text>}
              {data.businessPhone && <Text>{data.businessPhone}</Text>}
              {data.businessEmail && <Text>{data.businessEmail}</Text>}
            </View>
          </View>
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <Text style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              {data.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Bill To / Invoice Details */}
        <View style={styles.infoSection}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Bill To</Text>
            <Text style={styles.infoValueName}>{data.customerName}</Text>
            <View style={styles.infoValueText}>
              {data.customerAddress && <Text>{data.customerAddress}</Text>}
              {data.customerEmail && <Text>{data.customerEmail}</Text>}
              {data.customerPhone && <Text>{data.customerPhone}</Text>}
            </View>
          </View>
          <View style={styles.infoBlockRight}>
            <Text style={styles.infoLabel}>Invoice Details</Text>
            <Text style={styles.infoValueText}>Issue Date: {data.issueDate}</Text>
            <Text style={styles.infoValueText}>Due Date: {data.dueDate}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.tableCellDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellQty]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellAmount]}>Amount</Text>
          </View>
          {data.lineItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellDescription]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.tableCellQty]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, styles.tableCellPrice]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.tableCellAmount]}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatCurrency(data.subtotal)}</Text>
            </View>
            {data.taxAmount && data.taxAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Tax{data.taxRate ? ` (${data.taxRate}%)` : ''}
                </Text>
                <Text style={styles.totalsValue}>{formatCurrency(data.taxAmount)}</Text>
              </View>
            )}
            {data.discountAmount && data.discountAmount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount</Text>
                <Text style={styles.totalsValue}>-{formatCurrency(data.discountAmount)}</Text>
              </View>
            )}
            <View style={styles.totalsRowTotal}>
              <Text style={styles.totalsTotalLabel}>Total</Text>
              <Text style={styles.totalsTotalValue}>{formatCurrency(data.total)}</Text>
            </View>
            {data.amountPaid > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Amount Paid</Text>
                <Text style={styles.totalsValue}>-{formatCurrency(data.amountPaid)}</Text>
              </View>
            )}
            <View style={styles.totalsRowAmountDue}>
              <Text style={styles.amountDueLabel}>Amount Due</Text>
              <Text style={[styles.amountDueValue, { color: amountDueColor }]}>
                {formatCurrency(data.amountDue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesSectionTitle}>Notes</Text>
            <Text style={styles.notesSectionText}>{data.notes}</Text>
          </View>
        )}

        {/* Terms */}
        {data.terms && (
          <View style={styles.termsSection}>
            <Text style={styles.notesSectionTitle}>Terms & Conditions</Text>
            <Text style={styles.notesSectionText}>{data.terms}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
}

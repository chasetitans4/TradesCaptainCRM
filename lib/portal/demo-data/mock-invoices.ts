// Mock invoices for demo mode
// Realistic HVAC/Plumbing service invoices

function getRelativeDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

export interface MockInvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface MockInvoice {
  id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  job_title: string;
  created_at: Date;
  due_date: Date;
  paid_at?: Date;
  subtotal: number;
  tax: number;
  total: number;
  line_items: MockInvoiceLineItem[];
  notes?: string;
  is_demo: true;
}

export const mockInvoices: MockInvoice[] = [
  {
    id: 'demo-inv-1',
    invoice_number: 'INV-2024-0042',
    status: 'sent',
    job_title: 'Water Heater Repair',
    created_at: getRelativeDate(-2),
    due_date: getRelativeDate(28),
    subtotal: 425.00,
    tax: 35.06,
    total: 460.06,
    line_items: [
      {
        description: 'Water Heater Thermostat - Honeywell',
        quantity: 1,
        unit_price: 89.00,
        total: 89.00,
      },
      {
        description: 'Upper Heating Element - 4500W',
        quantity: 1,
        unit_price: 56.00,
        total: 56.00,
      },
      {
        description: 'Labor - Water Heater Repair',
        quantity: 2,
        unit_price: 125.00,
        total: 250.00,
      },
      {
        description: 'Service Call Fee',
        quantity: 1,
        unit_price: 30.00,
        total: 30.00,
      },
    ],
    notes: 'Replaced faulty thermostat and upper heating element. System tested and operating normally.',
    is_demo: true,
  },
  {
    id: 'demo-inv-2',
    invoice_number: 'INV-2024-0038',
    status: 'paid',
    job_title: 'Furnace Tune-Up',
    created_at: getRelativeDate(-14),
    due_date: getRelativeDate(-7),
    paid_at: getRelativeDate(-10),
    subtotal: 275.00,
    tax: 22.69,
    total: 297.69,
    line_items: [
      {
        description: 'Furnace Tune-Up - Standard',
        quantity: 1,
        unit_price: 149.00,
        total: 149.00,
      },
      {
        description: 'Air Filter - MERV 11 (20x25x1)',
        quantity: 2,
        unit_price: 28.00,
        total: 56.00,
      },
      {
        description: 'Humidifier Pad Inspection',
        quantity: 1,
        unit_price: 45.00,
        total: 45.00,
      },
      {
        description: 'Carbon Monoxide Test',
        quantity: 1,
        unit_price: 25.00,
        total: 25.00,
      },
    ],
    notes: 'Annual maintenance completed. Recommend replacing humidifier pad at next service.',
    is_demo: true,
  },
  {
    id: 'demo-inv-3',
    invoice_number: 'INV-2024-0031',
    status: 'paid',
    job_title: 'Garbage Disposal Installation',
    created_at: getRelativeDate(-30),
    due_date: getRelativeDate(-23),
    paid_at: getRelativeDate(-28),
    subtotal: 389.00,
    tax: 32.08,
    total: 421.08,
    line_items: [
      {
        description: 'Labor - Garbage Disposal Installation',
        quantity: 1.5,
        unit_price: 125.00,
        total: 187.50,
      },
      {
        description: 'Disposal Mounting Kit',
        quantity: 1,
        unit_price: 34.00,
        total: 34.00,
      },
      {
        description: 'P-Trap Assembly - PVC',
        quantity: 1,
        unit_price: 22.50,
        total: 22.50,
      },
      {
        description: 'Electrical Cord Kit',
        quantity: 1,
        unit_price: 15.00,
        total: 15.00,
      },
      {
        description: 'Old Unit Removal & Disposal',
        quantity: 1,
        unit_price: 75.00,
        total: 75.00,
      },
      {
        description: 'Service Call Fee',
        quantity: 1,
        unit_price: 55.00,
        total: 55.00,
      },
    ],
    notes: 'Customer provided disposal unit. Old unit removed and disposed properly.',
    is_demo: true,
  },
];

/**
 * Get unpaid demo invoices
 */
export function getUnpaidMockInvoices(): MockInvoice[] {
  return mockInvoices.filter((inv) => inv.status === 'sent' || inv.status === 'viewed' || inv.status === 'overdue');
}

/**
 * Get paid demo invoices
 */
export function getPaidMockInvoices(): MockInvoice[] {
  return mockInvoices.filter((inv) => inv.status === 'paid');
}

/**
 * Calculate total outstanding amount
 */
export function getMockOutstandingTotal(): number {
  return getUnpaidMockInvoices().reduce((sum, inv) => sum + inv.total, 0);
}

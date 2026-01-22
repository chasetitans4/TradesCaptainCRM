// Mock quotes for demo mode
// Realistic HVAC/Plumbing service quotes

function getRelativeDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

export interface MockQuoteLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface MockQuoteOption {
  id: string;
  name: string;
  description: string;
  price_difference: number;
  recommended?: boolean;
}

export interface MockQuote {
  id: string;
  quote_number: string;
  status: 'draft' | 'pending' | 'accepted' | 'declined' | 'expired';
  title: string;
  description: string;
  created_at: Date;
  valid_until: Date;
  accepted_at?: Date;
  subtotal: number;
  tax: number;
  total: number;
  line_items: MockQuoteLineItem[];
  options?: MockQuoteOption[];
  notes?: string;
  is_demo: true;
}

export const mockQuotes: MockQuote[] = [
  {
    id: 'demo-quote-1',
    quote_number: 'QT-2024-0089',
    status: 'pending',
    title: 'AC Replacement Quote',
    description: 'Full replacement of existing Carrier central air conditioning unit with new high-efficiency model. Includes removal of old unit, installation, and disposal.',
    created_at: getRelativeDate(-5),
    valid_until: getRelativeDate(25),
    subtotal: 3550.00,
    tax: 292.88,
    total: 3842.88,
    line_items: [
      {
        description: 'Carrier 24ACC636A003 - 3 Ton AC Unit',
        quantity: 1,
        unit_price: 2450.00,
        total: 2450.00,
      },
      {
        description: 'Labor - AC System Installation',
        quantity: 8,
        unit_price: 95.00,
        total: 760.00,
      },
      {
        description: 'Refrigerant Line Set - 25ft',
        quantity: 1,
        unit_price: 185.00,
        total: 185.00,
      },
      {
        description: 'Concrete Pad',
        quantity: 1,
        unit_price: 75.00,
        total: 75.00,
      },
      {
        description: 'Old Unit Removal & Disposal',
        quantity: 1,
        unit_price: 150.00,
        total: 150.00,
      },
      {
        description: 'Permit & Inspection Fees',
        quantity: 1,
        unit_price: 125.00,
        total: 125.00,
      },
    ],
    options: [
      {
        id: 'opt-1',
        name: 'Upgrade to 16 SEER',
        description: 'Higher efficiency model with lower operating costs',
        price_difference: 450.00,
        recommended: true,
      },
      {
        id: 'opt-2',
        name: 'Smart Thermostat Add-on',
        description: 'Ecobee Smart Thermostat with installation',
        price_difference: 299.00,
      },
      {
        id: 'opt-3',
        name: '10-Year Extended Warranty',
        description: 'Extended parts and labor warranty',
        price_difference: 395.00,
      },
    ],
    notes: 'Quote valid for 30 days. Price includes all labor, materials, permits, and disposal. Financing options available.',
    is_demo: true,
  },
  {
    id: 'demo-quote-2',
    quote_number: 'QT-2024-0076',
    status: 'accepted',
    title: 'Water Heater Parts & Repair',
    description: 'Replacement parts and labor for water heater repair including thermostat and heating element.',
    created_at: getRelativeDate(-10),
    valid_until: getRelativeDate(-3),
    accepted_at: getRelativeDate(-8),
    subtotal: 392.50,
    tax: 32.38,
    total: 424.88,
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
        description: 'Anode Rod - Magnesium',
        quantity: 1,
        unit_price: 42.50,
        total: 42.50,
      },
      {
        description: 'Labor - Water Heater Repair',
        quantity: 1.5,
        unit_price: 125.00,
        total: 187.50,
      },
      {
        description: 'Diagnostic Fee',
        quantity: 1,
        unit_price: 0,
        total: 0,
      },
    ],
    notes: 'Diagnostic fee waived with repair. Parts include manufacturer warranty.',
    is_demo: true,
  },
];

/**
 * Get pending quotes awaiting customer decision
 */
export function getPendingMockQuotes(): MockQuote[] {
  return mockQuotes.filter((quote) => quote.status === 'pending');
}

/**
 * Get accepted quotes
 */
export function getAcceptedMockQuotes(): MockQuote[] {
  return mockQuotes.filter((quote) => quote.status === 'accepted');
}

/**
 * Get total value of pending quotes
 */
export function getMockPendingQuotesTotal(): number {
  return getPendingMockQuotes().reduce((sum, quote) => sum + quote.total, 0);
}

'use client';

import { useState, useEffect } from 'react';
import { isDemoMode } from './index';
import { mockAppointments, MockAppointment } from './mock-appointments';
import { mockInvoices, MockInvoice } from './mock-invoices';
import { mockEquipment, MockEquipment } from './mock-equipment';
import { mockMessages, MockMessage } from './mock-messages';
import { mockDocuments, MockDocument } from './mock-documents';
import { mockQuotes, MockQuote } from './mock-quotes';

/**
 * Hook to check if demo mode is active
 * Returns false during SSR to avoid hydration mismatch
 */
export function useDemoMode(): boolean {
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    setDemoMode(isDemoMode());

    // Listen for storage changes (in case demo mode is toggled in another tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'portal-demo-mode') {
        setDemoMode(e.newValue === 'true');
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return demoMode;
}

/**
 * Convert mock appointment to the format expected by the appointments page
 */
function convertMockAppointment(apt: MockAppointment) {
  return {
    id: apt.id,
    title: apt.title,
    description: apt.description,
    scheduled_date: apt.scheduled_start.toISOString().split('T')[0],
    scheduled_time: apt.scheduled_start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    estimated_duration: Math.round(
      (apt.scheduled_end.getTime() - apt.scheduled_start.getTime()) / (1000 * 60)
    ),
    status: apt.status,
    address: apt.address,
    assigned_user: {
      id: `demo-tech-${apt.technician_name.toLowerCase().replace(' ', '-')}`,
      name: apt.technician_name,
      phone: apt.technician_phone,
    },
    is_demo: true as const,
  };
}

/**
 * Get demo appointments in the format expected by the appointments page
 */
export function getDemoAppointments() {
  const upcoming = mockAppointments
    .filter((apt) => ['scheduled', 'confirmed', 'on_the_way', 'in_progress'].includes(apt.status))
    .map(convertMockAppointment);

  const history = mockAppointments
    .filter((apt) => ['completed', 'cancelled'].includes(apt.status))
    .map(convertMockAppointment);

  return { upcoming, history };
}

/**
 * Convert mock invoice to the format expected by the invoices page
 */
function convertMockInvoice(inv: MockInvoice) {
  return {
    id: inv.id,
    invoice_number: inv.invoice_number,
    status: inv.status,
    job_title: inv.job_title,
    job: { title: inv.job_title },
    created_at: inv.created_at.toISOString(),
    due_date: inv.due_date.toISOString(),
    paid_at: inv.paid_at?.toISOString(),
    subtotal: inv.subtotal,
    tax: inv.tax,
    total: inv.total,
    line_items: inv.line_items,
    notes: inv.notes,
    is_demo: true as const,
  };
}

/**
 * Get demo invoices in the format expected by the invoices page
 */
export function getDemoInvoices() {
  return mockInvoices.map(convertMockInvoice);
}

/**
 * Convert mock equipment to the format expected by the equipment page
 */
function convertMockEquipment(eq: MockEquipment) {
  return {
    id: eq.id,
    name: eq.name,
    type: eq.type,
    brand: eq.brand,
    model: eq.model,
    serial_number: eq.serial_number,
    install_date: eq.install_date.toISOString(),
    warranty_expiry: eq.warranty_expiry.toISOString(),
    condition: eq.condition,
    location: eq.location,
    notes: eq.notes,
    service_history: eq.service_history.map((svc) => ({
      id: svc.id,
      date: svc.date.toISOString(),
      service_type: svc.service_type,
      description: svc.description,
      technician: svc.technician,
      cost: svc.cost,
    })),
    next_service_date: eq.next_service_date?.toISOString(),
    is_demo: true as const,
  };
}

/**
 * Get demo equipment in the format expected by the equipment page
 */
export function getDemoEquipment() {
  return mockEquipment.map(convertMockEquipment);
}

/**
 * Convert mock message to the format expected by the messages page
 */
function convertMockMessage(msg: MockMessage) {
  return {
    id: msg.id,
    sender: msg.sender,
    content: msg.content,
    timestamp: msg.timestamp.toISOString(),
    read: msg.read,
    is_demo: true as const,
  };
}

/**
 * Get demo messages in the format expected by the messages page
 */
export function getDemoMessages() {
  return mockMessages.map(convertMockMessage);
}

/**
 * Convert mock document to the format expected by the documents page
 */
function convertMockDocument(doc: MockDocument) {
  return {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    file_type: doc.file_type,
    file_size: doc.file_size,
    description: doc.description,
    uploaded_at: doc.uploaded_at.toISOString(),
    equipment_id: doc.equipment_id,
    job_id: doc.job_id,
    is_demo: true as const,
  };
}

/**
 * Get demo documents in the format expected by the documents page
 */
export function getDemoDocuments() {
  return mockDocuments.map(convertMockDocument);
}

/**
 * Convert mock quote to the format expected by the quotes page
 */
function convertMockQuote(quote: MockQuote) {
  return {
    id: quote.id,
    quote_number: quote.quote_number,
    status: quote.status,
    title: quote.title,
    description: quote.description,
    created_at: quote.created_at.toISOString(),
    valid_until: quote.valid_until.toISOString(),
    accepted_at: quote.accepted_at?.toISOString(),
    subtotal: quote.subtotal,
    tax: quote.tax,
    total: quote.total,
    line_items: quote.line_items,
    options: quote.options,
    notes: quote.notes,
    is_demo: true as const,
  };
}

/**
 * Get demo quotes in the format expected by the quotes page
 */
export function getDemoQuotes() {
  return mockQuotes.map(convertMockQuote);
}

/**
 * Merge demo data with real data
 * Demo items are added at the beginning of the list
 */
export function mergeWithDemoData<T>(realData: T[], demoData: T[], demoMode: boolean): T[] {
  if (!demoMode) return realData;
  return [...demoData, ...realData];
}

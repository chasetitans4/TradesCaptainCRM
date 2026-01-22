// Mock appointments for demo mode
// Realistic HVAC/Plumbing service appointments

// Helper to get relative dates
function getRelativeDate(daysFromNow: number, hour: number = 9, minute: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export interface MockAppointment {
  id: string;
  title: string;
  description: string;
  status: 'scheduled' | 'confirmed' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_start: Date;
  scheduled_end: Date;
  technician_name: string;
  technician_phone: string;
  service_type: string;
  address: string;
  notes?: string;
  is_demo: true;
}

export const mockAppointments: MockAppointment[] = [
  {
    id: 'demo-apt-1',
    title: 'Annual AC Maintenance',
    description: 'Routine annual maintenance check for central air conditioning system. Includes filter replacement, coil cleaning, and refrigerant level check.',
    status: 'scheduled',
    scheduled_start: getRelativeDate(3, 9, 0),
    scheduled_end: getRelativeDate(3, 11, 0),
    technician_name: 'Mike Thompson',
    technician_phone: '(555) 123-4567',
    service_type: 'Maintenance',
    address: '1234 Oak Street, Springfield, IL 62701',
    notes: 'Customer prefers morning appointments. Gate code: 1234',
    is_demo: true,
  },
  {
    id: 'demo-apt-2',
    title: 'Water Heater Repair',
    description: 'Customer reported inconsistent hot water temperature. Possible thermostat or heating element issue.',
    status: 'on_the_way',
    scheduled_start: getRelativeDate(0, 14, 0),
    scheduled_end: getRelativeDate(0, 16, 0),
    technician_name: 'James Rodriguez',
    technician_phone: '(555) 234-5678',
    service_type: 'Repair',
    address: '1234 Oak Street, Springfield, IL 62701',
    notes: 'Water heater is in basement. Customer will be home.',
    is_demo: true,
  },
  {
    id: 'demo-apt-3',
    title: 'Furnace Tune-Up',
    description: 'Pre-season furnace inspection and tune-up. Checked heat exchanger, cleaned burners, replaced filter.',
    status: 'completed',
    scheduled_start: getRelativeDate(-14, 10, 0),
    scheduled_end: getRelativeDate(-14, 12, 0),
    technician_name: 'Mike Thompson',
    technician_phone: '(555) 123-4567',
    service_type: 'Maintenance',
    address: '1234 Oak Street, Springfield, IL 62701',
    notes: 'Completed. Recommended replacing humidifier pad next visit.',
    is_demo: true,
  },
  {
    id: 'demo-apt-4',
    title: 'Garbage Disposal Installation',
    description: 'Installed new InSinkErator Evolution Excel garbage disposal. Removed old unit and connected new disposal to existing plumbing.',
    status: 'completed',
    scheduled_start: getRelativeDate(-30, 13, 0),
    scheduled_end: getRelativeDate(-30, 15, 0),
    technician_name: 'James Rodriguez',
    technician_phone: '(555) 234-5678',
    service_type: 'Installation',
    address: '1234 Oak Street, Springfield, IL 62701',
    notes: 'Customer provided new unit. Installation completed successfully.',
    is_demo: true,
  },
];

/**
 * Get upcoming demo appointments (scheduled or on_the_way)
 */
export function getUpcomingMockAppointments(): MockAppointment[] {
  return mockAppointments.filter(
    (apt) => apt.status === 'scheduled' || apt.status === 'confirmed' || apt.status === 'on_the_way'
  );
}

/**
 * Get past demo appointments (completed or cancelled)
 */
export function getPastMockAppointments(): MockAppointment[] {
  return mockAppointments.filter(
    (apt) => apt.status === 'completed' || apt.status === 'cancelled'
  );
}

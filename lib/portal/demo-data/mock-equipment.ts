// Mock equipment for demo mode
// Realistic HVAC/Plumbing equipment with service history

function getRelativeDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

export interface MockServiceRecord {
  id: string;
  date: Date;
  service_type: string;
  description: string;
  technician: string;
  cost?: number;
}

export interface MockEquipment {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  install_date: Date;
  warranty_expiry: Date;
  condition: 'excellent' | 'good' | 'fair' | 'needs_attention' | 'critical';
  location: string;
  notes?: string;
  service_history: MockServiceRecord[];
  next_service_date?: Date;
  is_demo: true;
}

export const mockEquipment: MockEquipment[] = [
  {
    id: 'demo-equip-1',
    name: 'Central Air Conditioning',
    type: 'HVAC - Cooling',
    brand: 'Carrier',
    model: '24ACC636A003',
    serial_number: 'CAR-2022-4829571',
    install_date: new Date('2022-05-15'),
    warranty_expiry: new Date('2027-05-15'),
    condition: 'good',
    location: 'Backyard - West Side',
    notes: 'Replaced compressor under warranty in 2023. Running efficiently.',
    service_history: [
      {
        id: 'demo-srv-1',
        date: getRelativeDate(3),
        service_type: 'Scheduled Maintenance',
        description: 'Annual AC maintenance - Upcoming',
        technician: 'Mike Thompson',
      },
      {
        id: 'demo-srv-2',
        date: new Date('2024-05-10'),
        service_type: 'Annual Maintenance',
        description: 'Cleaned condenser coils, checked refrigerant levels, replaced filter',
        technician: 'Mike Thompson',
        cost: 179.00,
      },
      {
        id: 'demo-srv-3',
        date: new Date('2023-08-22'),
        service_type: 'Warranty Repair',
        description: 'Replaced failed compressor under manufacturer warranty',
        technician: 'James Rodriguez',
        cost: 0,
      },
      {
        id: 'demo-srv-4',
        date: new Date('2023-05-08'),
        service_type: 'Annual Maintenance',
        description: 'Standard tune-up, all systems normal',
        technician: 'Mike Thompson',
        cost: 169.00,
      },
    ],
    next_service_date: getRelativeDate(3),
    is_demo: true,
  },
  {
    id: 'demo-equip-2',
    name: 'Gas Furnace',
    type: 'HVAC - Heating',
    brand: 'Trane',
    model: 'S9X2B080U4PSB',
    serial_number: 'TRN-2020-8834521',
    install_date: new Date('2020-10-20'),
    warranty_expiry: new Date('2030-10-20'),
    condition: 'excellent',
    location: 'Basement - Utility Room',
    notes: 'High-efficiency two-stage furnace. AFUE 96%.',
    service_history: [
      {
        id: 'demo-srv-5',
        date: getRelativeDate(-14),
        service_type: 'Annual Tune-Up',
        description: 'Pre-season inspection, cleaned burners, checked heat exchanger',
        technician: 'Mike Thompson',
        cost: 149.00,
      },
      {
        id: 'demo-srv-6',
        date: new Date('2023-10-15'),
        service_type: 'Annual Tune-Up',
        description: 'All components tested, replaced ignitor as preventive measure',
        technician: 'Mike Thompson',
        cost: 195.00,
      },
      {
        id: 'demo-srv-7',
        date: new Date('2022-10-12'),
        service_type: 'Annual Tune-Up',
        description: 'Standard maintenance, system performing excellently',
        technician: 'James Rodriguez',
        cost: 139.00,
      },
    ],
    next_service_date: getRelativeDate(300),
    is_demo: true,
  },
  {
    id: 'demo-equip-3',
    name: 'Water Heater',
    type: 'Plumbing',
    brand: 'Rheem',
    model: 'PROG50-38N RH67 PV',
    serial_number: 'RHM-2016-3392847',
    install_date: new Date('2016-03-10'),
    warranty_expiry: new Date('2022-03-10'),
    condition: 'needs_attention',
    location: 'Basement - Near Furnace',
    notes: 'Warranty expired. Consider replacement within 1-2 years. Shows signs of sediment buildup.',
    service_history: [
      {
        id: 'demo-srv-8',
        date: getRelativeDate(0),
        service_type: 'Repair',
        description: 'Replaced thermostat and upper heating element',
        technician: 'James Rodriguez',
        cost: 460.06,
      },
      {
        id: 'demo-srv-9',
        date: new Date('2023-03-15'),
        service_type: 'Maintenance',
        description: 'Flushed tank, replaced anode rod',
        technician: 'James Rodriguez',
        cost: 225.00,
      },
      {
        id: 'demo-srv-10',
        date: new Date('2021-02-08'),
        service_type: 'Maintenance',
        description: 'Annual flush and inspection',
        technician: 'Mike Thompson',
        cost: 125.00,
      },
    ],
    next_service_date: getRelativeDate(180),
    is_demo: true,
  },
];

/**
 * Get equipment needing attention
 */
export function getEquipmentNeedingAttention(): MockEquipment[] {
  return mockEquipment.filter(
    (eq) => eq.condition === 'needs_attention' || eq.condition === 'critical'
  );
}

/**
 * Get equipment with upcoming service
 */
export function getEquipmentWithUpcomingService(): MockEquipment[] {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return mockEquipment.filter(
    (eq) => eq.next_service_date && eq.next_service_date <= thirtyDaysFromNow
  );
}

/**
 * Get equipment with expired warranty
 */
export function getEquipmentWithExpiredWarranty(): MockEquipment[] {
  const now = new Date();
  return mockEquipment.filter((eq) => eq.warranty_expiry < now);
}

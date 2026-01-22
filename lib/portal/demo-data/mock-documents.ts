// Mock documents for demo mode
// Realistic HVAC/Plumbing service documents

export interface MockDocument {
  id: string;
  name: string;
  type: 'warranty' | 'report' | 'agreement' | 'manual' | 'invoice' | 'quote';
  file_type: 'pdf' | 'doc' | 'jpg' | 'png';
  file_size: number; // in bytes
  description: string;
  uploaded_at: Date;
  equipment_id?: string;
  job_id?: string;
  is_demo: true;
}

export const mockDocuments: MockDocument[] = [
  {
    id: 'demo-doc-1',
    name: 'Carrier AC Warranty Certificate',
    type: 'warranty',
    file_type: 'pdf',
    file_size: 245780, // ~240KB
    description: 'Manufacturer warranty certificate for Carrier 24ACC636A003 central air conditioning unit. Valid until May 2027.',
    uploaded_at: new Date('2022-05-20'),
    equipment_id: 'demo-equip-1',
    is_demo: true,
  },
  {
    id: 'demo-doc-2',
    name: 'Trane Furnace Installation Report',
    type: 'report',
    file_type: 'pdf',
    file_size: 892340, // ~871KB
    description: 'Complete installation report including equipment specifications, ductwork modifications, and initial performance testing results.',
    uploaded_at: new Date('2020-10-25'),
    equipment_id: 'demo-equip-2',
    is_demo: true,
  },
  {
    id: 'demo-doc-3',
    name: 'Annual Maintenance Agreement 2024',
    type: 'agreement',
    file_type: 'pdf',
    file_size: 156220, // ~152KB
    description: 'Service agreement covering annual maintenance for HVAC systems. Includes priority scheduling and 15% parts discount.',
    uploaded_at: new Date('2024-01-15'),
    is_demo: true,
  },
];

/**
 * Get documents by type
 */
export function getMockDocumentsByType(type: MockDocument['type']): MockDocument[] {
  return mockDocuments.filter((doc) => doc.type === type);
}

/**
 * Get documents for a specific equipment
 */
export function getMockDocumentsForEquipment(equipmentId: string): MockDocument[] {
  return mockDocuments.filter((doc) => doc.equipment_id === equipmentId);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get warranty documents
 */
export function getMockWarrantyDocuments(): MockDocument[] {
  return mockDocuments.filter((doc) => doc.type === 'warranty');
}

/**
 * Get service agreements
 */
export function getMockAgreementDocuments(): MockDocument[] {
  return mockDocuments.filter((doc) => doc.type === 'agreement');
}

export interface FollowUp {
  id: string;
  entity_type: 'lead' | 'customer' | 'job' | 'quote' | 'invoice';
  entity_id: string;
  follow_up_type: 'call' | 'email' | 'sms' | 'visit' | 'other';
  scheduled_date: string;
  scheduled_time?: string;
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'cancelled' | 'rescheduled';
  completed_at?: string;
  outcome?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  // Joined data
  entity?: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  assignee?: {
    full_name: string;
  };
}

export interface FollowUpFormData {
  entity_type: 'lead' | 'customer' | 'job' | 'quote' | 'invoice';
  entity_id: string;
  follow_up_type: 'call' | 'email' | 'sms' | 'visit' | 'other';
  scheduled_date: string;
  scheduled_time: string;
  notes: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string;
}

export const INITIAL_FORM_DATA: FollowUpFormData = {
  entity_type: 'lead',
  entity_id: '',
  follow_up_type: 'call',
  scheduled_date: '',
  scheduled_time: '09:00',
  notes: '',
  priority: 'medium',
  assigned_to: '',
};

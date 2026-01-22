// =====================================================
// SERVICE ONBOARDING CHECKLISTS (SERVER-SIDE)
// Database operations for checklists
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { 
  ClientChecklistStatus, 
  getChecklistForPlan, 
  calculateChecklistProgress,
  initializeClientChecklist // Re-export for API use
} from './checklist-definitions';
import { PlanTrack } from '@/lib/pricing/plans';

// Re-export definitions for server-side consumers (API routes)
export * from './checklist-definitions';

/**
 * Get checklist status for a client
 */
export async function getClientChecklistStatus(
  clientId: string
): Promise<ClientChecklistStatus | null> {
  const supabase = createAdminClient();
  
  // Fetch the most recently updated checklist for this client
  const { data, error } = await supabase
    .from('service_onboarding_progress')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    client_id: data.client_id,
    checklist_type: data.checklist_type,
    items: data.items,
    started_at: data.started_at,
    completed_at: data.completed_at,
    overall_progress: data.overall_progress
  };
}

/**
 * Save checklist status for a client
 */
export async function saveClientChecklistStatus(
  status: ClientChecklistStatus
): Promise<ClientChecklistStatus> {
  // Calculate progress
  const completedItems = status.items.filter(item => item.completed);
  const checklist = getChecklistForPlan(status.checklist_type as PlanTrack);
  status.overall_progress = calculateChecklistProgress(
    checklist,
    completedItems.map(i => i.item_id)
  );

  // Check if completed
  if (status.overall_progress === 100 && !status.completed_at) {
    status.completed_at = new Date().toISOString();
  }

  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('service_onboarding_progress')
    .upsert({
      client_id: status.client_id,
      checklist_type: status.checklist_type,
      items: status.items,
      started_at: status.started_at,
      completed_at: status.completed_at,
      overall_progress: status.overall_progress,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'client_id, checklist_type'
    });

  if (error) {
    console.error('Error saving checklist status:', error);
    throw error;
  }

  return status;
}

/**
 * Update a single item in the checklist
 */
export async function updateChecklistItem(
  clientId: string,
  itemId: string,
  completed: boolean,
  completedBy?: string,
  notes?: string
): Promise<ClientChecklistStatus | null> {
  const status = await getClientChecklistStatus(clientId);
  if (!status) return null;

  const itemIndex = status.items.findIndex(i => i.item_id === itemId);
  if (itemIndex === -1) return null;

  status.items[itemIndex] = {
    ...status.items[itemIndex],
    completed,
    completed_at: completed ? new Date().toISOString() : undefined,
    completed_by: completedBy,
    notes,
  };

  return saveClientChecklistStatus(status);
}

/**
 * Update a sub-item in the checklist
 */
export async function updateChecklistSubItem(
  clientId: string,
  itemId: string,
  subItemId: string,
  completed: boolean
): Promise<ClientChecklistStatus | null> {
  const status = await getClientChecklistStatus(clientId);
  if (!status) return null;

  const itemIndex = status.items.findIndex(i => i.item_id === itemId);
  if (itemIndex === -1) return null;

  const subItems = status.items[itemIndex].sub_items;
  if (!subItems) return null;

  const subItemIndex = subItems.findIndex(s => s.sub_item_id === subItemId);
  if (subItemIndex === -1) return null;

  subItems[subItemIndex] = {
    ...subItems[subItemIndex],
    completed,
    completed_at: completed ? new Date().toISOString() : undefined,
  };

  // Auto-complete parent if all required sub-items are done
  const checklist = getChecklistForPlan(status.checklist_type as PlanTrack);
  const checklistItem = checklist.find(c => c.id === itemId);
  if (checklistItem?.subItems) {
    const requiredSubItems = checklistItem.subItems.filter(s => s.required);
    const completedSubItems = subItems.filter(
      s => s.completed && requiredSubItems.some(r => r.id === s.sub_item_id)
    );

    if (completedSubItems.length === requiredSubItems.length) {
      status.items[itemIndex].completed = true;
      status.items[itemIndex].completed_at = new Date().toISOString();
    }
  }

  return saveClientChecklistStatus(status);
}

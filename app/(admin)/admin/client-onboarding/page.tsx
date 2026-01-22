'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AdminPageHeader } from '@/components/admin/page-header';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Globe,
  Building2,
  Layers,
  Clock,
  User,
  FileText,
  ExternalLink,
  Phone,
  PlayCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  type ChecklistItem,
  type ClientChecklistStatus,
} from '@/lib/onboarding/checklist-definitions';
import { type PlanTrack, type LegacyPlanTrack } from '@/lib/pricing/plans';
import { toast } from 'sonner';

// Type for the API response
interface ClientOnboarding {
  id: string;
  client_id: string;
  client_name?: string;
  name?: string;
  email?: string;
  plan_type?: string;
  plan_track?: PlanTrack | LegacyPlanTrack;
  plan_name?: string;
  progress?: number;
  status: string;
  started_at: string;
  tasks: any[];
}

const TRACK_ICONS: Record<PlanTrack | LegacyPlanTrack, React.ElementType> = {
  // Active tracks
  blue: Building2,
  web: Globe,
  seo_aeo: Search,
  // Legacy tracks
  leads_captain: Phone,
  seo: Search,
  silver: Layers,
  gold: Layers,
};

const TRACK_COLORS: Record<PlanTrack | LegacyPlanTrack, string> = {
  // Active tracks
  blue: 'text-blue-600 bg-blue-50',
  web: 'text-purple-600 bg-purple-50',
  seo_aeo: 'text-green-600 bg-green-50',
  // Legacy tracks
  leads_captain: 'text-cyan-600 bg-cyan-50',
  seo: 'text-green-600 bg-green-50',
  silver: 'text-gray-600 bg-gray-50',
  gold: 'text-yellow-600 bg-yellow-50',
};

export default function ClientOnboardingPage() {
  const { isAuthorized, loading: authLoading } = useAgentOrHigher();
  const [clients, setClients] = useState<ClientOnboarding[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientOnboarding | null>(null);
  
  // Checklist state
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistStatus, setChecklistStatus] = useState<ClientChecklistStatus | null>(null);
  
  // UI state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch clients on mount
  useEffect(() => {
    if (isAuthorized) {
      fetchClients();
    }
  }, [isAuthorized]);

  // Fetch checklist when client selected
  useEffect(() => {
    if (selectedClient) {
      loadChecklist(selectedClient);
    } else {
      setChecklistItems([]);
      setChecklistStatus(null);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding/in-progress');
      if (!res.ok) throw new Error('Failed to fetch clients');
      const data = await res.json();
      setClients(data.onboardings || []);
      
      // Select first client by default if none selected
      if (data.onboardings?.length > 0 && !selectedClient) {
        setSelectedClient(data.onboardings[0]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadChecklist = async (client: ClientOnboarding) => {
    try {
      setLoading(true);
      // Try to fetch existing status
      const res = await fetch(`/api/onboarding/checklists?client_id=${client.client_id}`);
      
      if (res.ok) {
        const data = await res.json();
        setChecklistStatus(data.status);
        setChecklistItems(data.checklist?.items || []);
      } else if (res.status === 404) {
        // Not initialized yet, fetch template
        setChecklistStatus(null);
        // Extract track from plan_type (e.g., "gold_pro" -> "gold")
        const track = client.plan_type?.split('_')[0] || 'seo'; 
        const templateRes = await fetch(`/api/onboarding/checklists?track=${track}`);
        if (templateRes.ok) {
          const data = await templateRes.json();
          setChecklistItems(data.checklist?.items || []);
        }
      } else {
        throw new Error('Failed to fetch checklist');
      }
    } catch (error) {
      console.error('Error loading checklist:', error);
      toast.error('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  const initializeChecklist = async () => {
    if (!selectedClient) return;
    
    try {
      setInitializing(true);
      const track = selectedClient.plan_type?.split('_')[0] || 'seo';
      const tier = selectedClient.plan_type?.split('_')[1] || 'starter';
      
      const res = await fetch('/api/onboarding/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient.client_id,
          track,
          tier,
          has_gbp_addon: false, // Default, needs to be derived from subscription if possible
        }),
      });

      if (!res.ok) throw new Error('Failed to initialize checklist');
      
      const data = await res.json();
      setChecklistStatus(data.status);
      toast.success('Checklist initialized');
      
      // Reload to ensure we have the correct template merged
      loadChecklist(selectedClient);
    } catch (error) {
      console.error('Error initializing checklist:', error);
      toast.error('Failed to start onboarding');
    } finally {
      setInitializing(false);
    }
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const updateItem = async (itemId: string, completed: boolean, subItemId?: string) => {
    if (!selectedClient || !checklistStatus) return;

    // Optimistic update
    const previousStatus = { ...checklistStatus };
    const newStatus = JSON.parse(JSON.stringify(checklistStatus));
    
    // Find or create item entry
    let itemEntry = newStatus.items.find((i: any) => i.item_id === itemId);
    if (!itemEntry) {
      itemEntry = { item_id: itemId, completed: false, sub_items: [] };
      newStatus.items.push(itemEntry);
    }

    if (subItemId) {
      let subEntry = itemEntry.sub_items?.find((s: any) => s.sub_item_id === subItemId);
      if (!subEntry) {
        if (!itemEntry.sub_items) itemEntry.sub_items = [];
        subEntry = { sub_item_id: subItemId, completed: false };
        itemEntry.sub_items.push(subEntry);
      }
      subEntry.completed = completed;
      
      // Check if all required sub-items are done to auto-complete parent
      const defItem = checklistItems.find(i => i.id === itemId);
      if (defItem?.subItems) {
        const requiredSubs = defItem.subItems.filter(s => s.required);
        const allDone = requiredSubs.every(reqSub => {
          const s = itemEntry.sub_items.find((x: any) => x.sub_item_id === reqSub.id);
          return s?.completed;
        });
        if (allDone) itemEntry.completed = true;
      }
    } else {
      itemEntry.completed = completed;
    }

    setChecklistStatus(newStatus);

    try {
      const res = await fetch('/api/onboarding/checklists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient.client_id,
          item_id: itemId,
          sub_item_id: subItemId,
          completed,
        }),
      });

      if (!res.ok) throw new Error('Failed to update item');
      
      // Update with server response to ensure sync
      const data = await res.json();
      setChecklistStatus(data.status);
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
      setChecklistStatus(previousStatus); // Revert
    }
  };

  const isItemCompleted = (itemId: string) => {
    return checklistStatus?.items.find(i => i.item_id === itemId)?.completed || false;
  };

  const isSubItemCompleted = (itemId: string, subItemId: string) => {
    const item = checklistStatus?.items.find(i => i.item_id === itemId);
    return item?.sub_items?.find(s => s.sub_item_id === subItemId)?.completed || false;
  };

  const calculateProgress = () => {
    if (!checklistStatus || !checklistItems.length) return 0;
    
    // Use the server-calculated progress if available and accurate, 
    // but calculating locally allows for immediate feedback on optimistic updates
    const requiredItems = checklistItems.filter(item => item.required);
    if (requiredItems.length === 0) return 100;
    
    const completedCount = requiredItems.filter(item => isItemCompleted(item.id)).length;
    return Math.round((completedCount / requiredItems.length) * 100);
  };

  const filteredClients = clients.filter(client =>
    (client.client_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedChecklist = checklistItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Client Onboarding"
        description="Track and manage service delivery checklists for new clients."
      />

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
        {/* Client List Sidebar */}
        <div className="w-full lg:w-80 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filteredClients.map(client => {
              const track = client.plan_track || 'seo';
              const TrackIcon = TRACK_ICONS[track] || Search;
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-muted/50 transition-colors',
                    selectedClient?.id === client.id && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      TRACK_COLORS[track] || 'bg-muted text-muted-foreground'
                    )}>
                      <TrackIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{client.name || client.client_name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-medium text-foreground/80">{client.plan_name}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">{client.progress || 0}%</span>
                      </div>
                      <Progress value={client.progress || 0} className="mt-2 h-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Checklist Content */}
        <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          {selectedClient ? (
            loading && !checklistItems.length ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 text-primary mb-3 animate-spin" />
                <p className="text-muted-foreground">Loading checklist...</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Client Header */}
                <div className="p-6 border-b border-border bg-muted/20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-14 h-14 rounded-xl flex items-center justify-center',
                        TRACK_COLORS[(selectedClient.plan_type?.split('_')[0] as PlanTrack) || 'seo']
                      )}>
                        {(() => {
                          const track = (selectedClient.plan_type?.split('_')[0] as PlanTrack) || 'seo';
                          const TrackIcon = TRACK_ICONS[track] || Search;
                          return <TrackIcon className="h-7 w-7" />;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{selectedClient.client_name}</h2>
                        <p className="text-sm text-muted-foreground">{selectedClient.client_id}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="px-2 py-1 bg-background border border-border rounded text-xs font-medium text-foreground">
                            {selectedClient.plan_type?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Started {new Date(selectedClient.started_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {checklistStatus ? (
                        <>
                          <div className="text-3xl font-bold text-foreground">{calculateProgress()}%</div>
                          <p className="text-sm text-muted-foreground">Complete</p>
                          <Progress value={calculateProgress()} className="mt-2 w-32" />
                        </>
                      ) : (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-2">Not Started</p>
                          <Button 
                            onClick={initializeChecklist} 
                            disabled={initializing}
                            size="sm"
                          >
                            {initializing ? (
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <PlayCircle className="h-4 w-4 mr-2" />
                            )}
                            Start Onboarding
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {Object.entries(groupedChecklist).map(([category, items]) => (
                    <div key={category} className="border border-border rounded-lg overflow-hidden bg-background">
                      <div className="px-4 py-3 bg-muted/50 border-b border-border">
                        <h3 className="font-semibold text-foreground">{category}</h3>
                      </div>
                      <div className="divide-y divide-border">
                        {items.map(item => {
                          const isCompleted = isItemCompleted(item.id);
                          const isExpanded = expandedItems.has(item.id);
                          const hasSubItems = item.subItems && item.subItems.length > 0;

                          return (
                            <div key={item.id} className="bg-card">
                              <div
                                className={cn(
                                  'p-4 flex items-start gap-3 cursor-pointer hover:bg-muted/50',
                                  isCompleted && 'bg-green-500/5'
                                )}
                                onClick={() => hasSubItems ? toggleExpanded(item.id) : updateItem(item.id, !isCompleted)}
                              >
                                {/* Checkbox */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateItem(item.id, !isCompleted);
                                  }}
                                  className="mt-0.5"
                                  disabled={!checklistStatus}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <Circle className={cn("h-5 w-5", !checklistStatus ? "text-muted" : "text-muted-foreground")} />
                                  )}
                                </button>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className={cn(
                                      'font-medium',
                                      isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                                    )}>
                                      {item.title}
                                    </h4>
                                    {item.required && (
                                      <span className="text-xs text-red-500">*</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                                </div>

                                {/* Expand Arrow */}
                                {hasSubItems && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpanded(item.id);
                                    }}
                                    className="p-1 hover:bg-muted rounded"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Sub-items */}
                              {hasSubItems && isExpanded && (
                                <div className="bg-muted/30 border-t border-border px-4 py-2">
                                  {item.subItems?.map(subItem => {
                                    const isSubCompleted = isSubItemCompleted(item.id, subItem.id);

                                    return (
                                      <div
                                        key={subItem.id}
                                        className="flex items-center gap-3 py-2 pl-8 cursor-pointer hover:bg-muted/50 rounded"
                                        onClick={() => updateItem(item.id, !isSubCompleted, subItem.id)}
                                      >
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateItem(item.id, !isSubCompleted, subItem.id);
                                          }}
                                          disabled={!checklistStatus}
                                        >
                                          {isSubCompleted ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                          ) : (
                                            <Circle className="h-4 w-4 text-muted-foreground" />
                                          )}
                                        </button>
                                        <div className="flex-1">
                                          <p className={cn(
                                            'text-sm',
                                            isSubCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                                          )}>
                                            {subItem.title}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Select a Client</h3>
              <p className="text-muted-foreground max-w-sm mt-2">
                Select a client from the list to view and manage their onboarding checklist.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

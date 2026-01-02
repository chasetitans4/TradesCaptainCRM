'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Globe,
  Building2,
  Palette,
  Layers,
  Clock,
  User,
  FileText,
  ExternalLink,
  Phone,
} from 'lucide-react';
import {
  getChecklistForPlan,
  type ChecklistItem,
  type ClientChecklistStatus,
} from '@/lib/onboarding/service-checklists';
import { type PlanTrack, type PlanTier } from '@/lib/pricing/plans';

// Demo clients with their checklist data
const DEMO_CLIENTS = [
  {
    id: 'client_001',
    name: 'Acme Plumbing Co.',
    email: 'john@acmeplumbing.com',
    plan_track: 'gold' as PlanTrack,
    plan_tier: 'pro' as PlanTier,
    plan_name: 'Gold Pro',
    started_at: '2025-12-15',
    progress: 45,
  },
  {
    id: 'client_002',
    name: 'Quick HVAC Services',
    email: 'mike@quickhvac.com',
    plan_track: 'seo' as PlanTrack,
    plan_tier: 'starter' as PlanTier,
    plan_name: 'Local SEO Starter',
    started_at: '2025-12-18',
    progress: 20,
  },
  {
    id: 'client_003',
    name: 'Elite Electric LLC',
    email: 'sarah@eliteelectric.com',
    plan_track: 'web' as PlanTrack,
    plan_tier: 'enterprise' as PlanTier,
    plan_name: 'Web Enterprise',
    has_gbp_addon: true,
    started_at: '2025-12-10',
    progress: 75,
  },
  {
    id: 'client_004',
    name: 'Johnson Roofing',
    email: 'tom@johnsonroofing.com',
    plan_track: 'blue' as PlanTrack,
    plan_tier: 'pro' as PlanTier,
    plan_name: 'Blue Pro',
    started_at: '2025-12-19',
    progress: 60,
  },
];

const TRACK_ICONS: Record<PlanTrack, React.ElementType> = {
  leads_captain: Phone,
  blue: Building2,
  web: Globe,
  seo: Search,
  silver: Layers,
  gold: Layers,
};

const TRACK_COLORS: Record<PlanTrack, string> = {
  leads_captain: 'text-cyan-600 bg-cyan-50',
  blue: 'text-blue-600 bg-blue-50',
  web: 'text-purple-600 bg-purple-50',
  seo: 'text-green-600 bg-green-50',
  silver: 'text-gray-600 bg-gray-50',
  gold: 'text-yellow-600 bg-yellow-50',
};

export default function ClientOnboardingPage() {
  const [selectedClient, setSelectedClient] = useState<typeof DEMO_CLIENTS[0] | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [completedSubItems, setCompletedSubItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (selectedClient) {
      loadChecklist(selectedClient);
    }
  }, [selectedClient]);

  const loadChecklist = (client: typeof DEMO_CLIENTS[0]) => {
    setLoading(true);
    const items = getChecklistForPlan(
      client.plan_track,
      client.plan_tier,
      client.has_gbp_addon
    );
    setChecklist(items);

    // Simulate some completed items based on progress
    const numToComplete = Math.floor(items.length * (client.progress / 100));
    const completed = new Set<string>();
    const completedSub = new Set<string>();

    for (let i = 0; i < numToComplete; i++) {
      completed.add(items[i].id);
      items[i].subItems?.forEach(sub => {
        completedSub.add(`${items[i].id}-${sub.id}`);
      });
    }

    setCompletedItems(completed);
    setCompletedSubItems(completedSub);
    setLoading(false);
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

  const toggleItemComplete = (itemId: string) => {
    const newCompleted = new Set(completedItems);
    if (newCompleted.has(itemId)) {
      newCompleted.delete(itemId);
    } else {
      newCompleted.add(itemId);
    }
    setCompletedItems(newCompleted);
  };

  const toggleSubItemComplete = (itemId: string, subItemId: string) => {
    const key = `${itemId}-${subItemId}`;
    const newCompleted = new Set(completedSubItems);
    if (newCompleted.has(key)) {
      newCompleted.delete(key);
    } else {
      newCompleted.add(key);
    }
    setCompletedSubItems(newCompleted);

    // Check if all required sub-items are done
    const item = checklist.find(c => c.id === itemId);
    if (item?.subItems) {
      const requiredSubs = item.subItems.filter(s => s.required);
      const allDone = requiredSubs.every(sub =>
        newCompleted.has(`${itemId}-${sub.id}`)
      );
      if (allDone && !completedItems.has(itemId)) {
        toggleItemComplete(itemId);
      }
    }
  };

  const calculateProgress = () => {
    const requiredItems = checklist.filter(item => item.required);
    if (requiredItems.length === 0) return 100;
    const completed = requiredItems.filter(item => completedItems.has(item.id));
    return Math.round((completed.length / requiredItems.length) * 100);
  };

  const filteredClients = DEMO_CLIENTS.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Client Onboarding</h1>
              <p className="text-sm text-gray-500">
                Track and manage service delivery checklists
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Client List Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredClients.map(client => {
              const TrackIcon = TRACK_ICONS[client.plan_track];
              return (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-gray-50 transition-colors',
                    selectedClient?.id === client.id && 'bg-indigo-50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      TRACK_COLORS[client.plan_track]
                    )}>
                      <TrackIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{client.name}</h3>
                      <p className="text-xs text-gray-500 truncate">{client.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-medium text-gray-600">{client.plan_name}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{client.progress}% complete</span>
                      </div>
                      <Progress value={client.progress} className="mt-2 h-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Checklist Content */}
        <div className="flex-1 p-6">
          {selectedClient ? (
            loading ? (
              <div className="card p-8 text-center">
                <RefreshCw className="h-8 w-8 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-gray-500">Loading checklist...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Client Header */}
                <div className="card p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-14 h-14 rounded-xl flex items-center justify-center',
                        TRACK_COLORS[selectedClient.plan_track]
                      )}>
                        {(() => {
                          const TrackIcon = TRACK_ICONS[selectedClient.plan_track];
                          return <TrackIcon className="h-7 w-7" />;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedClient.name}</h2>
                        <p className="text-sm text-gray-500">{selectedClient.email}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                            {selectedClient.plan_name}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Started {selectedClient.started_at}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">{calculateProgress()}%</div>
                      <p className="text-sm text-gray-500">Complete</p>
                      <Progress value={calculateProgress()} className="mt-2 w-32" />
                    </div>
                  </div>
                </div>

                {/* Checklist by Category */}
                {Object.entries(groupedChecklist).map(([category, items]) => (
                  <div key={category} className="card overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">{category}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {items.map(item => {
                        const isCompleted = completedItems.has(item.id);
                        const isExpanded = expandedItems.has(item.id);
                        const hasSubItems = item.subItems && item.subItems.length > 0;

                        return (
                          <div key={item.id} className="bg-white">
                            <div
                              className={cn(
                                'p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50',
                                isCompleted && 'bg-green-50/50'
                              )}
                              onClick={() => hasSubItems ? toggleExpanded(item.id) : toggleItemComplete(item.id)}
                            >
                              {/* Checkbox */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleItemComplete(item.id);
                                }}
                                className="mt-0.5"
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-300" />
                                )}
                              </button>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className={cn(
                                    'font-medium',
                                    isCompleted ? 'text-green-800 line-through' : 'text-gray-900'
                                  )}>
                                    {item.title}
                                  </h4>
                                  {item.required && (
                                    <span className="text-xs text-red-500">*</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                              </div>

                              {/* Expand Arrow */}
                              {hasSubItems && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(item.id);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Sub-items */}
                            {hasSubItems && isExpanded && (
                              <div className="bg-gray-50 border-t border-gray-100 px-4 py-2">
                                {item.subItems?.map(subItem => {
                                  const subKey = `${item.id}-${subItem.id}`;
                                  const isSubCompleted = completedSubItems.has(subKey);

                                  return (
                                    <div
                                      key={subItem.id}
                                      className="flex items-center gap-3 py-2 pl-8 cursor-pointer hover:bg-gray-100 rounded"
                                      onClick={() => toggleSubItemComplete(item.id, subItem.id)}
                                    >
                                      {isSubCompleted ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-gray-300" />
                                      )}
                                      <span className={cn(
                                        'text-sm',
                                        isSubCompleted ? 'text-green-700 line-through' : 'text-gray-700'
                                      )}>
                                        {subItem.title}
                                      </span>
                                      {subItem.required && (
                                        <span className="text-xs text-red-500">*</span>
                                      )}
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

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Client Profile
                  </Button>
                  <Button>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Onboarding Complete
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Select a client</h3>
              <p className="text-gray-500">
                Choose a client from the list to view and manage their onboarding checklist
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

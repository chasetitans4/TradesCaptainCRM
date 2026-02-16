'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import { Search, Plus, Minus, Wrench, X, Save } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  brand: string | null;
  purchase_price: number | null;
  quantity: number | null;
}

interface PartEntry {
  inventory_id: string | null;
  name: string;
  quantity_used: number;
  unit_cost: number;
  notes: string;
}

interface PartsUsedFormProps {
  jobId: string;
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (parts: PartEntry[]) => void;
}

export function PartsUsedForm({
  jobId,
  businessId,
  open,
  onOpenChange,
  onSave,
}: PartsUsedFormProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [parts, setParts] = useState<PartEntry[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    async function loadInventory() {
      const supabase = createClient();
      const { data } = await supabase
        .from('business_inventory')
        .select('id, name, brand, purchase_price, quantity')
        .eq('business_id', businessId)
        .in('status', ['available', 'in_use'])
        .order('name');

      if (data) setInventory(data);
    }

    // Also load any existing usage for this job
    async function loadExisting() {
      const supabase = createClient();
      const { data } = await supabase
        .from('job_inventory_usage')
        .select('inventory_id, quantity_used, unit_cost, notes')
        .eq('job_id', jobId);

      if (data && data.length > 0) {
        const existing: PartEntry[] = data.map(d => ({
          inventory_id: d.inventory_id,
          name: '', // Will be resolved from inventory
          quantity_used: d.quantity_used,
          unit_cost: d.unit_cost || 0,
          notes: d.notes || '',
        }));
        setParts(existing);
      }
    }

    loadInventory();
    loadExisting();
  }, [open, businessId, jobId]);

  const filteredInventory = inventory.filter(item => {
    const q = search.toLowerCase();
    return item.name.toLowerCase().includes(q) ||
      (item.brand?.toLowerCase().includes(q) ?? false);
  });

  const addFromInventory = (item: InventoryItem) => {
    // Don't add duplicates
    if (parts.some(p => p.inventory_id === item.id)) return;

    setParts(prev => [...prev, {
      inventory_id: item.id,
      name: item.name,
      quantity_used: 1,
      unit_cost: item.purchase_price || 0,
      notes: '',
    }]);
    setShowSearch(false);
    setSearch('');
  };

  const addCustomPart = () => {
    setParts(prev => [...prev, {
      inventory_id: null,
      name: '',
      quantity_used: 1,
      unit_cost: 0,
      notes: '',
    }]);
  };

  const updatePart = (index: number, updates: Partial<PartEntry>) => {
    setParts(prev => prev.map((p, i) => i === index ? { ...p, ...updates } : p));
  };

  const removePart = (index: number) => {
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (parts.length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Delete existing usage for this job and re-insert
    await supabase.from('job_inventory_usage').delete().eq('job_id', jobId);

    const inserts = parts
      .filter(p => p.name || p.inventory_id)
      .map(p => ({
        job_id: jobId,
        inventory_id: p.inventory_id || undefined,
        quantity_used: p.quantity_used,
        unit_cost: p.unit_cost,
        notes: p.inventory_id ? p.notes : `Custom: ${p.name}${p.notes ? ` - ${p.notes}` : ''}`,
      }));

    if (inserts.length > 0) {
      await supabase.from('job_inventory_usage').insert(inserts);
    }

    setSaving(false);
    onSave(parts);
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Parts & Materials"
      description="Log parts used for this job"
    >
      <div className="space-y-3 p-1">
        {/* Parts list */}
        {parts.map((part, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-center justify-between">
              {part.inventory_id ? (
                <span className="font-medium text-sm text-text">{part.name}</span>
              ) : (
                <input
                  type="text"
                  placeholder="Part name"
                  value={part.name}
                  onChange={(e) => updatePart(i, { name: e.target.value })}
                  className="text-sm font-medium bg-transparent border-b border-border focus:border-primary outline-none flex-1 mr-2"
                />
              )}
              <button onClick={() => removePart(i)} className="text-muted-foreground hover:text-danger">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Quantity stepper */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted mr-1 hidden sm:inline">Qty:</span>
                <button
                  className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted active:scale-95 transition-transform"
                  onClick={() => updatePart(i, { quantity_used: Math.max(1, part.quantity_used - 1) })}
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="w-10 text-center text-lg font-bold">{part.quantity_used}</span>
                <button
                  className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted active:scale-95 transition-transform"
                  onClick={() => updatePart(i, { quantity_used: part.quantity_used + 1 })}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {/* Unit cost */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-text-muted">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={part.unit_cost}
                  onChange={(e) => updatePart(i, { unit_cost: parseFloat(e.target.value) || 0 })}
                  className="w-20 text-sm bg-transparent border-b border-border focus:border-primary outline-none text-right"
                />
                <span className="text-xs text-text-muted">ea</span>
              </div>
            </div>
          </div>
        ))}

        {/* Search / Add buttons */}
        {showSearch ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:border-primary outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredInventory.slice(0, 10).map(item => (
                <button
                  key={item.id}
                  onClick={() => addFromInventory(item)}
                  className="w-full text-left px-3 py-2 text-sm rounded hover:bg-muted flex items-center justify-between"
                >
                  <span>{item.name}{item.brand ? ` (${item.brand})` : ''}</span>
                  {item.purchase_price !== null && (
                    <span className="text-text-muted">${item.purchase_price.toFixed(2)}</span>
                  )}
                </button>
              ))}
              {filteredInventory.length === 0 && (
                <p className="text-sm text-text-muted text-center py-2">No items found</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { setShowSearch(false); setSearch(''); }}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4 mr-1.5" />
              From Inventory
            </Button>
            <Button variant="outline" className="flex-1" onClick={addCustomPart}>
              <Plus className="h-4 w-4 mr-1.5" />
              Custom Part
            </Button>
          </div>
        )}

        {/* Save */}
        <Button className="w-full" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? 'Saving...' : parts.length > 0 ? `Save ${parts.length} part${parts.length > 1 ? 's' : ''}` : 'Done'}
        </Button>
      </div>
    </BottomSheet>
  );
}

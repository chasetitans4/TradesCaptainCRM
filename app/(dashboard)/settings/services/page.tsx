'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Package,
  Loader2,
  Save,
  X,
  DollarSign,
  Tag,
  Check,
} from 'lucide-react';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import type { UserWithBusiness } from '@/types';

interface SavedService {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  default_price: number | null;
  price_type: 'fixed' | 'hourly' | 'per_unit';
  unit_label: string | null;
  category: 'labor' | 'materials' | 'service' | null;
  is_taxable: boolean;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'labor', label: 'Labor' },
  { value: 'materials', label: 'Materials' },
  { value: 'service', label: 'Service' },
];

const PRICE_TYPES = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Per Hour' },
  { value: 'per_unit', label: 'Per Unit' },
];

export default function SavedServicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<SavedService[]>([]);
  const [editingService, setEditingService] = useState<SavedService | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formPriceType, setFormPriceType] = useState<'fixed' | 'hourly' | 'per_unit'>('fixed');
  const [formUnitLabel, setFormUnitLabel] = useState('');
  const [formCategory, setFormCategory] = useState<'labor' | 'materials' | 'service'>('service');
  const [formIsTaxable, setFormIsTaxable] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);
    loadServices(profile.business_id);
  };

  const loadServices = async (businessId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('saved_services')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    setServices(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormPrice('');
    setFormPriceType('fixed');
    setFormUnitLabel('');
    setFormCategory('service');
    setFormIsTaxable(true);
    setEditingService(null);
    setIsCreating(false);
  };

  const startEditing = (service: SavedService) => {
    setEditingService(service);
    setFormName(service.name);
    setFormDescription(service.description || '');
    setFormPrice(service.default_price?.toString() || '');
    setFormPriceType(service.price_type);
    setFormUnitLabel(service.unit_label || '');
    setFormCategory(service.category || 'service');
    setFormIsTaxable(service.is_taxable);
    setIsCreating(false);
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !user) return;

    setSaving(true);
    const supabase = createClient();

    try {
      const serviceData = {
        business_id: user.business_id,
        name: formName.trim(),
        description: formDescription.trim() || null,
        default_price: formPrice ? parseFloat(formPrice) : null,
        price_type: formPriceType,
        unit_label: formPriceType !== 'fixed' ? formUnitLabel.trim() || null : null,
        category: formCategory,
        is_taxable: formIsTaxable,
      };

      if (editingService) {
        await supabase
          .from('saved_services')
          .update(serviceData)
          .eq('id', editingService.id);
      } else {
        await supabase.from('saved_services').insert(serviceData);
      }

      await loadServices(user.business_id);
      resetForm();
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    const supabase = createClient();
    await supabase.from('saved_services').update({ is_active: false }).eq('id', id);

    setServices(services.filter((s) => s.id !== id));
    if (editingService?.id === id) {
      resetForm();
    }
  };

  const formatPrice = (service: SavedService) => {
    if (!service.default_price) return 'No default price';

    const price = `$${service.default_price.toFixed(2)}`;
    if (service.price_type === 'hourly') return `${price}/hr`;
    if (service.price_type === 'per_unit') return `${price}/${service.unit_label || 'unit'}`;
    return price;
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Saved Services</h1>
            <p className="text-xs text-muted-foreground">
              {services.length} service{services.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={startCreating}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Add</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Create/Edit Form */}
        {(isCreating || editingService) && (
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                {editingService ? 'Edit Service' : 'New Service'}
              </h2>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Service Name *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., AC System Diagnosis"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description..."
                className="w-full h-20 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Price Type
                </label>
                <select
                  value={formPriceType}
                  onChange={(e) => setFormPriceType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {PRICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">
                  Default Price
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {formPriceType !== 'fixed' && (
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">
                    Unit Label
                  </label>
                  <input
                    type="text"
                    value={formUnitLabel}
                    onChange={(e) => setFormUnitLabel(e.target.value)}
                    placeholder={formPriceType === 'hourly' ? 'hour' : 'sq ft'}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">Taxable</p>
                <p className="text-xs text-muted-foreground">
                  Include tax on this service
                </p>
              </div>
              <button
                onClick={() => setFormIsTaxable(!formIsTaxable)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  formIsTaxable ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    formIsTaxable ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Saving...' : 'Save Service'}
            </button>
          </div>
        )}

        {/* Services List */}
        {services.length === 0 && !isCreating ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No saved services</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create reusable services to speed up quote and invoice creation
            </p>
            <button
              onClick={startCreating}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {CATEGORIES.map((category) => {
              const categoryServices = services.filter(
                (s) => s.category === category.value
              );
              if (categoryServices.length === 0) return null;

              return (
                <div key={category.value}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {category.label}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {categoryServices.map((service) => (
                      <div
                        key={service.id}
                        className={`bg-card rounded-xl border p-4 ${
                          editingService?.id === service.id
                            ? 'border-primary'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{service.name}</h3>
                              {service.is_taxable && (
                                <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                                  Tax
                                </span>
                              )}
                            </div>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                                {service.description}
                              </p>
                            )}
                            <p className="text-sm font-medium text-primary mt-1">
                              {formatPrice(service)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditing(service)}
                              className="p-2 hover:bg-accent rounded-lg transition-colors"
                            >
                              <Edit2 className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleDelete(service.id)}
                              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

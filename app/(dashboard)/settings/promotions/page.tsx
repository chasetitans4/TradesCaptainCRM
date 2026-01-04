'use client';

import { useEffect, useState, useCallback } from 'react';
import { Percent, Plus, Loader2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

import type { Promotion, PromotionFormData } from './_components/types';
import { INITIAL_FORM_DATA } from './_components/types';
import { PromotionCard, isPromoActive } from './_components/promotion-card';
import { PromotionFormDialog } from './_components/promotion-form-dialog';
import { StatsCards } from './_components/stats-cards';

export default function PromotionsSettingsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [formData, setFormData] = useState<PromotionFormData>(INITIAL_FORM_DATA);
  const { toast } = useToast();

  const loadPromotions = useCallback(async () => {
    try {
      const response = await fetch('/api/promotions');
      if (response.ok) {
        const data = await response.json();
        setPromotions(data.promotions || []);
      }
    } catch (_error) {
      setError('Failed to load promotions');
      toast({
        title: 'Failed to load promotions',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);


  const openNewPromotionDialog = () => {
    setEditingPromotion(null);
    setFormData(INITIAL_FORM_DATA);
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormData({
      name: promo.name,
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value.toString(),
      min_purchase_amount: promo.min_purchase_amount?.toString() || '',
      max_discount_amount: promo.max_discount_amount?.toString() || '',
      applicable_services: promo.applicable_services?.join(', ') || '',
      start_date: promo.start_date?.split('T')[0] || '',
      end_date: promo.end_date?.split('T')[0] || '',
      usage_limit: promo.usage_limit?.toString() || '',
      is_active: promo.is_active,
      is_public: promo.is_public,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_purchase_amount: formData.min_purchase_amount
          ? parseFloat(formData.min_purchase_amount)
          : null,
        max_discount_amount: formData.max_discount_amount
          ? parseFloat(formData.max_discount_amount)
          : null,
        applicable_services: formData.applicable_services
          ? formData.applicable_services
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        is_active: formData.is_active,
        is_public: formData.is_public,
      };

      const response = await fetch(
        editingPromotion
          ? `/api/promotions/${editingPromotion.id}`
          : '/api/promotions',
        {
          method: editingPromotion ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save promotion');
      }

      setIsDialogOpen(false);
      loadPromotions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promoId: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      await fetch(`/api/promotions/${promoId}`, { method: 'DELETE' });
      loadPromotions();
    } catch (_error) {
      toast({
        title: 'Failed to delete promotion',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activePromotions = promotions.filter(isPromoActive);
  const inactivePromotions = promotions.filter((p) => !isPromoActive(p));
  const totalUsage = promotions.reduce((sum, p) => sum + p.usage_count, 0);
  const totalSavings = promotions.reduce((sum, p) => sum + (p.total_savings || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promotions & Coupons</h1>
          <p className="text-muted-foreground">
            Create and manage discount codes and promotional offers
          </p>
        </div>
        <Button onClick={openNewPromotionDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Promotion
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <StatsCards
        activeCount={activePromotions.length}
        totalCount={promotions.length}
        totalUsage={totalUsage}
        totalSavings={totalSavings}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active ({activePromotions.length})</TabsTrigger>
          <TabsTrigger value="inactive">
            Inactive ({inactivePromotions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activePromotions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No active promotions</h3>
                <p className="text-muted-foreground mb-4">
                  Create a promotion to offer discounts to your customers
                </p>
                <Button onClick={openNewPromotionDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promotion
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activePromotions.map((promo) => (
                <PromotionCard
                  key={promo.id}
                  promo={promo}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  onCopyCode={copyCode}
                  copiedCode={copiedCode}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {inactivePromotions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No inactive promotions</h3>
                <p className="text-muted-foreground">
                  Expired or disabled promotions will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inactivePromotions.map((promo) => (
                <PromotionCard
                  key={promo.id}
                  promo={promo}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  onCopyCode={copyCode}
                  copiedCode={copiedCode}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PromotionFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        editingPromotion={editingPromotion}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

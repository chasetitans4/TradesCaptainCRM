'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { BottomSheet } from '@/components/mobile/bottom-sheet';
import {
  Camera,
  Receipt,
  Wrench,
  Loader2,
  Check,
  X,
  Plus,
  Trash2,
  AlertCircle,
  ImagePlus,
} from 'lucide-react';

export type PhotoType = 'receipt' | 'parts' | 'damage';

export interface ExtractedItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  confidence: number;
  selected: boolean;
}

interface PhotoInvoiceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  onItemsConfirmed: (items: Omit<ExtractedItem, 'id' | 'confidence' | 'selected'>[]) => void;
}

export function PhotoInvoiceSheet({
  open,
  onOpenChange,
  jobId,
  onItemsConfirmed,
}: PhotoInvoiceSheetProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'capture' | 'analyzing' | 'review'>('capture');
  const [photoType, setPhotoType] = useState<PhotoType>('receipt');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<ExtractedItem[]>([]);
  const [vendor, setVendor] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Reset state when sheet closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('capture');
      setPreviewUrl(null);
      setItems([]);
      setVendor(null);
      setAnalysisError(null);
    }
    onOpenChange(newOpen);
  };

  // Handle file selection
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Start analysis
    await analyzePhoto(file);
  }, [photoType, jobId, toast]);

  // Analyze the photo
  const analyzePhoto = async (file: File) => {
    setStep('analyzing');
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('jobId', jobId);
      formData.append('photoType', photoType);

      const response = await fetch('/api/technician/analyze-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to extract items');
      }

      // Convert to ExtractedItem format with IDs and selection state
      const extractedItems: ExtractedItem[] = result.items.map((item: any, index: number) => ({
        id: `item-${index}-${Date.now()}`,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        confidence: item.confidence,
        selected: item.confidence >= 0.7, // Auto-select high confidence items
      }));

      setItems(extractedItems);
      setVendor(result.vendor || null);
      setStep('review');
    } catch (error) {
      console.error('Photo analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
      setStep('capture');
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Could not analyze photo',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle item selection
  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Update item
  const updateItem = (id: string, updates: Partial<ExtractedItem>) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  // Delete item
  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Add manual item
  const addManualItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        name: '',
        quantity: 1,
        unit_price: 0,
        confidence: 1, // Manual items have full confidence
        selected: true,
      },
    ]);
  };

  // Confirm selected items
  const handleConfirm = () => {
    const selectedItems = items
      .filter(item => item.selected && item.name.trim())
      .map(({ name, quantity, unit_price }) => ({
        name,
        quantity,
        unit_price,
      }));

    if (selectedItems.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one item to add to the invoice',
        variant: 'destructive',
      });
      return;
    }

    onItemsConfirmed(selectedItems);
    handleOpenChange(false);
  };

  // Calculate total
  const selectedTotal = items
    .filter(item => item.selected)
    .reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange}>
      <div className="p-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {step === 'capture' && 'Photo to Invoice'}
            {step === 'analyzing' && 'Analyzing Photo...'}
            {step === 'review' && 'Review Items'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Step: Capture */}
        {step === 'capture' && (
          <div className="space-y-4">
            {/* Photo type selection */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                What are you photographing?
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <PhotoTypeButton
                  type="receipt"
                  selected={photoType === 'receipt'}
                  onClick={() => setPhotoType('receipt')}
                  icon={Receipt}
                  label="Receipt"
                />
                <PhotoTypeButton
                  type="parts"
                  selected={photoType === 'parts'}
                  onClick={() => setPhotoType('parts')}
                  icon={Wrench}
                  label="Parts"
                />
                <PhotoTypeButton
                  type="damage"
                  selected={photoType === 'damage'}
                  onClick={() => setPhotoType('damage')}
                  icon={AlertCircle}
                  label="Damage"
                />
              </div>
            </div>

            {/* Camera capture area */}
            <div
              className={cn(
                'relative aspect-[4/3] rounded-xl border-2 border-dashed',
                'flex flex-col items-center justify-center gap-3',
                'bg-muted/30 cursor-pointer transition-colors',
                'hover:bg-muted/50 hover:border-primary/50'
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover rounded-xl"
                />
              ) : (
                <>
                  <div className="p-4 rounded-full bg-primary/10">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Tap to take a photo or select from gallery
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Hint text */}
            <p className="text-xs text-muted-foreground text-center">
              {photoType === 'receipt' && 'AI will extract line items from your receipt'}
              {photoType === 'parts' && 'AI will identify parts and estimate prices'}
              {photoType === 'damage' && 'AI will assess damage and suggest repairs'}
            </p>
          </div>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            {previewUrl && (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Analyzing"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              </div>
            )}
            <div className="text-center">
              <p className="font-medium">Analyzing photo...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Extracting items and prices
              </p>
            </div>
            {/* Progress bar animation */}
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-[progress_2s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Vendor info */}
            {vendor && (
              <div className="bg-muted/30 rounded-lg px-3 py-2">
                <p className="text-sm text-muted-foreground">Vendor detected</p>
                <p className="font-medium">{vendor}</p>
              </div>
            )}

            {/* Extracted items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  {items.length} item{items.length !== 1 ? 's' : ''} found
                </Label>
                <Button variant="ghost" size="sm" onClick={addManualItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem(item.id)}
                  onUpdate={(updates) => updateItem(item.id, updates)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}

              {items.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No items extracted</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={addManualItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Manually
                  </Button>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="bg-primary/5 rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="font-medium">Selected Total</span>
              <span className="text-xl font-bold">
                ${selectedTotal.toFixed(2)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStep('capture');
                  setPreviewUrl(null);
                }}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                New Photo
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={items.filter(i => i.selected).length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Add to Invoice
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes progress {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 50%; margin-left: 25%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </BottomSheet>
  );
}

// Photo type selection button
interface PhotoTypeButtonProps {
  type: PhotoType;
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}

function PhotoTypeButton({
  type,
  selected,
  onClick,
  icon: Icon,
  label,
}: PhotoTypeButtonProps) {
  return (
    <button
      className={cn(
        'p-3 rounded-lg border-2 transition-all',
        'flex flex-col items-center gap-1.5',
        selected
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border hover:border-primary/50'
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Item row component
interface ItemRowProps {
  item: ExtractedItem;
  onToggle: () => void;
  onUpdate: (updates: Partial<ExtractedItem>) => void;
  onDelete: () => void;
}

function ItemRow({ item, onToggle, onUpdate, onDelete }: ItemRowProps) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        item.selected ? 'border-primary/50 bg-primary/5' : 'border-border'
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={item.selected}
          onCheckedChange={onToggle}
          className="mt-1"
        />

        <div className="flex-1 space-y-2">
          <Input
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Item name"
            className="h-8"
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Qty</Label>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
                className="h-8"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Price</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={item.unit_price}
                onChange={(e) => onUpdate({ unit_price: parseFloat(e.target.value) || 0 })}
                className="h-8"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Confidence indicator */}
          {item.confidence < 0.7 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Low confidence - please verify
            </p>
          )}
        </div>
      </div>

      {/* Line total */}
      <div className="mt-2 text-right text-sm">
        <span className="text-muted-foreground">Total: </span>
        <span className="font-medium">
          ${(item.quantity * item.unit_price).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

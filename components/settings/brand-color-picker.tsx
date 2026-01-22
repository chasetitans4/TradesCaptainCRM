'use client';

// =====================================================
// BRAND COLOR PICKER
// Dual color picker with industry presets and contrast indicator
// =====================================================

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle } from 'lucide-react';
import { getContrastRating } from '@/lib/design/color-utils';
import { getAllPresets, type ColorPreset } from '@/lib/design/color-presets';

interface BrandColorPickerProps {
  primaryColor: string;
  secondaryColor: string;
  onChange: (colors: { primary: string; secondary: string }) => void;
  className?: string;
}

export function BrandColorPicker({
  primaryColor,
  secondaryColor,
  onChange,
  className,
}: BrandColorPickerProps) {
  const [activeTab, setActiveTab] = useState<'custom' | 'presets'>('presets');
  const presets = getAllPresets();

  const primaryContrast = getContrastRating(primaryColor);
  const secondaryContrast = getContrastRating(secondaryColor);

  const handlePrimaryChange = useCallback(
    (color: string) => {
      onChange({ primary: color, secondary: secondaryColor });
    },
    [onChange, secondaryColor]
  );

  const handleSecondaryChange = useCallback(
    (color: string) => {
      onChange({ primary: primaryColor, secondary: color });
    },
    [onChange, primaryColor]
  );

  const handlePresetSelect = useCallback(
    (preset: ColorPreset) => {
      onChange({ primary: preset.primary, secondary: preset.secondary });
    },
    [onChange]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
            activeTab === 'presets'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Industry Presets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={cn(
            'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
            activeTab === 'custom'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Custom Colors
        </button>
      </div>

      {/* Presets Tab */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-2 gap-3">
          {presets.map((preset) => {
            const isSelected =
              preset.primary === primaryColor && preset.secondary === secondaryColor;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  'relative p-3 rounded-lg border-2 text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {/* Color Preview */}
                <div className="flex gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-md shadow-sm"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <div
                    className="w-8 h-8 rounded-md shadow-sm"
                    style={{ backgroundColor: preset.secondary }}
                  />
                </div>
                {/* Preset Info */}
                <p className="text-sm font-semibold text-foreground">{preset.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {preset.description}
                </p>
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Colors Tab */}
      {activeTab === 'custom' && (
        <div className="space-y-4">
          {/* Primary Color */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Primary Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => handlePrimaryChange(e.target.value)}
                className="w-12 h-12 rounded-lg border border-border cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => handlePrimaryChange(e.target.value)}
                placeholder="#1D4ED8"
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-mono uppercase"
              />
              <ContrastBadge contrast={primaryContrast} />
            </div>
          </div>

          {/* Secondary Color */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Secondary Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => handleSecondaryChange(e.target.value)}
                className="w-12 h-12 rounded-lg border border-border cursor-pointer"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => handleSecondaryChange(e.target.value)}
                placeholder="#0369A1"
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-mono uppercase"
              />
              <ContrastBadge contrast={secondaryContrast} />
            </div>
          </div>
        </div>
      )}

      {/* Live Preview */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Preview</label>
        <div className="p-4 border border-border rounded-lg bg-background">
          <div className="flex flex-col gap-3">
            {/* Gradient Button Preview */}
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-white font-semibold text-sm"
              style={{
                background: `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
              }}
            >
              Book Appointment
            </button>

            {/* Solid Button Preview */}
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-white font-semibold text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              Primary Button
            </button>

            {/* Card with Accent Bar */}
            <div
              className="p-3 rounded-lg bg-muted/50"
              style={{ borderLeft: `4px solid ${primaryColor}` }}
            >
              <p className="text-sm font-semibold text-foreground">Card with Accent</p>
              <p className="text-xs text-muted-foreground">
                This is how cards will look in your portal
              </p>
            </div>

            {/* Badge Preview */}
            <div className="flex gap-2">
              <span
                className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Confirmed
              </span>
              <span
                className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: secondaryColor }}
              >
                Pending
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contrast Warning */}
      {(primaryContrast.level === 'fail' || secondaryContrast.level === 'fail') && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warning">Low Contrast Warning</p>
            <p className="text-xs text-muted-foreground">
              One or more colors may be difficult to read with white text. Consider
              choosing a darker shade for better accessibility.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Contrast Badge Component
function ContrastBadge({
  contrast,
}: {
  contrast: { ratio: number; level: 'fail' | 'AA' | 'AAA'; description: string };
}) {
  const colors = {
    fail: 'bg-destructive/10 text-destructive border-destructive/20',
    AA: 'bg-warning/10 text-warning border-warning/20',
    AAA: 'bg-success/10 text-success border-success/20',
  };

  return (
    <div
      className={cn(
        'px-2 py-1 rounded text-xs font-semibold border',
        colors[contrast.level]
      )}
      title={contrast.description}
    >
      {contrast.level === 'fail' ? 'Low' : contrast.level}
    </div>
  );
}

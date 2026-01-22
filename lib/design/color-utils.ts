// =====================================================
// COLOR UTILITIES
// Hex/HSL conversion and contrast checking for WCAG compliance
// =====================================================

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert hex color to RGB
 */
export function hexToRGB(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Parse hex values
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHSL(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert hex color to HSL
 */
export function hexToHSL(hex: string): HSL {
  return rgbToHSL(hexToRGB(hex));
}

/**
 * Convert HSL to CSS variable format (without hsl() wrapper)
 * Returns: "217 91% 60%"
 */
export function hslToCSSVar(hsl: HSL): string {
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Calculate relative luminance for WCAG contrast calculations
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(rgb: RGB): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio like 4.5:1 as a number (4.5)
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const L1 = getRelativeLuminance(hexToRGB(hex1));
  const L2 = getRelativeLuminance(hexToRGB(hex2));

  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color passes WCAG contrast requirements with white text
 * - WCAG AA: 4.5:1 for normal text, 3:1 for large text
 * - WCAG AAA: 7:1 for normal text, 4.5:1 for large text
 */
export function meetsContrastRequirement(
  bgHex: string,
  level: 'AA' | 'AAA' = 'AAA'
): boolean {
  const ratio = getContrastRatio(bgHex, '#FFFFFF');
  const threshold = level === 'AAA' ? 7 : 4.5;
  return ratio >= threshold;
}

/**
 * Get contrast rating for a background color with white text
 */
export function getContrastRating(bgHex: string): {
  ratio: number;
  level: 'fail' | 'AA' | 'AAA';
  description: string;
} {
  const ratio = getContrastRatio(bgHex, '#FFFFFF');

  if (ratio >= 7) {
    return {
      ratio: Math.round(ratio * 10) / 10,
      level: 'AAA',
      description: 'Excellent contrast',
    };
  } else if (ratio >= 4.5) {
    return {
      ratio: Math.round(ratio * 10) / 10,
      level: 'AA',
      description: 'Good contrast',
    };
  } else {
    return {
      ratio: Math.round(ratio * 10) / 10,
      level: 'fail',
      description: 'Poor contrast - text may be hard to read',
    };
  }
}

/**
 * Generate CSS variables for a business theme
 * Returns an object that can be applied via style.setProperty()
 */
export function generateThemeVariables(
  primaryHex: string,
  secondaryHex?: string
): Record<string, string> {
  const primary = hexToHSL(primaryHex);
  const secondary = secondaryHex ? hexToHSL(secondaryHex) : primary;

  return {
    '--business-primary': hslToCSSVar(primary),
    '--business-primary-foreground': '0 0% 100%',
    '--business-secondary': hslToCSSVar(secondary),
    '--business-secondary-foreground': '0 0% 100%',
    '--business-gradient': `linear-gradient(135deg, hsl(${hslToCSSVar(secondary)}) 0%, hsl(${hslToCSSVar(primary)}) 100%)`,
  };
}

/**
 * Apply business theme CSS variables to the document
 */
export function applyThemeToDocument(
  primaryHex: string,
  secondaryHex?: string
): void {
  if (typeof document === 'undefined') return;

  const variables = generateThemeVariables(primaryHex, secondaryHex);
  const root = document.documentElement;

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * Remove business theme CSS variables from the document
 */
export function removeThemeFromDocument(): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const variables = [
    '--business-primary',
    '--business-primary-foreground',
    '--business-secondary',
    '--business-secondary-foreground',
    '--business-gradient',
  ];

  variables.forEach((key) => {
    root.style.removeProperty(key);
  });
}

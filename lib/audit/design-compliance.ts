/**
 * Design Constitution Compliance Audit
 *
 * Automated verification of Design Constitution compliance:
 * - Touch target sizes (≥50x50px)
 * - Spacing between tappables (8-12px)
 * - Color contrast ratios (WCAG AA)
 * - Performance metrics
 */

/**
 * Audit result severity
 */
export type AuditSeverity = 'pass' | 'warning' | 'fail';

/**
 * Individual audit finding
 */
export interface AuditFinding {
  /** Rule ID */
  rule: string;
  /** Description of the check */
  description: string;
  /** Pass/warning/fail */
  severity: AuditSeverity;
  /** Detailed message */
  message: string;
  /** Element selector (if applicable) */
  selector?: string;
  /** Measured value */
  actual?: number | string;
  /** Expected value */
  expected?: number | string;
}

/**
 * Complete audit report
 */
export interface AuditReport {
  /** Audit timestamp */
  timestamp: Date;
  /** Page URL */
  url: string;
  /** Overall pass/fail */
  passed: boolean;
  /** Total findings count */
  totalFindings: number;
  /** Breakdown by severity */
  summary: {
    pass: number;
    warning: number;
    fail: number;
  };
  /** Individual findings */
  findings: AuditFinding[];
}

/**
 * Touch target minimum size per Constitution
 */
const MIN_TOUCH_TARGET_SIZE = 50; // px

/**
 * Minimum spacing between interactive elements
 */
const MIN_TOUCH_SPACING = 8; // px

/**
 * WCAG AA contrast ratio minimums
 */
const MIN_CONTRAST_NORMAL = 4.5;
const MIN_CONTRAST_LARGE = 3;

/**
 * Check if an element is interactive
 */
function isInteractive(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');

  // Interactive by tag
  if (['button', 'a', 'input', 'select', 'textarea'].includes(tagName)) {
    return true;
  }

  // Interactive by role
  if (['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab'].includes(role || '')) {
    return true;
  }

  // Has click handler (approximate check)
  if (element.hasAttribute('onclick') || element.hasAttribute('tabindex')) {
    return true;
  }

  return false;
}

/**
 * Get element dimensions
 */
function getElementSize(element: Element): { width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

/**
 * Audit touch target sizes
 */
export function auditTouchTargets(): AuditFinding[] {
  if (typeof document === 'undefined') return [];

  const findings: AuditFinding[] = [];
  const interactiveElements = document.querySelectorAll(
    'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]'
  );

  interactiveElements.forEach((element) => {
    const { width, height } = getElementSize(element);
    const minDimension = Math.min(width, height);

    // Skip hidden elements
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return;
    }

    // Skip zero-size elements (likely hidden)
    if (width === 0 && height === 0) {
      return;
    }

    const selector = getSelector(element);

    if (minDimension < MIN_TOUCH_TARGET_SIZE) {
      findings.push({
        rule: 'touch-target-size',
        description: 'Touch targets must be at least 50x50px',
        severity: minDimension < 44 ? 'fail' : 'warning',
        message: `Element is ${Math.round(width)}x${Math.round(height)}px`,
        selector,
        actual: `${Math.round(width)}x${Math.round(height)}px`,
        expected: '≥50x50px',
      });
    } else {
      findings.push({
        rule: 'touch-target-size',
        description: 'Touch targets must be at least 50x50px',
        severity: 'pass',
        message: `Element is ${Math.round(width)}x${Math.round(height)}px`,
        selector,
      });
    }
  });

  return findings;
}

/**
 * Get a readable selector for an element
 */
function getSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const classes = Array.from(element.classList).slice(0, 2).join('.');
  const tagName = element.tagName.toLowerCase();

  if (classes) {
    return `${tagName}.${classes}`;
  }

  return tagName;
}

/**
 * Audit spacing between interactive elements
 */
export function auditTouchSpacing(): AuditFinding[] {
  if (typeof document === 'undefined') return [];

  const findings: AuditFinding[] = [];
  const interactiveElements = Array.from(
    document.querySelectorAll('button, a[href], input, [role="button"]')
  ).filter((el) => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  for (let i = 0; i < interactiveElements.length; i++) {
    const el1 = interactiveElements[i];
    const rect1 = el1.getBoundingClientRect();

    for (let j = i + 1; j < interactiveElements.length; j++) {
      const el2 = interactiveElements[j];
      const rect2 = el2.getBoundingClientRect();

      // Calculate distance between elements
      const horizontalGap = Math.max(0, rect2.left - rect1.right, rect1.left - rect2.right);
      const verticalGap = Math.max(0, rect2.top - rect1.bottom, rect1.top - rect2.bottom);

      // Check if elements are adjacent (gaps are small)
      if (horizontalGap < 100 && verticalGap < 100) {
        const minGap = Math.min(
          horizontalGap > 0 ? horizontalGap : Infinity,
          verticalGap > 0 ? verticalGap : Infinity
        );

        if (minGap < MIN_TOUCH_SPACING && minGap !== Infinity) {
          findings.push({
            rule: 'touch-spacing',
            description: 'Interactive elements must be 8-12px apart',
            severity: 'warning',
            message: `Gap between elements is ${Math.round(minGap)}px`,
            selector: `${getSelector(el1)} ↔ ${getSelector(el2)}`,
            actual: `${Math.round(minGap)}px`,
            expected: '≥8px',
          });
        }
      }
    }
  }

  if (findings.length === 0) {
    findings.push({
      rule: 'touch-spacing',
      description: 'Interactive elements must be 8-12px apart',
      severity: 'pass',
      message: 'All touch targets have adequate spacing',
    });
  }

  return findings;
}

/**
 * Calculate relative luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse color string to RGB
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
    };
  }
  return null;
}

/**
 * Audit color contrast
 */
export function auditColorContrast(): AuditFinding[] {
  if (typeof document === 'undefined') return [];

  const findings: AuditFinding[] = [];
  const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, label, a, button');

  textElements.forEach((element) => {
    const style = getComputedStyle(element);

    if (style.display === 'none' || style.visibility === 'hidden') {
      return;
    }

    const textColor = parseColor(style.color);
    const bgColor = parseColor(style.backgroundColor);

    if (!textColor || !bgColor) return;

    const ratio = getContrastRatio(textColor, bgColor);
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight);
    const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);

    const minRatio = isLargeText ? MIN_CONTRAST_LARGE : MIN_CONTRAST_NORMAL;

    if (ratio < minRatio) {
      findings.push({
        rule: 'color-contrast',
        description: `Text contrast must be ≥${minRatio}:1 (WCAG AA)`,
        severity: 'fail',
        message: `Contrast ratio is ${ratio.toFixed(2)}:1`,
        selector: getSelector(element),
        actual: `${ratio.toFixed(2)}:1`,
        expected: `≥${minRatio}:1`,
      });
    }
  });

  if (findings.length === 0) {
    findings.push({
      rule: 'color-contrast',
      description: 'Text contrast meets WCAG AA standards',
      severity: 'pass',
      message: 'All text elements have adequate contrast',
    });
  }

  return findings;
}

/**
 * Audit performance metrics
 */
export async function auditPerformance(): Promise<AuditFinding[]> {
  if (typeof window === 'undefined' || !window.performance) return [];

  const findings: AuditFinding[] = [];

  // Check navigation timing
  const [navigationEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];

  if (navigationEntry) {
    const tti = navigationEntry.domInteractive - navigationEntry.startTime;

    findings.push({
      rule: 'performance-tti',
      description: 'Time to Interactive should be ≤2.5s',
      severity: tti <= 2500 ? 'pass' : tti <= 4000 ? 'warning' : 'fail',
      message: `TTI is ${(tti / 1000).toFixed(2)}s`,
      actual: `${(tti / 1000).toFixed(2)}s`,
      expected: '≤2.5s',
    });
  }

  // Check memory usage (if available)
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  if (memory) {
    const usedMB = memory.usedJSHeapSize / 1024 / 1024;

    findings.push({
      rule: 'performance-memory',
      description: 'Memory usage should be ≤300MB',
      severity: usedMB <= 300 ? 'pass' : usedMB <= 400 ? 'warning' : 'fail',
      message: `Using ${usedMB.toFixed(0)}MB`,
      actual: `${usedMB.toFixed(0)}MB`,
      expected: '≤300MB',
    });
  }

  return findings;
}

/**
 * Run all audits and generate report
 */
export async function runFullAudit(): Promise<AuditReport> {
  const touchTargetFindings = auditTouchTargets();
  const spacingFindings = auditTouchSpacing();
  const contrastFindings = auditColorContrast();
  const performanceFindings = await auditPerformance();

  const allFindings = [
    ...touchTargetFindings,
    ...spacingFindings,
    ...contrastFindings,
    ...performanceFindings,
  ];

  const summary = {
    pass: allFindings.filter((f) => f.severity === 'pass').length,
    warning: allFindings.filter((f) => f.severity === 'warning').length,
    fail: allFindings.filter((f) => f.severity === 'fail').length,
  };

  return {
    timestamp: new Date(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    passed: summary.fail === 0,
    totalFindings: allFindings.length,
    summary,
    findings: allFindings,
  };
}

/**
 * Quick check for Constitution compliance
 */
export function isConstitutionCompliant(): {
  compliant: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check touch targets
  const touchFindings = auditTouchTargets();
  const failedTouchTargets = touchFindings.filter((f) => f.severity === 'fail');
  if (failedTouchTargets.length > 0) {
    issues.push(`${failedTouchTargets.length} touch targets are too small`);
  }

  // Check spacing
  const spacingFindings = auditTouchSpacing();
  const failedSpacing = spacingFindings.filter((f) => f.severity === 'fail');
  if (failedSpacing.length > 0) {
    issues.push(`${failedSpacing.length} elements have insufficient spacing`);
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}

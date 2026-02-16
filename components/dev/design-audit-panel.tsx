'use client';

/**
 * Design Audit Panel
 *
 * Development tool for verifying Design Constitution compliance.
 * Shows real-time audit results for touch targets, spacing, contrast, and performance.
 *
 * Usage: Include in layout during development
 * <DesignAuditPanel />
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  runFullAudit,
  type AuditReport,
  type AuditFinding,
} from '@/lib/audit/design-compliance';
import {
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DesignAuditPanelProps {
  /** Initial visibility */
  defaultOpen?: boolean;
  /** Position */
  position?: 'bottom-left' | 'bottom-right' | 'top-right';
}

/**
 * Design Audit Panel Component
 */
export function DesignAuditPanel({
  defaultOpen = false,
  position = 'bottom-right',
}: DesignAuditPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [highlightTargets, setHighlightTargets] = useState(false);

  // Run audit
  const runAudit = useCallback(async () => {
    setIsRunning(true);
    try {
      const result = await runFullAudit();
      setReport(result);
    } catch (error) {
      console.error('Audit failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, []);

  // Run audit on mount
  useEffect(() => {
    if (isOpen && !report) {
      runAudit();
    }
  }, [isOpen, report, runAudit]);

  // Toggle touch target highlights
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const style = document.getElementById('audit-highlight-style');

    if (highlightTargets) {
      if (!style) {
        const newStyle = document.createElement('style');
        newStyle.id = 'audit-highlight-style';
        newStyle.textContent = `
          button, a[href], input, select, textarea, [role="button"], [tabindex] {
            outline: 2px dashed rgba(59, 130, 246, 0.5) !important;
            outline-offset: 2px !important;
          }
          button:hover, a[href]:hover, input:hover, [role="button"]:hover {
            outline-color: rgba(59, 130, 246, 1) !important;
          }
        `;
        document.head.appendChild(newStyle);
      }
    } else if (style) {
      style.remove();
    }

    return () => {
      document.getElementById('audit-highlight-style')?.remove();
    };
  }, [highlightTargets]);

  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-right': 'top-4 right-4',
  };

  // Collapsed state - just a button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-[9999] p-3 rounded-full bg-muted border border-border shadow-lg',
          'hover:bg-muted/80 transition-colors',
          positionClasses[position]
        )}
        title="Open Design Audit"
      >
        <Eye className="h-5 w-5 text-text-muted" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed z-[9999] w-80 bg-background border border-border rounded-xl shadow-2xl overflow-hidden',
        positionClasses[position]
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
        <h3 className="font-semibold text-text">Design Audit</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setHighlightTargets(!highlightTargets)}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              highlightTargets
                ? 'bg-primary/20 text-primary'
                : 'text-text-muted hover:text-text'
            )}
            title="Highlight touch targets"
          >
            {highlightTargets ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={runAudit}
            disabled={isRunning}
            className="p-1.5 rounded-md text-text-muted hover:text-text"
            title="Re-run audit"
          >
            <RefreshCw className={cn('h-4 w-4', isRunning && 'animate-spin')} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-md text-text-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary */}
      {report && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            {report.passed ? (
              <CheckCircle className="h-8 w-8 text-success" />
            ) : (
              <XCircle className="h-8 w-8 text-danger" />
            )}
            <div>
              <p className="font-semibold text-text">
                {report.passed ? 'Compliant' : 'Issues Found'}
              </p>
              <p className="text-xs text-text-muted">
                {new Date(report.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="p-2 rounded-lg bg-success/10">
              <p className="font-bold text-success">{report.summary.pass}</p>
              <p className="text-xs text-success/80">Pass</p>
            </div>
            <div className="p-2 rounded-lg bg-warning/10">
              <p className="font-bold text-warning">{report.summary.warning}</p>
              <p className="text-xs text-warning/80">Warn</p>
            </div>
            <div className="p-2 rounded-lg bg-danger/10">
              <p className="font-bold text-danger">{report.summary.fail}</p>
              <p className="text-xs text-danger/80">Fail</p>
            </div>
          </div>
        </div>
      )}

      {/* Findings */}
      {report && (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm text-text-muted hover:bg-muted"
          >
            <span>
              {report.findings.filter((f) => f.severity !== 'pass').length} issues
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {isExpanded && (
            <div className="max-h-64 overflow-y-auto border-t border-border">
              {report.findings
                .filter((f) => f.severity !== 'pass')
                .map((finding, index) => (
                  <FindingRow key={index} finding={finding} />
                ))}
              {report.findings.filter((f) => f.severity !== 'pass').length ===
                0 && (
                <p className="px-4 py-6 text-center text-sm text-text-muted">
                  All checks passed!
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {isRunning && !report && (
        <div className="p-8 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-2 text-text-muted animate-spin" />
          <p className="text-sm text-text-muted">Running audit...</p>
        </div>
      )}
    </div>
  );
}

/**
 * Individual finding row
 */
function FindingRow({ finding }: { finding: AuditFinding }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-2 px-4 py-2 text-left hover:bg-muted/50"
      >
        {finding.severity === 'fail' ? (
          <XCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text">{finding.rule}</p>
          <p className="text-xs text-text-muted truncate">{finding.message}</p>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 text-xs space-y-1">
          {finding.selector && (
            <p className="text-text-muted font-mono bg-muted px-2 py-1 rounded">
              {finding.selector}
            </p>
          )}
          {finding.actual && (
            <p className="text-text-muted">
              <span className="font-medium">Actual:</span> {finding.actual}
            </p>
          )}
          {finding.expected && (
            <p className="text-text-muted">
              <span className="font-medium">Expected:</span> {finding.expected}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Minimal audit badge for production
 */
export function AuditBadge() {
  const [isCompliant, setIsCompliant] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const report = await runFullAudit();
      setIsCompliant(report.passed);
    };
    check();
  }, []);

  if (isCompliant === null) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 p-2 rounded-full',
        isCompliant ? 'bg-success/20' : 'bg-danger/20'
      )}
      title={isCompliant ? 'Design Compliant' : 'Design Issues Found'}
    >
      {isCompliant ? (
        <CheckCircle className="h-4 w-4 text-success" />
      ) : (
        <XCircle className="h-4 w-4 text-danger" />
      )}
    </div>
  );
}

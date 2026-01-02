'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Phone,
  DollarSign,
  TrendingUp,
  Clock,
  Copy,
  Mail,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// =====================================================
// TYPES
// =====================================================

interface ROIInputs {
  missedCallsPerWeek: number;
  averageJobValue: number;
  closeRate: number;
  callbackSuccessRate?: number;
  competitorCaptureRate?: number;
}

interface ROIResults {
  monthlyMissedCalls: number;
  callsLostToCompetitors: number;
  potentialRevenueLost: number;
  callsCaptured: number;
  jobsRecovered: number;
  revenueRecovered: number;
  leadsCaptainCost: number;
  netMonthlySavings: number;
  netYearlySavings: number;
  roiMultiple: number;
  paybackDays: string | number;
  breakEvenCalls: number;
}

interface IndustryPreset {
  id: string;
  name: string;
  icon: string;
  missedCallsPerWeek: number;
  averageJobValue: number;
  closeRate: number;
}

// =====================================================
// CONSTANTS
// =====================================================

const LEADS_CAPTAIN_COST = 29;
const LEADS_CAPTAIN_CAPTURE_RATE = 0.85;
const WEEKS_PER_MONTH = 4;
const MONTHS_PER_YEAR = 12;

const INDUSTRY_PRESETS: IndustryPreset[] = [
  { id: 'plumber', name: 'Plumber', icon: '🔧', missedCallsPerWeek: 7, averageJobValue: 350, closeRate: 0.45 },
  { id: 'electrician', name: 'Electrician', icon: '⚡', missedCallsPerWeek: 6, averageJobValue: 400, closeRate: 0.40 },
  { id: 'hvac', name: 'HVAC', icon: '❄️', missedCallsPerWeek: 8, averageJobValue: 500, closeRate: 0.35 },
  { id: 'roofer', name: 'Roofer', icon: '🏠', missedCallsPerWeek: 5, averageJobValue: 1200, closeRate: 0.25 },
  { id: 'handyman', name: 'Handyman', icon: '🛠️', missedCallsPerWeek: 10, averageJobValue: 150, closeRate: 0.50 },
  { id: 'landscaper', name: 'Landscaper', icon: '🌳', missedCallsPerWeek: 8, averageJobValue: 250, closeRate: 0.45 },
  { id: 'cleaning', name: 'Cleaning', icon: '🧹', missedCallsPerWeek: 12, averageJobValue: 120, closeRate: 0.55 },
];

// =====================================================
// CALCULATION LOGIC
// =====================================================

function calculateROI(inputs: ROIInputs): ROIResults {
  const {
    missedCallsPerWeek,
    averageJobValue,
    closeRate,
    competitorCaptureRate = 0.70,
  } = inputs;

  // Monthly calls
  const monthlyMissedCalls = missedCallsPerWeek * WEEKS_PER_MONTH;

  // Without Leads Captain
  const callsLostToCompetitors = monthlyMissedCalls * competitorCaptureRate;
  const potentialRevenueLost = callsLostToCompetitors * averageJobValue * closeRate;

  // With Leads Captain
  const callsCaptured = monthlyMissedCalls * LEADS_CAPTAIN_CAPTURE_RATE;
  const jobsRecovered = callsCaptured * closeRate;
  const revenueRecovered = jobsRecovered * averageJobValue;

  // Net impact
  const netMonthlySavings = revenueRecovered - LEADS_CAPTAIN_COST;
  const netYearlySavings = netMonthlySavings * MONTHS_PER_YEAR;

  // ROI metrics
  const roiMultiple = revenueRecovered / LEADS_CAPTAIN_COST;
  const dailyRevenue = revenueRecovered / 30;
  const paybackDays = dailyRevenue > 0 ? LEADS_CAPTAIN_COST / dailyRevenue : 999;

  // Break-even
  const revenuePerCall = averageJobValue * closeRate;
  const breakEvenCalls = revenuePerCall > 0 ? LEADS_CAPTAIN_COST / revenuePerCall : 999;

  return {
    monthlyMissedCalls,
    callsLostToCompetitors: Math.round(callsLostToCompetitors),
    potentialRevenueLost: Math.round(potentialRevenueLost),
    callsCaptured: Math.round(callsCaptured),
    jobsRecovered: Math.round(jobsRecovered * 10) / 10,
    revenueRecovered: Math.round(revenueRecovered),
    leadsCaptainCost: LEADS_CAPTAIN_COST,
    netMonthlySavings: Math.round(netMonthlySavings),
    netYearlySavings: Math.round(netYearlySavings),
    roiMultiple: Math.round(roiMultiple),
    paybackDays: paybackDays < 1 ? '< 1' : Math.round(paybackDays),
    breakEvenCalls: Math.round(breakEvenCalls * 10) / 10,
  };
}

// =====================================================
// COMPONENT
// =====================================================

interface ROICalculatorProps {
  onGetStarted?: () => void;
  className?: string;
  showAdvanced?: boolean;
  variant?: 'full' | 'compact';
}

export function ROICalculator({
  onGetStarted,
  className,
  showAdvanced: initialShowAdvanced = false,
  variant = 'full',
}: ROICalculatorProps) {
  // State
  const [missedCallsPerWeek, setMissedCallsPerWeek] = useState(5);
  const [averageJobValue, setAverageJobValue] = useState(300);
  const [closeRate, setCloseRate] = useState(0.40);
  const [callbackSuccessRate, setCallbackSuccessRate] = useState(0.30);
  const [competitorCaptureRate, setCompetitorCaptureRate] = useState(0.70);
  const [showAdvanced, setShowAdvanced] = useState(initialShowAdvanced);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Calculate results
  const results = useMemo(() => calculateROI({
    missedCallsPerWeek,
    averageJobValue,
    closeRate,
    callbackSuccessRate,
    competitorCaptureRate,
  }), [missedCallsPerWeek, averageJobValue, closeRate, callbackSuccessRate, competitorCaptureRate]);

  // Apply preset
  const applyPreset = useCallback((preset: IndustryPreset) => {
    setMissedCallsPerWeek(preset.missedCallsPerWeek);
    setAverageJobValue(preset.averageJobValue);
    setCloseRate(preset.closeRate);
    setSelectedPreset(preset.id);
    setHasInteracted(true);

    // Track analytics
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'roi_calculator_preset', { preset: preset.id });
    }
  }, []);

  // Handle slider change
  const handleSliderChange = useCallback((setter: (value: number) => void, name: string) => {
    return (value: number[]) => {
      setter(value[0]);
      setSelectedPreset(null);
      setHasInteracted(true);

      // Track analytics
      if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
        (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'roi_calculator_input', {
          input_name: name,
          input_value: value[0],
        });
      }
    };
  }, []);

  // Copy results
  const copyResults = useCallback(async () => {
    const text = `📊 Leads Captain ROI Calculation

Current situation:
• ${results.monthlyMissedCalls} missed calls/month
• $${averageJobValue} average job
• ${Math.round(closeRate * 100)}% close rate

Without Leads Captain: Losing ~$${results.potentialRevenueLost.toLocaleString()}/month
With Leads Captain: Save $${results.netMonthlySavings.toLocaleString()}/month

That's a ${results.roiMultiple}x return on a $29/month investment.
Payback period: ${results.paybackDays === '< 1' ? 'Less than 1 day' : `${results.paybackDays} days`}.

Get Leads Captain — $29/mo → https://tradescaptain.com/leads-captain`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
        (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'roi_calculator_share', { method: 'copy' });
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [results, averageJobValue, closeRate]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={cn('w-full max-w-4xl mx-auto', className)}>
      <Card className="border-2">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl md:text-3xl font-bold">
            💰 How Much Are Missed Calls Costing You?
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            Slide the values to see your potential savings
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Industry Presets */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Quick select your trade:</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPreset === preset.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="text-sm"
                >
                  {preset.icon} {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-8">
            {/* Missed Calls Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  How many calls do you miss per week?
                </label>
                <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
                  {missedCallsPerWeek} calls
                </Badge>
              </div>
              <Slider
                value={[missedCallsPerWeek]}
                onValueChange={handleSliderChange(setMissedCallsPerWeek, 'missed_calls')}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>20</span>
              </div>
            </div>

            {/* Average Job Value Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  What&apos;s your average job worth?
                </label>
                <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
                  {formatCurrency(averageJobValue)}
                </Badge>
              </div>
              <Slider
                value={[averageJobValue]}
                onValueChange={handleSliderChange(setAverageJobValue, 'avg_job_value')}
                min={100}
                max={2000}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$100</span>
                <span>$2,000</span>
              </div>
            </div>

            {/* Close Rate Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  What % of leads become jobs?
                </label>
                <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
                  {Math.round(closeRate * 100)}%
                </Badge>
              </div>
              <Slider
                value={[closeRate * 100]}
                onValueChange={(value) => handleSliderChange((v) => setCloseRate(v / 100), 'close_rate')(value)}
                min={10}
                max={80}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10%</span>
                <span>80%</span>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          {variant === 'full' && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-muted-foreground"
              >
                {showAdvanced ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                Advanced options
              </Button>

              {showAdvanced && (
                <div className="mt-4 space-y-6 p-4 bg-muted/50 rounded-lg">
                  {/* Callback Success Rate */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">
                        When you call back later, how often do they still need you?
                      </label>
                      <Badge variant="outline" className="font-bold">
                        {Math.round(callbackSuccessRate * 100)}%
                      </Badge>
                    </div>
                    <Slider
                      value={[callbackSuccessRate * 100]}
                      onValueChange={(value) => handleSliderChange((v) => setCallbackSuccessRate(v / 100), 'callback_rate')(value)}
                      min={10}
                      max={60}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Competitor Capture Rate */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">
                        How often does a missed call go to a competitor?
                      </label>
                      <Badge variant="outline" className="font-bold">
                        {Math.round(competitorCaptureRate * 100)}%
                      </Badge>
                    </div>
                    <Slider
                      value={[competitorCaptureRate * 100]}
                      onValueChange={(value) => handleSliderChange((v) => setCompetitorCaptureRate(v / 100), 'competitor_rate')(value)}
                      min={30}
                      max={90}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Section */}
          <div className={cn(
            'rounded-lg border-2 p-6 transition-all duration-300',
            hasInteracted ? 'border-primary bg-primary/5' : 'border-muted'
          )}>
            <h3 className="text-lg font-semibold text-center mb-6">Your Results</h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Without Leads Captain */}
              <div className="space-y-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <h4 className="font-semibold text-red-700 dark:text-red-400">Without Leads Captain</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>📞 Missed calls/month</span>
                    <span className="font-medium">{results.monthlyMissedCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>❌ Go to competitors</span>
                    <span className="font-medium">{Math.round(competitorCaptureRate * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-red-600 dark:text-red-400 font-bold text-base pt-2 border-t">
                    <span>💸 Revenue lost</span>
                    <span>{formatCurrency(results.potentialRevenueLost)}/mo</span>
                  </div>
                </div>
              </div>

              {/* With Leads Captain */}
              <div className="space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <h4 className="font-semibold text-green-700 dark:text-green-400">With Leads Captain</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>📞 Missed calls/month</span>
                    <span className="font-medium">{results.monthlyMissedCalls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>✅ Captured by AI</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💰 Revenue recovered</span>
                    <span className="font-medium">{formatCurrency(results.revenueRecovered)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>− Leads Captain cost</span>
                    <span className="font-medium">−$29</span>
                  </div>
                  <div className="flex justify-between text-green-600 dark:text-green-400 font-bold text-base pt-2 border-t">
                    <span>= Net saved</span>
                    <span>{formatCurrency(results.netMonthlySavings)}/mo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {formatCurrency(results.netYearlySavings)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">saved/year</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {results.roiMultiple}x
                </div>
                <div className="text-xs text-muted-foreground mt-1">return</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {results.paybackDays} {typeof results.paybackDays === 'number' ? 'days' : 'day'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">to pay off</div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-4 text-center">
            <Button
              size="lg"
              className="w-full md:w-auto px-12 text-lg"
              onClick={() => {
                if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
                  (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'roi_calculator_cta_click');
                }
                onGetStarted?.();
              }}
            >
              Get Started — $29/mo →
            </Button>

            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={copyResults}
                className="text-xs"
              >
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? 'Copied!' : 'Copy Results'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const subject = encodeURIComponent('Your Leads Captain ROI Calculation');
                  const body = encodeURIComponent(`Based on your numbers, you could save $${results.netMonthlySavings}/month with Leads Captain.\n\nLearn more: https://tradescaptain.com/leads-captain`);
                  window.open(`mailto:?subject=${subject}&body=${body}`);

                  if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
                    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'roi_calculator_share', { method: 'email' });
                  }
                }}
              >
                <Mail className="h-3 w-3 mr-1" />
                Email Results
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Leads Captain: $29/month • No contract • Cancel anytime
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================
// COMPACT WIDGET VERSION
// =====================================================

export function ROICalculatorWidget({
  className,
  onGetStarted,
}: {
  className?: string;
  onGetStarted?: () => void;
}) {
  const [missedCallsPerWeek, setMissedCallsPerWeek] = useState(5);
  const [averageJobValue, setAverageJobValue] = useState(300);
  const [closeRate] = useState(0.40);

  const results = useMemo(() => calculateROI({
    missedCallsPerWeek,
    averageJobValue,
    closeRate,
  }), [missedCallsPerWeek, averageJobValue, closeRate]);

  return (
    <Card className={cn('border-2', className)}>
      <CardContent className="p-4 space-y-4">
        <h3 className="font-semibold text-center">Quick ROI Calculator</h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Missed calls/week</span>
              <span className="font-bold">{missedCallsPerWeek}</span>
            </div>
            <Slider
              value={[missedCallsPerWeek]}
              onValueChange={(v) => setMissedCallsPerWeek(v[0])}
              min={1}
              max={20}
              step={1}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Avg job value</span>
              <span className="font-bold">${averageJobValue}</span>
            </div>
            <Slider
              value={[averageJobValue]}
              onValueChange={(v) => setAverageJobValue(v[0])}
              min={100}
              max={2000}
              step={50}
            />
          </div>
        </div>

        <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
          <div className="text-sm text-muted-foreground">You could save</div>
          <div className="text-2xl font-bold text-green-600">
            ${results.netMonthlySavings.toLocaleString()}/mo
          </div>
        </div>

        <Button className="w-full" size="sm" onClick={onGetStarted}>
          Calculate Full ROI →
        </Button>
      </CardContent>
    </Card>
  );
}

export { calculateROI, type ROIInputs, type ROIResults, INDUSTRY_PRESETS };

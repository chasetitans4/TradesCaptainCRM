import { calculateROI, type ROIInputs } from '@/components/leads-captain/roi-calculator';

describe('calculateROI', () => {
  it('computes results for typical inputs', () => {
    const inputs: ROIInputs = {
      missedCallsPerWeek: 5,
      averageJobValue: 300,
      closeRate: 0.4,
    };
    const res = calculateROI(inputs);
    expect(res.monthlyMissedCalls).toBe(20);
    expect(res.callsLostToCompetitors).toBe(14);
    expect(res.potentialRevenueLost).toBe(1680);
    expect(res.callsCaptured).toBe(17);
    expect(res.jobsRecovered).toBe(6.8);
    expect(res.revenueRecovered).toBe(2040);
    expect(res.leadsCaptainCost).toBe(29);
    expect(res.netMonthlySavings).toBe(2011);
    expect(res.netYearlySavings).toBe(24132);
    expect(res.roiMultiple).toBe(70);
    expect(res.paybackDays).toBe('< 1');
    expect(res.breakEvenCalls).toBe(0.2);
  });

  it('returns numeric paybackDays when recovery is modest', () => {
    const inputs: ROIInputs = {
      missedCallsPerWeek: 2,
      averageJobValue: 100,
      closeRate: 0.1,
    };
    const res = calculateROI(inputs);
    expect(typeof res.paybackDays).toBe('number');
    expect(res.paybackDays).toBe(13);
  });

  it('handles zero close rate', () => {
    const inputs: ROIInputs = {
      missedCallsPerWeek: 8,
      averageJobValue: 500,
      closeRate: 0,
    };
    const res = calculateROI(inputs);
    expect(res.potentialRevenueLost).toBe(0);
    expect(res.revenueRecovered).toBe(0);
    expect(res.netMonthlySavings).toBe(-29);
    expect(res.netYearlySavings).toBe(-348);
    expect(res.roiMultiple).toBe(0);
    expect(res.paybackDays).toBe(999);
    expect(res.breakEvenCalls).toBe(999);
  });

  it('honors competitorCaptureRate override', () => {
    const inputs: ROIInputs = {
      missedCallsPerWeek: 3,
      averageJobValue: 1000,
      closeRate: 0.5,
      competitorCaptureRate: 0.9,
    };
    const res = calculateROI(inputs);
    expect(res.monthlyMissedCalls).toBe(12);
    expect(res.callsLostToCompetitors).toBe(11);
    expect(res.potentialRevenueLost).toBe(5400);
    expect(res.callsCaptured).toBe(10);
    expect(res.jobsRecovered).toBe(5.1);
    expect(res.revenueRecovered).toBe(5100);
    expect(res.netMonthlySavings).toBe(5071);
    expect(res.netYearlySavings).toBe(60852);
    expect(res.roiMultiple).toBe(176);
  });
});

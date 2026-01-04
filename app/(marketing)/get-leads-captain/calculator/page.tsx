'use client';

import { useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { ROICalculator } from '@/components/leads-captain/roi-calculator';

function ROICalculatorPageContent() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'roi_calculator_view');
    }
  }, []);

  const handleGetStarted = () => {
    router.push('/signup?plan=leads_captain');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="text-xl font-bold">
            TradesCaptain
          </a>
          <a href="/signup?plan=leads_captain" className="text-sm font-medium text-primary hover:underline">
            Get Started →
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Leads Captain ROI Calculator</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See exactly how much revenue you're losing to missed calls — and how much you could save with Leads Captain AI.
          </p>
        </div>

        <ROICalculator onGetStarted={handleGetStarted} variant="full" className="mb-12" />

        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold">Why Contractors Trust Leads Captain</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-medium">Responds in 5 seconds</h3>
              <p className="text-sm text-muted-foreground">AI texts your missed calls instantly</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="font-medium">Captures lead info</h3>
              <p className="text-sm text-muted-foreground">Gets service needed, address, urgency</p>
            </div>
            <div className="p-4">
              <div className="text-3xl mb-2">📱</div>
              <h3 className="font-medium">Notifies you instantly</h3>
              <p className="text-sm text-muted-foreground">SMS, email, and push notifications</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 TradesCaptain. All rights reserved.</p>
          <p className="mt-2">Leads Captain: $29/month • No contracts • Cancel anytime</p>
        </div>
      </footer>
    </div>
  );
}

export default function ROICalculatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ROICalculatorPageContent />
    </Suspense>
  );
}

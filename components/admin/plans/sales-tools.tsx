'use client';

// =====================================================
// SALES TOOLS SIDEBAR
// Quick access to feature sheets, calculator, and resources
// Version: 5.8.1
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Download,
  Calculator,
  MessageSquare,
  BarChart3,
  ChevronRight,
  DollarSign,
  Briefcase,
} from 'lucide-react';
import { PlanComparator } from './plan-comparator';
import { CommissionCalculator, UpgradeCommissionCalculator, CommissionQuickReference } from '@/components/admin/commission';

interface SalesToolsProps {
  onOpenComparator?: () => void;
}

// Feature sheets configuration
const FEATURE_SHEETS = [
  { id: 'leads_captain', name: 'Leads Captain', icon: MessageSquare },
  { id: 'blue', name: 'Blue CRM', icon: FileText },
  { id: 'web', name: 'Web', icon: FileText },
  { id: 'silver', name: 'Silver', icon: FileText },
  { id: 'gold', name: 'Gold', icon: FileText },
  { id: 'local_seo', name: 'Local SEO', icon: FileText },
];

const QUICK_REFERENCES = [
  { id: 'price_sheet', name: 'Price Sheet', icon: FileText },
  { id: 'commission_calc', name: 'Commission Calculator', icon: Calculator },
  { id: 'demo_script', name: 'Demo Script', icon: MessageSquare },
];

export function SalesTools({ onOpenComparator }: SalesToolsProps) {
  const [comparatorOpen, setComparatorOpen] = useState(false);
  const [commissionCalcOpen, setCommissionCalcOpen] = useState(false);

  const handleDownload = (type: string, id: string) => {
    // In production, this would download actual PDFs from a CDN or API
    const url = `/api/admin/sales-tools/download?type=${type}&id=${id}`;
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4" />
          Sales Tools
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Feature Sheets */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-text-muted">Feature Sheets</h4>
          <div className="space-y-1">
            {FEATURE_SHEETS.map((sheet) => (
              <Button
                key={sheet.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handleDownload('feature_sheet', sheet.id)}
              >
                <sheet.icon className="h-4 w-4 mr-2" />
                {sheet.name}
                <Download className="h-3 w-3 ml-auto opacity-50" />
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Quick References */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-text-muted">Quick References</h4>
          <div className="space-y-1">
            {QUICK_REFERENCES.map((ref) => (
              <Button
                key={ref.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => handleDownload('reference', ref.id)}
              >
                <ref.icon className="h-4 w-4 mr-2" />
                {ref.name}
                <Download className="h-3 w-3 ml-auto opacity-50" />
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Comparison Tools */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-text-muted">Comparison Tools</h4>
          <Sheet open={comparatorOpen} onOpenChange={setComparatorOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <BarChart3 className="h-4 w-4 mr-2" />
                Plan Comparator
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Plan Comparator</SheetTitle>
                <SheetDescription>
                  Compare plans side-by-side to help customers choose the right fit.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <PlanComparator />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Separator />

        {/* Commission Tools */}
        <div>
          <h4 className="text-sm font-medium mb-2 text-text-muted">Commission Tools</h4>
          <div className="space-y-2">
            <Sheet open={commissionCalcOpen} onOpenChange={setCommissionCalcOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Commission Calculator
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Commission Calculator</SheetTitle>
                  <SheetDescription>
                    Calculate your commission for new sales and upgrades.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <Tabs defaultValue="new-sale">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="new-sale">New Sale</TabsTrigger>
                      <TabsTrigger value="upgrade">Upgrade</TabsTrigger>
                    </TabsList>
                    <TabsContent value="new-sale" className="mt-4">
                      <CommissionCalculator />
                    </TabsContent>
                    <TabsContent value="upgrade" className="mt-4">
                      <UpgradeCommissionCalculator />
                    </TabsContent>
                  </Tabs>
                </div>
              </SheetContent>
            </Sheet>

            {/* Quick Reference inline */}
            <CommissionQuickReference />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for sidebar
export function SalesToolsCompact() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Briefcase className="h-4 w-4 mr-2" />
          Sales Tools
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Sales Tools</SheetTitle>
          <SheetDescription>
            Quick access to feature sheets and resources.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <SalesTools />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SalesTools;

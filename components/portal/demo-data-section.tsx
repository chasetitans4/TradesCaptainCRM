'use client';

import { useState, useEffect } from 'react';
import { FlaskConical, Calendar, Receipt, Wrench, MessageSquare, FileText, FileCheck, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { isDemoMode, enableDemoMode, disableDemoMode, DEMO_DATA_COUNTS } from '@/lib/portal/demo-data';

interface DemoDataSectionProps {
  onDemoModeChange?: (enabled: boolean) => void;
}

export function DemoDataSection({ onDemoModeChange }: DemoDataSectionProps) {
  const [demoModeActive, setDemoModeActive] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDemoModeActive(isDemoMode());
  }, []);

  const handleEnableDemo = () => {
    enableDemoMode();
    setDemoModeActive(true);
    if (onDemoModeChange) {
      onDemoModeChange(true);
    } else {
      // Refresh to show demo data
      window.location.reload();
    }
  };

  const handleClearDemo = () => {
    setShowClearDialog(true);
  };

  const confirmClearDemo = () => {
    disableDemoMode();
    setDemoModeActive(false);
    setShowClearDialog(false);
    if (onDemoModeChange) {
      onDemoModeChange(false);
    } else {
      // Refresh to clear demo data
      window.location.reload();
    }
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Demo Data
          </CardTitle>
          <CardDescription>
            Load sample data to explore the customer portal features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Demo Data
          </CardTitle>
          <CardDescription>
            Load sample data to explore the customer portal features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data counts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{DEMO_DATA_COUNTS.appointments} appointments</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Receipt className="h-4 w-4" />
              <span>{DEMO_DATA_COUNTS.invoices} invoices</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wrench className="h-4 w-4" />
              <span>{DEMO_DATA_COUNTS.equipment} equipment</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{DEMO_DATA_COUNTS.messages} messages</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{DEMO_DATA_COUNTS.documents} documents</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileCheck className="h-4 w-4" />
              <span>{DEMO_DATA_COUNTS.quotes} quotes</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {demoModeActive ? (
              <Button
                variant="outline"
                onClick={handleClearDemo}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                Clear Demo Data
              </Button>
            ) : (
              <Button onClick={handleEnableDemo}>
                <FlaskConical className="h-4 w-4 mr-2" />
                Load Demo Data
              </Button>
            )}
          </div>

          {/* Status indicator */}
          {demoModeActive && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-amber-800">
                <span className="font-medium">Demo mode is active.</span>{' '}
                Sample data is being displayed throughout the portal. Clear demo data to return to normal view.
              </div>
            </div>
          )}

          {!demoModeActive && (
            <p className="text-xs text-muted-foreground">
              Demo data is stored locally in your browser and can be cleared anytime.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Clear confirmation dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Demo Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all demo data from view and return the portal to its normal state.
              You can reload demo data anytime from settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearDemo}>
              Clear Demo Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

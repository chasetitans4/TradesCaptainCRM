'use client';

import Link from 'next/link';
import { useFeatureAvailability } from '@/hooks/usePrerequisites';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton-loaders';
import { AlertCircle, CheckCircle2, ArrowRight, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeatureId, PrerequisiteStatus } from '@/lib/onboarding/prerequisites';

interface PrerequisiteGateProps {
  featureId: FeatureId;
  children: React.ReactNode;
  /**
   * If true, shows children with a warning banner instead of blocking.
   * Use for features that work partially without all prerequisites.
   */
  softBlock?: boolean;
  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;
  /**
   * Custom blocked component
   */
  blockedComponent?: React.ReactNode;
  /**
   * Callback when a prerequisite is clicked
   */
  onPrerequisiteClick?: (prereq: PrerequisiteStatus) => void;
}

/**
 * Gate component that blocks or warns about missing prerequisites.
 *
 * @example
 * ```tsx
 * <PrerequisiteGate featureId="messaging">
 *   <MessagingDashboard />
 * </PrerequisiteGate>
 * ```
 */
export function PrerequisiteGate({
  featureId,
  children,
  softBlock = false,
  loadingComponent,
  blockedComponent,
  onPrerequisiteClick,
}: PrerequisiteGateProps) {
  const {
    loading,
    isAvailable,
    missingPrerequisites,
    recommendedPrerequisites,
    message,
  } = useFeatureAvailability(featureId);

  if (loading) {
    return (
      loadingComponent ?? (
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      )
    );
  }

  if (isAvailable && recommendedPrerequisites.length === 0) {
    return <>{children}</>;
  }

  if (isAvailable && recommendedPrerequisites.length > 0) {
    // Show children with recommendation banner
    return (
      <>
        <RecommendationBanner
          prerequisites={recommendedPrerequisites}
          onPrerequisiteClick={onPrerequisiteClick}
        />
        {children}
      </>
    );
  }

  if (softBlock) {
    // Show children with warning banner
    return (
      <>
        <WarningBanner
          prerequisites={missingPrerequisites}
          message={message}
          onPrerequisiteClick={onPrerequisiteClick}
        />
        {children}
      </>
    );
  }

  // Show blocked state
  return (
    blockedComponent ?? (
      <BlockedState
        missingPrerequisites={missingPrerequisites}
        message={message}
        onPrerequisiteClick={onPrerequisiteClick}
      />
    )
  );
}

function BlockedState({
  missingPrerequisites,
  message,
  onPrerequisiteClick,
}: {
  missingPrerequisites: PrerequisiteStatus[];
  message: string;
  onPrerequisiteClick?: (prereq: PrerequisiteStatus) => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <Settings2 className="w-6 h-6 text-warning" />
          </div>
          <CardTitle>Setup Required</CardTitle>
          <CardDescription className="mt-2">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {missingPrerequisites.map((prereq) => (
              <PrerequisiteItem
                key={prereq.id}
                prereq={prereq}
                onClick={onPrerequisiteClick}
              />
            ))}
          </div>
          <div className="pt-4 border-t">
            <Button asChild className="w-full">
              <Link href={missingPrerequisites[0]?.configUrl ?? '/settings'}>
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WarningBanner({
  prerequisites,
  message,
  onPrerequisiteClick,
}: {
  prerequisites: PrerequisiteStatus[];
  message: string;
  onPrerequisiteClick?: (prereq: PrerequisiteStatus) => void;
}) {
  return (
    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {prerequisites.map((prereq) => (
              <Link
                key={prereq.id}
                href={prereq.configUrl}
                onClick={() => onPrerequisiteClick?.(prereq)}
                className="text-sm text-warning hover:text-warning/80 underline"
              >
                Configure {prereq.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationBanner({
  prerequisites,
  onPrerequisiteClick,
}: {
  prerequisites: PrerequisiteStatus[];
  onPrerequisiteClick?: (prereq: PrerequisiteStatus) => void;
}) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Enhance your experience
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Set up these optional features for the best experience:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {prerequisites.map((prereq) => (
              <Link
                key={prereq.id}
                href={prereq.configUrl}
                onClick={() => onPrerequisiteClick?.(prereq)}
                className="text-sm text-primary hover:text-primary/80 underline"
              >
                {prereq.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrerequisiteItem({
  prereq,
  onClick,
}: {
  prereq: PrerequisiteStatus;
  onClick?: (prereq: PrerequisiteStatus) => void;
}) {
  return (
    <Link
      href={prereq.configUrl}
      onClick={() => onClick?.(prereq)}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        'hover:bg-muted hover:border-primary',
        prereq.configured
          ? 'border-success/20 bg-success/5'
          : 'border-border bg-card'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          prereq.configured ? 'bg-success/10' : 'bg-muted'
        )}
      >
        {prereq.configured ? (
          <CheckCircle2 className="w-4 h-4 text-success" />
        ) : (
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{prereq.name}</p>
        <p className="text-xs text-muted-foreground">{prereq.description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
    </Link>
  );
}

/**
 * Setup progress indicator component
 */
export function SetupProgress() {
  const { percentage, completed, total, loading } = useSetupProgress();

  if (loading) {
    return <Skeleton className="h-2 w-full" />;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Setup progress</span>
        <span className="font-medium">
          {completed}/{total} complete
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Need to import this hook
import { useSetupProgress } from '@/hooks/usePrerequisites';

'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CameraCapture, type CapturedPhoto } from './camera-capture';
import {
  Camera,
  ImageIcon,
  Link2,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';

/**
 * Photo pair for before/after documentation
 */
export interface PhotoPair {
  id: string;
  before: CapturedPhoto;
  after?: CapturedPhoto;
  isPaired: boolean;
}

interface BeforeAfterPairingProps {
  /** Job ID for metadata */
  jobId: string;
  /** Technician ID for metadata */
  technicianId: string;
  /** Technician name for display */
  technicianName?: string;
  /** Callback when a pair is completed */
  onPairComplete: (pair: PhotoPair) => void;
  /** Callback when a single "before" photo is saved without pairing */
  onBeforeSaved: (photo: CapturedPhoto) => void;
  /** Close the pairing workflow */
  onClose: () => void;
  /** Additional class names */
  className?: string;
}

type PairingStep = 'before' | 'prompt' | 'after' | 'review';

/**
 * Before/After Photo Pairing Workflow
 *
 * Per Design Constitution Section 3.10.3 - Before/After Pairing:
 *
 * Prompted workflow:
 * 1. First photo captured → "Is this a BEFORE photo?" (Yes/No/Just a photo)
 * 2. If Yes → Photo tagged as "Before"
 * 3. On subsequent capture → "Is this the AFTER for [thumbnail]?" (Yes/No/New before)
 * 4. If Yes → Photos paired automatically
 *
 * Visual pairing:
 * - Paired photos display side-by-side in job record
 * - Unpaired "Before" photos show reminder badge
 * - Proof of Work page pulls paired photos automatically
 */
export function BeforeAfterPairing({
  jobId,
  technicianId,
  technicianName,
  onPairComplete,
  onBeforeSaved,
  onClose,
  className,
}: BeforeAfterPairingProps) {
  const [step, setStep] = useState<PairingStep>('before');
  const [beforePhoto, setBeforePhoto] = useState<CapturedPhoto | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<CapturedPhoto | null>(null);

  // Handle before photo capture
  const handleBeforeCapture = useCallback((photo: CapturedPhoto) => {
    // Update photo type to 'before'
    const beforePhoto: CapturedPhoto = {
      ...photo,
      metadata: {
        ...photo.metadata,
        photoType: 'before',
      },
    };
    setBeforePhoto(beforePhoto);
    setStep('prompt');
  }, []);

  // Handle "take after" decision
  const handleTakeAfter = useCallback(() => {
    setStep('after');
  }, []);

  // Handle "save as before only" decision
  const handleSaveBeforeOnly = useCallback(() => {
    if (beforePhoto) {
      onBeforeSaved(beforePhoto);
      onClose();
    }
  }, [beforePhoto, onBeforeSaved, onClose]);

  // Handle after photo capture
  const handleAfterCapture = useCallback(
    (photo: CapturedPhoto) => {
      if (!beforePhoto) return;

      // Update photo with pairing info
      const pairedAfterPhoto: CapturedPhoto = {
        ...photo,
        metadata: {
          ...photo.metadata,
          photoType: 'after',
          pairedWithId: beforePhoto.id,
        },
      };
      setAfterPhoto(pairedAfterPhoto);
      setStep('review');
    },
    [beforePhoto]
  );

  // Confirm the pair
  const handleConfirmPair = useCallback(() => {
    if (!beforePhoto || !afterPhoto) return;

    const pair: PhotoPair = {
      id: `pair-${Date.now()}`,
      before: beforePhoto,
      after: afterPhoto,
      isPaired: true,
    };

    onPairComplete(pair);
    onClose();
  }, [beforePhoto, afterPhoto, onPairComplete, onClose]);

  // Retake after photo
  const handleRetakeAfter = useCallback(() => {
    setAfterPhoto(null);
    setStep('after');
  }, []);

  return (
    <div className={cn('fixed inset-0 z-50', className)}>
      {/* Step: Capture Before Photo */}
      {step === 'before' && (
        <CameraCapture
          jobId={jobId}
          technicianId={technicianId}
          technicianName={technicianName}
          onCapture={handleBeforeCapture}
          onClose={onClose}
          promptForPairing={false}
          defaultPhotoType="before"
        />
      )}

      {/* Step: Prompt for After */}
      {step === 'prompt' && beforePhoto && (
        <div className="h-full bg-black flex flex-col">
          {/* Header */}
          <header className="bg-black/80 px-4 py-3 safe-area-pt">
            <div className="flex items-center justify-between">
              <button onClick={onClose} className="p-2 text-white">
                <X className="h-6 w-6" />
              </button>
              <span className="text-white font-medium">Before Photo Saved</span>
              <div className="w-10" />
            </div>
          </header>

          {/* Before Photo Preview */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="relative w-full max-w-sm aspect-square rounded-xl overflow-hidden mb-6 border-2 border-success">
              <img
                src={beforePhoto.previewUrl}
                alt="Before"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-success text-white text-sm font-medium px-3 py-1 rounded-full">
                BEFORE
              </div>
            </div>

            <p className="text-white text-center text-lg mb-8">
              Would you like to take an "After" photo now?
            </p>

            {/* Options */}
            <div className="w-full max-w-sm space-y-3">
              <Button
                onClick={handleTakeAfter}
                className="w-full h-14 text-base bg-primary hover:bg-primary/90"
              >
                <Camera className="h-5 w-5 mr-2" />
                Take After Photo
                <ChevronRight className="h-5 w-5 ml-auto" />
              </Button>

              <Button
                onClick={handleSaveBeforeOnly}
                variant="outline"
                className="w-full h-14 text-base border-white/30 text-white hover:bg-white/10"
              >
                <Check className="h-5 w-5 mr-2" />
                Save Before Only
              </Button>

              <p className="text-white/60 text-sm text-center pt-2">
                You can add the "After" photo later from the job details
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step: Capture After Photo */}
      {step === 'after' && beforePhoto && (
        <CameraCapture
          jobId={jobId}
          technicianId={technicianId}
          technicianName={technicianName}
          onCapture={handleAfterCapture}
          onClose={() => setStep('prompt')}
          promptForPairing={false}
          defaultPhotoType="after"
          pairedWithId={beforePhoto.id}
          beforePhotoUrl={beforePhoto.previewUrl}
        />
      )}

      {/* Step: Review Pair */}
      {step === 'review' && beforePhoto && afterPhoto && (
        <div className="h-full bg-black flex flex-col">
          {/* Header */}
          <header className="bg-black/80 px-4 py-3 safe-area-pt">
            <div className="flex items-center justify-between">
              <button onClick={handleRetakeAfter} className="p-2 text-white">
                <X className="h-6 w-6" />
              </button>
              <span className="text-white font-medium">Review Photo Pair</span>
              <div className="w-10" />
            </div>
          </header>

          {/* Side-by-side Preview */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-lg flex gap-2 mb-4">
              {/* Before */}
              <div className="flex-1 relative aspect-square rounded-lg overflow-hidden border-2 border-white/20">
                <img
                  src={beforePhoto.previewUrl}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded">
                  BEFORE
                </div>
              </div>

              {/* Link icon */}
              <div className="flex items-center">
                <Link2 className="h-6 w-6 text-success" />
              </div>

              {/* After */}
              <div className="flex-1 relative aspect-square rounded-lg overflow-hidden border-2 border-success">
                <img
                  src={afterPhoto.previewUrl}
                  alt="After"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-success text-white text-xs font-medium px-2 py-1 rounded">
                  AFTER
                </div>
              </div>
            </div>

            <p className="text-white/80 text-center mb-6">
              These photos will be linked as a Before/After pair
            </p>

            {/* Actions */}
            <div className="w-full max-w-sm space-y-3">
              <Button
                onClick={handleConfirmPair}
                className="w-full h-14 text-base bg-success hover:bg-success/90"
              >
                <Check className="h-5 w-5 mr-2" />
                Save Photo Pair
              </Button>

              <Button
                onClick={handleRetakeAfter}
                variant="outline"
                className="w-full h-14 text-base border-white/30 text-white hover:bg-white/10"
              >
                <Camera className="h-5 w-5 mr-2" />
                Retake After Photo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Display component for a photo pair
 * Shows before/after side-by-side with linked indicator
 */
interface PhotoPairDisplayProps {
  pair: PhotoPair;
  onViewBefore?: () => void;
  onViewAfter?: () => void;
  className?: string;
}

export function PhotoPairDisplay({
  pair,
  onViewBefore,
  onViewAfter,
  className,
}: PhotoPairDisplayProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Before thumbnail */}
      <button
        onClick={onViewBefore}
        className="relative flex-1 aspect-square rounded-lg overflow-hidden"
      >
        <img
          src={pair.before.previewUrl}
          alt="Before"
          className="w-full h-full object-cover"
        />
        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
          Before
        </span>
      </button>

      {/* Link indicator */}
      {pair.isPaired && pair.after && (
        <Link2 className="h-4 w-4 text-success shrink-0" />
      )}

      {/* After thumbnail */}
      {pair.after ? (
        <button
          onClick={onViewAfter}
          className="relative flex-1 aspect-square rounded-lg overflow-hidden"
        >
          <img
            src={pair.after.previewUrl}
            alt="After"
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-1 left-1 bg-success text-white text-[10px] px-1.5 py-0.5 rounded">
            After
          </span>
        </button>
      ) : (
        // Placeholder for missing after photo
        <div className="flex-1 aspect-square rounded-lg bg-muted/20 border-2 border-dashed border-muted flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="h-6 w-6 text-muted mx-auto mb-1" />
            <span className="text-[10px] text-muted">After</span>
          </div>
        </div>
      )}
    </div>
  );
}

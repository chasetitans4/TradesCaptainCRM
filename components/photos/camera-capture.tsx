'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { compressPhoto, formatFileSize } from '@/lib/photos/compression';
import {
  createPhotoMetadata,
  type PhotoMetadata,
  type PhotoType,
  PHOTO_TYPE_LABELS,
} from '@/lib/photos/metadata';
import {
  Camera,
  X,
  Check,
  RotateCcw,
  Loader2,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/**
 * Captured photo with metadata and compressed data
 */
export interface CapturedPhoto {
  /** Unique ID for this capture */
  id: string;
  /** Compressed blob ready for upload */
  blob: Blob;
  /** Data URL for preview */
  previewUrl: string;
  /** Auto-generated metadata */
  metadata: PhotoMetadata;
  /** File size after compression */
  size: number;
  /** Original file size before compression */
  originalSize: number;
}

interface CameraCaptureProps {
  /** Job ID for metadata */
  jobId: string;
  /** Technician ID for metadata */
  technicianId: string;
  /** Technician name for display */
  technicianName?: string;
  /** Equipment ID if photographing specific equipment */
  equipmentId?: string;
  /** Callback when photo is captured and ready */
  onCapture: (photo: CapturedPhoto) => void;
  /** Callback to close the camera */
  onClose: () => void;
  /** Optional: prompt for before/after pairing */
  promptForPairing?: boolean;
  /** Optional: ID of "before" photo to pair with (for "after" shots) */
  pairedWithId?: string;
  /** Optional: preview of "before" photo for alignment guide */
  beforePhotoUrl?: string;
  /** Optional: default photo type */
  defaultPhotoType?: PhotoType;
  /** Additional class names */
  className?: string;
}

/**
 * Constitution-Compliant Camera Capture Component
 *
 * Per Design Constitution Section 3.10 - Photo Capture Workflow:
 *
 * Zero-Tap Camera Access (Section 3.10.1):
 * - Opens camera directly (no intermediate screens)
 * - No gallery selection, no mode choices
 *
 * Automatic Metadata Tagging (Section 3.10.2):
 * - Job ID, Timestamp, GPS, Technician auto-captured
 *
 * Compression (Section 3.10.4):
 * - Max 2048px, JPEG 80%, <500KB target
 */
export function CameraCapture({
  jobId,
  technicianId,
  technicianName,
  equipmentId,
  onCapture,
  onClose,
  promptForPairing = true,
  pairedWithId,
  beforePhotoUrl,
  defaultPhotoType = 'general',
  className,
}: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [photoType, setPhotoType] = useState<PhotoType>(
    pairedWithId ? 'after' : defaultPhotoType
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Auto-open camera on mount (zero-tap principle)
  useEffect(() => {
    // Small delay to ensure component is mounted
    const timer = setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle file selection (from camera)
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        onClose();
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setCapturedImage({ file, previewUrl });

      // If prompting for pairing, show type picker
      if (promptForPairing && !pairedWithId) {
        setShowTypePicker(true);
      }
    },
    [onClose, promptForPairing, pairedWithId]
  );

  // Process and finalize the capture
  const handleConfirm = useCallback(async () => {
    if (!capturedImage) return;

    setIsProcessing(true);

    try {
      // Compress photo (Constitution Section 3.10.4)
      const compressed = await compressPhoto(capturedImage.file);

      // Create metadata (Constitution Section 3.10.2)
      const metadata = await createPhotoMetadata({
        jobId,
        technicianId,
        technicianName,
        photoType,
        equipmentId,
        pairedWithId,
      });

      // Create captured photo object
      const photo: CapturedPhoto = {
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        blob: compressed.blob,
        previewUrl: compressed.dataUrl,
        metadata,
        size: compressed.size,
        originalSize: capturedImage.file.size,
      };

      onCapture(photo);
      onClose();
    } catch (error) {
      console.error('Error processing photo:', error);
      // TODO: Show error toast
    } finally {
      setIsProcessing(false);
    }
  }, [
    capturedImage,
    jobId,
    technicianId,
    technicianName,
    photoType,
    equipmentId,
    pairedWithId,
    onCapture,
    onClose,
  ]);

  // Retake photo
  const handleRetake = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage.previewUrl);
    }
    setCapturedImage(null);
    setShowTypePicker(false);
    fileInputRef.current?.click();
  }, [capturedImage]);

  // Cancel and close
  const handleCancel = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage.previewUrl);
    }
    onClose();
  }, [capturedImage, onClose]);

  // Photo type options for quick selection
  const photoTypeOptions: PhotoType[] = ['before', 'after', 'during', 'issue', 'general'];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black flex flex-col',
        className
      )}
    >
      {/* Hidden file input - configured for camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between px-4 py-3 safe-area-pt">
          <button
            onClick={handleCancel}
            className="p-2 text-white"
            aria-label="Close camera"
          >
            <X className="h-6 w-6" />
          </button>
          <span className="text-white font-medium">
            {pairedWithId ? 'Take After Photo' : 'Take Photo'}
          </span>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      {capturedImage ? (
        // Preview captured image
        <div className="flex-1 flex flex-col">
          {/* Image preview */}
          <div className="flex-1 relative">
            {/* Before photo overlay for alignment (if pairing) */}
            {beforePhotoUrl && (
              <img
                src={beforePhotoUrl}
                alt="Before reference"
                className="absolute inset-0 w-full h-full object-contain opacity-30"
              />
            )}
            <img
              src={capturedImage.previewUrl}
              alt="Captured"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Photo Type Picker */}
          {showTypePicker && (
            <div className="bg-black/80 px-4 py-3">
              <p className="text-white text-sm text-center mb-2">
                What type of photo is this?
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                {photoTypeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setPhotoType(type);
                      setShowTypePicker(false);
                    }}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      photoType === type
                        ? 'bg-primary text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    )}
                  >
                    {PHOTO_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-black px-4 py-4 safe-area-pb">
            <div className="flex items-center justify-between gap-4">
              {/* Retake */}
              <Button
                variant="ghost"
                onClick={handleRetake}
                className="text-white hover:bg-white/10"
                disabled={isProcessing}
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Retake
              </Button>

              {/* Photo Type Badge */}
              <button
                onClick={() => setShowTypePicker(!showTypePicker)}
                className="px-3 py-1.5 bg-white/10 rounded-full text-white text-sm"
                disabled={isProcessing}
              >
                {PHOTO_TYPE_LABELS[photoType]}
              </button>

              {/* Confirm */}
              <Button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="bg-success hover:bg-success/90 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Use Photo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Camera view (file input will open camera)
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white/60">
            <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Opening camera...</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 text-primary underline"
            >
              Tap to retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple photo capture trigger button
 * Opens CameraCapture in a modal/overlay
 */
interface PhotoCaptureTriggerProps {
  jobId: string;
  technicianId: string;
  technicianName?: string;
  onCapture: (photo: CapturedPhoto) => void;
  className?: string;
  children?: React.ReactNode;
}

export function PhotoCaptureTrigger({
  jobId,
  technicianId,
  technicianName,
  onCapture,
  className,
  children,
}: PhotoCaptureTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center justify-center gap-2',
          'min-w-[50px] min-h-[50px]', // Constitution touch target
          className
        )}
      >
        {children || (
          <>
            <Camera className="h-5 w-5" />
            <span>Photo</span>
          </>
        )}
      </button>

      {isOpen && (
        <CameraCapture
          jobId={jobId}
          technicianId={technicianId}
          technicianName={technicianName}
          onCapture={onCapture}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

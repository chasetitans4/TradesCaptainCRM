'use client';

/**
 * Barcode/QR Scanner Component
 *
 * Per Design Constitution Section 3.15.4:
 * - Barcode/QR scanning for equipment lookup
 * - Visual viewfinder with scan region
 * - Haptic feedback on successful scan
 * - Fallback for unsupported browsers
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  createVideoScanner,
  isBarcodeDetectorSupported,
  parseBarcodeContent,
  triggerScanHaptic,
  type DecodeResult,
  type ParsedBarcodeContent,
} from '@/lib/scanner/decode';
import {
  Scan,
  X,
  Camera,
  Flashlight,
  AlertCircle,
  Package,
  Link,
  Hash,
  FileText,
} from 'lucide-react';

interface BarcodeScannerProps {
  /** Callback when barcode is scanned */
  onScan: (result: DecodeResult, parsed: ParsedBarcodeContent) => void;
  /** Callback to close scanner */
  onClose: () => void;
  /** Whether to auto-close after successful scan */
  autoClose?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Full-screen barcode scanner with viewfinder
 */
export function BarcodeScanner({
  onScan,
  onClose,
  autoClose = true,
  className,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<ReturnType<typeof createVideoScanner> | null>(null);

  const [isSupported, setIsSupported] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<DecodeResult | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Check support on mount
  useEffect(() => {
    setIsSupported(isBarcodeDetectorSupported());
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setHasPermission(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, [stream]);

  // Handle scan result
  const handleDetect = useCallback(
    (results: DecodeResult[]) => {
      if (results.length === 0) return;

      const result = results[0]; // Take first detected barcode

      // Debounce: ignore if same as last scan within 2 seconds
      if (
        lastScan &&
        lastScan.rawValue === result.rawValue &&
        Date.now() - lastScan.timestamp.getTime() < 2000
      ) {
        return;
      }

      setLastScan(result);
      triggerScanHaptic();

      const parsed = parseBarcodeContent(result.rawValue);
      onScan(result, parsed);

      if (autoClose) {
        stopCamera();
        onClose();
      }
    },
    [lastScan, onScan, autoClose, stopCamera, onClose]
  );

  // Start scanner when video is playing
  useEffect(() => {
    if (!videoRef.current || !isScanning || !isSupported) return;

    const scanner = createVideoScanner(videoRef.current, handleDetect, {
      scanInterval: 100,
    });

    scanner.start();
    scannerRef.current = scanner;

    return () => {
      scanner.stop();
    };
  }, [isScanning, isSupported, handleDetect]);

  // Auto-start camera on mount
  useEffect(() => {
    if (isSupported) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle torch
  const toggleTorch = useCallback(async () => {
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      await track.applyConstraints({
        // @ts-ignore - torch is not in standard TypeScript types yet
        advanced: [{ torch: !torchEnabled }],
      });
      setTorchEnabled(!torchEnabled);
    } catch (error) {
      console.warn('Torch not available:', error);
    }
  }, [stream, torchEnabled]);

  // Unsupported browser
  if (!isSupported) {
    return (
      <div className={cn('fixed inset-0 z-50 bg-background', className)}>
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <AlertCircle className="h-16 w-16 text-warning mb-4" />
          <h2 className="text-xl font-semibold mb-2">Scanner Not Available</h2>
          <p className="text-text-muted mb-6">
            Your browser doesn&apos;t support barcode scanning. Try using Chrome or Safari.
          </p>
          <Button onClick={onClose} variant="outline" className="min-h-[50px] px-8">
            Close
          </Button>
        </div>
      </div>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <div className={cn('fixed inset-0 z-50 bg-background', className)}>
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <Camera className="h-16 w-16 text-text-muted mb-4" />
          <h2 className="text-xl font-semibold mb-2">Camera Access Needed</h2>
          <p className="text-text-muted mb-6">
            Please allow camera access to scan barcodes.
          </p>
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="min-h-[50px] px-6">
              Cancel
            </Button>
            <Button onClick={startCamera} className="min-h-[50px] px-6">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('fixed inset-0 z-50 bg-black', className)}>
      {/* Video Feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Viewfinder Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Darkened areas */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Clear scan area */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72"
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
        >
          {/* Corner markers */}
          <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" />

          {/* Scanning line animation */}
          <div className="absolute left-2 right-2 h-0.5 bg-primary animate-pulse top-1/2" />
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-3 rounded-full bg-black/50 text-white"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="text-white font-medium">Scan Barcode</h2>

        <button
          onClick={toggleTorch}
          className={cn(
            'p-3 rounded-full text-white',
            torchEnabled ? 'bg-primary' : 'bg-black/50'
          )}
        >
          <Flashlight className="h-6 w-6" />
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-20 left-0 right-0 text-center text-white">
        <p className="text-sm opacity-80">
          Point camera at barcode or QR code
        </p>
      </div>

      {/* Last scan result (if not auto-closing) */}
      {!autoClose && lastScan && (
        <div className="absolute bottom-24 left-4 right-4 bg-success/90 rounded-xl p-4 text-white">
          <p className="font-medium">Scanned: {lastScan.rawValue}</p>
          <p className="text-sm opacity-80">Format: {lastScan.format}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact scan button with result display
 */
export interface ScanButtonProps {
  /** Callback when scan completes */
  onScan: (result: DecodeResult, parsed: ParsedBarcodeContent) => void;
  /** Button label */
  label?: string;
  /** Custom className */
  className?: string;
}

export function ScanButton({
  onScan,
  label = 'Scan',
  className,
}: ScanButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className={cn('min-h-[50px] gap-2', className)}
      >
        <Scan className="h-5 w-5" />
        {label}
      </Button>

      {isOpen && (
        <BarcodeScanner
          onScan={(result, parsed) => {
            onScan(result, parsed);
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Scan result display card
 */
interface ScanResultCardProps {
  result: DecodeResult;
  parsed: ParsedBarcodeContent;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export function ScanResultCard({
  result,
  parsed,
  onAction,
  actionLabel,
  className,
}: ScanResultCardProps) {
  const getIcon = () => {
    switch (parsed.type) {
      case 'equipment_id':
        return <Package className="h-5 w-5 text-primary" />;
      case 'url':
        return <Link className="h-5 w-5 text-info" />;
      case 'part_number':
      case 'serial':
        return <Hash className="h-5 w-5 text-warning" />;
      default:
        return <FileText className="h-5 w-5 text-text-muted" />;
    }
  };

  const getTypeLabel = () => {
    switch (parsed.type) {
      case 'equipment_id':
        return 'Equipment ID';
      case 'url':
        return 'URL';
      case 'part_number':
        return 'Part Number';
      case 'serial':
        return 'Serial Number';
      default:
        return 'Text';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border',
        className
      )}
    >
      <div className="p-2 rounded-lg bg-background">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-text truncate">{parsed.value}</p>
        <p className="text-sm text-text-muted">
          {getTypeLabel()} • {result.format}
        </p>
      </div>

      {onAction && actionLabel && (
        <Button onClick={onAction} size="sm" className="min-h-[44px]">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Equipment lookup scanner - specialized for equipment tracking
 */
interface EquipmentScannerProps {
  /** Callback when equipment is found */
  onEquipmentFound: (equipmentId: string, rawBarcode: string) => void;
  /** Callback to close */
  onClose: () => void;
  /** Custom className */
  className?: string;
}

export function EquipmentScanner({
  onEquipmentFound,
  onClose,
  className,
}: EquipmentScannerProps) {
  const handleScan = useCallback(
    (result: DecodeResult, parsed: ParsedBarcodeContent) => {
      // For equipment scanning, accept equipment IDs, part numbers, and serials
      if (['equipment_id', 'part_number', 'serial'].includes(parsed.type)) {
        onEquipmentFound(parsed.value, result.rawValue);
      } else {
        // For other types, use the raw value
        onEquipmentFound(result.rawValue, result.rawValue);
      }
    },
    [onEquipmentFound]
  );

  return (
    <BarcodeScanner
      onScan={handleScan}
      onClose={onClose}
      autoClose={true}
      className={className}
    />
  );
}

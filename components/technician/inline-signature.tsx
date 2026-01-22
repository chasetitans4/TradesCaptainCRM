'use client';

import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { PenLine, Eraser, Check, X, Loader2 } from 'lucide-react';

interface InlineSignatureProps {
  customerName: string;
  customerEmail?: string;
  entityType: 'invoice' | 'job' | 'quote';
  entityId: string;
  onSigned: (signatureId: string, signatureUrl: string) => void;
  onSkip: () => void;
  agreementText?: string;
  className?: string;
}

export function InlineSignature({
  customerName,
  customerEmail,
  entityType,
  entityId,
  onSigned,
  onSkip,
  agreementText,
  className,
}: InlineSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerName, setSignerName] = useState(customerName);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const defaultAgreement = entityType === 'invoice'
    ? 'I acknowledge receipt of services and agree to pay the amount shown on this invoice.'
    : 'I authorize the work described and agree to the terms outlined.';

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas drawing style
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Handle resize for responsive canvas
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Set canvas size with DPR for crisp drawing
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Scale context
      ctx.scale(dpr, dpr);

      // Restore stroke settings after resize
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Get coordinates for mouse/touch events
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async () => {
    if (!hasSignature || !signerName.trim()) {
      toast({
        title: 'Please sign and enter name',
        description: 'Both a signature and name are required.',
        variant: 'destructive',
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setSubmitting(true);
    try {
      const signatureData = canvas.toDataURL('image/png');

      const response = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          signatureData,
          signerName: signerName.trim(),
          signerEmail: customerEmail,
          agreementText: agreementText || defaultAgreement,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save signature');
      }

      const result = await response.json();

      toast({ title: 'Signature captured' });
      onSigned(result.id, result.url);
    } catch (error) {
      console.error('Signature error:', error);
      toast({
        title: 'Failed to save signature',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Agreement text */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        {agreementText || defaultAgreement}
      </div>

      {/* Signature canvas */}
      <div className="relative">
        <div className="border-2 rounded-lg bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-32 touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {/* Signature line */}
          <div className="absolute bottom-4 left-4 right-4 border-b border-dashed border-muted-foreground/30" />

          {/* X mark at start of line */}
          <span className="absolute bottom-2 left-4 text-xs text-muted-foreground font-medium">
            X
          </span>
        </div>

        {/* Clear button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 h-8 px-2"
          onClick={clearSignature}
          disabled={!hasSignature}
        >
          <Eraser className="h-4 w-4" />
        </Button>
      </div>

      {/* Signer name */}
      <div className="space-y-1">
        <Label htmlFor="signerName" className="text-sm">
          Full Name
        </Label>
        <Input
          id="signerName"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Enter customer's full name"
          className="h-10"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={onSkip}
          disabled={submitting}
        >
          <X className="h-4 w-4 mr-2" />
          Skip
        </Button>
        <Button
          className="flex-1 h-12"
          onClick={handleSubmit}
          disabled={!hasSignature || !signerName.trim() || submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Confirm Signature
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

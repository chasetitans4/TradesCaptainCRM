'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Eraser, Check, PenLine } from 'lucide-react';

interface SignaturePadProps {
  entityType: 'job' | 'quote' | 'invoice' | 'document';
  entityId: string;
  customerId?: string;
  agreementText?: string;
  onSigned?: (signatureId: string) => void;
  readOnly?: boolean;
  existingSignature?: {
    signature_url: string;
    signer_name: string;
    signed_at: string;
  };
}

export function SignaturePad({
  entityType,
  entityId,
  customerId,
  agreementText,
  onSigned,
  readOnly = false,
  existingSignature,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const defaultAgreement = getDefaultAgreementText(entityType);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || readOnly) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Handle resize
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [readOnly]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
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
    if (readOnly) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;

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
      toast({ title: 'Please sign and enter your name', variant: 'destructive' });
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
          signerEmail: signerEmail.trim() || undefined,
          agreementText: agreementText || defaultAgreement,
          customerId,
        }),
      });

      if (!response.ok) throw new Error('Failed to save signature');

      const result = await response.json();
      toast({ title: 'Signature captured successfully' });
      onSigned?.(result.id);
    } catch (error) {
      toast({ title: 'Failed to save signature', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (existingSignature) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Signed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <img
              src={existingSignature.signature_url}
              alt="Signature"
              className="border rounded-lg bg-white p-2 max-h-32"
            />
            <div className="text-sm text-muted-foreground">
              <p>Signed by: {existingSignature.signer_name}</p>
              <p>Date: {new Date(existingSignature.signed_at).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenLine className="h-5 w-5" />
          Digital Signature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agreement Text */}
        <div className="bg-muted p-3 rounded-lg text-sm">
          {agreementText || defaultAgreement}
        </div>

        {/* Signature Canvas */}
        <div className="border rounded-lg bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-40 touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearSignature}>
            <Eraser className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        {/* Signer Info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="signerName">Full Name *</Label>
            <Input
              id="signerName"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signerEmail">Email (optional)</Label>
            <Input
              id="signerEmail"
              type="email"
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!hasSignature || !signerName.trim() || submitting}
        >
          <Check className="h-4 w-4 mr-2" />
          {submitting ? 'Saving...' : 'Sign & Submit'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function getDefaultAgreementText(entityType: string): string {
  switch (entityType) {
    case 'job':
      return 'I confirm that the work described has been completed to my satisfaction. I authorize payment for the services rendered.';
    case 'quote':
      return 'I accept this quote and authorize the work to proceed as described. I understand the terms and pricing outlined above.';
    case 'invoice':
      return 'I acknowledge receipt of services and agree to pay the amount shown on this invoice.';
    case 'document':
      return 'I have read and agree to the terms outlined in this document.';
    default:
      return 'I agree to the terms and conditions.';
  }
}

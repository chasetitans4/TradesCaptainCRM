'use client';

import { useState } from 'react';
import { Lock, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Step = 'enter' | 'confirm' | 'complete';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function PinPad({ value, onChange, disabled }: PinPadProps) {
  const handleDigit = (digit: string) => {
    if (value.length < 4 && !disabled) {
      onChange(value + digit);
    }
  };

  const handleDelete = () => {
    if (!disabled) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-4">
      {/* PIN dots */}
      <div className="flex justify-center gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              i < value.length ? 'bg-primary border-primary' : 'border-muted-foreground'
            }`}
          />
        ))}
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <Button
            key={digit}
            variant="outline"
            className="h-14 text-xl font-medium"
            onClick={() => handleDigit(digit.toString())}
            disabled={disabled}
          >
            {digit}
          </Button>
        ))}
        <div /> {/* Empty space */}
        <Button
          variant="outline"
          className="h-14 text-xl font-medium"
          onClick={() => handleDigit('0')}
          disabled={disabled}
        >
          0
        </Button>
        <Button
          variant="outline"
          className="h-14"
          onClick={handleDelete}
          disabled={value.length === 0 || disabled}
        >
          ←
        </Button>
      </div>
    </div>
  );
}

interface PinSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function PinSetup({ onComplete, onCancel }: PinSetupProps) {
  const [step, setStep] = useState<Step>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePinEntered = () => {
    if (pin.length === 4) {
      setStep('confirm');
      setError(null);
    }
  };

  const handleConfirmEntered = async () => {
    if (confirmPin.length !== 4) return;

    if (pin !== confirmPin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup', pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setStep('complete');
    } catch (e: any) {
      setError(e.message);
      setConfirmPin('');
    } finally {
      setLoading(false);
    }
  };

  // Auto-advance when PIN is complete
  if (pin.length === 4 && step === 'enter') {
    handlePinEntered();
  }

  if (confirmPin.length === 4 && step === 'confirm' && !loading) {
    handleConfirmEntered();
  }

  if (step === 'complete') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            PIN Set Up Successfully
          </CardTitle>
          <CardDescription>
            You can now use your PIN to quickly unlock the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onComplete} className="w-full">
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {step === 'enter' ? 'Set Up PIN' : 'Confirm PIN'}
        </CardTitle>
        <CardDescription>
          {step === 'enter'
            ? 'Enter a 4-digit PIN for quick access'
            : 'Enter your PIN again to confirm'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <PinPad
          value={step === 'enter' ? pin : confirmPin}
          onChange={step === 'enter' ? setPin : setConfirmPin}
          disabled={loading}
        />

        <div className="flex gap-2">
          {step === 'confirm' && (
            <Button
              variant="outline"
              onClick={() => {
                setStep('enter');
                setPin('');
                setConfirmPin('');
                setError(null);
              }}
              className="flex-1"
              disabled={loading}
            >
              Start Over
            </Button>
          )}
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

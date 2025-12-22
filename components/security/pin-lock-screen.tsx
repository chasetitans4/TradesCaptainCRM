'use client';

import { useState, useCallback } from 'react';
import { Lock, Delete, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PinLockScreenProps {
  onUnlock: () => void;
  onFullAuth: () => void;
  userName?: string;
}

export function PinLockScreen({ onUnlock, onFullAuth, userName }: PinLockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);

  const verifyPin = useCallback(
    async (pinToVerify: string) => {
      setVerifying(true);
      setError(null);

      try {
        const response = await fetch('/api/auth/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'verify', pin: pinToVerify }),
        });

        const data = await response.json();

        if (data.success) {
          onUnlock();
        } else if (data.locked) {
          setLocked(true);
          setError('Too many attempts. Please sign in again.');
        } else {
          setPin('');
          setError('Incorrect PIN');
          setRemainingAttempts(data.remainingAttempts);

          // Vibrate on error (if supported)
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
        }
      } catch {
        setError('Something went wrong');
        setPin('');
      } finally {
        setVerifying(false);
      }
    },
    [onUnlock]
  );

  const handleDigit = (digit: string) => {
    if (pin.length < 4 && !verifying) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);

      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (!verifying) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      <div className="w-full max-w-sm px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          {userName && (
            <p className="text-muted-foreground text-sm mb-2">Welcome back,</p>
          )}
          <h2 className="text-xl font-semibold">{userName || 'Enter PIN'}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Enter your 4-digit PIN to unlock
          </p>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? 'bg-primary border-primary scale-110'
                  : 'border-muted-foreground'
              } ${verifying ? 'animate-pulse' : ''}`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 text-center">
            <p className="text-destructive text-sm">{error}</p>
            {remainingAttempts !== null && remainingAttempts > 0 && (
              <p className="text-muted-foreground text-xs mt-1">
                {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining
              </p>
            )}
          </div>
        )}

        {locked ? (
          <div className="space-y-4">
            <Button onClick={onFullAuth} className="w-full" size="lg">
              Sign in with password
            </Button>
            <p className="text-center text-muted-foreground text-xs">
              Your PIN has been locked due to too many failed attempts.
            </p>
          </div>
        ) : (
          <>
            {/* Number pad */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <Button
                  key={digit}
                  variant="outline"
                  className="h-16 text-2xl font-medium hover:bg-primary/10 active:scale-95 transition-transform"
                  onClick={() => handleDigit(digit.toString())}
                  disabled={verifying}
                >
                  {digit}
                </Button>
              ))}
              <div /> {/* Empty space */}
              <Button
                variant="outline"
                className="h-16 text-2xl font-medium hover:bg-primary/10 active:scale-95 transition-transform"
                onClick={() => handleDigit('0')}
                disabled={verifying}
              >
                0
              </Button>
              <Button
                variant="ghost"
                className="h-16"
                onClick={handleDelete}
                disabled={pin.length === 0 || verifying}
              >
                <Delete className="h-6 w-6" />
              </Button>
            </div>

            {/* Alternative actions */}
            <div className="text-center space-y-3">
              <button
                onClick={onFullAuth}
                className="text-sm text-primary hover:underline"
                disabled={verifying}
              >
                Use password instead
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

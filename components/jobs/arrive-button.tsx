'use client';

import { useState } from 'react';
import { MapPin, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface ArriveButtonProps {
  jobId: string;
  customerName: string;
  onArrived?: (miles: number) => void;
  className?: string;
}

export function ArriveButton({ jobId, customerName, onArrived, className }: ArriveButtonProps) {
  const [loading, setLoading] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [miles, setMiles] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleArrive = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const response = await fetch(`/api/jobs/${jobId}/arrive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setArrived(true);
        setMiles(data.confirmedMiles);
        onArrived?.(data.confirmedMiles);
      } else {
        setError(data.error || 'Failed to record arrival');
      }
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        setError('Please enable location services to track mileage');
      } else {
        setError('Failed to record arrival');
      }
    } finally {
      setLoading(false);
    }
  };

  if (arrived) {
    return (
      <div className={`flex items-center gap-2 px-4 py-3 bg-success/10 text-success rounded-xl ${className}`}>
        <Check className="h-5 w-5" />
        <div>
          <p className="font-medium">Arrived at {customerName}</p>
          <p className="text-sm opacity-80">{miles?.toFixed(1)} miles traveled</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        onClick={handleArrive}
        disabled={loading}
        className="w-full h-14 text-lg font-semibold"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Recording arrival...
          </>
        ) : (
          <>
            <MapPin className="h-5 w-5 mr-2" />
            I&apos;ve Arrived
          </>
        )}
      </Button>
      {error && <p className="text-sm text-danger mt-2 text-center">{error}</p>}
    </div>
  );
}

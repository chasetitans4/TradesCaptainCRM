'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showValue?: boolean;
}

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  readonly = false,
  showValue = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayValue = hoverValue ?? value;

  return (
    <div className="flex items-center gap-1">
      {[...Array(max)].map((_, i) => {
        const starValue = i + 1;
        const filled = starValue <= displayValue;

        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readonly && setHoverValue(starValue)}
            onMouseLeave={() => !readonly && setHoverValue(null)}
            className={cn(
              'transition-transform',
              !readonly && 'hover:scale-110 cursor-pointer',
              readonly && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                sizes[size],
                'transition-colors',
                filled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-muted-foreground/40'
              )}
            />
          </button>
        );
      })}

      {showValue && (
        <span className="ml-2 text-sm font-medium">{value.toFixed(1)}</span>
      )}
    </div>
  );
}

// Display-only star rating
export function StarRatingDisplay({
  value,
  max = 5,
  size = 'sm',
  showCount,
}: {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <StarRating value={value} max={max} size={size} readonly />
      {showCount !== undefined && (
        <span className="text-sm text-muted-foreground">({showCount})</span>
      )}
    </div>
  );
}

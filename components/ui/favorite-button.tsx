'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EntityType = 'customer' | 'job' | 'lead' | 'invoice' | 'quote';

interface FavoriteButtonProps {
  entityType: EntityType;
  entityId: string;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function FavoriteButton({
  entityType,
  entityId,
  size = 'default',
  className,
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkFavorite() {
      try {
        const response = await fetch(
          `/api/favorites?type=${entityType}&id=${entityId}`
        );
        if (response.ok) {
          const data = await response.json();
          const found = data.favorites?.some(
            (f: any) => f.entity_id === entityId && f.entity_type === entityType
          );
          setIsFavorite(found);
        }
      } catch (error) {
        console.error('Error checking favorite:', error);
      } finally {
        setLoading(false);
      }
    }

    checkFavorite();
  }, [entityType, entityId]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.isFavorite);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  };

  const iconSize = {
    sm: 'h-3.5 w-3.5',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size];

  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon' : 'icon-sm'}
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'transition-colors',
        isFavorite && 'text-yellow-500 hover:text-yellow-600',
        className
      )}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={cn(
          iconSize,
          isFavorite && 'fill-current'
        )}
      />
    </Button>
  );
}

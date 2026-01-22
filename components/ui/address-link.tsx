'use client';

import { MapPin, Navigation } from 'lucide-react';
import { getSmartNavigationUrl, formatFullAddress } from '@/lib/utils/navigation';
import { cn } from '@/lib/utils';

interface AddressLinkProps {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  showIcon?: boolean;
  showNavigationIcon?: boolean;
  className?: string;
  iconClassName?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  children?: React.ReactNode;
}

export function AddressLink({
  address,
  city,
  state,
  zip,
  latitude,
  longitude,
  showIcon = true,
  showNavigationIcon = true,
  className,
  iconClassName,
  onClick,
  children,
}: AddressLinkProps) {
  const fullAddress = formatFullAddress({ address, city, state, zip });

  if (!fullAddress) return null;

  const navUrl = getSmartNavigationUrl(
    fullAddress,
    latitude ?? undefined,
    longitude ?? undefined
  );

  return (
    <a
      href={navUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 text-primary hover:underline active:scale-[0.98] transition-transform',
        className
      )}
      onClick={onClick}
    >
      {children ? (
        children
      ) : (
        <>
          {showIcon && (
            <MapPin className={cn('h-4 w-4 flex-shrink-0', iconClassName)} />
          )}
          <span className="break-words">{fullAddress}</span>
          {showNavigationIcon && (
            <Navigation className="h-3 w-3 flex-shrink-0 opacity-50" />
          )}
        </>
      )}
    </a>
  );
}

// Compact version for lists
export function AddressLinkCompact({
  address,
  city,
  state,
  zip,
  latitude,
  longitude,
}: Omit<AddressLinkProps, 'showIcon' | 'showNavigationIcon' | 'className' | 'iconClassName'>) {
  const fullAddress = formatFullAddress({ address, city, state, zip });

  if (!fullAddress) return null;

  const navUrl = getSmartNavigationUrl(
    fullAddress,
    latitude ?? undefined,
    longitude ?? undefined
  );

  return (
    <a
      href={navUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      <MapPin className="h-3 w-3" />
      <span className="truncate max-w-[200px]">{fullAddress}</span>
    </a>
  );
}

import { cn } from '@/lib/utils';

interface GradientBackgroundProps {
  variant?: 'mesh' | 'radial' | 'brand';
  className?: string;
  children?: React.ReactNode;
}

export function GradientBackground({
  variant = 'mesh',
  className,
  children,
}: GradientBackgroundProps) {
  const variants = {
    mesh: 'bg-gradient-mesh',
    radial: 'bg-gradient-radial',
    brand: 'bg-gradient-brand',
  };

  return (
    <div className={cn('relative min-h-screen', variants[variant], className)}>
      {children}
    </div>
  );
}

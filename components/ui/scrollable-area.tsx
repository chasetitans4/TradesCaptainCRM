'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollableAreaProps {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
  showIndicators?: boolean;
}

export function ScrollableArea({
  children,
  className,
  maxHeight = '100%',
  showIndicators = true,
}: ScrollableAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 5);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 5);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Initial check
    checkScroll();

    // Check on scroll
    el.addEventListener('scroll', checkScroll);

    // Check on resize
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    // Check when content changes
    const mutationObserver = new MutationObserver(checkScroll);
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  const scrollTo = (direction: 'up' | 'down') => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollAmount = el.clientHeight * 0.8;
    el.scrollBy({
      top: direction === 'up' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative" style={{ maxHeight }}>
      {/* Scroll Up Indicator */}
      {showIndicators && canScrollUp && (
        <button
          onClick={() => scrollTo('up')}
          className={cn(
            'absolute top-0 left-1/2 -translate-x-1/2 z-10',
            'w-6 h-4 flex items-center justify-center',
            'bg-gradient-to-b from-background/90 to-transparent',
            'text-muted-foreground/60 hover:text-muted-foreground',
            'transition-colors cursor-pointer'
          )}
          aria-label="Scroll up"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        className={cn(
          'overflow-y-auto scrollbar-hide',
          className
        )}
        style={{ maxHeight }}
      >
        {children}
      </div>

      {/* Scroll Down Indicator */}
      {showIndicators && canScrollDown && (
        <button
          onClick={() => scrollTo('down')}
          className={cn(
            'absolute bottom-0 left-1/2 -translate-x-1/2 z-10',
            'w-6 h-4 flex items-center justify-center',
            'bg-gradient-to-t from-background/90 to-transparent',
            'text-muted-foreground/60 hover:text-muted-foreground',
            'transition-colors cursor-pointer'
          )}
          aria-label="Scroll down"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const slides = [
  {
    title: 'Welcome to TradesCaptain!',
    description:
      'Your all-in-one platform for managing customers, jobs, and growing your business.',
    emoji: '👋',
  },
  {
    title: 'Manage Customers',
    description:
      'Keep all your customer information in one place. Track job history, notes, and communication.',
    emoji: '👥',
  },
  {
    title: 'Schedule & Dispatch',
    description:
      'Easily schedule jobs and dispatch your team. Everyone stays on the same page.',
    emoji: '📅',
  },
  {
    title: 'Get Paid Faster',
    description:
      'Send quotes, invoices, and collect payments online. No more chasing checks.',
    emoji: '💰',
  },
];

interface WelcomeModalProps {
  open?: boolean;
  onComplete?: () => void;
}

export function WelcomeModal({ open = true, onComplete }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(open);
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLastSlide = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];

  const handleComplete = () => {
    setIsOpen(false);
    onComplete?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <div className="flex flex-col items-center text-center py-6">
          {/* Illustration placeholder */}
          <div className="w-48 h-48 bg-gradient-to-br from-secondary-400/20 to-primary-600/20 rounded-full flex items-center justify-center mb-6">
            <div className="text-6xl">{slide.emoji}</div>
          </div>

          <DialogHeader>
            <DialogTitle className="text-xl">{slide.title}</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground mt-2 mb-8">{slide.description}</p>

          {/* Dots indicator */}
          <div className="flex items-center gap-2 mb-6">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  i === currentSlide
                    ? 'w-6 bg-primary'
                    : 'bg-muted hover:bg-muted-foreground/50'
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 w-full">
            {currentSlide > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentSlide((c) => c - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={() => {
                if (isLastSlide) {
                  handleComplete();
                } else {
                  setCurrentSlide((c) => c + 1);
                }
              }}
              className="flex-1 gap-2"
            >
              {isLastSlide ? (
                <>
                  Get Started
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

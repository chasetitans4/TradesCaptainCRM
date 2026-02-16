'use client';

/**
 * Voice Search Component
 *
 * Per Design Constitution Section 3.15.2:
 * - Voice search using Web Speech API
 * - Visual feedback during listening
 * - Real-time transcription display
 * - Haptic feedback on start/stop
 */

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useVoiceInput, isVoiceInputSupported } from '@/hooks/useVoiceInput';
import { Mic, MicOff, X, Search, Loader2 } from 'lucide-react';

interface VoiceSearchProps {
  /** Callback when search query is ready */
  onSearch: (query: string) => void;
  /** Callback when voice search is cancelled */
  onCancel?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to auto-submit after speech ends */
  autoSubmit?: boolean;
  /** Delay before auto-submit (ms) */
  autoSubmitDelay?: number;
  /** Custom className */
  className?: string;
}

/**
 * Full-screen voice search overlay
 */
export function VoiceSearchOverlay({
  onSearch,
  onCancel,
  placeholder = 'Try "Find customer John Smith"',
  autoSubmit = true,
  autoSubmitDelay = 1500,
  className,
}: VoiceSearchProps) {
  const [query, setQuery] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput({
    continuous: true,
    interimResults: true,
    onResult: (transcript) => {
      setQuery(transcript);
    },
  });

  // Auto-submit after speech ends
  useEffect(() => {
    if (!autoSubmit || isListening || !query || hasSubmitted) return;

    const timer = setTimeout(() => {
      onSearch(query);
      setHasSubmitted(true);
    }, autoSubmitDelay);

    return () => clearTimeout(timer);
  }, [autoSubmit, autoSubmitDelay, isListening, query, hasSubmitted, onSearch]);

  // Start listening on mount
  useEffect(() => {
    if (isSupported) {
      // Small delay to allow modal animation
      const timer = setTimeout(() => {
        startListening();
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSupported, startListening]);

  const handleSubmit = useCallback(() => {
    const searchQuery = query || transcript;
    if (searchQuery) {
      stopListening();
      onSearch(searchQuery);
      setHasSubmitted(true);
    }
  }, [query, transcript, stopListening, onSearch]);

  const handleCancel = useCallback(() => {
    stopListening();
    resetTranscript();
    onCancel?.();
  }, [stopListening, resetTranscript, onCancel]);

  const handleToggleListen = useCallback(() => {
    if (isListening) {
      stopListening();
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 20, 30]);
      }
    } else {
      setQuery('');
      setHasSubmitted(false);
      resetTranscript();
      startListening();
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
  }, [isListening, stopListening, startListening, resetTranscript]);

  // Not supported
  if (!isSupported) {
    return (
      <div className={cn('fixed inset-0 z-50 bg-background/95 backdrop-blur-sm', className)}>
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <MicOff className="h-16 w-16 text-text-muted mb-4" />
          <h2 className="text-xl font-semibold mb-2">Voice Search Unavailable</h2>
          <p className="text-text-muted mb-6">
            Your browser doesn&apos;t support voice recognition.
          </p>
          <Button onClick={handleCancel} variant="outline" className="min-h-[50px] px-8">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('fixed inset-0 z-50 bg-background/95 backdrop-blur-sm', className)}>
      {/* Close button */}
      <button
        onClick={handleCancel}
        className="absolute top-4 right-4 p-3 rounded-full bg-muted text-text-muted"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="flex flex-col items-center justify-center h-full p-6">
        {/* Mic button with pulse animation */}
        <button
          onClick={handleToggleListen}
          className={cn(
            'relative w-24 h-24 rounded-full flex items-center justify-center transition-all',
            isListening
              ? 'bg-primary text-white'
              : 'bg-muted text-text-muted hover:bg-muted/80'
          )}
        >
          {isListening && (
            <>
              {/* Pulse rings */}
              <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
            </>
          )}
          <Mic className="h-10 w-10 relative z-10" />
        </button>

        {/* Status text */}
        <p className="mt-6 text-lg font-medium text-text">
          {isListening ? 'Listening...' : query ? 'Tap to search again' : 'Tap to speak'}
        </p>

        {/* Transcript display */}
        <div className="mt-8 w-full max-w-md min-h-[80px] p-4 bg-muted/50 rounded-xl text-center">
          {query || transcript || interimTranscript ? (
            <p className="text-xl text-text">
              {query || transcript}
              {interimTranscript && (
                <span className="text-text-muted">{interimTranscript}</span>
              )}
            </p>
          ) : (
            <p className="text-text-muted">{placeholder}</p>
          )}
        </div>

        {/* Error display */}
        {error && (
          <p className="mt-4 text-danger text-sm">{error}</p>
        )}

        {/* Action buttons */}
        {(query || transcript) && !isListening && (
          <div className="mt-8 flex gap-4">
            <Button
              onClick={handleToggleListen}
              variant="outline"
              className="min-h-[50px] px-6 gap-2"
            >
              <Mic className="h-5 w-5" />
              Try Again
            </Button>
            <Button
              onClick={handleSubmit}
              className="min-h-[50px] px-6 gap-2"
              disabled={hasSubmitted}
            >
              {hasSubmitted ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Search
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact voice search button for inline use
 */
interface VoiceSearchButtonProps {
  /** Callback when search query is ready */
  onSearch: (query: string) => void;
  /** Whether voice is supported (for conditional rendering) */
  showIfUnsupported?: boolean;
  /** Custom className */
  className?: string;
}

export function VoiceSearchButton({
  onSearch,
  showIfUnsupported = false,
  className,
}: VoiceSearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const supported = isVoiceInputSupported();

  if (!supported && !showIfUnsupported) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="icon"
        disabled={!supported}
        className={cn('min-h-[50px] min-w-[50px]', className)}
        title={supported ? 'Voice search' : 'Voice search not supported'}
      >
        <Mic className="h-5 w-5" />
      </Button>

      {isOpen && (
        <VoiceSearchOverlay
          onSearch={(query) => {
            onSearch(query);
            setIsOpen(false);
          }}
          onCancel={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Inline voice input field with toggle
 */
interface VoiceSearchInputProps {
  /** Current value */
  value: string;
  /** Value change handler */
  onChange: (value: string) => void;
  /** Submit handler */
  onSubmit?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Custom className */
  className?: string;
}

export function VoiceSearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search...',
  className,
}: VoiceSearchInputProps) {
  const supported = isVoiceInputSupported();

  const {
    isListening,
    interimTranscript,
    startListening,
    stopListening,
  } = useVoiceInput({
    continuous: true,
    interimResults: true,
    onResult: (transcript) => {
      onChange(transcript);
    },
    onEnd: () => {
      if (value && onSubmit) {
        onSubmit(value);
      }
    },
  });

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      onChange('');
      startListening();
    }
  }, [isListening, stopListening, startListening, onChange]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      stopListening();
      if (value && onSubmit) {
        onSubmit(value);
      }
    },
    [stopListening, value, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className={cn('relative flex gap-2', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
        <input
          type="text"
          value={value + (isListening && interimTranscript ? interimTranscript : '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full h-[50px] pl-10 pr-4 rounded-xl border border-border bg-background',
            'text-text placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            isListening && 'ring-2 ring-primary/50'
          )}
        />
        {isListening && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-danger rounded-full animate-pulse" />
        )}
      </div>

      {supported && (
        <Button
          type="button"
          onClick={handleToggle}
          variant={isListening ? 'default' : 'outline'}
          className="min-h-[50px] min-w-[50px] shrink-0"
        >
          <Mic className={cn('h-5 w-5', isListening && 'animate-pulse')} />
        </Button>
      )}
    </form>
  );
}

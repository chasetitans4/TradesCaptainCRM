'use client';

import { forwardRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useVoiceInput, isVoiceInputSupported } from '@/hooks/useVoiceInput';
import { Mic, MicOff, X, Loader2 } from 'lucide-react';

/**
 * Mobile Text Input Props
 */
export interface MobileTextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Enable voice input. Default: true */
  enableVoice?: boolean;
  /** Callback when value changes (includes voice input) */
  onValueChange?: (value: string) => void;
  /** Callback on blur (for auto-save) */
  onFieldBlur?: () => void;
  /** Input size variant */
  size?: 'default' | 'large';
  /** Show character count */
  showCharCount?: boolean;
  /** Max characters */
  maxLength?: number;
}

/**
 * Mobile-Optimized Text Input
 *
 * Per Design Constitution Section 3.9:
 *
 * Specifications:
 * - 50px minimum input height (Constitution spec)
 * - Expand on focus (56px focused state)
 * - Large touch targets
 * - Voice input toggle
 *
 * Voice Input (Section 3.9.1):
 * - Microphone icon on all text fields
 * - Real-time transcription display
 * - Tap to start/stop
 */
export const MobileTextInput = forwardRef<HTMLInputElement, MobileTextInputProps>(
  (
    {
      label,
      helperText,
      error,
      enableVoice = true,
      onValueChange,
      onFieldBlur,
      size = 'default',
      showCharCount = false,
      maxLength,
      className,
      value,
      onChange,
      onBlur,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(value || '');

    // Voice input hook
    const voiceSupported = isVoiceInputSupported();
    const showVoiceInput = enableVoice && voiceSupported && !disabled;

    const {
      isListening,
      transcript,
      error: voiceError,
      toggleListening,
      clearTranscript,
    } = useVoiceInput({
      onResult: (text, isFinal) => {
        if (isFinal) {
          // Append transcribed text to current value
          const newValue = localValue ? `${localValue} ${text}` : text;
          setLocalValue(newValue);
          onValueChange?.(newValue);

          // Trigger onChange event
          const syntheticEvent = {
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange?.(syntheticEvent);
        }
      },
    });

    // Sync with external value
    useEffect(() => {
      if (value !== undefined) {
        setLocalValue(String(value));
      }
    }, [value]);

    // Handle input change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onValueChange?.(newValue);
        onChange?.(e);
      },
      [onChange, onValueChange]
    );

    // Handle blur
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        onBlur?.(e);
        onFieldBlur?.();
      },
      [onBlur, onFieldBlur]
    );

    // Handle focus
    const handleFocus = useCallback(() => {
      setIsFocused(true);
    }, []);

    // Clear input
    const handleClear = useCallback(() => {
      setLocalValue('');
      onValueChange?.('');

      const syntheticEvent = {
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(syntheticEvent);
    }, [onChange, onValueChange]);

    const hasValue = String(localValue).length > 0;
    const charCount = String(localValue).length;
    const isOverLimit = maxLength ? charCount > maxLength : false;

    return (
      <div className={cn('space-y-1.5', className)}>
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}

        {/* Input Container */}
        <div
          className={cn(
            'relative flex items-center',
            'rounded-xl border bg-background transition-all duration-150',
            // Height per Constitution: 50px default, 56px focused
            size === 'large' ? 'min-h-[56px]' : 'min-h-[50px]',
            isFocused && 'min-h-[56px]',
            // Border colors
            error ? 'border-danger' : isFocused ? 'border-primary' : 'border-border',
            // Focus ring
            isFocused && !error && 'ring-2 ring-primary/20',
            isFocused && error && 'ring-2 ring-danger/20',
            // Disabled
            disabled && 'opacity-50 bg-muted'
          )}
        >
          {/* Input */}
          <input
            ref={ref}
            type="text"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            disabled={disabled}
            maxLength={maxLength}
            className={cn(
              'flex-1 h-full px-4 py-3',
              'bg-transparent text-text text-base',
              'placeholder:text-text-muted',
              'focus:outline-none',
              // Make room for buttons
              showVoiceInput && 'pr-20',
              !showVoiceInput && hasValue && 'pr-10'
            )}
            {...props}
          />

          {/* Action Buttons */}
          <div className="absolute right-2 flex items-center gap-1">
            {/* Clear Button */}
            {hasValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  'p-2 rounded-lg text-text-muted hover:text-text hover:bg-muted',
                  'transition-colors'
                )}
                tabIndex={-1}
                aria-label="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Voice Input Button */}
            {showVoiceInput && (
              <button
                type="button"
                onClick={toggleListening}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  // 44px minimum touch target per Constitution
                  'min-w-[44px] min-h-[44px] flex items-center justify-center',
                  isListening
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:text-primary hover:bg-primary/10'
                )}
                tabIndex={-1}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                {isListening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Listening Indicator */}
        {isListening && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Listening... Speak now</span>
          </div>
        )}

        {/* Helper / Error / Character Count */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {error ? (
              <p className="text-sm text-danger">{error}</p>
            ) : voiceError ? (
              <p className="text-sm text-warning">{voiceError}</p>
            ) : helperText ? (
              <p className="text-sm text-text-muted">{helperText}</p>
            ) : null}
          </div>

          {showCharCount && maxLength && (
            <span
              className={cn(
                'text-xs',
                isOverLimit ? 'text-danger' : 'text-text-muted'
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

MobileTextInput.displayName = 'MobileTextInput';

/**
 * Mobile Textarea variant for longer text
 */
export interface MobileTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Input label */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Enable voice input. Default: true */
  enableVoice?: boolean;
  /** Callback when value changes (includes voice input) */
  onValueChange?: (value: string) => void;
  /** Callback on blur (for auto-save) */
  onFieldBlur?: () => void;
  /** Show character count */
  showCharCount?: boolean;
}

export const MobileTextarea = forwardRef<HTMLTextAreaElement, MobileTextareaProps>(
  (
    {
      label,
      helperText,
      error,
      enableVoice = true,
      onValueChange,
      onFieldBlur,
      showCharCount = false,
      maxLength,
      className,
      value,
      onChange,
      onBlur,
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState(value || '');

    // Voice input hook
    const voiceSupported = isVoiceInputSupported();
    const showVoiceInput = enableVoice && voiceSupported && !disabled;

    const { isListening, toggleListening } = useVoiceInput({
      onResult: (text, isFinal) => {
        if (isFinal) {
          const newValue = localValue ? `${localValue} ${text}` : text;
          setLocalValue(newValue);
          onValueChange?.(newValue);

          const syntheticEvent = {
            target: { value: newValue },
          } as React.ChangeEvent<HTMLTextAreaElement>;
          onChange?.(syntheticEvent);
        }
      },
    });

    // Sync with external value
    useEffect(() => {
      if (value !== undefined) {
        setLocalValue(String(value));
      }
    }, [value]);

    // Handle change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onValueChange?.(newValue);
        onChange?.(e);
      },
      [onChange, onValueChange]
    );

    // Handle blur
    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setIsFocused(false);
        onBlur?.(e);
        onFieldBlur?.();
      },
      [onBlur, onFieldBlur]
    );

    const charCount = String(localValue).length;
    const isOverLimit = maxLength ? charCount > maxLength : false;

    return (
      <div className={cn('space-y-1.5', className)}>
        {/* Label with Voice Button */}
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-sm font-medium text-text-secondary">
              {label}
            </label>
          )}

          {showVoiceInput && (
            <button
              type="button"
              onClick={toggleListening}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm',
                'min-h-[36px]',
                'transition-colors',
                isListening
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-primary hover:bg-primary/10'
              )}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            >
              {isListening ? (
                <>
                  <MicOff className="h-4 w-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  <span>Voice</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Textarea */}
        <div
          className={cn(
            'relative rounded-xl border bg-background transition-all duration-150',
            error ? 'border-danger' : isFocused ? 'border-primary' : 'border-border',
            isFocused && !error && 'ring-2 ring-primary/20',
            isFocused && error && 'ring-2 ring-danger/20',
            disabled && 'opacity-50 bg-muted'
          )}
        >
          <textarea
            ref={ref}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            disabled={disabled}
            maxLength={maxLength}
            rows={rows}
            className={cn(
              'w-full px-4 py-3',
              'bg-transparent text-text text-base',
              'placeholder:text-text-muted',
              'focus:outline-none',
              'resize-none'
            )}
            {...props}
          />

          {/* Listening indicator */}
          {isListening && (
            <div className="absolute bottom-2 right-2 flex items-center gap-2 text-sm text-primary bg-background/90 px-2 py-1 rounded">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Listening...</span>
            </div>
          )}
        </div>

        {/* Helper / Error / Character Count */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {error ? (
              <p className="text-sm text-danger">{error}</p>
            ) : helperText ? (
              <p className="text-sm text-text-muted">{helperText}</p>
            ) : null}
          </div>

          {showCharCount && maxLength && (
            <span
              className={cn(
                'text-xs',
                isOverLimit ? 'text-danger' : 'text-text-muted'
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

MobileTextarea.displayName = 'MobileTextarea';

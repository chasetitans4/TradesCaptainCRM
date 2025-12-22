'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Circle } from 'lucide-react';

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  name: string;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | undefined>(undefined);

function useRadioGroupContext() {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error('RadioGroupItem must be used within a RadioGroup');
  }
  return context;
}

interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function RadioGroup({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  disabled,
  name = 'radio-group',
  children,
  className,
  orientation = 'vertical',
}: RadioGroupProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback((newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  }, [isControlled, onValueChange]);

  return (
    <RadioGroupContext.Provider value={{ value, onValueChange: handleValueChange, name, disabled }}>
      <div
        role="radiogroup"
        aria-orientation={orientation}
        className={cn(
          'grid gap-2',
          orientation === 'horizontal' && 'grid-flow-col',
          className
        )}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  value: string;
}

export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, disabled: itemDisabled, ...props }, ref) => {
    const { value: selectedValue, onValueChange, name, disabled: groupDisabled } = useRadioGroupContext();
    const isSelected = selectedValue === value;
    const isDisabled = itemDisabled || groupDisabled;

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isSelected}
        data-state={isSelected ? 'checked' : 'unchecked'}
        disabled={isDisabled}
        className={cn(
          'aspect-square h-4 w-4 rounded-full border border-gray-300 text-primary ring-offset-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          isSelected && 'border-primary',
          className
        )}
        onClick={() => onValueChange(value)}
        {...props}
      >
        {isSelected && (
          <span className="flex items-center justify-center">
            <Circle className="h-2.5 w-2.5 fill-current text-primary" />
          </span>
        )}
      </button>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

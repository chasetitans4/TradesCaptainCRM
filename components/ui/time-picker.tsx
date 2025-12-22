'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimePickerProps {
  value?: string; // "HH:mm" format
  onChange: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minuteStep?: number;
  className?: string;
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  disabled,
  minuteStep = 15,
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);

  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += minuteStep) {
        slots.push(
          `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        );
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? formatTime(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <ScrollArea className="h-64">
          <div className="p-2">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => {
                  onChange(time);
                  setOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm rounded-md transition-colors',
                  value === time
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                {formatTime(time)}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

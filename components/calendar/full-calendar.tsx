'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { cn } from '@/lib/utils';
// Local event type compatible with FullCalendar EventInput
type CalendarEvent = {
  id?: string;
  title?: string;
  start?: Date | string;
  end?: Date | string;
  backgroundColor?: string;
  extendedProps?: Record<string, unknown>;
};

interface FullCalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: any) => void;
  onDateSelect?: (start: Date, end: Date) => void;
  className?: string;
}

export function FullCalendarView({
  events,
  onEventClick,
  onDateSelect,
  className,
}: FullCalendarViewProps) {
  return (
    <div className={cn('bg-card border rounded-xl p-4', className)}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        editable
        selectable
        selectMirror
        dayMaxEvents={3}
        eventClick={(info: any) => onEventClick?.(info.event)}
        select={(info: any) => onDateSelect?.(info.start, info.end)}
        height="auto"
      />
    </div>
  );
}

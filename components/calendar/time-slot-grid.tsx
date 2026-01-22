'use client';

import { useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { CalendarJob, JobBlock } from './job-block';
import { getJobColors } from '@/lib/calendar/colors';

// Constants
const START_HOUR = 6; // 6 AM
const END_HOUR = 18; // 6 PM
const SLOT_HEIGHT = 60; // pixels per hour
const SLOT_INTERVAL = 30; // minutes per slot

interface TimeSlotGridProps {
  date: Date;
  jobs: CalendarJob[];
  onJobClick?: (job: CalendarJob) => void;
  onTimeSlotClick?: (time: Date) => void;
  showCurrentTime?: boolean;
  className?: string;
}

export function TimeSlotGrid({
  date,
  jobs,
  onJobClick,
  onTimeSlotClick,
  showCurrentTime = true,
  className,
}: TimeSlotGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number; label: string }[] = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push({
          hour,
          minute,
          label: minute === 0
            ? time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
            : '',
        });
      }
    }
    return slots;
  }, []);

  // Calculate job positions
  const positionedJobs = useMemo(() => {
    const dayStart = new Date(date);
    dayStart.setHours(START_HOUR, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(END_HOUR, 0, 0, 0);

    return jobs
      .filter((job) => {
        const jobStart = new Date(job.startTime);
        const jobEnd = new Date(job.endTime);
        // Check if job overlaps with our visible range
        return jobStart < dayEnd && jobEnd > dayStart;
      })
      .map((job) => {
        const jobStart = new Date(job.startTime);
        const jobEnd = new Date(job.endTime);

        // Clamp to visible range
        const visibleStart = jobStart < dayStart ? dayStart : jobStart;
        const visibleEnd = jobEnd > dayEnd ? dayEnd : jobEnd;

        // Calculate position (in pixels from top)
        const startMinutes = (visibleStart.getHours() - START_HOUR) * 60 + visibleStart.getMinutes();
        const endMinutes = (visibleEnd.getHours() - START_HOUR) * 60 + visibleEnd.getMinutes();

        const top = (startMinutes / 60) * SLOT_HEIGHT;
        const height = Math.max(((endMinutes - startMinutes) / 60) * SLOT_HEIGHT, 30); // Min 30px height

        return {
          ...job,
          top,
          height,
        };
      });
  }, [date, jobs]);

  // Current time indicator
  const currentTimePosition = useMemo(() => {
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (!isToday || !showCurrentTime) return null;

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (currentHour < START_HOUR || currentHour >= END_HOUR) return null;

    const minutes = (currentHour - START_HOUR) * 60 + currentMinute;
    return (minutes / 60) * SLOT_HEIGHT;
  }, [date, showCurrentTime]);

  // Scroll to current time on mount
  useEffect(() => {
    if (currentTimePosition !== null && scrollRef.current) {
      const scrollTarget = Math.max(0, currentTimePosition - 100);
      scrollRef.current.scrollTop = scrollTarget;
    }
  }, [currentTimePosition]);

  // Handle time slot click
  const handleSlotClick = (hour: number, minute: number) => {
    if (!onTimeSlotClick) return;
    const clickedTime = new Date(date);
    clickedTime.setHours(hour, minute, 0, 0);
    onTimeSlotClick(clickedTime);
  };

  const totalHeight = (END_HOUR - START_HOUR) * SLOT_HEIGHT;

  return (
    <div
      ref={scrollRef}
      className={cn('overflow-auto flex-1', className)}
    >
      <div
        className="relative flex"
        style={{ minHeight: totalHeight }}
      >
        {/* Time labels column */}
        <div className="sticky left-0 z-10 w-14 shrink-0 bg-background border-r border-border">
          {timeSlots.map((slot, index) => (
            <div
              key={`${slot.hour}-${slot.minute}`}
              className="h-[30px] flex items-start justify-end pr-2 -mt-2"
              style={{ height: SLOT_HEIGHT / 2 }}
            >
              {slot.label && (
                <span className="text-xs text-muted-foreground font-medium">
                  {slot.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Main grid area */}
        <div className="flex-1 relative">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {timeSlots.map((slot, index) => (
              <div
                key={`line-${slot.hour}-${slot.minute}`}
                className={cn(
                  'border-t',
                  slot.minute === 0 ? 'border-border' : 'border-border/30'
                )}
                style={{ height: SLOT_HEIGHT / 2 }}
              >
                <button
                  className="w-full h-full hover:bg-muted/30 transition-colors"
                  onClick={() => handleSlotClick(slot.hour, slot.minute)}
                  aria-label={`Schedule at ${slot.hour}:${slot.minute.toString().padStart(2, '0')}`}
                />
              </div>
            ))}
          </div>

          {/* Jobs */}
          <div className="absolute inset-0 pointer-events-none">
            {positionedJobs.map((job) => {
              const colors = getJobColors(job.jobType, job.status);
              return (
                <div
                  key={job.id}
                  className="absolute left-1 right-1 pointer-events-auto"
                  style={{
                    top: job.top,
                    height: job.height,
                  }}
                >
                  <div
                    className={cn(
                      'h-full rounded-md px-2 py-1 text-left overflow-hidden cursor-pointer',
                      'hover:shadow-lg hover:z-10 active:scale-[0.99] transition-all',
                      'border-l-3',
                      colors.bgClass,
                      colors.textClass,
                      job.status === 'completed' && 'opacity-60'
                    )}
                    style={{
                      borderLeftWidth: '3px',
                      borderLeftColor: colors.dot,
                    }}
                    onClick={() => onJobClick?.(job)}
                  >
                    <div className="text-xs font-semibold truncate">
                      {job.title}
                    </div>
                    {job.height >= 45 && (
                      <div className="text-[10px] opacity-80 truncate">
                        {job.customerName || formatTime(job.startTime)}
                      </div>
                    )}
                    {job.height >= 60 && job.address && (
                      <div className="text-[10px] opacity-70 truncate mt-0.5">
                        {job.city || job.address}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              ref={currentTimeRef}
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: currentTimePosition }}
            >
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Multi-day grid for week view
interface WeekTimeSlotGridProps {
  dates: Date[];
  jobs: CalendarJob[];
  onJobClick?: (job: CalendarJob) => void;
  onTimeSlotClick?: (time: Date) => void;
  showCurrentTime?: boolean;
  className?: string;
}

export function WeekTimeSlotGrid({
  dates,
  jobs,
  onJobClick,
  onTimeSlotClick,
  showCurrentTime = true,
  className,
}: WeekTimeSlotGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group jobs by day
  const jobsByDay = useMemo(() => {
    const grouped: Record<string, CalendarJob[]> = {};
    dates.forEach((date) => {
      const key = date.toISOString().split('T')[0];
      grouped[key] = [];
    });

    jobs.forEach((job) => {
      const jobDate = new Date(job.startTime).toISOString().split('T')[0];
      if (grouped[jobDate]) {
        grouped[jobDate].push(job);
      }
    });

    return grouped;
  }, [dates, jobs]);

  // Time slots
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number; label: string }[] = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push({
          hour,
          minute,
          label: minute === 0
            ? time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
            : '',
        });
      }
    }
    return slots;
  }, []);

  // Current time
  const currentTimePosition = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (!showCurrentTime || currentHour < START_HOUR || currentHour >= END_HOUR) {
      return null;
    }

    const minutes = (currentHour - START_HOUR) * 60 + currentMinute;
    return (minutes / 60) * SLOT_HEIGHT;
  }, [showCurrentTime]);

  // Today index
  const todayIndex = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return dates.findIndex((d) => d.toISOString().split('T')[0] === today);
  }, [dates]);

  const totalHeight = (END_HOUR - START_HOUR) * SLOT_HEIGHT;

  const formatDayHeader = (date: Date) => {
    const today = new Date();
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    return {
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      isToday,
    };
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Day headers */}
      <div className="flex border-b border-border shrink-0">
        <div className="w-14 shrink-0" /> {/* Spacer for time column */}
        {dates.map((date) => {
          const { dayName, dayNum, isToday } = formatDayHeader(date);
          return (
            <div
              key={date.toISOString()}
              className={cn(
                'flex-1 text-center py-2 border-l border-border',
                isToday && 'bg-primary/5'
              )}
            >
              <div className="text-xs text-muted-foreground uppercase">{dayName}</div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  isToday && 'text-primary'
                )}
              >
                {dayNum}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div ref={scrollRef} className="overflow-auto flex-1">
        <div className="flex" style={{ minHeight: totalHeight }}>
          {/* Time labels */}
          <div className="sticky left-0 z-10 w-14 shrink-0 bg-background border-r border-border">
            {timeSlots.map((slot) => (
              <div
                key={`${slot.hour}-${slot.minute}`}
                className="flex items-start justify-end pr-2 -mt-2"
                style={{ height: SLOT_HEIGHT / 2 }}
              >
                {slot.label && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {slot.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dates.map((date, dayIndex) => {
            const key = date.toISOString().split('T')[0];
            const dayJobs = jobsByDay[key] || [];
            const isToday = todayIndex === dayIndex;

            return (
              <div
                key={key}
                className={cn(
                  'flex-1 relative border-l border-border',
                  isToday && 'bg-primary/5'
                )}
              >
                {/* Grid lines */}
                {timeSlots.map((slot) => (
                  <div
                    key={`${key}-${slot.hour}-${slot.minute}`}
                    className={cn(
                      'border-t',
                      slot.minute === 0 ? 'border-border' : 'border-border/30'
                    )}
                    style={{ height: SLOT_HEIGHT / 2 }}
                  />
                ))}

                {/* Jobs for this day */}
                <DayJobsOverlay
                  date={date}
                  jobs={dayJobs}
                  onJobClick={onJobClick}
                />

                {/* Current time line */}
                {isToday && currentTimePosition !== null && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: currentTimePosition }}
                  >
                    <div className="h-0.5 bg-red-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helper component for day jobs overlay
function DayJobsOverlay({
  date,
  jobs,
  onJobClick,
}: {
  date: Date;
  jobs: CalendarJob[];
  onJobClick?: (job: CalendarJob) => void;
}) {
  const positionedJobs = useMemo(() => {
    const dayStart = new Date(date);
    dayStart.setHours(START_HOUR, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(END_HOUR, 0, 0, 0);

    return jobs.map((job) => {
      const jobStart = new Date(job.startTime);
      const jobEnd = new Date(job.endTime);

      const visibleStart = jobStart < dayStart ? dayStart : jobStart;
      const visibleEnd = jobEnd > dayEnd ? dayEnd : jobEnd;

      const startMinutes = (visibleStart.getHours() - START_HOUR) * 60 + visibleStart.getMinutes();
      const endMinutes = (visibleEnd.getHours() - START_HOUR) * 60 + visibleEnd.getMinutes();

      const top = (startMinutes / 60) * SLOT_HEIGHT;
      const height = Math.max(((endMinutes - startMinutes) / 60) * SLOT_HEIGHT, 24);

      return { ...job, top, height };
    });
  }, [date, jobs]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {positionedJobs.map((job) => {
        const colors = getJobColors(job.jobType, job.status);
        return (
          <div
            key={job.id}
            className="absolute left-0.5 right-0.5 pointer-events-auto"
            style={{ top: job.top, height: job.height }}
          >
            <div
              className={cn(
                'h-full rounded px-1 py-0.5 text-left overflow-hidden cursor-pointer',
                'hover:shadow-md hover:z-10 transition-all text-[10px]',
                job.status === 'completed' && 'opacity-60'
              )}
              style={{
                backgroundColor: colors.bg,
                borderLeft: `2px solid ${colors.dot}`,
                color: colors.text,
              }}
              onClick={() => onJobClick?.(job)}
            >
              <div className="font-semibold truncate leading-tight">{job.title}</div>
              {job.height >= 36 && (
                <div className="opacity-80 truncate leading-tight">
                  {formatTime(job.startTime)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

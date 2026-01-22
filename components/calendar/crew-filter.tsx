'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Users, Check } from 'lucide-react';

export interface CrewMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  status?: 'available' | 'en_route' | 'on_job' | 'break' | 'offline';
  jobCount?: number;
  color?: string;
}

interface CrewFilterProps {
  crew: CrewMember[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  showJobCounts?: boolean;
  multiSelect?: boolean;
  className?: string;
}

// Status indicator colors
const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-500',
  en_route: 'bg-blue-500',
  on_job: 'bg-amber-500',
  break: 'bg-gray-400',
  offline: 'bg-red-500',
};

// Generate a consistent color for a crew member
function getCrewColor(name: string, index: number): string {
  const colors = [
    '#4A90D9', // Blue
    '#4ADE80', // Green
    '#A855F7', // Purple
    '#F97316', // Orange
    '#EC4899', // Pink
    '#2DD4BF', // Teal
    '#EAB308', // Yellow
    '#EF4444', // Red
  ];
  return colors[index % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function CrewFilter({
  crew,
  selectedIds,
  onSelectionChange,
  showJobCounts = true,
  multiSelect = true,
  className,
}: CrewFilterProps) {
  const allSelected = selectedIds.length === 0 || selectedIds.length === crew.length;

  const handleCrewClick = (crewId: string) => {
    if (crewId === 'all') {
      onSelectionChange([]);
      return;
    }

    if (multiSelect) {
      if (selectedIds.includes(crewId)) {
        const newIds = selectedIds.filter((id) => id !== crewId);
        onSelectionChange(newIds.length === crew.length ? [] : newIds);
      } else {
        const newIds = [...selectedIds, crewId];
        onSelectionChange(newIds.length === crew.length ? [] : newIds);
      }
    } else {
      onSelectionChange(selectedIds.includes(crewId) ? [] : [crewId]);
    }
  };

  const totalJobCount = useMemo(
    () => crew.reduce((sum, c) => sum + (c.jobCount || 0), 0),
    [crew]
  );

  return (
    <div className={cn('w-full', className)}>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 p-1">
          {/* All crew pill */}
          <button
            onClick={() => handleCrewClick('all')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-full border transition-all',
              'min-h-[48px] min-w-[80px] shrink-0',
              'hover:shadow-md active:scale-[0.98]',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              allSelected
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:border-primary/50'
            )}
          >
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full',
                allSelected ? 'bg-primary-foreground/20' : 'bg-muted'
              )}
            >
              <Users className={cn('h-4 w-4', allSelected ? 'text-primary-foreground' : 'text-muted-foreground')} />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium">All</div>
              {showJobCounts && (
                <div className={cn('text-xs', allSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {totalJobCount} jobs
                </div>
              )}
            </div>
            {allSelected && (
              <Check className="h-4 w-4 ml-1" />
            )}
          </button>

          {/* Individual crew pills */}
          {crew.map((member, index) => {
            const isSelected = selectedIds.length === 0 || selectedIds.includes(member.id);
            const isExplicitlySelected = selectedIds.includes(member.id);
            const crewColor = member.color || getCrewColor(member.name, index);

            return (
              <button
                key={member.id}
                onClick={() => handleCrewClick(member.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-full border transition-all',
                  'min-h-[48px] shrink-0',
                  'hover:shadow-md active:scale-[0.98]',
                  'focus:outline-none focus:ring-2 focus:ring-primary/20',
                  isExplicitlySelected
                    ? 'border-primary bg-primary/10'
                    : isSelected
                      ? 'bg-background border-border hover:border-primary/50'
                      : 'bg-muted/50 border-transparent opacity-60'
                )}
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    {member.avatar_url ? (
                      <AvatarImage src={member.avatar_url} alt={member.name} />
                    ) : null}
                    <AvatarFallback
                      style={{ backgroundColor: crewColor }}
                      className="text-white text-xs font-medium"
                    >
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status indicator */}
                  {member.status && (
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                        STATUS_COLORS[member.status] || 'bg-gray-400'
                      )}
                    />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium truncate max-w-[100px]">
                    {member.name.split(' ')[0]}
                  </div>
                  {showJobCounts && (
                    <div className="text-xs text-muted-foreground">
                      {member.jobCount || 0} jobs
                    </div>
                  )}
                </div>
                {isExplicitlySelected && (
                  <Check className="h-4 w-4 text-primary ml-1" />
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

// Compact version for tighter spaces
interface CompactCrewFilterProps {
  crew: CrewMember[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  className?: string;
}

export function CompactCrewFilter({
  crew,
  selectedIds,
  onSelectionChange,
  className,
}: CompactCrewFilterProps) {
  const allSelected = selectedIds.length === 0;

  const handleClick = (id: string) => {
    if (id === 'all') {
      onSelectionChange([]);
    } else if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      <button
        onClick={() => handleClick('all')}
        className={cn(
          'px-2 py-1 rounded-md text-xs font-medium transition-colors',
          allSelected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        )}
      >
        All
      </button>
      {crew.map((member, index) => {
        const isSelected = selectedIds.length === 0 || selectedIds.includes(member.id);
        const color = member.color || getCrewColor(member.name, index);

        return (
          <button
            key={member.id}
            onClick={() => handleClick(member.id)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
              isSelected
                ? 'bg-opacity-20'
                : 'bg-muted text-muted-foreground opacity-50'
            )}
            style={{
              backgroundColor: isSelected ? `${color}20` : undefined,
              color: isSelected ? color : undefined,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            {member.name.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}

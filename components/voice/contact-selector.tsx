'use client';

import { useEffect, useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Phone, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
}

interface ContactSelectorProps {
  label?: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  excludeId?: string;
  className?: string;
  showPhone?: boolean;
  filterActiveOnly?: boolean;
}

/**
 * Contact Selector Component
 * Allows selection of a team member as a contact for voice settings.
 * Used for primary/backup contact selection in global and location-specific settings.
 */
export function ContactSelector({
  label,
  value,
  onChange,
  placeholder = 'Select a team member',
  description,
  disabled = false,
  excludeId,
  className,
  showPhone = true,
  filterActiveOnly = true,
}: ContactSelectorProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/team/members');
      if (!response.ok) {
        throw new Error('Failed to load team members');
      }
      const data = await response.json();
      setMembers(data.members || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Filter members
  const filteredMembers = members.filter((member) => {
    if (excludeId && member.id === excludeId) return false;
    if (filterActiveOnly && member.status !== 'active') return false;
    return true;
  });

  // Find selected member for display
  const selectedMember = members.find((m) => m.id === value);

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label className="text-text">{label}</Label>}
      <Select
        value={value || ''}
        onValueChange={(val) => onChange(val === '' ? undefined : val)}
        disabled={disabled || loading}
      >
        <SelectTrigger className={cn(loading && 'opacity-50')}>
          <SelectValue placeholder={loading ? 'Loading...' : placeholder}>
            {selectedMember && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-text-muted" />
                <span>{selectedMember.full_name}</span>
                {selectedMember.role === 'owner' && (
                  <span className="text-xs text-primary">(Owner)</span>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* None option */}
          <SelectItem value="">
            <div className="flex items-center gap-2 text-text-muted">
              <Users className="h-4 w-4" />
              <span>None (no contact)</span>
            </div>
          </SelectItem>

          {error ? (
            <div className="px-2 py-4 text-center text-sm text-danger">
              {error}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-text-muted">
              No team members available
            </div>
          ) : (
            filteredMembers.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center gap-2">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.full_name}</span>
                      {member.role === 'owner' && (
                        <span className="text-xs text-primary">(Owner)</span>
                      )}
                      {member.role === 'admin' && (
                        <span className="text-xs text-info">(Admin)</span>
                      )}
                    </div>
                    {showPhone && member.phone && (
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Phone className="h-3 w-3" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-xs text-text-muted">{description}</p>
      )}
    </div>
  );
}

/**
 * Dual Contact Selector Component
 * Combines primary and backup contact selection in a single component.
 * Used in voice settings pages.
 */
interface DualContactSelectorProps {
  primaryContactId: string | undefined;
  backupContactId: string | undefined;
  onPrimaryChange: (value: string | undefined) => void;
  onBackupChange: (value: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}

export function DualContactSelector({
  primaryContactId,
  backupContactId,
  onPrimaryChange,
  onBackupChange,
  disabled = false,
  className,
}: DualContactSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <ContactSelector
        label="Primary Contact"
        value={primaryContactId}
        onChange={onPrimaryChange}
        placeholder="Select primary contact"
        description="First person to receive emergency escalations and notifications"
        disabled={disabled}
        excludeId={backupContactId}
      />
      <ContactSelector
        label="Backup Contact"
        value={backupContactId}
        onChange={onBackupChange}
        placeholder="Select backup contact"
        description="Contacted if primary doesn't respond within escalation timeout"
        disabled={disabled}
        excludeId={primaryContactId}
      />
    </div>
  );
}

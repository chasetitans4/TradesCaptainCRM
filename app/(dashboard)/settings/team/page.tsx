'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  User,
  Crown,
  Shield,
  Wrench,
  MoreVertical,
  Mail,
  RefreshCw,
  X,
  CheckCircle,
  Loader2,
  UserX,
  UserCheck,
  ArrowRightLeft,
} from 'lucide-react';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatRelativeDate } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import type { UserWithBusiness } from '@/types';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'technician';
  avatar_url: string | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  inviter: { name: string } | null;
}

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
  technician: { label: 'Technician', icon: Wrench, color: 'text-gray-600 bg-gray-100 dark:bg-gray-800' },
};

export default function TeamPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<TeamMember | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferConfirm, setTransferConfirm] = useState('');
  const [selectedNewOwner, setSelectedNewOwner] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    // Load members
    const membersRes = await fetch('/api/team/members');
    if (membersRes.ok) {
      const data = await membersRes.json();
      setMembers(data.members);
    }

    // Load invitations (only for admins/owners)
    if (['owner', 'admin'].includes(profile.role)) {
      const invitationsRes = await fetch('/api/team/invitations');
      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        setInvitations(data.invitations);
      }
    }

    setLoading(false);
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'technician') => {
    setActionLoading(memberId);
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
        setShowRoleModal(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to change role');
      }
    } catch (error) {
      alert('Failed to change role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (memberId: string) => {
    if (!confirm('Are you sure you want to deactivate this team member? They will no longer be able to log in.')) return;

    setActionLoading(memberId);
    try {
      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMembers(members.map(m => m.id === memberId ? { ...m, status: 'deactivated' } : m));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to deactivate member');
      }
    } catch (error) {
      alert('Failed to deactivate member');
    } finally {
      setActionLoading(null);
      setShowMenu(null);
    }
  };

  const handleReactivate = async (memberId: string) => {
    setActionLoading(memberId);
    try {
      const response = await fetch(`/api/team/members/${memberId}/reactivate`, {
        method: 'POST',
      });

      if (response.ok) {
        setMembers(members.map(m => m.id === memberId ? { ...m, status: 'active' } : m));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to reactivate member');
      }
    } catch (error) {
      alert('Failed to reactivate member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setActionLoading(inviteId);
    try {
      const response = await fetch(`/api/team/invitations/${inviteId}/resend`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Invitation resent!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to resend invitation');
      }
    } catch (error) {
      alert('Failed to resend invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!confirm('Cancel this invitation?')) return;

    setActionLoading(inviteId);
    try {
      const response = await fetch(`/api/team/invitations/${inviteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInvitations(invitations.filter(i => i.id !== inviteId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      alert('Failed to cancel invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTransferOwnership = async () => {
    if (transferConfirm !== 'TRANSFER' || !selectedNewOwner) return;

    setActionLoading('transfer');
    try {
      const response = await fetch('/api/team/transfer-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_owner_id: selectedNewOwner }),
      });

      if (response.ok) {
        alert('Ownership transferred successfully!');
        loadData();
        setShowTransferModal(false);
        setTransferConfirm('');
        setSelectedNewOwner(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to transfer ownership');
      }
    } catch (error) {
      alert('Failed to transfer ownership');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const canManageTeam = hasPermission(user.role as any, 'manage_team');
  const isOwner = user.role === 'owner';
  const activeMembers = members.filter(m => m.status === 'active');
  const inactiveMembers = members.filter(m => m.status === 'deactivated');
  const eligibleNewOwners = activeMembers.filter(m => m.id !== user.id && m.role !== 'owner');

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold flex-1">Team</h1>
          {canManageTeam && (
            <Link
              href="/settings/team/invite"
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Invite</span>
            </Link>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Active Members */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Team Members ({activeMembers.length})
          </h2>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {activeMembers.map((member) => {
              const roleConfig = ROLE_CONFIG[member.role];
              const RoleIcon = roleConfig.icon;
              const isCurrentUser = member.id === user.id;
              const canEditMember = canManageTeam && !isCurrentUser && member.role !== 'owner';

              return (
                <div key={member.id} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{member.name}</p>
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground">(You)</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full', roleConfig.color)}>
                      <RoleIcon className="h-3 w-3" />
                      {roleConfig.label}
                    </span>

                    {canEditMember && (
                      <div className="relative">
                        <button
                          onClick={() => setShowMenu(showMenu === member.id ? null : member.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>

                        {showMenu === member.id && (
                          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px] z-20">
                            <button
                              onClick={() => {
                                setShowRoleModal(member);
                                setShowMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left"
                            >
                              <ArrowRightLeft className="h-4 w-4" />
                              Change Role
                            </button>
                            <button
                              onClick={() => handleDeactivate(member.id)}
                              disabled={actionLoading === member.id}
                              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left text-red-600"
                            >
                              {actionLoading === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <UserX className="h-4 w-4" />
                              )}
                              Deactivate
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pending Invitations */}
        {canManageTeam && invitations.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Pending Invitations ({invitations.length})
            </h2>
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {invitations.map((invite) => {
                const roleConfig = ROLE_CONFIG[invite.role as keyof typeof ROLE_CONFIG];

                return (
                  <div key={invite.id} className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Sent {formatRelativeDate(invite.created_at)}
                        {invite.inviter && ` by ${invite.inviter.name}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs px-2 py-1 rounded-full', roleConfig?.color)}>
                        {roleConfig?.label || invite.role}
                      </span>

                      <button
                        onClick={() => handleResendInvite(invite.id)}
                        disabled={actionLoading === invite.id}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Resend invitation"
                      >
                        {actionLoading === invite.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      <button
                        onClick={() => handleCancelInvite(invite.id)}
                        disabled={actionLoading === invite.id}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Cancel invitation"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inactive Members */}
        {canManageTeam && inactiveMembers.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Inactive Members ({inactiveMembers.length})
            </h2>
            <div className="bg-card rounded-xl border border-border divide-y divide-border opacity-60">
              {inactiveMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <UserX className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                  </div>

                  <button
                    onClick={() => handleReactivate(member.id)}
                    disabled={actionLoading === member.id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {actionLoading === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    Reactivate
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transfer Ownership (Owner only) */}
        {isOwner && eligibleNewOwners.length > 0 && (
          <div className="pt-4 border-t border-border">
            <button
              onClick={() => setShowTransferModal(true)}
              className="w-full text-left p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <Crown className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Transfer Ownership</p>
                  <p className="text-sm text-muted-foreground">
                    Transfer your owner role to another team member
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(null)} />
      )}

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Change Role</h2>
            <p className="text-sm text-muted-foreground">
              Select a new role for {showRoleModal.name}
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleChangeRole(showRoleModal.id, 'admin')}
                disabled={actionLoading === showRoleModal.id}
                className={cn(
                  'w-full flex items-center gap-3 p-4 border rounded-lg transition-colors text-left',
                  showRoleModal.role === 'admin'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted'
                )}
              >
                <Shield className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Admin</p>
                  <p className="text-sm text-muted-foreground">Full access except billing</p>
                </div>
                {showRoleModal.role === 'admin' && (
                  <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                )}
              </button>

              <button
                onClick={() => handleChangeRole(showRoleModal.id, 'technician')}
                disabled={actionLoading === showRoleModal.id}
                className={cn(
                  'w-full flex items-center gap-3 p-4 border rounded-lg transition-colors text-left',
                  showRoleModal.role === 'technician'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted'
                )}
              >
                <Wrench className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium">Technician</p>
                  <p className="text-sm text-muted-foreground">View assigned jobs only</p>
                </div>
                {showRoleModal.role === 'technician' && (
                  <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                )}
              </button>
            </div>

            <button
              onClick={() => setShowRoleModal(null)}
              className="w-full py-3 border border-input rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-amber-600">Transfer Ownership</h2>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Warning:</strong> After transferring ownership, you will become an Admin and lose access to:
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 list-disc list-inside">
                <li>Billing and subscription management</li>
                <li>Ability to transfer ownership</li>
              </ul>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">New Owner</label>
              <select
                value={selectedNewOwner || ''}
                onChange={(e) => setSelectedNewOwner(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg"
              >
                <option value="">Select a team member</option>
                {eligibleNewOwners.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Type TRANSFER to confirm
              </label>
              <input
                type="text"
                value={transferConfirm}
                onChange={(e) => setTransferConfirm(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg"
                placeholder="TRANSFER"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferConfirm('');
                  setSelectedNewOwner(null);
                }}
                className="flex-1 py-3 border border-input rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferOwnership}
                disabled={transferConfirm !== 'TRANSFER' || !selectedNewOwner || actionLoading === 'transfer'}
                className="flex-1 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === 'transfer' ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  'Transfer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

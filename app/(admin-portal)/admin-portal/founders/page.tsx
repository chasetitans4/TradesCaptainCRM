'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Crown,
  Users,
  Gift,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Building2,
  Mail,
  TrendingUp,
  Lock,
  Unlock,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface FoundersStatus {
  is_open: boolean;
  slots_remaining: number;
  slots_claimed: number;
  total_slots: number;
  closed_at?: string;
  closed_by?: string;
}

interface FoundersMember {
  id: string;
  business_name: string;
  owner_email: string;
  owner_name: string;
  founders_start_date: string;
  founders_end_date: string;
  plan_status: string;
  created_at: string;
}

export default function FoundersProgramPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<FoundersStatus | null>(null);
  const [members, setMembers] = useState<FoundersMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [statusRes, membersRes] = await Promise.all([
        fetch('/api/admin/founders/status'),
        fetch('/api/admin/accounts?plan_status=founders'),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.accounts || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseProgram() {
    if (!confirm('Are you sure you want to close the Founders Program? This cannot be undone.')) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/founders/close', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to close program');
      }
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressPercent = status
    ? ((status.total_slots - status.slots_remaining) / status.total_slots) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Crown className="h-7 w-7 text-purple-600" />
            Founders Program
          </h1>
          <p className="text-gray-500">Manage the first 100 founding members</p>
        </div>
        {status?.is_open && (
          <button
            onClick={handleCloseProgram}
            disabled={actionLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            Close Program
          </button>
        )}
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl p-6 ${
        status?.is_open
          ? 'bg-gradient-to-r from-purple-600 to-purple-700'
          : 'bg-gray-800'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {status?.is_open ? (
              <div className="p-2 bg-white/20 rounded-lg">
                <Unlock className="h-6 w-6 text-white" />
              </div>
            ) : (
              <div className="p-2 bg-white/10 rounded-lg">
                <Lock className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div>
              <div className="text-xl font-bold text-white">
                {status?.is_open ? 'Program Open' : 'Program Closed'}
              </div>
              <div className="text-white/70">
                {status?.is_open
                  ? `${status.slots_remaining} slots remaining`
                  : status?.closed_at
                  ? `Closed ${formatDistanceToNow(new Date(status.closed_at), { addSuffix: true })}`
                  : 'All slots have been claimed'}
              </div>
            </div>
          </div>
          {status?.is_open && (
            <Link
              href="/admin-portal/submissions/new-founders"
              className="px-4 py-2 bg-white text-purple-700 rounded-lg hover:bg-purple-50 transition-colors font-medium flex items-center gap-2"
            >
              <Gift className="h-4 w-4" />
              Add Founder
            </Link>
          )}
        </div>

        {/* Progress Bar */}
        <div className="bg-white/20 rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-sm text-white/80">
          <span>{status?.slots_claimed || 0} claimed</span>
          <span>{status?.total_slots || 100} total</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {status?.slots_claimed || 0}
              </div>
              <div className="text-sm text-gray-500">Founders Claimed</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Gift className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${(status?.slots_claimed || 0) * 147}
              </div>
              <div className="text-sm text-gray-500">Value Given</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Crown className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {status?.slots_remaining || 0}
              </div>
              <div className="text-sm text-gray-500">Slots Available</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${(status?.slots_claimed || 0) * 49}
              </div>
              <div className="text-sm text-gray-500">Future MRR</div>
            </div>
          </div>
        </div>
      </div>

      {/* Founders List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Founding Members</h2>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Crown className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No founding members yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">#</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Business</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Owner</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Free Period Ends</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((member, index) => {
                  const isActive = new Date(member.founders_end_date) > new Date();
                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{member.business_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-900">{member.owner_name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.owner_email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            <XCircle className="h-3 w-3" />
                            Expired
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {format(new Date(member.founders_end_date), 'MMM d, yyyy')}
                        </div>
                        {isActive && (
                          <div className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(member.founders_end_date), { addSuffix: true })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {format(new Date(member.created_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

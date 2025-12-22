'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Users,
  Crown,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  UserPlus,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface DashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  trialAccounts: number;
  foundersAccounts: number;
  cancelledAccounts: number;
  trialConversionRate: number;
  monthlyRevenue: number;
  pendingSubmissions: number;
  foundersRemaining: number;
  foundersTotal: number;
}

interface Activity {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  created_at: string;
  admin?: { full_name: string };
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/admin/reports/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard');
        const data = await res.json();
        setStats(data.stats);
        setActivities(data.recentActivity || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  function getActivityIcon(action: string) {
    switch (action) {
      case 'created_account':
        return <Building2 className="h-4 w-4 text-green-600" />;
      case 'cancelled_account':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'extended_trial':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'sent_invite':
        return <UserPlus className="h-4 w-4 text-primary" />;
      case 'approved_submission':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  }

  function formatActivityText(activity: Activity) {
    const admin = activity.admin?.full_name || 'Admin';
    switch (activity.action) {
      case 'created_account':
        return `${admin} created a new account`;
      case 'cancelled_account':
        return `${admin} cancelled an account`;
      case 'extended_trial':
        return `${admin} extended a trial period`;
      case 'sent_invite':
        return `${admin} sent an invite to ${activity.details?.email || 'a client'}`;
      case 'approved_submission':
        return `${admin} approved a submission`;
      case 'created_submission':
        return `${admin} created a new submission`;
      default:
        return `${admin} performed ${activity.action.replace(/_/g, ' ')}`;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome to the TradesCaptain Admin Portal</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin-portal/submissions/new-trial"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <UserPlus className="h-4 w-4" />
            New Trial
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Accounts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500">All time</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{stats?.totalAccounts || 0}</div>
            <div className="text-sm text-gray-500">Total Accounts</div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span>{stats?.activeAccounts || 0} active</span>
          </div>
        </div>

        {/* Trial Accounts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <span className="text-xs text-gray-500">Active trials</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{stats?.trialAccounts || 0}</div>
            <div className="text-sm text-gray-500">Trial Accounts</div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats?.trialConversionRate || 0}% conversion rate
          </div>
        </div>

        {/* Founders Program */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Crown className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500">Limited slots</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{stats?.foundersAccounts || 0}</div>
            <div className="text-sm text-gray-500">Founders Members</div>
          </div>
          <div className="mt-2 text-sm text-purple-600">
            {stats?.foundersRemaining || 0} of {stats?.foundersTotal || 100} slots remaining
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs text-gray-500">This month</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">
              ${stats?.monthlyRevenue?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-500">Monthly Revenue</div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            From {stats?.activeAccounts || 0} paying accounts
          </div>
        </div>
      </div>

      {/* Pending Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Actions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pending Actions</h2>
          </div>
          <div className="p-5 space-y-4">
            {(stats?.pendingSubmissions || 0) > 0 && (
              <Link
                href="/admin-portal/submissions?status=pending"
                className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FileText className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {stats?.pendingSubmissions} Pending Submissions
                    </div>
                    <div className="text-sm text-gray-500">
                      Review and send invites
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </Link>
            )}

            {(stats?.trialAccounts || 0) > 0 && (
              <Link
                href="/admin-portal/accounts?plan_status=trial"
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {stats?.trialAccounts} Active Trials
                    </div>
                    <div className="text-sm text-gray-500">
                      Monitor trial progress
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </Link>
            )}

            {(stats?.pendingSubmissions || 0) === 0 && (stats?.trialAccounts || 0) === 0 && (
              <div className="text-center py-6 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>All caught up! No pending actions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Link
              href="/admin-portal/activity"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {activities.length === 0 ? (
              <div className="p-5 text-center text-gray-500">
                No recent activity
              </div>
            ) : (
              activities.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  className="px-5 py-3 flex items-start gap-3"
                >
                  <div className="p-1.5 bg-gray-100 rounded-lg mt-0.5">
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {formatActivityText(activity)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Active: {stats?.activeAccounts || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-600">Trial: {stats?.trialAccounts || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-gray-600">Founders: {stats?.foundersAccounts || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600">Cancelled: {stats?.cancelledAccounts || 0}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <Calendar className="h-4 w-4 inline mr-1" />
            Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
          </div>
        </div>
      </div>
    </div>
  );
}

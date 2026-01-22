'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Calendar,
  Receipt,
  FileText,
  MessageSquare,
  Wrench,
  Check,
  CheckCheck,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Filter,
  X,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: {
    link?: string;
    [key: string]: unknown;
  };
}

type FilterType = 'all' | 'unread' | 'appointment' | 'invoice' | 'quote' | 'message';

const NOTIFICATION_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'quote', label: 'Quotes' },
  { value: 'message', label: 'Messages' },
];

export default function NotificationsPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<FilterType>('all');
  const [markingRead, setMarkingRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        businessId,
        limit: '50',
      });
      if (filter === 'unread') {
        params.set('unreadOnly', 'true');
      }

      const res = await fetch(`/api/portal/notifications?${params}`);
      if (!res.ok) {
        throw new Error(`Failed to load notifications: ${res.status}`);
      }
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId, filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const markAsRead = async (notificationIds?: string[]) => {
    setMarkingRead(true);
    try {
      const res = await fetch(`/api/portal/notifications?businessId=${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          notificationIds
            ? { notificationIds }
            : { markAllRead: true }
        ),
      });
      if (!res.ok) {
        throw new Error('Failed to mark notifications as read');
      }
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead([notification.id]);
    }
    if (notification.data?.link) {
      router.push(notification.data.link as string);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
      case 'appointment_reminder':
      case 'appointment_confirmed':
      case 'appointment_rescheduled':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'invoice':
      case 'invoice_due':
      case 'invoice_overdue':
      case 'payment':
      case 'payment_received':
        return <Receipt className="h-5 w-5 text-green-600" />;
      case 'quote':
      case 'quote_sent':
      case 'quote_expiring':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'message':
      case 'new_message':
        return <MessageSquare className="h-5 w-5 text-indigo-600" />;
      case 'equipment':
      case 'maintenance':
      case 'maintenance_due':
        return <Wrench className="h-5 w-5 text-orange-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'appointment':
      case 'appointment_reminder':
      case 'appointment_confirmed':
      case 'appointment_rescheduled':
        return 'bg-blue-100';
      case 'invoice':
      case 'invoice_due':
      case 'invoice_overdue':
      case 'payment':
      case 'payment_received':
        return 'bg-green-100';
      case 'quote':
      case 'quote_sent':
      case 'quote_expiring':
        return 'bg-purple-100';
      case 'message':
      case 'new_message':
        return 'bg-indigo-100';
      case 'equipment':
      case 'maintenance':
      case 'maintenance_due':
        return 'bg-orange-100';
      default:
        return 'bg-gray-100';
    }
  };

  // Filter notifications by type
  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all' || filter === 'unread') return true;
    return notification.type.includes(filter);
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;
    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4">
                <div className="flex gap-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-full bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/portal/${businessId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAsRead()}
              disabled={markingRead}
            >
              {markingRead ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark all read
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {NOTIFICATION_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilter(type.value as FilterType)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors',
              filter === type.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {type.label}
            {type.value === 'unread' && unreadCount > 0 && (
              <Badge className="ml-1.5 h-5 min-w-5 px-1 bg-white/20 text-white">
                {unreadCount}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
          <p className="text-sm text-gray-500">
            {filter === 'unread'
              ? "You're all caught up!"
              : 'Notifications will appear here when you receive them.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-500 mb-3">{date}</h3>
              <div className="space-y-2">
                {dateNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'bg-white rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md',
                      !notification.read
                        ? 'border-blue-200 bg-blue-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                        getNotificationColor(notification.type)
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm',
                            !notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                          )}>
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400">
                              {formatTime(notification.created_at)}
                            </span>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.data?.link && (
                          <p className="text-xs text-blue-600 mt-2">
                            Tap to view details
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

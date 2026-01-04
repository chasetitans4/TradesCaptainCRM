'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  MessageSquare,
  Calendar,
  DollarSign,
  UserPlus,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton-loaders';

// Notification types
export type NotificationType =
  | 'message'
  | 'lead'
  | 'job'
  | 'invoice'
  | 'payment'
  | 'reminder'
  | 'alert'
  | 'info'
  | 'celebration';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// Icons for notification types
const NOTIFICATION_ICONS: Record<NotificationType, typeof Bell> = {
  message: MessageSquare,
  lead: UserPlus,
  job: Calendar,
  invoice: DollarSign,
  payment: DollarSign,
  reminder: AlertTriangle,
  alert: AlertTriangle,
  info: Info,
  celebration: Sparkles,
};

// Colors for notification types
const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  message: 'bg-primary/10 text-primary',
  lead: 'bg-secondary/10 text-secondary',
  job: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  invoice: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  payment: 'bg-success/10 text-success',
  reminder: 'bg-warning/10 text-warning',
  alert: 'bg-destructive/10 text-destructive',
  info: 'bg-muted text-muted-foreground',
  celebration: 'bg-gradient-to-br from-secondary-400/20 to-primary-600/20 text-primary',
};

interface NotificationCenterProps {
  notifications?: Notification[];
  loading?: boolean;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onDismiss?: (id: string) => void;
  onClear?: () => void;
}

export function NotificationCenter({
  notifications = [],
  loading = false,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClear,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        onMarkRead?.(notification.id);
      }
      if (notification.href) {
        setIsOpen(false);
      }
    },
    [onMarkRead]
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute flex items-center justify-center',
                'top-1 right-1 min-w-[18px] h-[18px] px-1',
                'text-[10px] font-bold text-white bg-destructive rounded-full',
                'animate-in fade-in zoom-in duration-300'
              )}
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-96 max-h-[80vh] overflow-hidden p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div>
            <h2 className="font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllRead}
                className="text-xs gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notification list */}
        <div className="overflow-y-auto max-h-[400px]">
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" index={i} />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" index={i} />
                    <Skeleton className="h-3 w-full" index={i} />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                <Bell className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onDismiss={() => onDismiss?.(notification.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t bg-card flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/notifications" onClick={() => setIsOpen(false)}>
                View all notifications
              </Link>
            </Button>
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-muted-foreground"
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onDismiss: () => void;
}

function NotificationItem({
  notification,
  onClick,
  onDismiss,
}: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type];
  const colorClass = NOTIFICATION_COLORS[notification.type];

  const content = (
    <div
      className={cn(
        'flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer group relative',
        !notification.read && 'bg-primary/5'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          colorClass
        )}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium truncate',
              !notification.read && 'text-foreground'
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span
              className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5"
              aria-label="Unread"
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
        </p>
      </div>

      {/* Dismiss button (visible on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );

  if (notification.href) {
    return <Link href={notification.href}>{content}</Link>;
  }

  return content;
}

// Hook for managing notifications state
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch notifications on mount
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(
            data.notifications.map((n: Notification & { createdAt: string }) => ({
              ...n,
              createdAt: new Date(n.createdAt),
            }))
          );
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  const dismiss = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  }, []);

  const clear = useCallback(async () => {
    setNotifications([]);

    try {
      await fetch('/api/notifications', { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `local-${Date.now()}`,
      createdAt: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    markRead,
    markAllRead,
    dismiss,
    clear,
    addNotification,
  };
}

// Mock notifications for development
export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'lead',
    title: 'New lead received',
    message: 'John Smith requested a quote for HVAC repair',
    href: '/leads/1',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment received',
    message: 'Jane Doe paid $450 for invoice #INV-001',
    href: '/invoices/1',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: '3',
    type: 'reminder',
    title: 'Job reminder',
    message: 'You have a job scheduled tomorrow at 9:00 AM',
    href: '/calendar',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: '4',
    type: 'message',
    title: 'New message',
    message: 'Mike Johnson: "When can you come take a look?"',
    href: '/messages/1',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
  },
];

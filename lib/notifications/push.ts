// =====================================================
// PUSH NOTIFICATIONS LIBRARY
// Web Push and notification management
// =====================================================

import { createClient as createServerClient } from '@/lib/supabase/server';

// VAPID keys for web push (set in environment variables)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@tradescaptain.com';

interface SendNotificationParams {
  userId: string;
  businessId: string;
  title: string;
  body: string;
  icon?: string;
  actionType?: string;
  actionData?: Record<string, any>;
  url?: string;
  metadata?: Record<string, any>;
}

/**
 * Check if web push is configured
 */
export function isWebPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

interface Notification {
  id: string;
  user_id: string;
  business_id: string;
  title: string;
  body: string;
  icon?: string;
  action_type?: string;
  action_data?: Record<string, any>;
  read_at?: string;
  created_at: string;
}

interface NotificationPreferences {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  new_lead_notifications: boolean;
  job_assignment_notifications: boolean;
  schedule_change_notifications: boolean;
  message_notifications: boolean;
  payment_notifications: boolean;
  reminder_notifications: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

/**
 * Send a push notification to a user
 */
export async function sendPushNotification(params: SendNotificationParams): Promise<void> {
  const { userId, businessId, title, body, icon, actionType, actionData, url, metadata } = params;
  const supabase = await createServerClient();

  // Check user preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (prefs && !prefs.push_enabled) {
    return; // User has disabled push notifications
  }

  // Check quiet hours
  if (prefs?.quiet_hours_enabled && prefs.quiet_hours_start && prefs.quiet_hours_end) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    if (currentTime >= prefs.quiet_hours_start && currentTime <= prefs.quiet_hours_end) {
      return; // Within quiet hours
    }
  }

  // Save notification to database
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      business_id: businessId,
      title,
      body,
      icon,
      action_type: actionType || (url ? 'open_url' : undefined),
      action_data: {
        ...(actionData || {}),
        ...(url ? { url } : {}),
        ...(metadata ? { metadata } : {}),
      },
    })
    .select()
    .single();

  if (error) throw error;

  // Get all active subscriptions for user
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!subscriptions?.length) return;

  // Prepare payload
  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/icon-192.png',
    data: {
      notificationId: notification?.id,
      actionType: actionType || (url ? 'open_url' : undefined),
      ...((actionData || {})),
      ...(url ? { url } : {}),
      ...(metadata ? { metadata } : {}),
    },
  });

  // Send to all subscriptions using web-push
  for (const sub of subscriptions) {
    try {
      if (sub.device_type === 'web' && sub.endpoint) {
        // Web Push using fetch-based implementation
        await sendWebPush(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys_p256dh,
              auth: sub.keys_auth,
            },
          },
          payload
        );
      } else if (sub.fcm_token) {
        // FCM for mobile - log for now, would need firebase-admin
        console.log(`FCM notification queued for ${sub.fcm_token}`);
      }
    } catch (error: any) {
      console.error(`Failed to send push to subscription ${sub.id}:`, error);
      // If subscription is invalid (410 Gone), mark as inactive
      if (error.statusCode === 410 || error.message?.includes('410')) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', sub.id);
      }
    }
  }
}

/**
 * Send a web push notification
 * This is a simplified implementation - for production, use the web-push library
 */
async function sendWebPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string
): Promise<void> {
  if (!isWebPushConfigured()) {
    console.log('Web push not configured, skipping. Set VAPID keys in environment.');
    return;
  }

  // For a full implementation, you would use the web-push npm package:
  // import webpush from 'web-push';
  // webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
  // await webpush.sendNotification(subscription, payload);

  // Simple fetch-based push (limited browser support for direct push)
  // In production, install web-push: npm install web-push
  try {
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: payload,
    });

    if (!response.ok) {
      const error: any = new Error(`Push failed: ${response.status}`);
      error.statusCode = response.status;
      throw error;
    }
  } catch (error) {
    // Log but don't fail silently - notifications are stored in DB anyway
    console.error('Web push delivery failed:', error);
    throw error;
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<Notification[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.unreadOnly) {
    query = query.is('read_at', null);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw error;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createServerClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) throw error;
  return count || 0;
}

/**
 * Get or create notification preferences
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (!data) {
    // Create default preferences
    const { data: created, error: createError } = await supabase
      .from('notification_preferences')
      .insert({ user_id: userId })
      .select()
      .single();

    if (createError) throw createError;
    return created;
  }

  return data;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, 'id' | 'user_id'>>
): Promise<NotificationPreferences> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('notification_preferences')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Register a push subscription
 */
export async function registerPushSubscription(
  userId: string,
  subscription: {
    endpoint?: string;
    keys?: { p256dh: string; auth: string };
    fcmToken?: string;
    deviceType: 'web' | 'ios' | 'android';
    deviceName?: string;
  }
): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      keys_p256dh: subscription.keys?.p256dh,
      keys_auth: subscription.keys?.auth,
      fcm_token: subscription.fcmToken,
      device_type: subscription.deviceType,
      device_name: subscription.deviceName,
      is_active: true,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

/**
 * Unregister a push subscription
 */
export async function unregisterPushSubscription(
  userId: string,
  endpoint?: string,
  fcmToken?: string
): Promise<void> {
  const supabase = await createServerClient();

  let query = supabase
    .from('push_subscriptions')
    .update({ is_active: false })
    .eq('user_id', userId);

  if (endpoint) {
    query = query.eq('endpoint', endpoint);
  } else if (fcmToken) {
    query = query.eq('fcm_token', fcmToken);
  }

  const { error } = await query;
  if (error) throw error;
}

// =====================================================
// NOTIFICATION HELPER FUNCTIONS
// =====================================================

/**
 * Notify about new lead
 */
export async function notifyNewLead(
  businessId: string,
  leadName: string,
  leadId: string
): Promise<void> {
  const supabase = await createServerClient();

  // Get all users who should receive lead notifications
  const { data: users } = await supabase
    .from('users')
    .select(`
      id,
      preferences:notification_preferences(new_lead_notifications)
    `)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin']);

  for (const user of users || []) {
    const prefs = Array.isArray(user.preferences) ? user.preferences[0] : user.preferences;
    if (prefs?.new_lead_notifications !== false) {
      await sendPushNotification({
        userId: user.id,
        businessId,
        title: 'New Lead',
        body: `${leadName} just submitted a request`,
        actionType: 'open_lead',
        actionData: { leadId },
      });
    }
  }
}

/**
 * Notify technician about job assignment
 */
export async function notifyJobAssigned(
  userId: string,
  businessId: string,
  jobTitle: string,
  jobId: string
): Promise<void> {
  await sendPushNotification({
    userId,
    businessId,
    title: 'Job Assigned',
    body: `You've been assigned: ${jobTitle}`,
    actionType: 'open_job',
    actionData: { jobId },
  });
}

/**
 * Notify about new message
 */
export async function notifyNewMessage(
  userId: string,
  businessId: string,
  customerName: string,
  messagePreview: string,
  customerId: string
): Promise<void> {
  await sendPushNotification({
    userId,
    businessId,
    title: `Message from ${customerName}`,
    body: messagePreview.slice(0, 100),
    actionType: 'open_messages',
    actionData: { customerId },
  });
}

/**
 * Notify about payment received
 */
export async function notifyPaymentReceived(
  businessId: string,
  customerName: string,
  amount: number,
  invoiceId: string
): Promise<void> {
  const supabase = await createServerClient();

  // Get owner/admin users
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin']);

  for (const user of users || []) {
    await sendPushNotification({
      userId: user.id,
      businessId,
      title: 'Payment Received',
      body: `${customerName} paid $${amount.toFixed(2)}`,
      actionType: 'open_invoice',
      actionData: { invoiceId },
    });
  }
}

/**
 * Notify about schedule change
 */
export async function notifyScheduleChange(
  userId: string,
  businessId: string,
  jobTitle: string,
  newDate: string,
  jobId: string
): Promise<void> {
  await sendPushNotification({
    userId,
    businessId,
    title: 'Schedule Changed',
    body: `${jobTitle} rescheduled to ${new Date(newDate).toLocaleDateString()}`,
    actionType: 'open_job',
    actionData: { jobId },
  });
}

// Aliases for API compatibility
export const subscribeToPush = registerPushSubscription;
export const unsubscribeFromPush = unregisterPushSubscription;

'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Bell,
  Shield,
  Key,
  Globe,
  Mail,
  Loader2,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toasts, showError, showSuccess } from '@/lib/toast';

interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  timezone?: string;
}

interface NotificationSettings {
  email_new_leads: boolean;
  email_commission_updates: boolean;
  email_weekly_summary: boolean;
  browser_notifications: boolean;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_new_leads: true,
    email_commission_updates: true,
    email_weekly_summary: true,
    browser_notifications: false,
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.admin);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profile.full_name,
          phone: profile.phone,
          timezone: profile.timezone,
        }),
      });

      if (res.ok) {
        toasts.profileUpdated();
      } else {
        toasts.saveError();
      }
    } catch (error) {
      toasts.networkError();
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toasts.passwordMismatch();
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordForm.current,
          new_password: passwordForm.new,
        }),
      });

      if (res.ok) {
        toasts.passwordChanged();
        setPasswordForm({ current: '', new: '', confirm: '' });
      } else {
        const data = await res.json();
        showError(data.error || 'Failed to change password');
      }
    } catch (error) {
      toasts.networkError();
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="mt-1 bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={profile?.role?.replace('_', ' ') || ''}
                      disabled
                      className="mt-1 bg-muted capitalize"
                    />
                  </div>
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profile?.full_name || ''}
                      onChange={(e) =>
                        setProfile((prev) => (prev ? { ...prev, full_name: e.target.value } : null))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile?.phone || ''}
                      onChange={(e) =>
                        setProfile((prev) => (prev ? { ...prev, phone: e.target.value } : null))
                      }
                      placeholder="(555) 123-4567"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={profile?.timezone || 'America/New_York'}
                      onChange={(e) =>
                        setProfile((prev) => (prev ? { ...prev, timezone: e.target.value } : null))
                      }
                      className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="America/Phoenix">Arizona (MST)</option>
                      <option value="America/Anchorage">Alaska (AKST)</option>
                      <option value="Pacific/Honolulu">Hawaii (HST)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="current_password">Current Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="current_password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.current}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, current: e.target.value }))
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative mt-1">
                    <Input
                      id="new_password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.new}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, new: e.target.value }))
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </h3>
                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">New Lead Assignments</p>
                      <p className="text-xs text-muted-foreground">Get notified when new leads are assigned to you</p>
                    </div>
                    <Switch
                      checked={notifications.email_new_leads}
                      onCheckedChange={() => handleNotificationToggle('email_new_leads')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Commission Updates</p>
                      <p className="text-xs text-muted-foreground">Receive updates about your commission earnings</p>
                    </div>
                    <Switch
                      checked={notifications.email_commission_updates}
                      onCheckedChange={() => handleNotificationToggle('email_commission_updates')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Weekly Summary</p>
                      <p className="text-xs text-muted-foreground">Receive a weekly summary of your activity</p>
                    </div>
                    <Switch
                      checked={notifications.email_weekly_summary}
                      onCheckedChange={() => handleNotificationToggle('email_weekly_summary')}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-6 space-y-4">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Browser Notifications
                </h3>
                <div className="pl-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Enable Browser Notifications</p>
                      <p className="text-xs text-muted-foreground">Get instant notifications in your browser</p>
                    </div>
                    <Switch
                      checked={notifications.browser_notifications}
                      onCheckedChange={() => handleNotificationToggle('browser_notifications')}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => toasts.saved()}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

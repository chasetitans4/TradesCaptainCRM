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
  Palette,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { useAgentOrHigher } from '@/hooks/useAdminAuth';
import { AdminPageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toasts, showError, showSuccess } from '@/lib/toast';
import { logger } from '@/lib/logger';

const adminSettingsLogger = logger.child({ context: 'admin.settings' });

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

interface PlatformSettings {
  platform_branding: {
    logo_url: string;
    name: string;
  };
}

export default function AdminSettingsPage() {
  const { loading: authLoading, isAuthorized, user: currentUser } = useAgentOrHigher();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_new_leads: true,
    email_commission_updates: true,
    email_weekly_summary: true,
    browser_notifications: false,
  });
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
  const [logoUrlInput, setLogoUrlInput] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  useEffect(() => {
    if (isAuthorized) {
      Promise.all([fetchProfile(), fetchPlatformSettings()]);
    }
  }, [isAuthorized]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (error) {
      adminSettingsLogger.error({
        msg: 'Failed to fetch admin profile',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformSettings = async () => {
    try {
      const res = await fetch('/api/admin/platform-settings');
      if (res.ok) {
        const data = await res.json();
        setPlatformSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to fetch platform settings', error);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        showError('File size must be less than 2MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlatformSettingsSave = async () => {
    setSaving(true);
    try {
      let logoUrl = platformSettings?.platform_branding?.logo_url;

      // Handle file upload
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);

        const uploadRes = await fetch('/api/admin/platform-settings/logo', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Failed to upload logo');
        const data = await uploadRes.json();
        logoUrl = data.url;
      }
      // Handle URL input
      else if (logoInputMode === 'url' && logoUrlInput.trim()) {
        // Validate URL format
        try {
          new URL(logoUrlInput.trim());
          logoUrl = logoUrlInput.trim();
        } catch {
          showError('Please enter a valid URL');
          setSaving(false);
          return;
        }
      }

      const newSettings = {
        logo_url: logoUrl,
        name: platformSettings?.platform_branding?.name || 'Trades Captain'
      };

      const res = await fetch('/api/admin/platform-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'platform_branding',
          value: newSettings
        }),
      });

      if (res.ok) {
        showSuccess('Platform settings updated');
        setLogoFile(null);
        setLogoPreview(null);
        setLogoUrlInput('');
        fetchPlatformSettings();
      } else {
        showError('Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      showError('An error occurred');
    } finally {
      setSaving(false);
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

  if (authLoading) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-border bg-background">
        <AdminPageHeader
          title="Settings"
          description="Manage your account and preferences"
          icon={Settings}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            {['super_admin', 'admin'].includes(currentUser?.role || '') && (
              <TabsTrigger value="platform">
                <Palette className="h-4 w-4 mr-2" />
                Platform
              </TabsTrigger>
            )}
          </TabsList>

          {/* Platform Tab */}
          <TabsContent value="platform">
            <Card>
              <CardHeader>
                <CardTitle>Platform Branding</CardTitle>
                <CardDescription>Customize the global look and feel of the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label>Platform Logo</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload your horizontal logo. This will be displayed centered in the header of the CRM and customer portal.
                    </p>

                    {/* Sizing Guidelines */}
                    <div className="mb-4 p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm font-medium mb-2">Recommended Logo Specifications:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>Upload Size:</strong> 360 × 80 pixels (2x for retina displays)</li>
                        <li>• <strong>Display Size:</strong> 180 × 40 pixels (centered in header)</li>
                        <li>• <strong>Orientation:</strong> Horizontal / landscape format</li>
                        <li>• <strong>Format:</strong> PNG (transparent background) or SVG recommended</li>
                        <li>• <strong>Max File Size:</strong> 2MB</li>
                      </ul>
                    </div>

                    {/* Input Mode Toggle */}
                    <div className="flex items-center gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => setLogoInputMode('upload')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          logoInputMode === 'upload'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <Upload className="h-4 w-4" />
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoInputMode('url')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          logoInputMode === 'url'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        <LinkIcon className="h-4 w-4" />
                        Image URL
                      </button>
                    </div>

                    <div className="flex flex-col md:flex-row items-start gap-6">
                      {/* Logo Preview */}
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-xs text-muted-foreground">Preview (actual display size)</p>
                        <div className="border rounded-lg p-4 bg-muted/50">
                          {logoPreview || logoUrlInput || platformSettings?.platform_branding?.logo_url ? (
                            <div className="relative h-10 w-[180px]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={logoPreview || logoUrlInput || platformSettings?.platform_branding?.logo_url || ''}
                                alt="Platform Logo"
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-[180px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded">
                              <span className="text-xs">180 × 40px</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-1">
                        {logoInputMode === 'upload' ? (
                          <>
                            <Label htmlFor="logo-upload" className="cursor-pointer">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                <Button type="button" variant="outline" className="pointer-events-none">
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload New Logo
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                  {logoFile ? logoFile.name : 'No file selected'}
                                </span>
                              </div>
                              <Input
                                id="logo-upload"
                                type="file"
                                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleLogoSelect}
                              />
                            </Label>
                            <p className="text-xs text-muted-foreground mt-2">
                              Accepts PNG, SVG, JPEG, or WebP files up to 2MB
                            </p>
                          </>
                        ) : (
                          <>
                            <Label htmlFor="logo-url">Logo URL</Label>
                            <Input
                              id="logo-url"
                              type="url"
                              placeholder="https://example.com/logo.png"
                              value={logoUrlInput}
                              onChange={(e) => setLogoUrlInput(e.target.value)}
                              className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                              Paste a direct link to your logo from an image hosting service (e.g., Imgur, Postimg, Cloudinary)
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="platform-name">Platform Name</Label>
                    <Input
                      id="platform-name"
                      value={platformSettings?.platform_branding?.name || ''}
                      onChange={(e) => setPlatformSettings(prev => prev ? {
                        ...prev,
                        platform_branding: {
                          ...prev.platform_branding,
                          name: e.target.value
                        }
                      } : null)}
                      className="mt-1 max-w-md"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handlePlatformSettingsSave} disabled={saving}>
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
              </CardContent>
            </Card>
          </TabsContent>

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
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient, getCurrentUserProfile, signOut } from '@/lib/supabase/client';
import { hasPermission, type Permission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { UserWithBusiness } from '@/types';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Bell,
  Moon,
  Shield,
  ChevronRight,
  LogOut,
  Building2,
  CreditCard,
  Bot,
  Users,
  HelpCircle,
  Camera,
  Check,
  Loader2,
  CalendarDays,
  MessageSquare,
} from 'lucide-react';

interface SettingSection {
  href?: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  permission?: Permission;
  badge?: string;
  external?: boolean;
}

const SETTING_SECTIONS: { title: string; items: SettingSection[] }[] = [
  {
    title: 'Business',
    items: [
      {
        href: '/settings/business',
        label: 'Business Profile',
        description: 'Company name, address, logo',
        icon: Building2,
        permission: 'manage_settings',
      },
      {
        href: '/settings/team',
        label: 'Team Members',
        description: 'Invite and manage users',
        icon: Users,
        permission: 'manage_team',
      },
      {
        href: '/settings/billing',
        label: 'Billing & Subscription',
        description: 'Plan, payment methods',
        icon: CreditCard,
        permission: 'manage_billing',
      },
    ],
  },
  {
    title: 'Features',
    items: [
      {
        href: '/settings/calendar',
        label: 'Calendar Integration',
        description: 'Sync with Google, iCloud, Outlook',
        icon: CalendarDays,
        permission: 'manage_calendar',
        badge: 'Pro',
      },
      {
        href: '/settings/phone',
        label: 'Phone & SMS',
        description: 'Business phone number, call forwarding',
        icon: Phone,
        permission: 'manage_phone_settings',
        badge: 'Growth',
      },
      {
        href: '/settings/ai-sms',
        label: 'AI SMS Settings',
        description: 'Auto-responses, knowledge base',
        icon: Bot,
        permission: 'manage_ai_sms',
        badge: 'Pro',
      },
      {
        href: '/settings/sms-templates',
        label: 'SMS Templates',
        description: 'Saved message templates',
        icon: MessageSquare,
        permission: 'manage_messages',
      },
      {
        href: '/settings/notifications',
        label: 'Email Notifications',
        description: 'Alert recipients, preferences',
        icon: Mail,
        permission: 'manage_email_recipients',
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        href: '/help',
        label: 'Help Center',
        description: '85+ help articles',
        icon: HelpCircle,
      },
      {
        href: 'mailto:support@tradescaptain.com',
        label: 'Contact Support',
        description: 'Get help from our team',
        icon: Mail,
        external: true,
      },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { toast } = useToast();

  // Profile form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Preferences
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setLoading(false);
    }
    loadUser();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          phone: phone.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, name: name.trim(), phone: phone.trim() || null });
    } catch (_error) {
      toast({
        title: 'Failed to save profile',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.push('/login');
  };

  if (loading || !user) {
    return <SettingsSkeleton />;
  }

  // Filter sections based on permissions
  const filteredSections = SETTING_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => (item.permission ? hasPermission(user.role, item.permission) : true)
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Settings</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Profile Section */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4">Profile</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Avatar
                src={user.avatar_url || undefined}
                fallback={name.charAt(0) || 'U'}
                size="xl"
              />
              <button className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div>
              <p className="font-medium text-text">{name || 'Your Name'}</p>
              <Badge className="capitalize mt-1">{user.role}</Badge>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-text-muted" />
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-text-muted" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="mt-1 bg-muted"
              />
              <p className="text-xs text-text-muted mt-1">
                Contact support to change your email
              </p>
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-text-muted" />
                Phone (optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </section>

        {/* Preferences */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4">Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text">Push Notifications</p>
                  <p className="text-sm text-text-muted">
                    Get notified about new leads and jobs
                  </p>
                </div>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Moon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-text">Dark Mode</p>
                  <p className="text-sm text-text-muted">
                    Use dark theme
                  </p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </div>
        </section>

        {/* Settings sections */}
        {filteredSections.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-semibold text-text-muted mb-2 px-1">
              {section.title}
            </h2>
            <div className="card divide-y divide-border">
              {section.items.map((item) => {
                const Icon = item.icon;
                const Component = item.external ? 'a' : Link;
                const href = item.href ?? '#';
                const props = item.external
                  ? { href, target: '_blank', rel: 'noopener noreferrer' }
                  : { href };

                return (
                  <Component
                    key={item.label}
                    {...props}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text">{item.label}</p>
                        {item.badge && (
                          <Badge className="bg-primary/10 text-primary text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-text-muted">{item.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
                  </Component>
                );
              })}
            </div>
          </section>
        ))}

        {/* Security */}
        <section>
          <h2 className="text-sm font-semibold text-text-muted mb-2 px-1">
            Security
          </h2>
          <div className="card divide-y divide-border">
            <Link
              href="/settings/password"
              className="flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted transition-colors"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-text">Change Password</p>
                <p className="text-sm text-text-muted">Update your password</p>
              </div>
              <ChevronRight className="h-5 w-5 text-text-muted" />
            </Link>
          </div>
        </section>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full card p-4 flex items-center gap-4 text-danger hover:bg-danger/5 active:bg-danger/10 transition-colors"
        >
          <div className="p-2 rounded-lg bg-danger/10">
            <LogOut className="h-5 w-5 text-danger" />
          </div>
          <p className="font-medium">{signingOut ? 'Signing out...' : 'Sign Out'}</p>
        </button>

        {/* App info */}
        <p className="text-center text-xs text-text-muted py-4">
          Trades Captain CRM v1.0.0
          <br />
          © 2024 Trades Captain. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-6 w-24 skeleton rounded" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        <div className="card p-4 h-64 skeleton" />
        <div className="card p-4 h-32 skeleton" />
        {[1, 2].map((i) => (
          <div key={i}>
            <div className="h-4 w-20 skeleton rounded mb-2" />
            <div className="card h-32 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

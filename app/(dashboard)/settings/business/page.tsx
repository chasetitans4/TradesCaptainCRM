'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Loader2,
  Check,
  Upload,
  Trash2,
  Image as ImageIcon,
  Palette,
} from 'lucide-react';
import type { UserWithBusiness } from '@/types';
import { BrandColorPicker } from '@/components/settings/brand-color-picker';
import { useBusinessTheme } from '@/lib/contexts/business-theme-context';
import Image from 'next/image';

export default function BusinessSettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#1D4ED8');
  const [secondaryColor, setSecondaryColor] = useState('#0369A1');

  // Access theme context to update colors in real-time
  const { updateColors } = useBusinessTheme();

  useEffect(() => {
    async function loadBusiness() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);

      // Load business data
      const supabase = createClient();
      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', profile.business_id)
        .single();

      if (business) {
        setName(business.name || '');
        setAddress(business.address || '');
        setCity(business.city || '');
        setState(business.state || '');
        setZip(business.zip || '');
        setPhone(business.phone || '');
        setEmail(business.email || '');
        setWebsite(business.website || '');
        setLogoUrl(business.logo_url || null);
        setPrimaryColor(business.primary_color || '#1D4ED8');
        setSecondaryColor(business.secondary_color || '#0369A1');
      }

      setLoading(false);
    }
    loadBusiness();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          name: name.trim(),
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip: zip.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        })
        .eq('id', user.business_id);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your business profile has been updated.',
      });
    } catch (_error) {
      toast({
        title: 'Failed to save',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, WebP, or SVG image.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/business/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types
        if (data.type === 'too_small' && data.details) {
          throw new Error(
            `Image is too small (${data.details.width}x${data.details.height}px). Minimum size is ${data.details.minWidth}x${data.details.minHeight}px.`
          );
        }
        throw new Error(data.error || 'Failed to upload logo');
      }

      setLogoUrl(data.logo_url);

      // Show success with resize info if applicable
      const wasResized = data.dimensions?.wasResized;
      toast({
        title: 'Logo uploaded',
        description: wasResized
          ? `Your logo was resized from ${data.dimensions.originalWidth}x${data.dimensions.originalHeight}px to ${data.dimensions.width}x${data.dimensions.height}px for optimal display.`
          : 'Your business logo has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoDelete = async () => {
    if (!logoUrl) return;

    setUploadingLogo(true);

    try {
      const response = await fetch('/api/business/logo', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete logo');
      }

      setLogoUrl(null);
      toast({
        title: 'Logo removed',
        description: 'Your business logo has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading || !user) {
    return <BusinessSettingsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Business Profile</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Logo Section */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Business Logo
          </h2>
          <p className="text-sm text-text-muted mb-4">
            Your logo will appear in your customer portal and on invoices.
          </p>

          <div className="flex items-start gap-4">
            {/* Logo Preview */}
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/50">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Business logo"
                  width={96}
                  height={96}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <Building2 className="h-8 w-8 text-text-muted" />
              )}
            </div>

            {/* Upload/Delete Buttons */}
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="w-full sm:w-auto"
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </>
                )}
              </Button>
              {logoUrl && (
                <Button
                  variant="ghost"
                  onClick={handleLogoDelete}
                  disabled={uploadingLogo}
                  className="w-full sm:w-auto text-danger hover:text-danger"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Logo
                </Button>
              )}
              <div className="text-xs text-text-muted space-y-1">
                <p><span className="font-medium">Minimum:</span> 100x100px</p>
                <p><span className="font-medium text-primary">Recommended:</span> 400x400px (square)</p>
                <p><span className="font-medium">Maximum:</span> 800x800px (auto-resized)</p>
                <p className="text-text-muted/70">Formats: JPEG, PNG, WebP, SVG. Max 5MB.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Business Info Section */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Business Information
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Business Name"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-text-muted" />
                Phone Number
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

            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-text-muted" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@yourbusiness.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-text-muted" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="mt-1"
              />
            </div>
          </div>
        </section>

        {/* Address Section */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Address
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="w-1/2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="12345"
                className="mt-1"
              />
            </div>
          </div>
        </section>

        {/* Branding Section */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Brand Colors
          </h2>
          <p className="text-sm text-text-muted mb-4">
            Choose colors that match your brand. These will be used in your dashboard and customer portal.
          </p>

          <BrandColorPicker
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            onChange={({ primary, secondary }) => {
              setPrimaryColor(primary);
              setSecondaryColor(secondary);
              // Update theme in real-time for preview
              updateColors(primary, secondary);
            }}
          />
        </section>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
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
    </div>
  );
}

function BusinessSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-6 w-32 skeleton rounded" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        <div className="card p-4 h-40 skeleton" />
        <div className="card p-4 h-64 skeleton" />
        <div className="card p-4 h-48 skeleton" />
      </div>
    </div>
  );
}

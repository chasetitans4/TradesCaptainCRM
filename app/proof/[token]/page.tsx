import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  CheckCircle,
  MapPin,
  Clock,
  Camera,
  Building2,
  User,
  Share2,
  Shield,
} from 'lucide-react';
import { recordView } from '@/lib/proof-of-work';
import type {
  ProofOfWork,
  ProofOfWorkTimelineEvent,
  VerifiedJobPhoto,
} from '@/types/proof-of-work';
import { VERIFICATION_BADGES } from '@/types/proof-of-work';
import { headers } from 'next/headers';
import { createHash } from 'crypto';

interface PageProps {
  params: Promise<{ token: string }>;
}

interface ProofOfWorkData {
  pow: ProofOfWork;
  timeline: ProofOfWorkTimelineEvent[];
  photos: VerifiedJobPhoto[];
  technician: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  business: {
    id: string;
    name: string;
    logo_url?: string;
    phone: string;
  };
}

async function getProofOfWorkData(token: string): Promise<ProofOfWorkData | null> {
  const supabase = createAdminClient();

  // Get PoW with related data
  const { data: pow, error } = await supabase
    .from('proof_of_work')
    .select(`
      *,
      technician:users!technician_id (
        id,
        first_name,
        last_name,
        avatar_url
      ),
      business:businesses!business_id (
        id,
        name,
        logo_url,
        phone
      )
    `)
    .eq('public_token', token)
    .single();

  if (error || !pow) {
    return null;
  }

  // Get timeline events
  const { data: timeline } = await supabase
    .from('proof_of_work_timeline')
    .select('*')
    .eq('proof_of_work_id', pow.id)
    .order('event_time', { ascending: true });

  // Get verified photos
  const { data: photos } = await supabase
    .from('job_photos')
    .select('*')
    .eq('job_id', pow.job_id)
    .gte('verification_level', 1)
    .order('display_order', { ascending: true });

  return {
    pow: pow as ProofOfWork,
    timeline: (timeline || []) as ProofOfWorkTimelineEvent[],
    photos: (photos || []) as VerifiedJobPhoto[],
    technician: pow.technician as ProofOfWorkData['technician'],
    business: pow.business as ProofOfWorkData['business'],
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getProofOfWorkData(token);

  if (!data) {
    return {
      title: 'Proof of Work Not Found',
    };
  }

  return {
    title: `Proof of Work - ${data.business.name}`,
    description: `Verified service record for ${data.pow.service_type} on ${formatDate(data.pow.service_date)}`,
    openGraph: {
      title: `Proof of Work - ${data.business.name}`,
      description: `Verified service: ${data.pow.service_type}`,
      type: 'website',
    },
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export default async function ProofOfWorkPage({ params }: PageProps) {
  const { token } = await params;
  const data = await getProofOfWorkData(token);

  if (!data) {
    notFound();
  }

  const { pow, timeline, photos, technician, business } = data;

  // Record view (with hashed IP for privacy)
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0] || 'unknown';
  const userAgent = headersList.get('user-agent') || undefined;
  const referrer = headersList.get('referer') || undefined;

  await recordView(pow.id, {
    ipHash: hashIp(ip),
    userAgent,
    referrer,
  });

  // Get active badges
  const activeBadges = VERIFICATION_BADGES.filter(
    (badge) => pow[badge.key] === true
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-gray-900">{business.name}</h1>
                <p className="text-sm text-gray-500">{business.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Verified</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Title Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Service Completed</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {pow.service_type}
          </h2>
          <p className="text-gray-600">{formatDate(pow.service_date)}</p>

          {/* Location */}
          <div className="flex items-center gap-2 mt-4 text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>
              {pow.location_city}, {pow.location_state}
              {pow.location_zip && ` ${pow.location_zip}`}
            </span>
          </div>

          {/* Duration */}
          {pow.duration_minutes && (
            <div className="flex items-center gap-2 mt-2 text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                {Math.floor(pow.duration_minutes / 60)}h {pow.duration_minutes % 60}m on site
              </span>
            </div>
          )}
        </div>

        {/* Verification Badges */}
        {activeBadges.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Verification</h3>
            <div className="grid grid-cols-2 gap-3">
              {activeBadges.map((badge) => (
                <div
                  key={badge.key}
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
                >
                  <span className="text-xl">{badge.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {badge.label}
                    </p>
                    <p className="text-xs text-gray-600">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technician */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Your Technician</h3>
          <div className="flex items-center gap-4">
            {technician.avatar_url ? (
              <img
                src={technician.avatar_url}
                alt={`${technician.first_name} ${technician.last_name}`}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-7 w-7 text-blue-600" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {technician.first_name} {technician.last_name}
              </p>
              <p className="text-sm text-gray-600">Verified Technician</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="text-xl">{event.event_icon}</span>
                    {index < timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-2" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="font-medium text-gray-900">{event.event_label}</p>
                    <p className="text-sm text-gray-500">
                      {formatTime(event.event_time)}
                    </p>
                    {event.verification_badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                        {event.verification_badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">
                Photo Documentation ({photos.length})
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <img
                    src={photo.thumbnail_url || photo.photo_url}
                    alt={photo.caption || 'Work photo'}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  {photo.verification_level >= 2 && (
                    <div className="absolute bottom-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                      Verified
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Summary */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Work Summary</h3>
          <p className="text-gray-600">{pow.summary_text}</p>
        </div>

        {/* Share Button */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.share) {
                navigator.share({
                  title: `Proof of Work - ${business.name}`,
                  text: `Check out my verified service record from ${business.name}`,
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            <Share2 className="h-5 w-5" />
            Share This Proof of Work
          </button>
        </div>

        {/* Reference Number */}
        <div className="text-center text-sm text-gray-500 pb-8">
          <p>Reference: {pow.reference_number}</p>
          {pow.finalized_at && (
            <p className="mt-1">
              Record finalized on {formatDate(pow.finalized_at)}
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            This is a verified Proof of Work document generated by{' '}
            <span className="font-medium">{business.name}</span>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Powered by Trades Captain
          </p>
        </div>
      </footer>
    </div>
  );
}

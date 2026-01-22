'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Gift,
  Copy,
  Share2,
  Trophy,
  Users,
  CheckCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

const referralsLogger = logger.child({ context: 'portal.referrals' });

interface ReferralProgram {
  id: string;
  name: string;
  description: string;
  referrer_reward_type: string;
  referrer_reward_amount: number;
  referee_reward_type: string;
  referee_reward_amount: number;
}

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
}

interface Referral {
  id: string;
  referred_name: string;
  status: string;
  created_at: string;
  reward_status: string;
  reward_amount?: number;
}

export default function ReferralsPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [program, setProgram] = useState<ReferralProgram | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReferralData() {
      try {
        const response = await fetch(`/api/portal/referrals?businessId=${businessId}`);
        if (!response.ok) {
          throw new Error('Failed to load referral data');
        }
        const data = await response.json();
        
        if (data.program) {
          setProgram(data.program);
          setStats(data.stats);
          setReferrals(data.referrals || []);
          setReferralCode(data.referralCode || '');
        }
      } catch (err) {
        referralsLogger.error({
          msg: 'Error loading referrals',
          error: err instanceof Error ? { message: err.message } : { message: String(err) },
        });
      } finally {
        setLoading(false);
      }
    }

    loadReferralData();
  }, [businessId]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success('Referral code copied!');
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on ' + program?.name,
          text: `Use my code ${referralCode} to get a discount!`,
          url: window.location.origin, // Ideally a specific landing page
        });
      } catch (err) {
        // Share cancelled or failed
      }
    } else {
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
          <p className="text-gray-500">Share with friends and earn rewards</p>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Referral Program</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Check back later for new referral opportunities.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatReward = (amount: number, type: string) => {
    if (type === 'percentage') return `${amount}%`;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Referrals</h1>
        <p className="text-gray-500">Share with friends and earn rewards</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Program Info & Code */}
        <Card className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-2xl font-bold">{program.name}</h2>
                <p className="text-blue-100 max-w-lg">
                  Give {formatReward(program.referee_reward_amount, program.referee_reward_type)} to a friend, 
                  get {formatReward(program.referrer_reward_amount, program.referrer_reward_type)} for yourself when they book their first service!
                </p>
              </div>
              
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 min-w-[300px]">
                <p className="text-sm text-blue-100 mb-2 text-center">Your Unique Referral Code</p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-white text-blue-900 px-4 py-2 rounded-lg font-mono font-bold text-center tracking-wider text-lg border-2 border-dashed border-blue-200">
                    {referralCode || 'LOADING...'}
                  </code>
                  <Button variant="secondary" size="icon" onClick={copyToClipboard} title="Copy Code">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={shareReferral} title="Share">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Your Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Total Earned</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatReward(stats?.totalEarnings || 0, program.referrer_reward_type)}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {formatReward(stats?.pendingEarnings || 0, program.referrer_reward_type)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Recent Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No referrals yet.</p>
                <p className="text-sm mt-1">Share your code to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        referral.status === 'completed' ? 'bg-green-100' : 'bg-gray-200'
                      }`}>
                        <CheckCircle className={`h-4 w-4 ${
                          referral.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{referral.referred_name || 'Friend'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={referral.status === 'completed' ? 'default' : 'secondary'}>
                      {referral.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

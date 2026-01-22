'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  FileText,
  Receipt,
  MessageCircle,
  Wrench,
  Star,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

const portalHomeLogger = logger.child({ context: 'portal.home' });

interface CustomerSession {
  customer: {
    id: string;
    name: string;
    email: string;
  };
  business: {
    name: string;
  };
}

export default function PortalHomePage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch(`/api/portal/session?businessId=${businessId}`);
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch (error) {
        portalHomeLogger.error({ msg: 'Failed to load session', error });
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [businessId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const customerName = session?.customer?.name?.split(' ')[0] || 'there';
  const businessName = session?.business?.name || 'Customer Portal';

  const quickActions = [
    {
      title: 'My Appointments',
      description: 'View upcoming services',
      icon: Calendar,
      href: `/portal/${businessId}/appointments`,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Invoices & Payments',
      description: 'View and pay invoices',
      icon: Receipt,
      href: `/portal/${businessId}/invoices`,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Quotes',
      description: 'Review and approve estimates',
      icon: FileText,
      href: `/portal/${businessId}/quotes`,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      title: 'My Equipment',
      description: 'Manage your systems',
      icon: Wrench,
      href: `/portal/${businessId}/equipment`,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      title: 'Messages',
      description: 'Contact support',
      icon: MessageCircle,
      href: `/portal/${businessId}/messages`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
    {
      title: 'Leave Feedback',
      description: 'Rate your experience',
      icon: Star,
      href: `/portal/${businessId}/feedback`,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {customerName}!
        </h1>
        <p className="text-gray-500 mt-2">
          Manage your account with {businessName}
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} className="block group">
            <Card className="h-full transition-all hover:shadow-md border-gray-200 group-hover:border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold text-gray-900">
                  {action.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${action.bg}`}>
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-gray-500">
                  {action.description}
                </CardDescription>
                <div className="mt-4 flex items-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Go to {action.title} <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Helper Card */}
      <Card className="bg-slate-900 text-white border-none">
        <CardContent className="flex items-center justify-between p-8">
          <div>
            <h3 className="text-lg font-semibold mb-1">Need immediate assistance?</h3>
            <p className="text-slate-300">
              Send us a message and we'll get back to you as soon as possible.
            </p>
          </div>
          <Link href={`/portal/${businessId}/messages`}>
            <Button variant="secondary" className="whitespace-nowrap">
              Contact Us
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

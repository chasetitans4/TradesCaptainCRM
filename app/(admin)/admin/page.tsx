'use client';

import {
  BarChart3,
  MessageSquare,
  Rocket,
  Layout,
  LifeBuoy,
  Clock,
  Shield,
  Users,
  CreditCard,
  Building2,
  UserCog,
  TrendingUp,
  DollarSign,
  Ticket,
  Tag,
  Coins,
  Lightbulb,
  Globe,
  Target,
  Headphones,
  FileText
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminPageHeader } from '@/components/admin/page-header';

export default function AdminDashboardPage() {
  const router = useRouter();

  const modules = [
    {
      title: 'Sales Leads',
      description: 'Manage and track your sales pipeline.',
      icon: Target,
      href: '/admin/leads',
      color: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400',
    },
    {
      title: 'Web Customers',
      description: 'Manage website/web app customers.',
      icon: Globe,
      href: '/admin/web-customers',
      color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400',
    },
    {
      title: 'Agent Submissions',
      description: 'Manage trial submissions for new clients.',
      icon: FileText,
      href: '/admin/submissions',
      color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400',
    },
    {
      title: 'Support Tickets',
      description: 'Manage customer support requests and issues.',
      icon: Headphones,
      href: '/admin/tickets',
      color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400',
    },
    {
      title: 'Support Templates',
      description: 'Pre-written responses for common support scenarios.',
      icon: MessageSquare,
      href: '/admin/support-templates',
      color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400',
    },
    {
      title: 'Reporting & Analytics',
      description: 'View sales performance, pipeline health, and revenue metrics.',
      icon: BarChart3,
      href: '/admin/reports',
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      title: 'Accounts',
      description: 'Manage business accounts, subscriptions, and trials.',
      icon: Building2,
      href: '/admin/accounts',
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
    },
    {
      title: 'Pricing & Plans',
      description: 'Manage subscription plans, add-ons, and pricing structures.',
      icon: Coins,
      href: '/admin/pricing',
      color: 'text-lime-600 bg-lime-100 dark:bg-lime-900/30 dark:text-lime-400',
    },
    {
      title: 'Offers & Discounts',
      description: 'Manage promotional offers and discount approvals.',
      icon: Tag,
      href: '/admin/offers',
      color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400',
    },
    {
      title: 'Coupons',
      description: 'Manage promotion codes and free trial coupons.',
      icon: Ticket,
      href: '/admin/coupons',
      color: 'text-fuchsia-600 bg-fuchsia-100 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
    },
    {
      title: 'Pipeline Management',
      description: 'Track leads, deals, and sales team performance.',
      icon: Layout,
      href: '/admin/pipeline',
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
    },
    {
      title: 'Leads Captain',
      description: 'AI-powered lead qualification and engagement.',
      icon: Rocket,
      href: '/admin/leads-captain',
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      title: 'Agent Performance',
      description: 'Track agent metrics, calls, and conversions.',
      icon: UserCog,
      href: '/admin/agent-performance',
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'Commissions',
      description: 'Calculate and track sales agent commissions.',
      icon: DollarSign,
      href: '/admin/commissions',
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    },
    {
      title: 'Expenses',
      description: 'Track business expenses and operational costs.',
      icon: CreditCard,
      href: '/admin/expenses',
      color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    },
    {
      title: 'SMS Usage',
      description: 'Monitor SMS volume and costs across accounts.',
      icon: MessageSquare,
      href: '/admin/sms-usage',
      color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400',
    },
    {
      title: 'Feature Requests',
      description: 'Manage and prioritize user feature requests.',
      icon: Lightbulb,
      href: '/admin/feature-requests',
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    {
      title: 'Revenue Recovery',
      description: 'Manage failed payments and churn prevention.',
      icon: TrendingUp,
      href: '/admin/revenue-recovery',
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      title: 'Retention',
      description: 'Monitor customer health scores and retention metrics.',
      icon: LifeBuoy,
      href: '/admin/retention',
      color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400',
    },
    {
      title: 'Sales Playbook',
      description: 'Sales scripts, objection handling, and best practices.',
      icon: Shield,
      href: '/admin/sales-playbook',
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      title: 'Settings',
      description: 'Global system configuration and admin settings.',
      icon: Users,
      href: '/admin/settings',
      color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
    },
    {
      title: 'Onboarding',
      description: 'Track and manage new customer onboarding progress.',
      icon: Clock,
      href: '/admin/onboarding',
      color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400',
    },
    {
      title: 'Timesheets',
      description: 'Track employee hours and timesheets.',
      icon: Clock,
      href: '/admin/timesheets',
      color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
    },
    {
      title: 'Agents',
      description: 'Manage internal sales and support agents.',
      icon: Users,
      href: '/admin/agents',
      color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400',
    }
  ];

  return (
    <div className="flex flex-col space-y-6 p-6">
      <AdminPageHeader
        title="Admin Dashboard"
        description="Overview of system performance and management tools"
        icon={Layout}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card 
              key={module.title}
              className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-l-4 border-l-transparent hover:border-l-primary"
              onClick={() => router.push(module.href)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${module.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <CardTitle className="text-lg mt-4">{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="line-clamp-2">
                  {module.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

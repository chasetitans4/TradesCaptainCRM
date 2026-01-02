// =====================================================
// GLOBAL SEARCH API
// GET /api/search - Search across customers, jobs, leads, invoices
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkSearchRateLimit } from '@/lib/rate-limit';

interface SearchResult {
  type: 'customer' | 'job' | 'lead' | 'invoice';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's business
    const { data: profile } = await supabase
      .from('users')
      .select('business_id, id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check rate limit (30 searches per minute per user)
    const rateLimit = await checkSearchRateLimit(profile.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Search rate limit exceeded. Please wait a moment.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 60).toString(),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const businessId = profile.business_id;
    const searchPattern = `%${query}%`;

    // Search in parallel
    const [customersResult, jobsResult, leadsResult, invoicesResult] = await Promise.all([
      // Search customers
      supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('business_id', businessId)
        .or(`name.ilike.${searchPattern},phone.ilike.${searchPattern},email.ilike.${searchPattern}`)
        .limit(limit),

      // Search jobs
      supabase
        .from('jobs')
        .select('id, service_type, scheduled_date, customer:customers(name)')
        .eq('business_id', businessId)
        .or(`service_type.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .limit(limit),

      // Search leads
      supabase
        .from('leads')
        .select('id, name, phone, service_needed, status')
        .eq('business_id', businessId)
        .or(`name.ilike.${searchPattern},phone.ilike.${searchPattern},service_needed.ilike.${searchPattern}`)
        .limit(limit),

      // Search invoices
      supabase
        .from('invoices')
        .select('id, invoice_number, total, status, customer:customers(name)')
        .eq('business_id', businessId)
        .or(`invoice_number.ilike.${searchPattern}`)
        .limit(limit),
    ]);

    const results: SearchResult[] = [];

    // Map customers
    if (customersResult.data) {
      for (const customer of customersResult.data) {
        results.push({
          type: 'customer',
          id: customer.id,
          title: customer.name,
          subtitle: customer.phone || customer.email || undefined,
          href: `/customers/${customer.id}`,
        });
      }
    }

    // Map jobs
    if (jobsResult.data) {
      for (const job of jobsResult.data as any[]) {
        results.push({
          type: 'job',
          id: job.id,
          title: job.service_type,
          subtitle: job.customer?.name
            ? `${job.customer.name} - ${formatDate(job.scheduled_date)}`
            : formatDate(job.scheduled_date),
          href: `/jobs/${job.id}`,
        });
      }
    }

    // Map leads
    if (leadsResult.data) {
      for (const lead of leadsResult.data) {
        results.push({
          type: 'lead',
          id: lead.id,
          title: lead.name,
          subtitle: lead.service_needed || lead.status,
          href: `/leads/${lead.id}`,
        });
      }
    }

    // Map invoices
    if (invoicesResult.data) {
      for (const invoice of invoicesResult.data as any[]) {
        results.push({
          type: 'invoice',
          id: invoice.id,
          title: `Invoice #${invoice.invoice_number}`,
          subtitle: invoice.customer?.name
            ? `${invoice.customer.name} - ${formatCurrency(invoice.total)}`
            : formatCurrency(invoice.total),
          href: `/invoices/${invoice.id}`,
        });
      }
    }

    // Sort by relevance (exact matches first)
    results.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(query.toLowerCase()) ? 0 : 1;
      const bExact = b.title.toLowerCase().includes(query.toLowerCase()) ? 0 : 1;
      return aExact - bExact;
    });

    // Limit total results
    return NextResponse.json({
      results: results.slice(0, limit),
      total: results.length,
    });
  } catch (error) {
    console.error('Error in GET /api/search:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

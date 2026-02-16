// =====================================================
// WHILE I'M HERE SUGGESTIONS API
// GET /api/suggestions/while-im-here
//
// Per CIL Spec Section 3.2:
// Surfaces documented historical insights during invoice creation
// Sources: Equipment age 8+ years, tech observations, customer requests, recurring issues
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import type { Suggestion } from '@/components/invoices/suggestion-card';

// Keywords for detecting tech observations
const OBSERVATION_KEYWORDS = [
  'noted',
  'observed',
  'recommend',
  'should consider',
  'may need',
  'shows signs',
  'appears to',
  'suggest',
];

// Keywords for detecting customer requests
const REQUEST_KEYWORDS = [
  'asked about',
  'interested in',
  'wants to know',
  'inquired',
  'would like',
  'considering',
  'mentioned wanting',
];

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const jobId = searchParams.get('jobId');

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const suggestions: Suggestion[] = [];

    // 1. Equipment age suggestions (8+ years)
    const { data: equipmentData } = await supabase
      .from('equipment')
      .select('id, name, type, install_date, model, serial_number')
      .eq('customer_id', customerId)
      .eq('status', 'active');

    if (equipmentData) {
      const now = new Date();
      for (const equipment of equipmentData) {
        if (equipment.install_date) {
          const installDate = new Date(equipment.install_date);
          const ageYears = Math.floor(
            (now.getTime() - installDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
          );

          if (ageYears >= 8) {
            suggestions.push({
              id: `equipment-age-${equipment.id}`,
              type: 'equipment_age',
              title: `${equipment.name || equipment.type} is ${ageYears} years old`,
              description: `Installed ${installDate.toLocaleDateString()}. May be approaching end of service life.`,
              equipmentId: equipment.id,
              equipmentName: equipment.name || equipment.type,
              priority: ageYears >= 12 ? 8 : ageYears >= 10 ? 6 : 4,
            });
          }
        }
      }
    }

    // 2. Tech observations from past job notes (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: pastJobs } = await supabase
      .from('jobs')
      .select('id, title, type, notes, completed_at')
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .neq('id', jobId || '')
      .gte('completed_at', twelveMonthsAgo.toISOString())
      .order('completed_at', { ascending: false })
      .limit(10);

    if (pastJobs) {
      for (const job of pastJobs) {
        if (job.notes) {
          const noteLower = job.notes.toLowerCase();

          // Check for tech observations
          for (const keyword of OBSERVATION_KEYWORDS) {
            if (noteLower.includes(keyword)) {
              // Extract relevant sentence
              const sentences = job.notes.split(/[.!?]+/);
              const relevantSentence = sentences.find((s: string) =>
                s.toLowerCase().includes(keyword)
              );

              if (relevantSentence) {
                suggestions.push({
                  id: `observation-${job.id}-${keyword}`,
                  type: 'tech_observation',
                  title: relevantSentence.trim(),
                  description: `From ${job.type || job.title} visit`,
                  sourceJobId: job.id,
                  sourceDate: job.completed_at,
                  priority: 5,
                });
                break; // One observation per job
              }
            }
          }

          // Check for customer requests
          for (const keyword of REQUEST_KEYWORDS) {
            if (noteLower.includes(keyword)) {
              const sentences = job.notes.split(/[.!?]+/);
              const relevantSentence = sentences.find((s: string) =>
                s.toLowerCase().includes(keyword)
              );

              if (relevantSentence) {
                suggestions.push({
                  id: `request-${job.id}-${keyword}`,
                  type: 'customer_request',
                  title: relevantSentence.trim(),
                  description: `Customer mentioned during ${job.type || job.title}`,
                  sourceJobId: job.id,
                  sourceDate: job.completed_at,
                  priority: 6,
                });
                break; // One request per job
              }
            }
          }
        }
      }
    }

    // 3. Recurring issues (same issue type 2+ times in 12 months)
    if (pastJobs) {
      const issueTypes = new Map<string, { count: number; jobs: any[] }>();

      for (const job of pastJobs) {
        const issueType = job.type?.toLowerCase() || '';
        if (issueType && issueType.includes('repair')) {
          if (!issueTypes.has(issueType)) {
            issueTypes.set(issueType, { count: 0, jobs: [] });
          }
          const entry = issueTypes.get(issueType)!;
          entry.count++;
          entry.jobs.push(job);
        }
      }

      for (const [issueType, data] of issueTypes) {
        if (data.count >= 2) {
          const mostRecent = data.jobs[0];
          suggestions.push({
            id: `recurring-${issueType}`,
            type: 'recurring_issue',
            title: `${data.count} similar repairs in the past year`,
            description: `${issueType} - may indicate underlying issue`,
            sourceJobId: mostRecent.id,
            sourceDate: mostRecent.completed_at,
            priority: 7,
          });
        }
      }
    }

    // Sort by priority (highest first) and deduplicate
    const uniqueSuggestions = suggestions
      .filter(
        (s, index, self) =>
          index === self.findIndex((t) => t.title === s.title)
      )
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5); // Max 5 suggestions

    return NextResponse.json({
      suggestions: uniqueSuggestions,
      total: uniqueSuggestions.length,
    });
  } catch (error) {
    console.error('Error in GET /api/suggestions/while-im-here:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

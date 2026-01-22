// =====================================================
// Prompt 5: AI Insights Generator
// Generates business insights from conversation data
// Runs async/batch for cost efficiency
// =====================================================

import { jobLogger } from '@/lib/logger';
import {
  AIInsightsInput,
  AIInsightsOutput,
  ConversationSummary,
  BusinessInsight,
  PromptResult,
} from '@/types/leads-captain/prompt-types';
import { callClaude, parseJSONResponse, withTimeout } from './base-prompt';

// =====================================================
// SYSTEM PROMPT
// =====================================================

function buildInsightsSystemPrompt(businessType: string): string {
  return `You are an AI business analyst specializing in ${businessType} service companies.

Your task is to analyze conversation data and generate actionable business insights.

ANALYSIS AREAS:
1. Lead Quality Trends - Are leads getting better or worse?
2. Common Customer Pain Points - What issues come up repeatedly?
3. Service Demand Patterns - Which services are most requested?
4. Response Effectiveness - How well is the AI/team converting leads?
5. Pricing Feedback - Any patterns in price objections or acceptance?
6. Seasonal Patterns - Time-based trends in inquiries
7. Competitor Mentions - What are customers saying about alternatives?
8. Upsell Opportunities - Where could additional services be offered?

INSIGHT CATEGORIES:
- opportunity: Actionable growth opportunity
- warning: Potential problem or negative trend
- trend: Neutral observation about patterns
- recommendation: Suggested action or improvement

INSIGHT PRIORITY:
- high: Immediate attention needed, significant impact
- medium: Should be addressed soon
- low: Good to know, minor impact

OUTPUT FORMAT:
{
  "insights": [
    {
      "category": "opportunity|warning|trend|recommendation",
      "priority": "high|medium|low",
      "title": "Brief title (max 50 chars)",
      "description": "Detailed explanation (2-3 sentences)",
      "dataPoints": ["Supporting evidence from conversations"],
      "suggestedAction": "What to do about it (optional)"
    }
  ],
  "keyMetrics": {
    "avgLeadQuality": "hot|warm|cold",
    "avgSentiment": "positive|neutral|negative",
    "topServices": ["service1", "service2"],
    "topConcerns": ["concern1", "concern2"],
    "conversionIndicators": "improving|stable|declining"
  },
  "executiveSummary": "2-3 sentence overview of the period"
}

GUIDELINES:
- Focus on actionable insights, not just observations
- Support insights with specific data points from conversations
- Prioritize insights that could increase revenue or prevent churn
- Be specific - "HVAC tune-ups are 40% of inquiries" not "HVAC is popular"
- Look for patterns across multiple conversations, not one-off incidents
- Consider seasonality and timing

OUTPUT: JSON only, no additional text`;
}

// =====================================================
// USER PROMPT BUILDER
// =====================================================

function buildInsightsUserPrompt(input: AIInsightsInput): string {
  const conversationSummaries = input.conversationSummaries
    .map((conv, i) => {
      return `Conversation ${i + 1}:
- Date: ${conv.date}
- Service: ${conv.serviceCategory || 'Unknown'}
- Lead Quality: ${conv.leadQuality}
- Sentiment: ${conv.sentiment}
- Outcome: ${conv.outcome}
- Summary: ${conv.summary}
- Key Topics: ${conv.keyTopics.join(', ') || 'None identified'}`;
    })
    .join('\n\n');

  return `Analyze the following ${input.conversationSummaries.length} conversations from the past ${input.periodDays} days.

BUSINESS CONTEXT:
- Business Type: ${input.businessType}
- Total Conversations: ${input.conversationSummaries.length}
- Period: Last ${input.periodDays} days

CONVERSATION SUMMARIES:
${conversationSummaries}

${input.previousInsights && input.previousInsights.length > 0 ? `
PREVIOUS INSIGHTS (for trend comparison):
${input.previousInsights.map(i => `- ${i.title}: ${i.description}`).join('\n')}
` : ''}

Generate insights based on this data. Focus on patterns, trends, and actionable recommendations.`;
}

// =====================================================
// MAIN EXECUTION
// =====================================================

export async function executeAIInsightsGenerator(
  input: AIInsightsInput
): Promise<PromptResult<AIInsightsOutput>> {
  const startTime = Date.now();

  try {
    // Validate input
    if (!input.conversationSummaries || input.conversationSummaries.length === 0) {
      return {
        success: true,
        data: {
          insights: [],
          keyMetrics: {
            avgLeadQuality: 'warm',
            avgSentiment: 'neutral',
            topServices: [],
            topConcerns: [],
            conversionIndicators: 'stable',
          },
          executiveSummary: 'No conversations to analyze for this period.',
          generatedAt: new Date().toISOString(),
          periodDays: input.periodDays,
          conversationsAnalyzed: 0,
        },
        tokensUsed: 0,
        latencyMs: Date.now() - startTime,
      };
    }

    const systemPrompt = buildInsightsSystemPrompt(input.businessType);
    const userPrompt = buildInsightsUserPrompt(input);

    // Call Claude with longer timeout for batch processing
    const response = await withTimeout(
      callClaude({
        systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent analysis
      }),
      60000 // 60 second timeout for batch processing
    );

    const parsed = parseJSONResponse<Omit<AIInsightsOutput, 'generatedAt' | 'periodDays' | 'conversationsAnalyzed'>>(response.content);

    if (!parsed) {
      // Fallback to quick analysis
      const quickInsights = generateQuickInsights(input);
      return {
        success: true,
        data: quickInsights,
        tokensUsed: response.tokensUsed,
        latencyMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      data: {
        ...parsed,
        generatedAt: new Date().toISOString(),
        periodDays: input.periodDays,
        conversationsAnalyzed: input.conversationSummaries.length,
      },
      tokensUsed: response.tokensUsed,
      latencyMs: Date.now() - startTime,
    };

  } catch (error) {
    jobLogger.error({
      msg: 'AI insights generator failed',
      error: error instanceof Error ? error.message : String(error),
    });

    // Return quick analysis as fallback
    const quickInsights = generateQuickInsights(input);
    return {
      success: true,
      data: quickInsights,
      error: error instanceof Error ? error.message : 'Unknown error',
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
    };
  }
}

// =====================================================
// QUICK ANALYSIS (Non-LLM Fallback)
// =====================================================

function generateQuickInsights(input: AIInsightsInput): AIInsightsOutput {
  const summaries = input.conversationSummaries;
  const insights: BusinessInsight[] = [];

  // Calculate metrics
  const leadQualities = summaries.map(s => s.leadQuality);
  const sentiments = summaries.map(s => s.sentiment);
  const services = summaries.flatMap(s => s.serviceCategory ? [s.serviceCategory] : []);
  const topics = summaries.flatMap(s => s.keyTopics);

  // Lead quality distribution
  const hotLeads = leadQualities.filter(q => q === 'hot').length;
  const coldLeads = leadQualities.filter(q => q === 'cold').length;
  const hotPercentage = (hotLeads / summaries.length) * 100;
  const coldPercentage = (coldLeads / summaries.length) * 100;

  if (hotPercentage > 30) {
    insights.push({
      category: 'opportunity',
      priority: 'high',
      title: 'High volume of hot leads',
      description: `${hotPercentage.toFixed(0)}% of conversations are hot leads. Consider prioritizing quick follow-up to maximize conversions.`,
      dataPoints: [`${hotLeads} hot leads out of ${summaries.length} conversations`],
      suggestedAction: 'Implement same-day callback for hot leads',
    });
  }

  if (coldPercentage > 50) {
    insights.push({
      category: 'warning',
      priority: 'medium',
      title: 'Many cold leads',
      description: `${coldPercentage.toFixed(0)}% of conversations are cold leads. Review lead sources and qualification criteria.`,
      dataPoints: [`${coldLeads} cold leads out of ${summaries.length} conversations`],
      suggestedAction: 'Analyze lead sources to identify low-quality channels',
    });
  }

  // Sentiment analysis
  const negativeSentiments = sentiments.filter(s => s === 'frustrated' || s === 'angry').length;
  const negativePercentage = (negativeSentiments / summaries.length) * 100;

  if (negativePercentage > 20) {
    insights.push({
      category: 'warning',
      priority: 'high',
      title: 'Customer frustration detected',
      description: `${negativePercentage.toFixed(0)}% of customers showed frustration or anger. Review response quality and timing.`,
      dataPoints: [`${negativeSentiments} frustrated/angry customers`],
      suggestedAction: 'Review frustrated conversations for common issues',
    });
  }

  // Service demand
  const serviceCounts = services.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([service]) => service);

  if (topServices.length > 0) {
    const topService = topServices[0];
    const topCount = serviceCounts[topService];
    const percentage = (topCount / summaries.length) * 100;

    insights.push({
      category: 'trend',
      priority: 'medium',
      title: `${topService} is top service`,
      description: `${percentage.toFixed(0)}% of inquiries are for ${topService}. Consider promoting this service more prominently.`,
      dataPoints: [`${topCount} inquiries for ${topService}`],
    });
  }

  // Topic analysis
  const topicCounts = topics.reduce((acc, t) => {
    const normalized = t.toLowerCase();
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topConcerns = Object.entries(topicCounts)
    .filter(([topic]) =>
      topic.includes('price') ||
      topic.includes('cost') ||
      topic.includes('wait') ||
      topic.includes('delay') ||
      topic.includes('problem')
    )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  // Calculate average metrics
  const avgLeadQuality = hotPercentage > 30 ? 'hot' : coldPercentage > 50 ? 'cold' : 'warm';
  const avgSentiment = negativePercentage > 30 ? 'negative' : negativePercentage < 10 ? 'positive' : 'neutral';

  return {
    insights,
    keyMetrics: {
      avgLeadQuality,
      avgSentiment,
      topServices,
      topConcerns,
      conversionIndicators: 'stable', // Can't determine without historical data
    },
    executiveSummary: `Analyzed ${summaries.length} conversations over ${input.periodDays} days. ${topServices[0] ? `Top service: ${topServices[0]}.` : ''} ${avgLeadQuality === 'hot' ? 'Strong lead quality.' : avgLeadQuality === 'cold' ? 'Lead quality needs attention.' : 'Lead quality is moderate.'}`,
    generatedAt: new Date().toISOString(),
    periodDays: input.periodDays,
    conversationsAnalyzed: summaries.length,
  };
}

// =====================================================
// BATCH PROCESSING
// =====================================================

export async function generateInsightsForBusiness(
  configId: string,
  businessType: string,
  conversationSummaries: ConversationSummary[],
  periodDays: number = 7
): Promise<AIInsightsOutput> {
  const input: AIInsightsInput = {
    conversationSummaries,
    periodDays,
    businessType,
  };

  const result = await executeAIInsightsGenerator(input);

  if (result.success && result.data) {
    return result.data;
  }

  // Return empty insights on failure
  return {
    insights: [],
    keyMetrics: {
      avgLeadQuality: 'warm',
      avgSentiment: 'neutral',
      topServices: [],
      topConcerns: [],
      conversionIndicators: 'stable',
    },
    executiveSummary: 'Unable to generate insights at this time.',
    generatedAt: new Date().toISOString(),
    periodDays,
    conversationsAnalyzed: conversationSummaries.length,
  };
}

// =====================================================
// HELPER: Build summaries from analysis data
// =====================================================

export function buildConversationSummary(
  analysis: {
    summary: string;
    customer_sentiment: string;
    lead_quality: string;
    service_category: string | null;
    analyzed_at: string;
  },
  conversation: {
    status: string;
    is_hot_lead: boolean;
  }
): ConversationSummary {
  return {
    date: analysis.analyzed_at,
    summary: analysis.summary,
    sentiment: analysis.customer_sentiment as 'positive' | 'neutral' | 'frustrated' | 'angry',
    leadQuality: analysis.lead_quality as 'hot' | 'warm' | 'cold',
    serviceCategory: analysis.service_category,
    outcome: conversation.status === 'closed'
      ? (conversation.is_hot_lead ? 'converted' : 'completed')
      : conversation.status as 'converted' | 'lost' | 'pending' | 'completed',
    keyTopics: [], // Would be extracted from notes
  };
}

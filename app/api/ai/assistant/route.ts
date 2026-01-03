// ===========================================
// AI ASSISTANT API
// Handles AI chat interactions with low token usage
// Uses GPT-4o-mini for efficiency
// ===========================================

import 'openai/shims/node';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { searchArticles, ARTICLES } from '@/lib/knowledge-base/articles';
import { NAVIGATION_MAP, findBestRoute } from '@/lib/knowledge-base/navigation-map';
import { AVAILABLE_ACTIONS, findAction } from '@/lib/knowledge-base/actions';
import { checkAIRateLimit } from '@/lib/rate-limit';

// Lazy initialization of OpenAI client to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// Build a compact knowledge summary for the system prompt
function buildKnowledgeSummary(): string {
  // Group articles by category with just titles
  const categories = new Map<string, string[]>();

  for (const article of ARTICLES) {
    const existing = categories.get(article.categoryId) || [];
    existing.push(article.title);
    categories.set(article.categoryId, existing);
  }

  let summary = 'Available help topics:\n';
  for (const [category, titles] of categories) {
    summary += `- ${category}: ${titles.slice(0, 5).join(', ')}${titles.length > 5 ? '...' : ''}\n`;
  }

  return summary;
}

// Build navigation options summary
function buildNavigationSummary(): string {
  const routes = NAVIGATION_MAP.map(r => `${r.label} (${r.path})`);
  return `CRM pages: ${routes.slice(0, 20).join(', ')}...`;
}

// Build actions summary
function buildActionsSummary(): string {
  return AVAILABLE_ACTIONS
    .map(a => `- ${a.name}: ${a.description}`)
    .join('\n');
}

// System prompt - kept minimal for token efficiency
const SYSTEM_PROMPT = `You are a helpful AI assistant for TradesCaptain CRM, a business management platform for trade professionals (plumbers, electricians, HVAC, contractors).

Your capabilities:
1. Answer questions about how to use the CRM
2. Help users navigate to the right pages
3. Assist with creating leads, jobs, quotes, invoices
4. Provide guidance on best practices
5. Create support tickets when you cannot resolve an issue

RESPONSE FORMAT:
- Keep responses concise (2-4 sentences typically)
- When suggesting navigation, use this format: [[LINK:/path|Link Text]]
- When an action can be performed, use: [[ACTION:action_id|Action Description]]
- When you cannot fully help or the user has a complex issue/bug/account problem, offer to create a support ticket using: [[TICKET_OFFER]]
- Be friendly but professional

WHEN TO OFFER A SUPPORT TICKET:
- User reports a bug or error you cannot fix
- User has account/billing issues
- User needs technical support beyond your knowledge
- User is frustrated after multiple attempts
- User explicitly asks to speak to support or create a ticket
- User has integration issues you cannot resolve
- The issue requires human intervention

${buildKnowledgeSummary()}

${buildNavigationSummary()}

Available actions:
${buildActionsSummary()}

NAVIGATION EXAMPLES:
- To view leads: [[LINK:/leads|Go to Leads]]
- To create a job: [[LINK:/jobs/new|Create New Job]]
- To open settings: [[LINK:/settings|Open Settings]]

TICKET OFFER EXAMPLE:
"I understand this is a frustrating issue. Since this requires our support team's attention, would you like me to create a support ticket? I'll summarize your issue and our conversation so the team has all the context they need. [[TICKET_OFFER]]"

Remember: Be helpful, concise, and always provide actionable next steps when possible. If you cannot fully resolve an issue, always offer to create a support ticket.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, currentPath, conversationHistory = [], businessId } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get identifier for rate limiting (businessId or IP)
    const identifier = businessId ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'anonymous';

    // Check Redis-backed rate limit (50 AI calls per minute per business/IP)
    const rateLimit = await checkAIRateLimit(identifier);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'AI rate limit exceeded. Please try again shortly.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '50',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
            'Retry-After': (rateLimit.retryAfter || 60).toString(),
          },
        }
      );
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      // Fallback to local knowledge base search
      return handleLocalFallback(message, currentPath);
    }

    // Check for direct navigation intent first (saves tokens)
    const navigationMatch = findBestRoute(message);
    if (navigationMatch && isNavigationQuery(message)) {
      return NextResponse.json({
        response: `I can take you there! [[LINK:${navigationMatch.path}|Go to ${navigationMatch.label}]]`,
        type: 'navigation',
        route: navigationMatch.path,
      });
    }

    // Check for help article match
    const relevantArticles = searchArticles(message);
    let contextInfo = '';

    if (relevantArticles.length > 0) {
      // Include top article content for context (truncated)
      const topArticle = relevantArticles[0];
      contextInfo = `\n\nRelevant help article "${topArticle.title}":\n${topArticle.content.slice(0, 500)}...\n\nRelated pages: ${topArticle.relatedRoutes?.join(', ') || 'none'}`;
    }

    // Build messages array with history (limited)
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT + contextInfo },
    ];

    // Add recent conversation history (last 4 messages for context)
    const recentHistory = conversationHistory.slice(-4);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    // Add current message with context
    const userMessage = currentPath
      ? `[User is on page: ${currentPath}]\n\n${message}`
      : message;
    messages.push({ role: 'user', content: userMessage });

    // Get OpenAI client
    const client = getOpenAIClient();
    if (!client) {
      return handleLocalFallback(message, currentPath);
    }

    // Call OpenAI with efficient model
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Most cost-effective model
      messages,
      max_tokens: 300, // Keep responses concise
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, I encountered an issue. Please try again.';

    // Parse response for links and actions
    const parsedResponse = parseResponse(response);

    return NextResponse.json({
      response: parsedResponse.text,
      links: parsedResponse.links,
      actions: parsedResponse.actions,
      offerTicket: parsedResponse.offerTicket,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      },
    });
  } catch (error: any) {
    console.error('AI Assistant error:', error);

    // Fallback to local knowledge base on error
    const body = await request.clone().json().catch(() => ({}));
    return handleLocalFallback(body.message || '', body.currentPath || '');
  }
}

// Handle queries without OpenAI (fallback)
function handleLocalFallback(message: string, currentPath: string) {
  // Search knowledge base
  const articles = searchArticles(message);

  // Check for navigation intent
  const route = findBestRoute(message);

  // Check for action intent
  const action = findAction(message);

  let response = '';
  const links: { path: string; label: string }[] = [];
  const actions: { id: string; name: string }[] = [];

  if (route && isNavigationQuery(message)) {
    response = `I can help you get there!`;
    links.push({ path: route.path, label: route.label });
  } else if (action) {
    response = `I can help you ${action.name.toLowerCase()}. Would you like to proceed?`;
    actions.push({ id: action.id, name: action.name });
    if (action.route) {
      links.push({ path: action.route, label: action.name });
    }
  } else if (articles.length > 0) {
    const article = articles[0];
    response = `Here's what I found about "${article.title}":\n\n${article.summary}`;

    if (article.relatedRoutes?.length) {
      response += '\n\nRelated pages:';
      for (const routePath of article.relatedRoutes.slice(0, 3)) {
        const routeInfo = NAVIGATION_MAP.find(r => r.path === routePath);
        if (routeInfo) {
          links.push({ path: routePath, label: routeInfo.label });
        }
      }
    }
  } else {
    response = "I'm not sure about that. Would you like to browse our Help Center, or I can create a support ticket for you to get help from our team?";
    links.push({ path: '/help', label: 'Help Center' });
    // Offer ticket when we can't help
    return NextResponse.json({
      response,
      links,
      actions,
      offerTicket: true,
      fallback: true,
    });
  }

  return NextResponse.json({
    response,
    links,
    actions,
    offerTicket: false,
    fallback: true,
  });
}

// Check if query is asking for navigation
function isNavigationQuery(query: string): boolean {
  const navigationPatterns = [
    /where (is|can i find|do i)/i,
    /how (do i get to|to go to|to open|to access)/i,
    /take me to/i,
    /go to/i,
    /open/i,
    /show me/i,
    /navigate to/i,
  ];

  return navigationPatterns.some(pattern => pattern.test(query));
}

// Parse response for special markers
function parseResponse(response: string): {
  text: string;
  links: { path: string; label: string }[];
  actions: { id: string; name: string }[];
  offerTicket: boolean;
} {
  const links: { path: string; label: string }[] = [];
  const actions: { id: string; name: string }[] = [];
  let offerTicket = false;

  // Extract [[LINK:/path|Label]] patterns
  let text = response.replace(
    /\[\[LINK:([^\|]+)\|([^\]]+)\]\]/g,
    (_, path, label) => {
      links.push({ path, label });
      return `[${label}]`; // Keep readable text
    }
  );

  // Extract [[ACTION:id|Label]] patterns
  text = text.replace(
    /\[\[ACTION:([^\|]+)\|([^\]]+)\]\]/g,
    (_, id, name) => {
      actions.push({ id, name });
      return `[${name}]`;
    }
  );

  // Check for ticket offer marker
  if (text.includes('[[TICKET_OFFER]]')) {
    offerTicket = true;
    text = text.replace(/\[\[TICKET_OFFER\]\]/g, '');
  }

  return { text, links, actions, offerTicket };
}

// GET endpoint for suggestions based on current page
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const currentPath = searchParams.get('path') || '/dashboard';

  // Get contextual suggestions
  const suggestions = getContextualSuggestions(currentPath);

  return NextResponse.json({ suggestions });
}

// Generate suggestions based on current page
function getContextualSuggestions(currentPath: string): string[] {
  const suggestionMap: Record<string, string[]> = {
    '/dashboard': [
      'How do I read my dashboard metrics?',
      'What should I do first today?',
      'Show me my outstanding invoices',
    ],
    '/leads': [
      'How do I add a new lead?',
      'What do the lead statuses mean?',
      'How can I improve my lead conversion?',
    ],
    '/leads/new': [
      'What information should I capture for leads?',
      'How do I track lead sources?',
    ],
    '/customers': [
      'How do I add a new customer?',
      'Can I merge duplicate customers?',
      'How do I view customer history?',
    ],
    '/jobs': [
      'How do I create a new job?',
      'What do the job statuses mean?',
      'How do I assign jobs to technicians?',
    ],
    '/jobs/new': [
      'What details should I include in a job?',
      'How do I set job duration?',
    ],
    '/quotes': [
      'How do I create a professional quote?',
      'Can I offer multiple options in a quote?',
      'How do I follow up on sent quotes?',
    ],
    '/invoices': [
      'How do I create an invoice?',
      'How do I accept online payments?',
      'How do I send payment reminders?',
    ],
    '/calendar': [
      'How do I change calendar views?',
      'Can I sync with Google Calendar?',
      'How do I set my availability?',
    ],
    '/messages': [
      'How does AI auto-response work?',
      'Can I use message templates?',
      'How do I start a new conversation?',
    ],
    '/settings': [
      'How do I update my business profile?',
      'How do I invite team members?',
      'How do I connect integrations?',
    ],
    '/reports': [
      'What reports are available?',
      'How do I export report data?',
      'How do I track my revenue?',
    ],
  };

  // Find matching suggestions or return defaults
  for (const [path, suggestions] of Object.entries(suggestionMap)) {
    if (currentPath.startsWith(path)) {
      return suggestions;
    }
  }

  return [
    'How do I get started?',
    'What features does TradesCaptain have?',
    'Where can I find help?',
  ];
}

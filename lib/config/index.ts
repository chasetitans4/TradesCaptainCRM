// =====================================================
// CENTRALIZED CONFIGURATION
// Type-safe environment variable access
// =====================================================

import { z } from 'zod';

// Environment schema with validation
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('TradesCaptain'),

  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Authentication
  JWT_SECRET: z.string().min(32).optional(),
  SESSION_EXPIRY: z.coerce.number().default(604800),

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Resend
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo-preview'),

  // Nylas
  NYLAS_CLIENT_ID: z.string().optional(),
  NYLAS_CLIENT_SECRET: z.string().optional(),
  NYLAS_API_KEY: z.string().optional(),
  NYLAS_API_URI: z.string().url().optional(),

  // Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // Feature flags
  NEXT_PUBLIC_ENABLE_AI_SMS: z.coerce.boolean().default(false),
  NEXT_PUBLIC_ENABLE_ROUTE_OPTIMIZATION: z.coerce.boolean().default(false),
  NEXT_PUBLIC_ENABLE_ONLINE_BOOKING: z.coerce.boolean().default(false),
});

type Env = z.infer<typeof envSchema>;

// Validate environment on initialization
function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.format();
    console.error('\n❌ INVALID ENVIRONMENT CONFIGURATION');
    console.error('━'.repeat(50));
    console.error(JSON.stringify(errors, null, 2));
    console.error('━'.repeat(50));

    // FAIL LOUDLY - even in development
    // Silent defaults mask misconfigurations that cause debugging nightmares
    const missingVars = Object.keys(errors)
      .filter(k => k !== '_errors')
      .join(', ');

    throw new Error(
      `\n⚠️  Missing required environment variables: ${missingVars}\n` +
      `\n   To fix this:\n` +
      `   1. Copy .env.example to .env.local\n` +
      `   2. Fill in the required values (at minimum: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)\n` +
      `   3. Restart the dev server\n`
    );
  }

  return parsed.data;
}

// Lazy-loaded validated environment
let _env: Env | null = null;

function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

/**
 * Application configuration
 */
export const config = {
  // Environment
  get env() {
    return getEnv();
  },

  get isDevelopment() {
    return getEnv().NODE_ENV === 'development';
  },

  get isProduction() {
    return getEnv().NODE_ENV === 'production';
  },

  get isTest() {
    return getEnv().NODE_ENV === 'test';
  },

  // Application
  app: {
    get url() {
      return getEnv().NEXT_PUBLIC_APP_URL;
    },
    get name() {
      return getEnv().NEXT_PUBLIC_APP_NAME;
    },
  },

  // Database
  supabase: {
    get url() {
      return getEnv().NEXT_PUBLIC_SUPABASE_URL;
    },
    get anonKey() {
      return getEnv().NEXT_PUBLIC_SUPABASE_ANON_KEY;
    },
    get serviceRoleKey() {
      return getEnv().SUPABASE_SERVICE_ROLE_KEY;
    },
  },

  // Authentication
  auth: {
    get jwtSecret() {
      return getEnv().JWT_SECRET;
    },
    get sessionExpiry() {
      return getEnv().SESSION_EXPIRY;
    },
  },

  // Stripe
  stripe: {
    get publishableKey() {
      return getEnv().NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    },
    get secretKey() {
      return getEnv().STRIPE_SECRET_KEY;
    },
    get webhookSecret() {
      return getEnv().STRIPE_WEBHOOK_SECRET;
    },
    get isConfigured() {
      return !!(getEnv().STRIPE_SECRET_KEY && getEnv().NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    },
  },

  // Twilio
  twilio: {
    get accountSid() {
      return getEnv().TWILIO_ACCOUNT_SID;
    },
    get authToken() {
      return getEnv().TWILIO_AUTH_TOKEN;
    },
    get phoneNumber() {
      return getEnv().TWILIO_PHONE_NUMBER;
    },
    get isConfigured() {
      return !!(getEnv().TWILIO_ACCOUNT_SID && getEnv().TWILIO_AUTH_TOKEN);
    },
  },

  // Resend
  resend: {
    get apiKey() {
      return getEnv().RESEND_API_KEY;
    },
    get fromEmail() {
      return getEnv().RESEND_FROM_EMAIL || 'noreply@tradescaptain.com';
    },
    get isConfigured() {
      return !!getEnv().RESEND_API_KEY;
    },
  },

  // OpenAI
  openai: {
    get apiKey() {
      return getEnv().OPENAI_API_KEY;
    },
    get model() {
      return getEnv().OPENAI_MODEL;
    },
    get isConfigured() {
      return !!getEnv().OPENAI_API_KEY;
    },
  },

  // Nylas
  nylas: {
    get clientId() {
      return getEnv().NYLAS_CLIENT_ID;
    },
    get clientSecret() {
      return getEnv().NYLAS_CLIENT_SECRET;
    },
    get apiKey() {
      return getEnv().NYLAS_API_KEY;
    },
    get apiUri() {
      return getEnv().NYLAS_API_URI;
    },
    get isConfigured() {
      return !!(getEnv().NYLAS_CLIENT_ID && getEnv().NYLAS_API_KEY);
    },
  },

  // Feature flags
  features: {
    get aiSms() {
      return getEnv().NEXT_PUBLIC_ENABLE_AI_SMS;
    },
    get routeOptimization() {
      return getEnv().NEXT_PUBLIC_ENABLE_ROUTE_OPTIMIZATION;
    },
    get onlineBooking() {
      return getEnv().NEXT_PUBLIC_ENABLE_ONLINE_BOOKING;
    },
  },

  // Sentry
  sentry: {
    get dsn() {
      return getEnv().NEXT_PUBLIC_SENTRY_DSN;
    },
    get isConfigured() {
      return !!getEnv().NEXT_PUBLIC_SENTRY_DSN;
    },
  },
};

/**
 * Check if required integrations are configured
 */
export function checkIntegrations(): Record<string, boolean> {
  return {
    supabase: true, // Always required
    stripe: config.stripe.isConfigured,
    twilio: config.twilio.isConfigured,
    resend: config.resend.isConfigured,
    openai: config.openai.isConfigured,
    nylas: config.nylas.isConfigured,
    sentry: config.sentry.isConfigured,
  };
}

/**
 * Get list of missing integrations
 */
export function getMissingIntegrations(): string[] {
  const integrations = checkIntegrations();
  return Object.entries(integrations)
    .filter(([, configured]) => !configured)
    .map(([name]) => name);
}

export default config;

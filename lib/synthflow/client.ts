/**
 * Synthflow API Client
 *
 * Delta 6: All calls include training_opt_out: true
 * Voice/SMS data is NEVER used to train AI models
 */

import { logger } from '@/lib/logger';
import type {
  SynthflowCallParams,
  SynthflowResponse,
  SynthflowWebhookPayload,
} from '@/types/voice-receptionist';

const synthflowLogger = logger.child({ module: 'synthflow' });

// Configuration - Delta 6: Training opt-out is always enabled
const SYNTHFLOW_CONFIG = {
  baseUrl: process.env.SYNTHFLOW_API_URL || 'https://api.synthflow.ai',
  apiKey: process.env.SYNTHFLOW_API_KEY,
  webhookSecret: process.env.SYNTHFLOW_WEBHOOK_SECRET,
  // Delta 6: ALWAYS true - cannot be overridden
  trainingOptOut: true as const,
  // Timeout for API calls
  timeoutMs: 30000,
  // Fallback timeout before transferring to human
  fallbackTimeoutMs: 5000,
};

/**
 * Synthflow API Client
 * Handles all communication with the Synthflow voice AI platform
 */
class SynthflowClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!SYNTHFLOW_CONFIG.apiKey) {
      synthflowLogger.warn('SYNTHFLOW_API_KEY not set - Synthflow features will be unavailable');
    }
    this.apiKey = SYNTHFLOW_CONFIG.apiKey || '';
    this.baseUrl = SYNTHFLOW_CONFIG.baseUrl;
  }

  /**
   * Check if client is configured and ready
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Initiate an AI voice call
   * Delta 6: Always includes training_opt_out: true
   */
  async initiateCall(params: Omit<SynthflowCallParams, 'noTraining'>): Promise<SynthflowResponse> {
    if (!this.isConfigured()) {
      throw new Error('Synthflow client not configured - missing API key');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SYNTHFLOW_CONFIG.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/v1/calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: params.phoneNumber,
          assistant_id: params.assistantId,
          voice_id: params.voiceId,
          initial_message: params.greeting,
          context: params.context,
          webhook_url: params.webhookUrl,
          // Delta 6: Explicit training opt-out
          training_opt_out: true,
          data_retention: 'session_only',
          // Do not store transcripts long-term
          store_transcript: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        synthflowLogger.error({
          msg: 'Synthflow call initiation failed',
          status: response.status,
          error: errorText,
        });
        throw new Error(`Synthflow API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      synthflowLogger.info({
        msg: 'Synthflow call initiated',
        callId: data.call_id || data.callId,
        phoneNumber: params.phoneNumber.slice(-4), // Log last 4 digits only
      });

      return {
        callId: data.call_id || data.callId,
        status: data.status || 'initiated',
        transcript: data.transcript,
        extractedData: data.extracted_data,
        confidence: data.confidence,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        synthflowLogger.error('Synthflow call initiation timed out');
        throw new Error('Synthflow API timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string): Promise<SynthflowResponse> {
    if (!this.isConfigured()) {
      throw new Error('Synthflow client not configured');
    }

    const response = await fetch(`${this.baseUrl}/v1/calls/${callId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get call status: ${response.status}`);
    }

    const data = await response.json();
    return {
      callId: data.call_id || callId,
      status: data.status,
      transcript: data.transcript,
      extractedData: data.extracted_data,
      confidence: data.confidence,
    };
  }

  /**
   * End an active call
   */
  async endCall(callId: string, reason?: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Synthflow client not configured');
    }

    const response = await fetch(`${this.baseUrl}/v1/calls/${callId}/end`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      synthflowLogger.error({ msg: 'Failed to end call', callId, status: response.status });
      throw new Error(`Failed to end call: ${response.status}`);
    }

    synthflowLogger.info({ msg: 'Call ended', callId, reason });
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/v1/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!SYNTHFLOW_CONFIG.webhookSecret) {
      synthflowLogger.error('Webhook secret not configured - rejecting request');
      return false;
    }

    // Implement HMAC validation based on Synthflow's signature scheme
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', SYNTHFLOW_CONFIG.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(body: string): SynthflowWebhookPayload {
    try {
      const data = JSON.parse(body);
      return {
        call_id: data.call_id,
        event_type: data.event_type,
        phone_number: data.phone_number,
        duration_seconds: data.duration_seconds,
        transcript: data.transcript,
        extracted_data: data.extracted_data,
        confidence: data.confidence,
        error: data.error,
      };
    } catch (error) {
      synthflowLogger.error({ msg: 'Failed to parse webhook payload', error });
      throw new Error('Invalid webhook payload');
    }
  }
}

// Singleton instance
let synthflowClient: SynthflowClient | null = null;

/**
 * Get Synthflow client instance
 */
export function getSynthflowClient(): SynthflowClient {
  if (!synthflowClient) {
    synthflowClient = new SynthflowClient();
  }
  return synthflowClient;
}

/**
 * Check if Synthflow is available (health check with caching)
 */
let lastHealthCheck: { result: boolean; timestamp: number } | null = null;
const HEALTH_CHECK_CACHE_MS = 60000; // 1 minute

export async function isSynthflowAvailable(): Promise<boolean> {
  const now = Date.now();

  if (lastHealthCheck && now - lastHealthCheck.timestamp < HEALTH_CHECK_CACHE_MS) {
    return lastHealthCheck.result;
  }

  const client = getSynthflowClient();
  const result = await client.healthCheck();

  lastHealthCheck = { result, timestamp: now };
  return result;
}

/**
 * Get fallback timeout (how long to wait before falling back to human)
 */
export function getFallbackTimeoutMs(): number {
  return SYNTHFLOW_CONFIG.fallbackTimeoutMs;
}

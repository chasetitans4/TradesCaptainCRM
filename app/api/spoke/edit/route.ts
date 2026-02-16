// =====================================================
// SPOKE EDIT API
// POST /api/spoke/edit
//
// Per Spoke Spec Section 8.3:
// Handle EDIT SMS replies for corrections.
//
// Called when contractor replies "EDIT" to confirmation SMS.
// 30-minute edit window per spec.
//
// Beta Constraint:
// - Corrections logged but don't modify system behavior
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { smsLogger } from '@/lib/logger';
import {
  handleEditKeyword,
  handleEditCorrection,
  hasActiveEditSession,
} from '@/lib/spoke/confirmation';

const editLogger = smsLogger.child({ context: 'api.spoke.edit' });

// Internal service authentication
const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify internal service auth
    const authHeader = request.headers.get('X-Internal-Secret');
    if (!INTERNAL_SECRET || authHeader !== INTERNAL_SECRET) {
      editLogger.warn({ msg: 'Unauthorized edit request' });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contractorPhone, message } = body;

    if (!contractorPhone || !message) {
      return NextResponse.json(
        { error: 'Missing contractorPhone or message' },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim().toUpperCase();

    editLogger.info({
      msg: 'Processing edit request',
      contractorPhone,
      messagePreview: message.slice(0, 50),
    });

    // Check if this is the EDIT keyword to start a session
    if (trimmedMessage === 'EDIT') {
      const result = await handleEditKeyword(contractorPhone);

      editLogger.info({
        msg: 'Edit session initiated',
        contractorPhone,
        success: result.success,
        latencyMs: Date.now() - startTime,
      });

      return NextResponse.json({
        action: 'session_started',
        success: result.success,
        message: result.message,
        latencyMs: Date.now() - startTime,
      });
    }

    // Check if user is in active edit session
    const hasSession = await hasActiveEditSession(contractorPhone);

    if (hasSession) {
      // Process as correction
      const result = await handleEditCorrection(contractorPhone, message);

      editLogger.info({
        msg: 'Edit correction processed',
        contractorPhone,
        success: result.success,
        latencyMs: Date.now() - startTime,
      });

      return NextResponse.json({
        action: 'correction_applied',
        success: result.success,
        message: result.message,
        latencyMs: Date.now() - startTime,
      });
    }

    // No active session and not EDIT keyword
    editLogger.info({
      msg: 'Edit request without active session',
      contractorPhone,
      latencyMs: Date.now() - startTime,
    });

    return NextResponse.json({
      action: 'no_session',
      success: false,
      message: 'Reply EDIT to change your last update.',
      latencyMs: Date.now() - startTime,
    });

  } catch (error) {
    const latencyMs = Date.now() - startTime;

    editLogger.error({
      msg: 'Error in edit endpoint',
      error: error instanceof Error ? { name: error.name, message: error.message } : { message: 'Unknown error' },
      latencyMs,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// =====================================================
// Leads Captain - Sandbox Test API
// Run simulated conversations for testing AI config
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { jobLogger } from '@/lib/logger';
import { checkPermission } from '@/lib/permissions/check-permission';
import {
  executeFullSandboxTest,
  testSingleResponse,
} from '@/lib/leads-captain/prompts/sandbox-test-agent';
import { SandboxTestInput, SandboxTestScenario } from '@/types/leads-captain/prompt-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minute timeout for full tests

/**
 * GET /api/leads-captain/sandbox-test
 * Retrieve previous sandbox test results
 */
export async function GET(request: NextRequest) {
  try {
    await checkPermission('view_leads_captain');
    const searchParams = request.nextUrl.searchParams;
    const configId = searchParams.get('configId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get recent test results
    const { data: tests, error } = await supabase
      .from('leads_captain_sandbox_tests')
      .select('*')
      .eq('config_id', configId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      jobLogger.error({
        msg: 'Failed to fetch sandbox tests',
        configId,
        error: error.message,
      });
      return NextResponse.json(
        { error: 'Failed to fetch tests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tests: tests || [],
    });

  } catch (error) {
    jobLogger.error({
      msg: 'Sandbox test GET failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads-captain/sandbox-test
 * Run a sandbox test simulation
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    await checkPermission('manage_leads_captain');

    const body = await request.json();
    const {
      configId,
      scenario,
      maxTurns = 8,
      testMode = 'full', // 'full' or 'single'
      singleTestData, // For single response tests
    } = body;

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get config for business context
    const { data: config, error: configError } = await supabase
      .from('leads_captain_config')
      .select('*')
      .eq('id', configId)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Config not found' },
        { status: 404 }
      );
    }

    // Handle single response test
    if (testMode === 'single' && singleTestData) {
      const result = await testSingleResponse(
        singleTestData.customerMessage,
        singleTestData.businessResponse,
        {
          businessType: config.business_type || 'service',
          serviceType: singleTestData.serviceType || 'general service',
          customerPersona: singleTestData.customerPersona || 'friendly',
        }
      );

      return NextResponse.json({
        success: true,
        mode: 'single',
        result,
        processingTimeMs: Date.now() - startTime,
      });
    }

    // Validate scenario for full test
    if (!scenario) {
      return NextResponse.json(
        { error: 'scenario is required for full tests' },
        { status: 400 }
      );
    }

    const testScenario: SandboxTestScenario = {
      businessType: config.business_type || 'service',
      serviceType: scenario.serviceType || 'general service',
      customerPersona: scenario.customerPersona || 'friendly',
      additionalContext: scenario.additionalContext,
    };

    const testInput: SandboxTestInput = {
      scenario: testScenario,
      maxTurns,
      testGoal: scenario.testGoal,
    };

    // Create message processor that uses the actual AI system
    const processMessage = async (message: string): Promise<string> => {
      // Import orchestrator dynamically to avoid circular deps
      const { orchestrateMessage } = await import('@/lib/leads-captain/orchestrator');

      // Get rules for the config
      const { data: rules } = await supabase
        .from('leads_captain_rules')
        .select('*')
        .eq('config_id', configId)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      // Create a mock conversation for testing
      const mockConversation = {
        id: 'sandbox-test',
        config_id: configId,
        customer_phone: '+15555550000',
        customer_name: null,
        customer_email: null,
        status: 'active' as const,
        initial_intent: null,
        current_intent: null,
        sentiment: null,
        is_hot_lead: false,
        is_emergency: false,
        requires_human: false,
        opted_out: false,
        message_count: 0,
        ai_message_count: 0,
        customer_memory: {},
        crm_lead_id: null,
        crm_customer_id: null,
        started_at: new Date().toISOString(),
        last_message_at: null,
        last_customer_message_at: null,
        closed_at: null,
        created_at: new Date().toISOString(),
        owner_id: null,
        claimed_by: null,
        claimed_at: null,
        last_activity_at: new Date().toISOString(),
        muted_until: null,
      };

      const result = await orchestrateMessage({
        config,
        conversation: mockConversation,
        rules: rules || [],
        recentMessages: [],
        currentMessage: message,
        isFirstMessage: true,
        isBusinessHours: true,
        isQuietHours: false,
      });

      return result.responseText || 'No response generated';
    };

    // Run full sandbox test
    const testResult = await executeFullSandboxTest(testInput, processMessage);

    // Save test result
    if (testResult.success && testResult.data) {
      const { error: insertError } = await supabase
        .from('leads_captain_sandbox_tests')
        .insert({
          config_id: configId,
          scenario: testScenario,
          conversation: testResult.data.conversation,
          analysis: testResult.data.analysis,
          scenario_completed: testResult.data.scenarioCompleted,
          turns_used: testResult.data.turnsUsed,
          tokens_used: testResult.data.totalTokensUsed,
        });

      if (insertError) {
        jobLogger.warn({
          msg: 'Failed to save sandbox test result',
          configId,
          error: insertError.message,
        });
      }
    }

    const processingTime = Date.now() - startTime;

    jobLogger.info({
      msg: 'Sandbox test completed',
      configId,
      scenario: testScenario.customerPersona,
      turnsUsed: testResult.data?.turnsUsed || 0,
      overallScore: testResult.data?.analysis.overallScore || 0,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: testResult.success,
      mode: 'full',
      result: testResult.data,
      error: testResult.error,
      processingTimeMs: processingTime,
    });

  } catch (error) {
    jobLogger.error({
      msg: 'Sandbox test failed',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads-captain/sandbox-test
 * Delete sandbox test results
 */
export async function DELETE(request: NextRequest) {
  try {
    await checkPermission('manage_leads_captain');
    const searchParams = request.nextUrl.searchParams;
    const testId = searchParams.get('testId');
    const configId = searchParams.get('configId');
    const deleteAll = searchParams.get('deleteAll') === 'true';

    if (!configId) {
      return NextResponse.json(
        { error: 'configId is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (deleteAll) {
      // Delete all tests for config
      const { error } = await supabase
        .from('leads_captain_sandbox_tests')
        .delete()
        .eq('config_id', configId);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to delete tests' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'All tests deleted',
      });
    }

    if (!testId) {
      return NextResponse.json(
        { error: 'testId or deleteAll=true is required' },
        { status: 400 }
      );
    }

    // Delete single test
    const { error } = await supabase
      .from('leads_captain_sandbox_tests')
      .delete()
      .eq('id', testId)
      .eq('config_id', configId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete test' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Test deleted',
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

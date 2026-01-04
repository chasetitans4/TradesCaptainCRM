'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bot,
  Moon,
  Sun,
  MessageSquare,
  Brain,
  Save,
  Loader2,
  TestTube,
  Sparkles,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type AITone = 'professional' | 'friendly' | 'casual';

interface TestResult {
  success: boolean;
  response?: string;
  error?: string;
}

export default function AISMSSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testMessage, setTestMessage] = useState('Hi, I need to schedule a service appointment');
  const { toast } = useToast();

  // Settings state
  const [enabled, setEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('20:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [tone, setTone] = useState<AITone>('professional');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [maxAutoReplies, setMaxAutoReplies] = useState(10);

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/sms/ai-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setEnabled(data.settings.ai_sms_enabled || false);
          setQuietStart(data.settings.ai_sms_quiet_start || '20:00');
          setQuietEnd(data.settings.ai_sms_quiet_end || '08:00');
          setTone(data.settings.ai_sms_tone || 'professional');
          setKnowledgeBase(data.settings.ai_sms_knowledge_base || '');
          setMaxAutoReplies(data.settings.ai_sms_max_replies || 10);
        }
      }
    } catch (_error) {
      toast({
        title: 'Failed to load AI settings',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/sms/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_sms_enabled: enabled,
          ai_sms_quiet_start: quietStart,
          ai_sms_quiet_end: quietEnd,
          ai_sms_tone: tone,
          ai_sms_knowledge_base: knowledgeBase,
          ai_sms_max_replies: maxAutoReplies,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (_error) {
      toast({
        title: 'Failed to save settings',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestAI = async () => {
    if (!testMessage.trim()) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/sms/ai-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testMessage,
          tone,
          knowledge_base: knowledgeBase,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({ success: true, response: data.response });
      } else {
        setTestResult({ success: false, error: data.error || 'Test failed' });
      }
    } catch (_error) {
      setTestResult({ success: false, error: 'Failed to test AI response' });
    } finally {
      setTesting(false);
    }
  };

  const toneDescriptions: Record<AITone, string> = {
    professional: 'Formal and business-like. Uses proper grammar and maintains a courteous tone.',
    friendly: 'Warm and approachable while remaining professional. Uses casual language.',
    casual: 'Relaxed and conversational. Uses contractions and informal expressions.',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">AI SMS Settings</h1>
            <p className="text-xs text-muted-foreground">Configure automatic responses</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </button>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Enable/Disable Toggle */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${enabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                <Bot className={`h-5 w-5 ${enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-medium">AI Auto-Responses</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically reply to incoming messages
                </p>
              </div>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                enabled ? 'bg-green-500' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Moon className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-medium">Quiet Hours</h3>
              <p className="text-sm text-muted-foreground">
                AI won't respond during these hours (sends greeting only)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Start Time</label>
              <div className="relative">
                <Moon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">End Time</label>
              <div className="relative">
                <Sun className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            During quiet hours, AI will only send: "Thanks for reaching out! We'll get back to you during business hours."
          </p>
        </div>

        {/* AI Tone */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-medium">AI Tone</h3>
              <p className="text-sm text-muted-foreground">
                Choose how the AI communicates
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {(['professional', 'friendly', 'casual'] as AITone[]).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                  tone === t
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  tone === t ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {tone === t && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <div>
                  <span className="font-medium capitalize">{t}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {toneDescriptions[t]}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Max Auto-Replies */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <MessageSquare className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-medium">Max Auto-Replies</h3>
              <p className="text-sm text-muted-foreground">
                Limit AI responses per conversation before human handoff
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="20"
              value={maxAutoReplies}
              onChange={(e) => setMaxAutoReplies(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-medium w-8 text-center">{maxAutoReplies}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            After {maxAutoReplies} AI messages, customers will be notified that a human will follow up.
          </p>
        </div>

        {/* Knowledge Base */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Brain className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium">Knowledge Base</h3>
              <p className="text-sm text-muted-foreground">
                Information for the AI to reference when responding
              </p>
            </div>
          </div>

          <textarea
            value={knowledgeBase}
            onChange={(e) => setKnowledgeBase(e.target.value)}
            placeholder="Enter information about your business, services, pricing, hours, etc. The AI will use this to provide accurate responses.

Example:
- Business: ABC Plumbing & HVAC
- Services: Plumbing repairs, water heater installation, AC repair, heating service
- Hours: Mon-Fri 8am-6pm, Sat 9am-2pm
- Emergency service available 24/7 (extra charge)
- Service area: Within 30 miles of downtown
- Pricing: Service call $89, estimates are free"
            className="w-full h-48 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {knowledgeBase.length}/2000 characters
          </p>
        </div>

        {/* Test AI Response */}
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TestTube className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-medium">Test AI Response</h3>
              <p className="text-sm text-muted-foreground">
                See how the AI would respond to a message
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter a test message..."
              className="w-full h-20 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
            />

            <button
              onClick={handleTestAI}
              disabled={testing || !testMessage.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {testing ? 'Generating...' : 'Test Response'}
            </button>

            {testResult && (
              <div className={`p-3 rounded-lg ${
                testResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
              }`}>
                {testResult.success ? (
                  <div className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">AI Response:</p>
                      <p className="text-sm mt-1">{testResult.response}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">{testResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Human Handoff Info */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-700 dark:text-amber-400">Automatic Human Handoff</h4>
              <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                The AI will automatically hand off to a human when customers:
              </p>
              <ul className="text-sm text-amber-600 dark:text-amber-500 mt-2 space-y-1 list-disc list-inside">
                <li>Ask to speak to a person or representative</li>
                <li>Express frustration or urgency</li>
                <li>Have complex issues the AI can't handle</li>
                <li>Reach the maximum auto-reply limit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

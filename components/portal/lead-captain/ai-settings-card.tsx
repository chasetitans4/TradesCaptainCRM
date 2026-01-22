'use client';

import { useState, useEffect } from 'react';
import { Bot, Save, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PortalLeadCaptainConfig } from '@/types/portal/lead-captain';
import type { CreativityLevel, PricingMode } from '@/types/leads-captain';

interface AISettingsCardProps {
  config: PortalLeadCaptainConfig;
  onSave: (updates: Partial<PortalLeadCaptainConfig>) => Promise<void>;
}

export function AISettingsCard({ config, onSave }: AISettingsCardProps) {
  const [aiEnabled, setAiEnabled] = useState(config.ai_enabled);
  const [confidenceThreshold, setConfidenceThreshold] = useState(config.ai_confidence_threshold);
  const [creativityLevel, setCreativityLevel] = useState(config.ai_creativity_level);
  const [maxMessages, setMaxMessages] = useState(config.ai_max_messages);
  const [pricingMode, setPricingMode] = useState(config.ai_pricing_mode);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    setHasChanges(
      aiEnabled !== config.ai_enabled ||
      confidenceThreshold !== config.ai_confidence_threshold ||
      creativityLevel !== config.ai_creativity_level ||
      maxMessages !== config.ai_max_messages ||
      pricingMode !== config.ai_pricing_mode
    );
  }, [aiEnabled, confidenceThreshold, creativityLevel, maxMessages, pricingMode, config]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        ai_enabled: aiEnabled,
        ai_confidence_threshold: confidenceThreshold,
        ai_creativity_level: creativityLevel,
        ai_max_messages: maxMessages,
        ai_pricing_mode: pricingMode,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Settings
        </CardTitle>
        <CardDescription>
          Configure AI response behavior and parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Enabled Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="ai-enabled">AI Responses Enabled</Label>
            <p className="text-sm text-gray-500">
              Allow AI to automatically respond to leads
            </p>
          </div>
          <Switch
            id="ai-enabled"
            checked={aiEnabled}
            onCheckedChange={setAiEnabled}
          />
        </div>

        {!aiEnabled && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              AI responses are disabled. All messages will require manual responses.
            </AlertDescription>
          </Alert>
        )}

        {/* Creativity Level */}
        <div className="space-y-2">
          <Label htmlFor="creativity">AI Creativity Level</Label>
          <Select
            value={creativityLevel}
            onValueChange={(value) => setCreativityLevel(value as CreativityLevel)}
            disabled={!aiEnabled}
          >
            <SelectTrigger id="creativity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex flex-col items-start">
                  <span>None</span>
                  <span className="text-xs text-gray-500">Stick to templates only</span>
                </div>
              </SelectItem>
              <SelectItem value="low">
                <div className="flex flex-col items-start">
                  <span>Low</span>
                  <span className="text-xs text-gray-500">Minor personalization</span>
                </div>
              </SelectItem>
              <SelectItem value="medium">
                <div className="flex flex-col items-start">
                  <span>Medium</span>
                  <span className="text-xs text-gray-500">Balanced personalization</span>
                </div>
              </SelectItem>
              <SelectItem value="high">
                <div className="flex flex-col items-start">
                  <span>High</span>
                  <span className="text-xs text-gray-500">More creative responses</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-2">
          <Label htmlFor="threshold">Confidence Threshold ({confidenceThreshold}%)</Label>
          <Input
            id="threshold"
            type="range"
            min="30"
            max="95"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
            disabled={!aiEnabled}
            className="cursor-pointer"
          />
          <p className="text-sm text-gray-500">
            AI will only respond automatically when confidence is above this threshold
          </p>
        </div>

        {/* Max Messages */}
        <div className="space-y-2">
          <Label htmlFor="max-messages">Max AI Messages Per Conversation</Label>
          <Input
            id="max-messages"
            type="number"
            min="1"
            max="50"
            value={maxMessages}
            onChange={(e) => setMaxMessages(parseInt(e.target.value) || 1)}
            disabled={!aiEnabled}
            className="w-24"
          />
          <p className="text-sm text-gray-500">
            After this many AI responses, conversations will be escalated for human review
          </p>
        </div>

        {/* Pricing Mode */}
        <div className="space-y-2">
          <Label htmlFor="pricing-mode">Price Information Sharing</Label>
          <Select
            value={pricingMode}
            onValueChange={(value) => setPricingMode(value as PricingMode)}
            disabled={!aiEnabled}
          >
            <SelectTrigger id="pricing-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">
                <div className="flex flex-col items-start">
                  <span>Never share prices</span>
                  <span className="text-xs text-gray-500">AI will not mention pricing</span>
                </div>
              </SelectItem>
              <SelectItem value="ranges">
                <div className="flex flex-col items-start">
                  <span>Share price ranges</span>
                  <span className="text-xs text-gray-500">e.g., $100-$200</span>
                </div>
              </SelectItem>
              <SelectItem value="specific">
                <div className="flex flex-col items-start">
                  <span>Share specific prices</span>
                  <span className="text-xs text-gray-500">From your price list</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}

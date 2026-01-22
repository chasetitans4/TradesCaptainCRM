'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PortalLeadCaptainConfig } from '@/types/portal/lead-captain';

interface ResponseStyleCardProps {
  config: PortalLeadCaptainConfig;
  onSave: (updates: Partial<PortalLeadCaptainConfig>) => Promise<void>;
}

export function ResponseStyleCard({ config, onSave }: ResponseStyleCardProps) {
  const [tone, setTone] = useState(config.tone);
  const [useEmojis, setUseEmojis] = useState(config.use_emojis);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    setHasChanges(tone !== config.tone || useEmojis !== config.use_emojis);
  }, [tone, useEmojis, config.tone, config.use_emojis]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ tone, use_emojis: useEmojis });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Response Style
        </CardTitle>
        <CardDescription>
          Control how AI messages sound to your customers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="tone">Response Tone</Label>
          <Select value={tone} onValueChange={(value) => setTone(value as typeof tone)}>
            <SelectTrigger id="tone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="casual">
                <div className="flex flex-col items-start">
                  <span>Casual</span>
                  <span className="text-xs text-gray-500">Relaxed and conversational</span>
                </div>
              </SelectItem>
              <SelectItem value="friendly_professional">
                <div className="flex flex-col items-start">
                  <span>Friendly Professional</span>
                  <span className="text-xs text-gray-500">Warm but business-appropriate</span>
                </div>
              </SelectItem>
              <SelectItem value="formal">
                <div className="flex flex-col items-start">
                  <span>Formal</span>
                  <span className="text-xs text-gray-500">Professional and polished</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            This affects how the AI writes messages to your leads
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="emojis">Use Emojis</Label>
            <p className="text-sm text-gray-500">Include emojis in AI responses</p>
          </div>
          <Switch
            id="emojis"
            checked={useEmojis}
            onCheckedChange={setUseEmojis}
          />
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

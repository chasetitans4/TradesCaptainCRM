'use client';

import { useState, useEffect } from 'react';
import { Bot, BotOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AIPauseToggleProps {
  businessId: string;
}

export function AIPauseToggle({ businessId }: AIPauseToggleProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadState();
  }, [businessId]);

  async function loadState() {
    try {
      const res = await fetch(`/api/portal/ai-settings?businessId=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setIsPaused(data.aiPaused);
      }
    } catch (error) {
      console.error('Failed to load AI settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function togglePause(newState: boolean) {
    setToggling(true);
    try {
      const res = await fetch(`/api/portal/ai-settings?businessId=${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiPaused: newState }),
      });
      if (res.ok) {
        setIsPaused(newState);
      }
    } catch (error) {
      console.error('Failed to toggle AI pause:', error);
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (isPaused) {
    return (
      <Button
        variant="outline"
        onClick={() => togglePause(false)}
        disabled={toggling}
        className="border-orange-300 text-orange-700 hover:bg-orange-50"
      >
        {toggling ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <BotOff className="h-4 w-4 mr-2" />
        )}
        AI Paused - Click to Resume
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={toggling}>
          {toggling ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Bot className="h-4 w-4 mr-2" />
          )}
          AI Active
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pause AI Responses?</AlertDialogTitle>
          <AlertDialogDescription>
            When paused, you won&apos;t receive automatic AI responses to your messages.
            A team member will respond manually instead. This may result in longer response times.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep AI Active</AlertDialogCancel>
          <AlertDialogAction onClick={() => togglePause(true)}>
            Pause AI
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AIPauseToggle;

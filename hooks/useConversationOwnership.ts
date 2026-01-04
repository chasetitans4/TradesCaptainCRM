// =====================================================
// CONVERSATION OWNERSHIP HOOK
// Per Section 5.1 and 5.2 of Product Identity
// Handles ownership, claiming, and collision prevention
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ConversationOwnership {
  ownerId: string | null;
  ownerName: string | null;
  claimedBy: string | null;
  claimedByName: string | null;
  claimedAt: string | null;
  isClaimed: boolean;
  lastActivityAt: string | null;
}

export interface DraftState {
  content: string;
  savedAt: string;
}

export interface CollisionWarning {
  type: 'new_message' | 'claimed_by_other' | 'owner_changed';
  message: string;
  userId?: string;
  userName?: string;
  timestamp: string;
}

interface UseConversationOwnershipOptions {
  conversationId: string;
  conversationType: 'outreach' | 'leads_captain';
  currentUserId: string;
  currentUserName?: string;
  /** Called when another user sends a message while you're composing */
  onCollision?: (warning: CollisionWarning) => void;
  /** Auto-save draft interval in ms (default 5000) */
  draftSaveInterval?: number;
}

export function useConversationOwnership({
  conversationId,
  conversationType,
  currentUserId,
  currentUserName,
  onCollision,
  draftSaveInterval = 5000,
}: UseConversationOwnershipOptions) {
  const [ownership, setOwnership] = useState<ConversationOwnership | null>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');

  const supabase = createClient();

  // Fetch current ownership state
  const fetchOwnership = useCallback(async () => {
    try {
      const tableName = conversationType === 'outreach'
        ? 'outreach_conversations'
        : 'leads_captain_conversations_v2';

      const { data, error: fetchError } = await supabase
        .from(tableName)
        .select('owner_id, claimed_by, claimed_at, last_activity_at')
        .eq('id', conversationId)
        .single();

      if (fetchError) throw fetchError;

      // Check if claim is still valid (30 min expiry)
      const claimedAt = data?.claimed_at ? new Date(data.claimed_at) : null;
      const isClaimValid = claimedAt &&
        (new Date().getTime() - claimedAt.getTime()) < 30 * 60 * 1000;

      setOwnership({
        ownerId: data?.owner_id || null,
        ownerName: null, // Would need a join to get name
        claimedBy: isClaimValid ? data?.claimed_by : null,
        claimedByName: null,
        claimedAt: isClaimValid ? data?.claimed_at : null,
        isClaimed: !!isClaimValid && !!data?.claimed_by,
        lastActivityAt: data?.last_activity_at || null,
      });
    } catch (err) {
      console.error('Error fetching ownership:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ownership');
    } finally {
      setLoading(false);
    }
  }, [conversationId, conversationType, supabase]);

  // Fetch existing draft
  const fetchDraft = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('message_drafts')
        .select('content, updated_at')
        .eq('conversation_id', conversationId)
        .eq('conversation_type', conversationType)
        .eq('user_id', currentUserId)
        .single();

      if (data) {
        setDraft({
          content: data.content,
          savedAt: data.updated_at,
        });
        setDraftContent(data.content);
      }
    } catch {
      // No draft exists, that's fine
    }
  }, [conversationId, conversationType, currentUserId, supabase]);

  // Save draft
  const saveDraft = useCallback(async (content: string) => {
    if (!content.trim()) {
      // Delete draft if empty
      await supabase
        .from('message_drafts')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('conversation_type', conversationType)
        .eq('user_id', currentUserId);
      setDraft(null);
      return;
    }

    const now = new Date().toISOString();
    const { error: saveError } = await supabase
      .from('message_drafts')
      .upsert({
        conversation_id: conversationId,
        conversation_type: conversationType,
        user_id: currentUserId,
        content,
        updated_at: now,
      }, {
        onConflict: 'conversation_id,conversation_type,user_id',
      });

    if (!saveError) {
      setDraft({ content, savedAt: now });
    }
  }, [conversationId, conversationType, currentUserId, supabase]);

  // Claim conversation (Section 5.2)
  const claimConversation = useCallback(async (): Promise<boolean> => {
    try {
      const tableName = conversationType === 'outreach'
        ? 'outreach_conversations'
        : 'leads_captain_conversations_v2';

      // Check if already claimed by someone else
      const { data: current } = await supabase
        .from(tableName)
        .select('claimed_by, claimed_at')
        .eq('id', conversationId)
        .single();

      if (current?.claimed_by && current.claimed_by !== currentUserId) {
        const claimedAt = new Date(current.claimed_at);
        const isStillValid = (new Date().getTime() - claimedAt.getTime()) < 30 * 60 * 1000;

        if (isStillValid) {
          onCollision?.({
            type: 'claimed_by_other',
            message: 'This conversation is being handled by another team member.',
            userId: current.claimed_by,
            timestamp: new Date().toISOString(),
          });
          return false;
        }
      }

      // Claim it
      const { error: claimError } = await supabase
        .from(tableName)
        .update({
          claimed_by: currentUserId,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (claimError) throw claimError;

      await fetchOwnership();
      return true;
    } catch (err) {
      console.error('Error claiming conversation:', err);
      return false;
    }
  }, [conversationId, conversationType, currentUserId, supabase, onCollision, fetchOwnership]);

  // Release claim
  const releaseConversation = useCallback(async () => {
    try {
      const tableName = conversationType === 'outreach'
        ? 'outreach_conversations'
        : 'leads_captain_conversations_v2';

      await supabase
        .from(tableName)
        .update({
          claimed_by: null,
          claimed_at: null,
        })
        .eq('id', conversationId)
        .eq('claimed_by', currentUserId);

      await fetchOwnership();
    } catch (err) {
      console.error('Error releasing conversation:', err);
    }
  }, [conversationId, conversationType, currentUserId, supabase, fetchOwnership]);

  // Clear draft after sending
  const clearDraft = useCallback(async () => {
    await supabase
      .from('message_drafts')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('conversation_type', conversationType)
      .eq('user_id', currentUserId);
    setDraft(null);
    setDraftContent('');
  }, [conversationId, conversationType, currentUserId, supabase]);

  // Set up realtime subscription for collision detection
  useEffect(() => {
    const messagesTable = conversationType === 'outreach'
      ? 'outreach_messages'
      : 'leads_captain_messages_v2';

    const channel: RealtimeChannel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: messagesTable,
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as { actor_id?: string; direction?: string };

          // Check if someone else sent a message while we might be composing
          if (
            newMessage.direction === 'outbound' &&
            newMessage.actor_id &&
            newMessage.actor_id !== currentUserId &&
            draftContent.trim().length > 0
          ) {
            onCollision?.({
              type: 'new_message',
              message: 'Another team member just sent a message. Your draft has been preserved.',
              userId: newMessage.actor_id,
              timestamp: new Date().toISOString(),
            });
            // Refresh ownership
            fetchOwnership();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, conversationType, currentUserId, draftContent, supabase, onCollision, fetchOwnership]);

  // Auto-save draft periodically
  useEffect(() => {
    if (!draftContent.trim()) return;

    const timer = setTimeout(() => {
      saveDraft(draftContent);
    }, draftSaveInterval);

    return () => clearTimeout(timer);
  }, [draftContent, draftSaveInterval, saveDraft]);

  // Initial fetch
  useEffect(() => {
    fetchOwnership();
    fetchDraft();
  }, [fetchOwnership, fetchDraft]);

  return {
    ownership,
    draft,
    loading,
    error,
    draftContent,
    setDraftContent,
    saveDraft,
    clearDraft,
    claimConversation,
    releaseConversation,
    isOwnedByMe: ownership?.ownerId === currentUserId,
    isClaimedByMe: ownership?.claimedBy === currentUserId,
    isClaimedByOther: ownership?.isClaimed && ownership?.claimedBy !== currentUserId,
  };
}

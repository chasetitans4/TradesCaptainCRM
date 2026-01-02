'use client';

// =====================================================
// LEADS CAPTAIN v2 APPROVALS PAGE
// Review and approve AI-generated responses
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  Bot,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ApprovalQueueItem } from '@/types/nevermiss';

export default function LeadsCaptainApprovalsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ApprovalQueueItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ApprovalQueueItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApprovals();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchApprovals, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/nevermiss/v2/approvals');
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (item: ApprovalQueueItem, action: 'approve' | 'reject', editedContent?: string) => {
    try {
      setProcessing(true);
      const res = await fetch(`/api/nevermiss/v2/approvals/${item.message.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editedContent ? 'edit' : action,
          edited_content: editedContent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success(
        action === 'approve'
          ? editedContent
            ? 'Message edited and sent'
            : 'Message approved and sent'
          : 'Message rejected'
      );
      setEditDialogOpen(false);
      setSelectedItem(null);
      fetchApprovals();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process');
    } finally {
      setProcessing(false);
    }
  };

  const openEditDialog = (item: ApprovalQueueItem) => {
    setSelectedItem(item);
    setEditedContent(item.message.content);
    setEditDialogOpen(true);
  };

  const getTimeRemaining = (timeoutAt: string) => {
    const timeout = new Date(timeoutAt).getTime();
    const now = Date.now();
    const diff = timeout - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/nevermiss')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Approval Queue</h1>
            <p className="text-muted-foreground">
              Review AI responses before they're sent
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchApprovals}>
          Refresh
        </Button>
      </div>

      {/* Queue */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No pending approvals at the moment</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.message.id} className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {item.conversation.customer_name || item.conversation.customer_phone}
                    </span>
                    <Badge variant="outline">{item.conversation.customer_phone}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className={getTimeRemaining(item.timeout_at) === 'Expired' ? 'text-red-500' : ''}>
                      {getTimeRemaining(item.timeout_at)}
                    </span>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Bot className="h-3 w-3" />
                  AI generated • Confidence: {item.message.ai_confidence || 'N/A'}%
                  {item.message.detected_intent && (
                    <>
                      {' '}• Intent: {item.message.detected_intent}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Proposed Response */}
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm whitespace-pre-wrap">{item.message.content}</p>
                </div>

                {/* Decision Explanation */}
                {item.message.decision_explanation && (
                  <div className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{item.message.decision_explanation}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleAction(item, 'approve')}
                    disabled={processing}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve & Send
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openEditDialog(item)}
                    disabled={processing}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit & Send
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction(item, 'reject')}
                    disabled={processing}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/nevermiss/conversations?id=${item.conversation.id}`)}
                    className="ml-auto"
                  >
                    View Conversation
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Response</DialogTitle>
            <DialogDescription>
              Modify the message before sending to{' '}
              {selectedItem?.conversation.customer_name || selectedItem?.conversation.customer_phone}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={5}
              placeholder="Enter your message..."
            />
            <p className="text-xs text-muted-foreground">
              {editedContent.length} characters
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedItem && handleAction(selectedItem, 'approve', editedContent)}
              disabled={processing || !editedContent.trim()}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Edited Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

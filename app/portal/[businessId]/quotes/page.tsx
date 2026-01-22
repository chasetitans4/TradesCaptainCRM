'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

const portalEstimatesLogger = logger.child({ context: 'portal.estimates' });

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuoteComment {
  id: string;
  content: string;
  author_type: 'customer' | 'business';
  created_at: string;
}

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  approval_status?: 'pending' | 'approved' | 'declined' | 'changes_requested';
  total: number;
  valid_until?: string;
  created_at: string;
  items?: QuoteItem[];
  comments?: QuoteComment[];
  notes?: string;
}

export default function EstimatesPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  
  const [estimates, setEstimates] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog states
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [commentText, setCommentText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'approve' | 'decline' | 'comment' | null>(null);

  useEffect(() => {
    loadEstimates();
  }, [businessId]);

  async function loadEstimates() {
    try {
      const res = await fetch(`/api/portal/estimates?businessId=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setEstimates(data.estimates || []);
      }
    } catch (err) {
      portalEstimatesLogger.error({ msg: 'Failed to load estimates', error: err });
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(quoteId: string, action: 'approve' | 'decline' | 'comment') {
    setActionLoading(quoteId);
    try {
      let endpoint = `/api/portal/estimates/${quoteId}`;
      let body: any = {};

      if (action === 'comment') {
        endpoint += '/comments';
        body = { content: commentText };
      } else {
        // approve or decline
        body = { status: action === 'approve' ? 'approved' : 'declined', reason: commentText };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Failed to ${action} estimate`);

      setSuccessMsg(action === 'comment' ? 'Comment added' : `Estimate ${action}d successfully`);
      setDialogOpen(false);
      setCommentText('');
      await loadEstimates();
      
      setTimeout(() => setSuccessMsg(null), 3000);

    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600">Approved</Badge>;
      case 'declined': return <Badge variant="destructive">Declined</Badge>;
      case 'sent': 
      case 'viewed': return <Badge className="bg-blue-600">Pending Review</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const openDialog = (quote: Quote, type: 'approve' | 'decline' | 'comment') => {
    setSelectedQuote(quote);
    setDialogType(type);
    setDialogOpen(true);
    setCommentText('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimates & Approvals</h1>
          <p className="text-muted-foreground">Review and approve your service estimates.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : estimates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Estimates Found</h3>
            <p className="text-muted-foreground">You don't have any open estimates at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {estimates.map((quote) => (
            <Card key={quote.id} className="overflow-hidden border-l-4 border-l-blue-600">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-xl">Estimate #{quote.quote_number}</CardTitle>
                      {getStatusBadge(quote.status)}
                    </div>
                    <CardDescription>
                      Created on {format(new Date(quote.created_at), 'MMMM d, yyyy')}
                      {quote.valid_until && ` • Valid until ${format(new Date(quote.valid_until), 'MMM d, yyyy')}`}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">${quote.total.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-6">
                  <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Line Items</h4>
                  <div className="space-y-2">
                    {quote.items?.map((item) => (
                      <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
                        <div>
                          <span className="font-medium">{item.description}</span>
                          <div className="text-sm text-muted-foreground">Qty: {item.quantity} × ${item.unit_price.toFixed(2)}</div>
                        </div>
                        <div className="font-medium">${item.total.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {(quote.status === 'sent' || quote.status === 'viewed') && (
                  <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                    <Button 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => openDialog(quote, 'approve')}
                    >
                      <ThumbsUp className="mr-2 h-4 w-4" /> Approve Estimate
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      onClick={() => openDialog(quote, 'decline')}
                    >
                      <ThumbsDown className="mr-2 h-4 w-4" /> Decline
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={() => openDialog(quote, 'comment')}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" /> Ask Question / Request Changes
                    </Button>
                  </div>
                )}
                
                {quote.comments && quote.comments.length > 0 && (
                  <div className="mt-6 bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" /> Discussion History
                    </h4>
                    <div className="space-y-3">
                      {quote.comments.map((comment) => (
                        <div key={comment.id} className={`flex ${comment.author_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg p-3 ${
                            comment.author_type === 'customer' 
                              ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100' 
                              : 'bg-white text-gray-900 border dark:bg-gray-800 dark:text-gray-100'
                          }`}>
                            <p className="text-sm">{comment.content}</p>
                            <div className="text-xs opacity-70 mt-1">
                              {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'approve' && 'Approve Estimate'}
              {dialogType === 'decline' && 'Decline Estimate'}
              {dialogType === 'comment' && 'Add Comment / Request Changes'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'approve' && 'Are you sure you want to approve this estimate? Work will be scheduled shortly.'}
              {dialogType === 'decline' && 'Please let us know why you are declining this estimate.'}
              {dialogType === 'comment' && 'Send a message to our team regarding this estimate.'}
            </DialogDescription>
          </DialogHeader>
          
          {(dialogType === 'decline' || dialogType === 'comment') && (
            <div className="py-2">
              <Label htmlFor="comment">
                {dialogType === 'decline' ? 'Reason (Optional)' : 'Message'}
              </Label>
              <Textarea
                id="comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={dialogType === 'decline' ? "Price is too high..." : "Can we change..."}
                className="mt-2"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedQuote && dialogType && handleAction(selectedQuote.id, dialogType)}
              disabled={actionLoading === selectedQuote?.id}
              className={dialogType === 'approve' ? 'bg-green-600 hover:bg-green-700' : dialogType === 'decline' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {actionLoading === selectedQuote?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialogType === 'approve' && 'Confirm Approval'}
              {dialogType === 'decline' && 'Confirm Decline'}
              {dialogType === 'comment' && 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

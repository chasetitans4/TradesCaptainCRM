
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, ThumbsUp, MessageSquare, Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const portalFeedbackLogger = logger.child({ context: 'portal.feedback' });

interface Feedback {
  id: string;
  rating: number;
  comment: string | null;
  would_recommend: boolean;
  created_at: string;
  status: string;
}

export default function FeedbackPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  
  const [, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);

  useEffect(() => {
    loadFeedback();
  }, [businessId]);

  async function loadFeedback() {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/feedback?businessId=${businessId}`);
      if (!res.ok) throw new Error('Failed to load feedback history');
      const data = await res.json();
      setFeedbackHistory(data.feedback || []);
    } catch (err) {
      // Non-critical, just log
      portalFeedbackLogger.error({ msg: 'Load feedback error', error: err });
      setFeedbackHistory([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/portal/feedback?businessId=${businessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment,
          wouldRecommend
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSuccess(true);
      setRating(0);
      setComment('');
      setWouldRecommend(true);
      loadFeedback(); // Refresh list

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Feedback & Reviews</h1>
        <p className="text-muted-foreground">
          We value your opinion! Let us know how we did.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Write a Review
          </CardTitle>
          <CardDescription>
            Share your experience with our services.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Thank you! Your feedback has been submitted.</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2 py-2">
            <Label className="text-base">How would you rate us?</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 h-5">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comments (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Tell us what you liked or how we can improve..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>

          {/* Recommendation */}
          <div className="flex items-center justify-between border rounded-lg p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Recommendation</Label>
              <p className="text-sm text-gray-500">
                Would you recommend us to friends or family?
              </p>
            </div>
            <Switch
              checked={wouldRecommend}
              onCheckedChange={setWouldRecommend}
            />
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleSubmit} 
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit Feedback
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {feedbackHistory.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold px-1">Your Past Reviews</h3>
          {feedbackHistory.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-4 w-4",
                          star <= item.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(item.created_at)}</span>
                </div>
                
                {item.comment && (
                  <p className="text-gray-700 mt-2 whitespace-pre-wrap">{item.comment}</p>
                )}

                <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
                  {item.would_recommend ? (
                    <div className="flex items-center text-green-600 gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>Recommends</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Does not recommend</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

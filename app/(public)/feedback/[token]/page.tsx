'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Star,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { SENTIMENT_CONFIG, REVIEW_PLATFORM_CONFIG } from '@/types/reputation';

// =====================================================
// PUBLIC FEEDBACK PAGE
// Customers access this via the feedback URL in their SMS/email
// =====================================================

interface FeedbackData {
  id: string;
  status: string;
  customer: { name: string } | null;
  job: { service_type: string; completed_at: string } | null;
  proof_of_work: { url: string; short_url: string } | null;
  has_feedback: boolean;
  feedback_routing: {
    category: string;
    review_link_shown: boolean;
    review_link_clicked: boolean;
  } | null;
}

interface FeedbackRouting {
  category: string;
  showReviewLinks: boolean;
  reviewUrls?: Array<{ platform: string; url: string }>;
  recoveryNeeded: boolean;
}

export default function FeedbackPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FeedbackData | null>(null);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [routing, setRouting] = useState<FeedbackRouting | null>(null);

  // Load feedback request data
  useEffect(() => {
    if (!token) return;

    async function loadData() {
      try {
        const response = await fetch(`/api/reputation/feedback/${token}`);
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Unable to load feedback form');
          return;
        }

        setData(result);

        // If already submitted, show the result
        if (result.has_feedback && result.feedback_routing) {
          setSubmitted(true);
          setRouting({
            category: result.feedback_routing.category,
            showReviewLinks: result.feedback_routing.review_link_shown,
            recoveryNeeded: result.feedback_routing.category === 'negative',
          });
        }
      } catch {
        setError('Unable to load feedback form');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [token]);

  // Submit feedback
  async function handleSubmit() {
    if (rating === 0) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/reputation/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentiment_score: rating,
          feedback_text: feedbackText || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to submit feedback');
        return;
      }

      setSubmitted(true);
      setRouting(result.routing);
    } catch {
      setError('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  }

  // Track review click
  async function handleReviewClick(platform: string, url: string) {
    try {
      await fetch(`/api/reputation/feedback/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, url }),
      });
    } catch {
      // Silently fail - don't block the user
    }

    // Open review link
    window.open(url, '_blank');
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Unable to Load</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Thank you state after submission
  if (submitted && routing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            {routing.showReviewLinks && routing.reviewUrls && routing.reviewUrls.length > 0 ? (
              // Positive feedback - show review links
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
                <p className="text-muted-foreground mb-6">
                  We're thrilled you had a great experience. Would you mind sharing
                  your feedback on one of these platforms? It really helps other
                  homeowners find us.
                </p>

                <div className="space-y-3">
                  {routing.reviewUrls.map((review) => (
                    <Button
                      key={review.platform}
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => handleReviewClick(review.platform, review.url)}
                    >
                      <span className="flex items-center gap-2">
                        {REVIEW_PLATFORM_CONFIG[review.platform as keyof typeof REVIEW_PLATFORM_CONFIG]?.label || review.platform}
                      </span>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  ))}
                </div>
              </div>
            ) : routing.recoveryNeeded ? (
              // Negative feedback - recovery message
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">We Hear You</h2>
                <p className="text-muted-foreground">
                  We're sorry your experience wasn't what you expected. Someone from
                  our team will reach out to you within 24 hours to make this right.
                </p>
              </div>
            ) : (
              // Neutral feedback
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
                <p className="text-muted-foreground">
                  We appreciate you taking the time to share your feedback.
                </p>
              </div>
            )}

            {/* PoW link if available */}
            {data?.proof_of_work && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground text-center mb-2">
                  View your verified service record:
                </p>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => window.open(data.proof_of_work?.url, '_blank')}
                >
                  View Proof of Work
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Feedback form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">How was your experience?</CardTitle>
          <CardDescription>
            {data?.customer?.name && `Hi ${data.customer.name}! `}
            We'd love to hear about your recent{' '}
            {data?.job?.service_type?.toLowerCase() || 'service'}.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Star rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Rating label */}
          {rating > 0 && (
            <p className="text-center text-sm font-medium">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          )}

          {/* Optional feedback text */}
          <div>
            <label
              htmlFor="feedback"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Any additional comments? (optional)
            </label>
            <Textarea
              id="feedback"
              placeholder="Tell us more about your experience..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>

          {/* PoW link if available */}
          {data?.proof_of_work && (
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => window.open(data.proof_of_work?.url, '_blank')}
              >
                View your service record
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

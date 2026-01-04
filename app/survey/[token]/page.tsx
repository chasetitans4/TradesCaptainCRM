'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useParams } from 'next/navigation';

interface SurveyData {
  id: string;
  status: string;
  customerName: string;
  businessName: string;
  jobTitle?: string;
}

export default function SurveyPage() {
  const params = useParams();
  const token = params.token as string;

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showGoogleReview, setShowGoogleReview] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');

  const [ratings, setRatings] = useState({
    overall: 0,
    service: 0,
    technician: 0,
    communication: 0,
    value: 0,
  });
  const [feedback, setFeedback] = useState({
    whatWentWell: '',
    whatCouldImprove: '',
    additionalComments: '',
  });
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSurvey = useCallback(async () => {
    try {
      const response = await fetch(`/api/surveys/${token}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Survey not found or has expired.');
        } else {
          setError('Failed to load survey.');
        }
        return;
      }

      const data = await response.json();
      setSurvey(data);

      if (data.status === 'completed') {
        setSubmitted(true);
      }
    } catch (_err) {
      setError('Failed to load survey.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSurvey();
  }, [loadSurvey]);

  const handleSubmit = async () => {
    if (ratings.overall === 0) {
      alert('Please provide an overall rating');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/surveys/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallRating: ratings.overall,
          serviceQuality: ratings.service || undefined,
          technicianRating: ratings.technician || undefined,
          communicationRating: ratings.communication || undefined,
          valueRating: ratings.value || undefined,
          whatWentWell: feedback.whatWentWell || undefined,
          whatCouldImprove: feedback.whatCouldImprove || undefined,
          additionalComments: feedback.additionalComments || undefined,
          npsScore: npsScore ?? undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit');

      const result = await response.json();
      setSubmitted(true);

      if (result.showGoogleReview) {
        setShowGoogleReview(true);
        setGoogleReviewUrl(result.googleReviewUrl);
      }
    } catch (_err) {
      alert('Failed to submit survey. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleReviewClick = async () => {
    // Track the click
    try {
      await fetch(`/api/surveys/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'googleReviewClicked' }),
      });
    } catch (_err) {
      // Ignore tracking errors
    }

    window.open(googleReviewUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Oops!</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-6">
              We appreciate your feedback. Your response helps us improve our service.
            </p>

            {showGoogleReview && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm mb-4">
                  We're glad you had a great experience! Would you mind sharing your feedback on Google?
                </p>
                <Button onClick={handleGoogleReviewClick}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Leave a Google Review
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{survey?.businessName}</CardTitle>
            <CardDescription>
              Hi {survey?.customerName}, we'd love to hear about your experience
              {survey?.jobTitle && ` with "${survey.jobTitle}"`}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Overall Rating */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How would you rate your overall experience?</CardTitle>
          </CardHeader>
          <CardContent>
            <StarRating
              value={ratings.overall}
              onChange={(v) => setRatings({ ...ratings, overall: v })}
              size="large"
            />
          </CardContent>
        </Card>

        {/* Detailed Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rate specific aspects (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Quality of Service</Label>
              <StarRating
                value={ratings.service}
                onChange={(v) => setRatings({ ...ratings, service: v })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Technician Professionalism</Label>
              <StarRating
                value={ratings.technician}
                onChange={(v) => setRatings({ ...ratings, technician: v })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Communication</Label>
              <StarRating
                value={ratings.communication}
                onChange={(v) => setRatings({ ...ratings, communication: v })}
              />
            </div>
            <div>
              <Label className="mb-2 block">Value for Money</Label>
              <StarRating
                value={ratings.value}
                onChange={(v) => setRatings({ ...ratings, value: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* NPS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              How likely are you to recommend us to a friend or colleague?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => setNpsScore(score)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    npsScore === score
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Not at all likely</span>
              <span>Extremely likely</span>
            </div>
          </CardContent>
        </Card>

        {/* Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Feedback (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">What went well?</Label>
              <Textarea
                value={feedback.whatWentWell}
                onChange={(e) => setFeedback({ ...feedback, whatWentWell: e.target.value })}
                placeholder="Tell us what you liked about our service..."
              />
            </div>
            <div>
              <Label className="mb-2 block">What could we improve?</Label>
              <Textarea
                value={feedback.whatCouldImprove}
                onChange={(e) => setFeedback({ ...feedback, whatCouldImprove: e.target.value })}
                placeholder="Let us know how we can do better..."
              />
            </div>
            <div>
              <Label className="mb-2 block">Additional Comments</Label>
              <Textarea
                value={feedback.additionalComments}
                onChange={(e) => setFeedback({ ...feedback, additionalComments: e.target.value })}
                placeholder="Any other feedback you'd like to share..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || ratings.overall === 0}
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </div>
    </div>
  );
}

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  size?: 'normal' | 'large';
}

function StarRating({ value, onChange, size = 'normal' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const starSize = size === 'large' ? 'h-10 w-10' : 'h-6 w-6';

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="focus:outline-none"
        >
          <Star
            className={`${starSize} transition-colors ${
              star <= (hovered || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

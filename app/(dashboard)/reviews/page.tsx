'use client';

import { useEffect, useState } from 'react';
import {
  Star,
  MessageSquare,
  Send,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Loader2,
  Filter,
  Search,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AvatarRoot, AvatarFallback } from '@/components/ui/avatar';

interface Review {
  id: string;
  customer_id: string;
  job_id?: string;
  platform: 'google' | 'facebook' | 'yelp' | 'internal' | 'other';
  rating: number;
  review_text?: string;
  reviewer_name: string;
  review_date: string;
  response_text?: string;
  response_date?: string;
  is_verified: boolean;
  status: 'new' | 'responded' | 'flagged' | 'hidden';
  customer?: {
    name: string;
    email?: string;
  };
  job?: {
    service_type: string;
  };
}

interface ReviewRequest {
  id: string;
  customer_id: string;
  job_id?: string;
  sent_at: string;
  opened_at?: string;
  completed_at?: string;
  platform_clicked?: string;
  status: 'pending' | 'sent' | 'opened' | 'completed' | 'expired';
  customer?: {
    name: string;
    email?: string;
  };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [reviewsRes, requestsRes] = await Promise.all([
        fetch('/api/reviews'),
        fetch('/api/reviews/requests'),
      ]);

      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        setReviews(data.reviews || []);
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load reviews data');
    } finally {
      setLoading(false);
    }
  }

  const openResponseDialog = (review: Review) => {
    setSelectedReview(review);
    setResponseText(review.response_text || '');
    setIsResponseDialogOpen(true);
  };

  const handleSaveResponse = async () => {
    if (!selectedReview) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/reviews/${selectedReview.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_text: responseText }),
      });

      if (!response.ok) {
        throw new Error('Failed to save response');
      }

      setIsResponseDialogOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (reviewId: string, status: string) => {
    try {
      await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadData();
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const handleSendReviewRequest = async (customerId: string, jobId?: string) => {
    try {
      await fetch('/api/reviews/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, job_id: jobId }),
      });
      loadData();
    } catch (error) {
      console.error('Error sending request:', error);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      google: 'bg-blue-100 text-blue-800',
      facebook: 'bg-indigo-100 text-indigo-800',
      yelp: 'bg-red-100 text-red-800',
      internal: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={colors[platform] || colors.other}>
        {platform.charAt(0).toUpperCase() + platform.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'responded':
        return <Badge className="bg-green-100 text-green-800">Responded</Badge>;
      case 'flagged':
        return <Badge className="bg-red-100 text-red-800">Flagged</Badge>;
      case 'hidden':
        return <Badge variant="secondary">Hidden</Badge>;
      default:
        return <Badge variant="outline">New</Badge>;
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    if (filterPlatform !== 'all' && review.platform !== filterPlatform) return false;
    if (filterRating !== 'all' && review.rating !== parseInt(filterRating)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        review.reviewer_name.toLowerCase().includes(query) ||
        review.review_text?.toLowerCase().includes(query) ||
        review.customer?.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats calculations
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const positiveReviews = reviews.filter((r) => r.rating >= 4).length;
  const negativeReviews = reviews.filter((r) => r.rating <= 2).length;
  const pendingResponses = reviews.filter(
    (r) => r.status === 'new' && !r.response_text
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-muted-foreground">
            Monitor and respond to customer reviews across all platforms
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <ThumbsUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{positiveReviews}</p>
                <p className="text-sm text-muted-foreground">Positive (4-5 stars)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <ThumbsDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{negativeReviews}</p>
                <p className="text-sm text-muted-foreground">Negative (1-2 stars)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingResponses}</p>
                <p className="text-sm text-muted-foreground">Needs Response</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="requests">Review Requests ({requests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="yelp">Yelp</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRating} onValueChange={setFilterRating}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reviews List */}
          {filteredReviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No reviews found</h3>
                <p className="text-muted-foreground">
                  {reviews.length === 0
                    ? 'Reviews will appear here as customers leave feedback'
                    : 'Try adjusting your filters'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <AvatarRoot>
                        <AvatarFallback>
                          {review.reviewer_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                        </AvatarFallback>
                      </AvatarRoot>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{review.reviewer_name}</p>
                              {getPlatformBadge(review.platform)}
                              {getStatusBadge(review.status)}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {renderStars(review.rating)}
                              <span className="text-sm text-muted-foreground">
                                {new Date(review.review_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openResponseDialog(review)}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                {review.response_text ? 'Edit Response' : 'Respond'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(review.id, 'flagged')}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Flag Review
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(review.id, 'hidden')}
                              >
                                Hide Review
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {review.review_text && (
                          <p className="mt-3 text-sm">{review.review_text}</p>
                        )}

                        {review.job && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Service: {review.job.service_type}
                          </p>
                        )}

                        {/* Response */}
                        {review.response_text && (
                          <div className="mt-4 p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">
                              Your Response (
                              {review.response_date
                                ? new Date(review.response_date).toLocaleDateString()
                                : 'Draft'}
                              )
                            </p>
                            <p className="text-sm">{review.response_text}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-4">
                          {!review.response_text && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openResponseDialog(review)}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Respond
                            </Button>
                          )}
                          {review.platform !== 'internal' && (
                            <Button size="sm" variant="ghost">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View on {review.platform}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-1">No review requests</h3>
                <p className="text-muted-foreground">
                  Review requests will appear here when you send them to customers
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <AvatarRoot>
                          <AvatarFallback>
                            {request.customer?.name
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase() || 'C'}
                          </AvatarFallback>
                        </AvatarRoot>
                        <div>
                          <p className="font-medium">
                            {request.customer?.name || 'Unknown Customer'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {request.customer?.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge
                            variant={
                              request.status === 'completed'
                                ? 'default'
                                : request.status === 'opened'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sent {new Date(request.sent_at).toLocaleDateString()}
                          </p>
                        </div>
                        {request.platform_clicked && (
                          <Badge variant="outline">{request.platform_clicked}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              {/* Original Review */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-medium">{selectedReview.reviewer_name}</p>
                  {renderStars(selectedReview.rating)}
                </div>
                {selectedReview.review_text && (
                  <p className="text-sm">{selectedReview.review_text}</p>
                )}
              </div>

              {/* Response */}
              <div className="space-y-2">
                <Label>Your Response</Label>
                <Textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write a professional response..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  This response will be visible publicly on the review platform
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResponseDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveResponse} disabled={saving || !responseText.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

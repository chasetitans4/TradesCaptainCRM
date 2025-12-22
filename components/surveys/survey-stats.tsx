'use client';

import { useState, useEffect } from 'react';
import { Star, TrendingUp, Users, ThumbsUp, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface SurveyStats {
  totalSent: number;
  totalCompleted: number;
  completionRate: number;
  averageRating: number;
  averageNps: number;
  googleReviewClicks: number;
  ratingDistribution: Record<number, number>;
}

interface SurveyStatsProps {
  initialStats?: SurveyStats;
  days?: number;
}

export function SurveyStats({ initialStats, days = 30 }: SurveyStatsProps) {
  const [stats, setStats] = useState<SurveyStats | null>(initialStats || null);
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    if (!initialStats) {
      loadStats();
    }
  }, [days]);

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/surveys?stats=true&days=${days}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load survey stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const getNpsLabel = (nps: number) => {
    if (nps >= 50) return { label: 'Excellent', color: 'text-green-600' };
    if (nps >= 0) return { label: 'Good', color: 'text-blue-600' };
    return { label: 'Needs Improvement', color: 'text-yellow-600' };
  };

  const npsInfo = getNpsLabel(stats.averageNps);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCompleted} of {stats.totalSent} surveys completed
            </p>
            <Progress value={stats.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {stats.averageRating}
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {stats.totalCompleted} responses
            </p>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(stats.averageRating)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${npsInfo.color}`}>
              {stats.averageNps > 0 ? '+' : ''}{stats.averageNps}
            </div>
            <p className="text-xs text-muted-foreground">{npsInfo.label}</p>
            <Badge variant="outline" className="mt-2">
              Net Promoter Score
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Google Reviews</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.googleReviewClicks}</div>
            <p className="text-xs text-muted-foreground">
              Customers clicked to leave a Google review
            </p>
            {stats.totalCompleted > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((stats.googleReviewClicks / stats.totalCompleted) * 100)}% conversion
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingDistribution[rating] || 0;
              const percentage = stats.totalCompleted > 0
                ? Math.round((count / stats.totalCompleted) * 100)
                : 0;

              return (
                <div key={rating} className="flex items-center gap-4">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <div className="w-16 text-right text-sm text-muted-foreground">
                    {count} ({percentage}%)
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Clock,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  DollarSign,
  Wrench,
  Star,
  Send,
  Calendar,
  User,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { format, formatDistanceToNow } from 'date-fns';

type ActivityType =
  | 'note_added'
  | 'call_logged'
  | 'email_sent'
  | 'sms_sent'
  | 'quote_created'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_declined'
  | 'job_created'
  | 'job_scheduled'
  | 'job_started'
  | 'job_completed'
  | 'invoice_created'
  | 'invoice_sent'
  | 'payment_received'
  | 'review_requested'
  | 'survey_completed'
  | 'document_uploaded'
  | 'appointment_scheduled';

interface Activity {
  id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  user?: { full_name: string };
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface CustomerTimelineProps {
  customerId: string;
  initialActivities?: Activity[];
  readOnly?: boolean;
}

const activityIcons: Record<ActivityType, React.ReactNode> = {
  note_added: <MessageSquare className="h-4 w-4" />,
  call_logged: <Phone className="h-4 w-4" />,
  email_sent: <Mail className="h-4 w-4" />,
  sms_sent: <Send className="h-4 w-4" />,
  quote_created: <FileText className="h-4 w-4" />,
  quote_sent: <Send className="h-4 w-4" />,
  quote_accepted: <FileText className="h-4 w-4 text-green-500" />,
  quote_declined: <FileText className="h-4 w-4 text-red-500" />,
  job_created: <Wrench className="h-4 w-4" />,
  job_scheduled: <Calendar className="h-4 w-4" />,
  job_started: <Wrench className="h-4 w-4 text-blue-500" />,
  job_completed: <Wrench className="h-4 w-4 text-green-500" />,
  invoice_created: <DollarSign className="h-4 w-4" />,
  invoice_sent: <Send className="h-4 w-4" />,
  payment_received: <DollarSign className="h-4 w-4 text-green-500" />,
  review_requested: <Star className="h-4 w-4" />,
  survey_completed: <Star className="h-4 w-4 text-yellow-500" />,
  document_uploaded: <FileText className="h-4 w-4" />,
  appointment_scheduled: <Calendar className="h-4 w-4" />,
};

const activityColors: Record<ActivityType, string> = {
  note_added: 'bg-blue-100 text-blue-600',
  call_logged: 'bg-green-100 text-green-600',
  email_sent: 'bg-purple-100 text-purple-600',
  sms_sent: 'bg-indigo-100 text-indigo-600',
  quote_created: 'bg-orange-100 text-orange-600',
  quote_sent: 'bg-orange-100 text-orange-600',
  quote_accepted: 'bg-green-100 text-green-600',
  quote_declined: 'bg-red-100 text-red-600',
  job_created: 'bg-blue-100 text-blue-600',
  job_scheduled: 'bg-cyan-100 text-cyan-600',
  job_started: 'bg-blue-100 text-blue-600',
  job_completed: 'bg-green-100 text-green-600',
  invoice_created: 'bg-yellow-100 text-yellow-600',
  invoice_sent: 'bg-yellow-100 text-yellow-600',
  payment_received: 'bg-green-100 text-green-600',
  review_requested: 'bg-purple-100 text-purple-600',
  survey_completed: 'bg-yellow-100 text-yellow-600',
  document_uploaded: 'bg-gray-100 text-gray-600',
  appointment_scheduled: 'bg-cyan-100 text-cyan-600',
};

export function CustomerTimeline({
  customerId,
  initialActivities = [],
  readOnly = false,
}: CustomerTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialActivities.length >= 50);
  const { toast } = useToast();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          note: newNote.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to add note');

      // Refresh activities
      await loadActivities();

      setNewNote('');
      setShowNoteInput(false);
      toast({ title: 'Note added' });
    } catch (error) {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const loadActivities = async (offset: number = 0) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/activity?customerId=${customerId}&limit=50&offset=${offset}`
      );
      if (!response.ok) throw new Error('Failed to load activities');

      const data = await response.json();

      if (offset === 0) {
        setActivities(data);
      } else {
        setActivities([...activities, ...data]);
      }

      setHasMore(data.length >= 50);
    } catch (error) {
      toast({ title: 'Failed to load activities', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    loadActivities(activities.length);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={() => setShowNoteInput(!showNoteInput)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Note Input */}
        {showNoteInput && (
          <div className="mb-6 space-y-2">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this customer..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNoteInput(false);
                  setNewNote('');
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddNote} disabled={submitting || !newNote.trim()}>
                {submitting ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No activity recorded yet
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="relative flex gap-4 pl-10">
                  {/* Icon */}
                  <div
                    className={`absolute left-0 p-2 rounded-full ${
                      activityColors[activity.activity_type] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {activityIcons[activity.activity_type] || <Clock className="h-4 w-4" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </time>
                    </div>

                    {/* Metadata */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {activity.metadata.amount && (
                          <Badge variant="outline">
                            ${activity.metadata.amount.toLocaleString()}
                          </Badge>
                        )}
                        {activity.metadata.rating && (
                          <Badge variant="outline">
                            {activity.metadata.rating} stars
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* User & Timestamp */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {activity.user && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {activity.user.full_name}
                        </span>
                      )}
                      <span>{format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mic, Square, Loader2, SkipForward, Check } from 'lucide-react';

interface VoiceNoteRecorderProps {
  jobId: string;
  onComplete: (recorded: boolean) => void;
  onSkip: () => void;
  maxDuration?: number; // seconds, default 90
}

export function VoiceNoteRecorder({
  jobId,
  onComplete,
  onSkip,
  maxDuration = 90,
}: VoiceNoteRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunks.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      recorder.start(1000); // Collect data every second
      mediaRecorder.current = recorder;
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Microphone Access Denied',
        description: 'Please allow microphone access to record voice notes.',
        variant: 'destructive',
      });
    }
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  }, []);

  // Upload voice note
  const uploadVoiceNote = async () => {
    if (!audioBlob) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('jobId', jobId);
      formData.append('audioFile', audioBlob, 'voice-note.webm');
      formData.append('duration', duration.toString());

      const response = await fetch('/api/technician/voice-note', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      onComplete(true);
    } catch (error) {
      console.error('Error uploading voice note:', error);
      toast({
        title: 'Upload Failed',
        description: 'Could not save voice note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle record/stop button
  const handleRecordButton = () => {
    if (isRecording) {
      stopRecording();
    } else if (audioBlob) {
      // Re-record
      setAudioBlob(null);
      setDuration(0);
      startRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center py-4">
      {/* Recording visualization */}
      <div
        className={cn(
          'relative mb-6 w-32 h-32 rounded-full flex items-center justify-center transition-all',
          isRecording
            ? 'bg-danger/10 animate-pulse'
            : audioBlob
            ? 'bg-success/10'
            : 'bg-muted'
        )}
      >
        {/* Progress ring for recording */}
        {isRecording && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
            <circle
              cx="64"
              cy="64"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={`${(duration / maxDuration) * 377} 377`}
              className="text-danger"
            />
          </svg>
        )}

        {/* Record button */}
        <button
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all',
            isRecording
              ? 'bg-danger text-white scale-90'
              : audioBlob
              ? 'bg-success text-white'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          onClick={handleRecordButton}
          disabled={isUploading}
          aria-label={
            isRecording
              ? 'Stop recording'
              : audioBlob
              ? 'Record again'
              : 'Start recording'
          }
        >
          {isRecording ? (
            <Square className="h-6 w-6" fill="currentColor" />
          ) : audioBlob ? (
            <Check className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </button>
      </div>

      {/* Duration display */}
      <div className="text-2xl font-mono mb-2">
        {formatDuration(duration)} / {formatDuration(maxDuration)}
      </div>

      {/* Status text */}
      <p className="text-sm text-text-muted mb-6">
        {isRecording
          ? 'Recording... tap to stop'
          : audioBlob
          ? 'Ready to save'
          : 'Tap to record'}
      </p>

      {/* Action buttons */}
      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          className="flex-1 h-12"
          onClick={onSkip}
          disabled={isRecording || isUploading}
        >
          <SkipForward className="h-5 w-5 mr-2" />
          Skip
        </Button>

        {audioBlob && (
          <Button
            className="flex-1 h-12"
            onClick={uploadVoiceNote}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Save Note
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

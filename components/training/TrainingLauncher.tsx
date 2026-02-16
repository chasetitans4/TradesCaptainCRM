'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTrainingContext } from './TrainingProvider';
import { getCourse, getCoursesForRole } from '@/lib/training/content';
import { GraduationCap, PlayCircle, Clock, CheckCircle2 } from 'lucide-react';
import type { TrainingCourse } from '@/types/training';

// =====================================================
// TRAINING LAUNCHER BUTTON
// =====================================================

interface TrainingLauncherButtonProps {
  courseId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function TrainingLauncherButton({
  courseId,
  variant = 'outline',
  size = 'sm',
  className,
}: TrainingLauncherButtonProps) {
  const { start, isActive } = useTrainingContext();
  const course = getCourse(courseId);

  if (!course) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => start(courseId)}
      disabled={isActive}
      className={className}
    >
      <GraduationCap className="w-4 h-4 mr-2" />
      Start Training
    </Button>
  );
}

// =====================================================
// TRAINING COURSE CARD
// =====================================================

interface TrainingCourseCardProps {
  course: TrainingCourse;
  isCompleted?: boolean;
  onStart: (courseId: string) => void;
  disabled?: boolean;
}

export function TrainingCourseCard({
  course,
  isCompleted = false,
  onStart,
  disabled = false,
}: TrainingCourseCardProps) {
  return (
    <div
      className={`p-4 border rounded-lg transition-colors ${
        isCompleted
          ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
          : 'bg-card border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-foreground">{course.title}</h3>
            {isCompleted && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {course.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {course.estimatedMinutes} min
            </span>
            <span>
              {course.modules.length} module{course.modules.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <Button
          variant={isCompleted ? 'outline' : 'default'}
          size="sm"
          onClick={() => onStart(course.id)}
          disabled={disabled}
        >
          <PlayCircle className="w-4 h-4 mr-1" />
          {isCompleted ? 'Replay' : 'Start'}
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// TRAINING MENU DIALOG
// =====================================================

interface TrainingMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: string;
}

export function TrainingMenuDialog({
  open,
  onOpenChange,
  userRole = 'owner',
}: TrainingMenuDialogProps) {
  const { start, isActive, progress } = useTrainingContext();
  const courses = getCoursesForRole(userRole);

  const handleStart = (courseId: string) => {
    onOpenChange(false);
    start(courseId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Training Center
          </DialogTitle>
          <DialogDescription>
            Learn how to use Trades Captain with interactive training guides.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No training courses available for your role.
            </p>
          ) : (
            courses.map((course) => {
              const completedModules = progress.getCompletedModules(course.id);
              const isCompleted = completedModules.length === course.modules.length;

              return (
                <TrainingCourseCard
                  key={course.id}
                  course={course}
                  isCompleted={isCompleted}
                  onStart={handleStart}
                  disabled={isActive}
                />
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =====================================================
// HELP MENU TRAINING LINK
// =====================================================

interface HelpMenuTrainingLinkProps {
  userRole?: string;
}

export function HelpMenuTrainingLink({ userRole = 'owner' }: HelpMenuTrainingLinkProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-muted rounded-md transition-colors"
      >
        <GraduationCap className="w-4 h-4" />
        Training Center
      </button>

      <TrainingMenuDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userRole={userRole}
      />
    </>
  );
}

// =====================================================
// CONTEXTUAL TRAINING PROMPT
// =====================================================

interface ContextualTrainingPromptProps {
  courseId: string;
  title?: string;
  description?: string;
  onDismiss?: () => void;
  onNeverShow?: () => void;
}

export function ContextualTrainingPrompt({
  courseId,
  title,
  description,
  onDismiss,
  onNeverShow,
}: ContextualTrainingPromptProps) {
  const { start, isActive } = useTrainingContext();
  const course = getCourse(courseId);

  if (!course) return null;

  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1">
          <h4 className="font-medium text-foreground mb-1">
            {title || `New to ${course.title}?`}
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            {description || `Take a quick ${course.estimatedMinutes}-minute tour to get set up.`}
          </p>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => start(courseId)}
              disabled={isActive}
            >
              Start Training
            </Button>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
              >
                Maybe Later
              </Button>
            )}
          </div>

          {onNeverShow && (
            <button
              onClick={onNeverShow}
              className="text-xs text-muted-foreground hover:text-foreground mt-2 block"
            >
              Don't show this again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

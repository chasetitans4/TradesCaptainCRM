'use client';

// =====================================================
// BEGINNER'S GUIDE TO THE CRM
// Day-by-day onboarding guide for new users
// Version: 1.0
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Calendar,
  Users,
  ClipboardList,
  Bell,
  BarChart3,
  Smartphone,
  Target,
  DollarSign,
  FileText,
  Lightbulb,
  ArrowRight,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Phone,
  Mail,
} from 'lucide-react';

interface DayGuide {
  day: number;
  title: string;
  description: string;
  icon: React.ElementType;
  tasks: {
    id: string;
    title: string;
    description: string;
    duration: string;
    href?: string;
  }[];
}

const DAY_GUIDES: DayGuide[] = [
  {
    day: 1,
    title: 'Get Oriented',
    description: 'Log in and explore your new CRM',
    icon: Target,
    tasks: [
      {
        id: 'explore-dashboard',
        title: 'Explore the Dashboard',
        description: 'See your stats, leads, and tasks at a glance. This is your home base.',
        duration: '5 min',
        href: '/dashboard',
      },
      {
        id: 'understand-sections',
        title: 'Understand Each Section',
        description: 'New Leads, Scheduled Jobs, Revenue, and Tasks - know what each means.',
        duration: '5 min',
      },
      {
        id: 'check-settings',
        title: 'Review Your Settings',
        description: 'Make sure your business name, phone, and email are correct.',
        duration: '5 min',
        href: '/settings',
      },
    ],
  },
  {
    day: 2,
    title: 'Add Your First Lead',
    description: 'Start tracking potential customers',
    icon: Users,
    tasks: [
      {
        id: 'add-first-lead',
        title: 'Add a Lead',
        description: 'Enter name, phone, and what they need. Even a test lead works!',
        duration: '2 min',
        href: '/leads/new',
      },
      {
        id: 'add-details',
        title: 'Add Notes and Details',
        description: 'Include everything you know - service needed, address, urgency.',
        duration: '3 min',
      },
      {
        id: 'understand-sources',
        title: 'Set the Lead Source',
        description: 'Where did they find you? This helps track what marketing works.',
        duration: '1 min',
      },
    ],
  },
  {
    day: 3,
    title: 'Use the Pipeline',
    description: 'Track leads through your sales process',
    icon: ClipboardList,
    tasks: [
      {
        id: 'view-pipeline',
        title: 'View Your Pipeline',
        description: 'See the visual stages: New → Contacted → Quoted → Scheduled → Complete → Paid',
        duration: '3 min',
        href: '/leads',
      },
      {
        id: 'move-lead',
        title: 'Move a Lead',
        description: 'Click a lead and update their status as things progress.',
        duration: '2 min',
      },
      {
        id: 'understand-stages',
        title: 'Understand Each Stage',
        description: 'Know when to move leads and what each stage means for your business.',
        duration: '5 min',
      },
    ],
  },
  {
    day: 4,
    title: 'Go Mobile',
    description: 'Install the app and work from anywhere',
    icon: Smartphone,
    tasks: [
      {
        id: 'download-app',
        title: 'Download the App',
        description: 'Get TradesCaptain from the App Store or Google Play.',
        duration: '3 min',
      },
      {
        id: 'login-mobile',
        title: 'Log In on Mobile',
        description: 'Use the same email and password as the web.',
        duration: '1 min',
      },
      {
        id: 'try-mobile',
        title: 'Try Adding a Lead on Mobile',
        description: 'Add a lead while on the go - this is how you will use it most!',
        duration: '2 min',
      },
    ],
  },
  {
    day: 5,
    title: 'Set Up Notifications',
    description: 'Never miss an important update',
    icon: Bell,
    tasks: [
      {
        id: 'enable-notifications',
        title: 'Enable Push Notifications',
        description: 'Get notified when new leads come in or customers reply.',
        duration: '2 min',
        href: '/settings',
      },
      {
        id: 'choose-alerts',
        title: 'Choose Your Alerts',
        description: 'Pick what you want to be notified about - new leads, reminders, etc.',
        duration: '3 min',
      },
      {
        id: 'test-notification',
        title: 'Test a Notification',
        description: 'Make sure they are working on your phone.',
        duration: '1 min',
      },
    ],
  },
  {
    day: 6,
    title: 'Review Your Progress',
    description: 'Check your first week of tracking',
    icon: BarChart3,
    tasks: [
      {
        id: 'check-stats',
        title: 'Check Your Stats',
        description: 'See how many leads you added and contacted.',
        duration: '3 min',
        href: '/reports',
      },
      {
        id: 'identify-gaps',
        title: 'Identify Any Gaps',
        description: 'Are there leads you forgot to follow up with?',
        duration: '5 min',
      },
      {
        id: 'contact-stale',
        title: 'Contact Stale Leads',
        description: 'Reach out to anyone who has been waiting too long.',
        duration: '10 min',
      },
    ],
  },
  {
    day: 7,
    title: 'Build the Habit',
    description: 'Establish your daily CRM routine',
    icon: Calendar,
    tasks: [
      {
        id: 'morning-routine',
        title: 'Morning Check (2 min)',
        description: 'Check dashboard for new leads, review scheduled jobs, see tasks due today.',
        duration: '2 min',
        href: '/dashboard',
      },
      {
        id: 'during-day',
        title: 'During the Day',
        description: 'Add new leads immediately. Update job status after each job.',
        duration: 'Ongoing',
      },
      {
        id: 'end-of-day',
        title: 'End of Day (2 min)',
        description: 'Ensure all new leads contacted. Schedule follow-ups for tomorrow.',
        duration: '2 min',
      },
    ],
  },
];

const GOLDEN_RULES = [
  { rule: 'Add Every Lead', description: 'Even if they seem like a long shot. You never know.' },
  { rule: 'Add Leads Immediately', description: 'While on the phone or right after. Details fade fast.' },
  { rule: 'Contact Within 24 Hours', description: 'Speed wins. First contractor to respond usually gets the job.' },
  { rule: 'Update Status Every Time', description: 'Pipeline only helps if it is accurate.' },
  { rule: 'Check Dashboard Every Morning', description: '5 minutes prevents leads from falling through cracks.' },
];

const COMMON_TASKS = [
  { task: 'Add a Lead', steps: 'Click "+ Add Lead" → Enter name and phone → Enter what they need → Save' },
  { task: 'Send an Estimate', steps: 'Open lead → Click "Create Estimate" → Add line items → Click "Send"' },
  { task: 'Schedule a Job', steps: 'Open lead → Click "Schedule Job" → Pick date and time → Save' },
  { task: 'Mark Job Complete', steps: 'Open job → Click "Mark Complete" → Add notes → Done' },
  { task: 'Send an Invoice', steps: 'Open completed job → Click "Create Invoice" → Verify amounts → Send' },
  { task: 'Check Follow-ups', steps: 'Go to Dashboard → Look at "Needs Attention" section → Take action' },
];

const SUPPORT_OPTIONS = [
  { method: 'Help Center', when: 'How-to questions', time: 'Instant (self-serve)', icon: BookOpen },
  { method: 'Chat', when: 'Quick questions', time: 'Minutes to hours', icon: MessageSquare },
  { method: 'Email', when: 'Detailed issues', time: '24 hours', icon: Mail },
  { method: 'Phone (Gold only)', when: 'Urgent issues', time: 'Same day', icon: Phone },
];

export default function GettingStartedPage() {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const toggleDay = (day: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  const toggleTask = (taskId: string) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);
    // Save to localStorage
    localStorage.setItem('onboarding-completed-tasks', JSON.stringify([...newCompleted]));
  };

  const totalTasks = DAY_GUIDES.reduce((acc, day) => acc + day.tasks.length, 0);
  const completedCount = completedTasks.size;
  const progressPercent = Math.round((completedCount / totalTasks) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary/5 border-b">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Getting Started Guide</h1>
              <p className="text-gray-600">Your first week with TradesCaptain</p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Your Progress</span>
              <span className="text-sm text-gray-500">
                {completedCount} of {totalTasks} tasks completed
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {progressPercent === 100 && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Congratulations! You have completed the getting started guide.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Day-by-Day Guide */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Your First Week: Day by Day
          </h2>

          {DAY_GUIDES.map((day) => {
            const Icon = day.icon;
            const isExpanded = expandedDays.has(day.day);
            const dayTasksCompleted = day.tasks.filter((t) => completedTasks.has(t.id)).length;
            const allDayTasksComplete = dayTasksCompleted === day.tasks.length;

            return (
              <Card key={day.day} className={allDayTasksComplete ? 'border-green-200 bg-green-50/50' : ''}>
                <button
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
                  onClick={() => toggleDay(day.day)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${allDayTasksComplete ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Icon className={`h-5 w-5 ${allDayTasksComplete ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={allDayTasksComplete ? 'default' : 'outline'}>
                          Day {day.day}
                        </Badge>
                        <span className="font-medium">{day.title}</span>
                        {allDayTasksComplete && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{day.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {dayTasksCompleted}/{day.tasks.length}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-3 pl-14">
                      {day.tasks.map((task) => {
                        const isCompleted = completedTasks.has(task.id);
                        return (
                          <div
                            key={task.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isCompleted
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white hover:bg-gray-50'
                            }`}
                            onClick={() => toggleTask(task.id)}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-300 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${isCompleted ? 'text-green-800' : ''}`}>
                                  {task.title}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {task.duration}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5">{task.description}</p>
                              {task.href && !isCompleted && (
                                <Button
                                  size="sm"
                                  variant="link"
                                  className="p-0 h-auto mt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = task.href!;
                                  }}
                                >
                                  Go to {task.title.toLowerCase()} <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Golden Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              The 5 Golden Rules for CRM Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {GOLDEN_RULES.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">{idx + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium">{item.rule}</p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Common Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              How to Do Common Tasks
            </CardTitle>
            <CardDescription>Quick reference for everyday actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {COMMON_TASKS.map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{item.task}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.steps}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Getting Help */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Getting Help
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SUPPORT_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.method} className="text-center p-4 border rounded-lg">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-medium">{option.method}</p>
                    <p className="text-xs text-gray-500 mt-1">{option.when}</p>
                    <Badge variant="secondary" className="mt-2">
                      {option.time}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

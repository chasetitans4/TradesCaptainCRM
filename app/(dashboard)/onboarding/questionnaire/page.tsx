'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  Progress,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Users,
  Receipt,
  Clock,
  Route,
  Calendar,
  Star,
  MessageSquare,
  Mail,
  Bell,
  FileText,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface Question {
  id: string;
  type: 'single' | 'multi' | 'text';
  question: string;
  description?: string;
  options?: { value: string; label: string; description?: string }[];
  required?: boolean;
}

const FEATURE_ICONS: Record<string, React.ElementType> = {
  timesheets: Clock,
  receipts: Receipt,
  route_optimization: Route,
  online_booking: Calendar,
  review_requests: Star,
  ai_sms: MessageSquare,
  yes: Check,
  no: Users,
};

export default function QuestionnairePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const onboardingQuestionnaireLogger = logger.child({ context: 'onboarding-questionnaire' });

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    try {
      const res = await fetch('/api/onboarding/questionnaire');
      if (!res.ok) throw new Error('Failed to load questionnaire');
      const data = await res.json();
      setQuestions(data.questions);
      setRecommendations(data.recommendations);
    } catch (err) {
      onboardingQuestionnaireLogger.error({
        msg: 'Error fetching questionnaire',
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  }

  function handleSingleSelect(questionId: string, value: string) {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleMultiSelect(questionId: string, value: string) {
    setResponses((prev) => {
      const current = prev[questionId] || [];
      if (current.includes(value)) {
        return { ...prev, [questionId]: current.filter((v: string) => v !== value) };
      }
      return { ...prev, [questionId]: [...current, value] };
    });
  }

  function canProceed(): boolean {
    const currentQuestion = questions[currentStep];
    if (!currentQuestion?.required) return true;
    const response = responses[currentQuestion.id];
    if (currentQuestion.type === 'multi') {
      return Array.isArray(response) && response.length > 0;
    }
    return !!response;
  }

  async function handleNext() {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await submitQuestionnaire();
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  async function submitQuestionnaire() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/questionnaire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save preferences');
      }

      router.push('/dashboard?setup=complete');
    } catch (err: any) {
      onboardingQuestionnaireLogger.error({
        msg: 'Error saving questionnaire',
        error: err instanceof Error ? err.message : String(err),
        currentStep,
        responsesCount: Object.keys(responses).length,
      });
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-text-muted mb-2">
          <span>
            Question {currentStep + 1} of {questions.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Question */}
      <div className="flex-1 flex flex-col">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text mb-2">{currentQuestion?.question}</h1>
          {currentQuestion?.description && (
            <p className="text-text-muted text-sm">{currentQuestion.description}</p>
          )}
        </div>

        {/* AI Services Info Box - v6.3: Updated for addon model */}
        {currentQuestion?.id === 'aiServices' && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Leads Captain Add-on — $49/mo</p>
                <p className="text-blue-700 mt-1">
                  AI-powered missed call text-back and SMS automation. Available for <strong>any Blue CRM plan</strong>.
                  You can add or remove this anytime in <strong>Settings &gt; AI Services</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Options */}
        <div className="space-y-3 flex-1">
          {currentQuestion?.options?.map((option) => {
            const isSelected =
              currentQuestion.type === 'multi'
                ? (responses[currentQuestion.id] || []).includes(option.value)
                : responses[currentQuestion.id] === option.value;

            const isRecommended =
              currentQuestion.id === 'features' && recommendations.includes(option.value);

            const Icon = FEATURE_ICONS[option.value];

            return (
              <Card
                key={option.value}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:border-border-dark'
                }`}
                onClick={() =>
                  currentQuestion.type === 'multi'
                    ? handleMultiSelect(currentQuestion.id, option.value)
                    : handleSingleSelect(currentQuestion.id, option.value)
                }
              >
                <CardContent className="py-4 px-4">
                  <div className="flex items-start gap-3">
                    {Icon && (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-primary text-white' : 'bg-muted text-text-muted'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-medium ${
                            isSelected ? 'text-primary' : 'text-text'
                          }`}
                        >
                          {option.label}
                        </p>
                        {isRecommended && (
                          <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-sm text-text-muted mt-0.5">{option.description}</p>
                      )}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-primary bg-primary' : 'border-border'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : currentStep === questions.length - 1 ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Finish Setup
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>

        {/* Skip option */}
        {!currentQuestion?.required && currentStep < questions.length - 1 && (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="text-center text-sm text-text-muted hover:text-text py-3"
          >
            Skip this question
          </button>
        )}
      </div>
    </div>
  );
}

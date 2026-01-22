'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROICalculator } from '@/components/leads-captain/roi-calculator';
import {
  Phone,
  MessageSquare,
  Clock,
  Bell,
  CheckCircle,
  XCircle,
  ArrowRight,
  Zap,
  Shield,
  Users,
} from 'lucide-react';

export default function LeadsCaptainLandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'page_view', { page_title: 'Leads Captain Landing' });
    }
  }, []);

  const handleGetStarted = () => {
    router.push('/signup?plan=leads_captain');
  };

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="text-xl font-bold">
            TradesCaptain
          </a>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Login
            </a>
            <Button size="sm" onClick={handleGetStarted}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              AI-Powered Missed Call Recovery
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Never Lose a Lead to a <span className="text-primary">Missed Call</span> Again
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Leads Captain AI texts your missed calls in under 5 seconds, captures their info, and notifies you instantly. Turn every missed call into a booked job.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={handleGetStarted} className="text-lg px-8">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push('/get-leads-captain/calculator')} className="text-lg px-8">
                Calculate Your ROI
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              $29/month after trial • No contracts • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-red-50 dark:bg-red-950/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Every Missed Call is Money Walking Out the Door
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-red-200 dark:border-red-900">
                <CardContent className="p-6 text-center">
                  <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">70% Lost to Competitors</h3>
                  <p className="text-sm text-muted-foreground">
                    When you miss a call, most customers call someone else within 5 minutes
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-900">
                <CardContent className="p-6 text-center">
                  <Clock className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Too Busy to Call Back</h3>
                  <p className="text-sm text-muted-foreground">
                    When you're on a job, you can't answer every call. Voicemail isn't enough.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-900">
                <CardContent className="p-6 text-center">
                  <Phone className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Average: 5+ Missed/Week</h3>
                  <p className="text-sm text-muted-foreground">
                    At $300/job and 40% close rate, that's $2,400/month walking away
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">How Leads Captain Works</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Simple, automatic, and effective. Here's what happens when you can't answer:
            </p>
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Instant Text Response
                  </h3>
                  <p className="text-muted-foreground">
                    Within 5 seconds of a missed call, our AI texts your customer: “Hey! Sorry I missed your call — I'm with a customer right now. What can I help you with?”
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    AI Captures Lead Info
                  </h3>
                  <p className="text-muted-foreground">
                    The AI has a natural conversation to capture what they need (service), where they are (address), and how urgent it is. All automatically.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    You Get Notified
                  </h3>
                  <p className="text-muted-foreground">
                    You receive an SMS, email, and push notification with all the details. For emergencies, we notify you immediately — even after hours.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">4</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Call Back & Close
                  </h3>
                  <p className="text-muted-foreground">
                    Call them back when you're free. They're still warm, they're already engaged, and you have all the info you need. Easy close.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30" id="calculator">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Calculate Your Savings</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            See exactly how much you're losing to missed calls — and how fast Leads Captain pays for itself.
          </p>
          <ROICalculator onGetStarted={handleGetStarted} />
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Capture Every Lead</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="5-Second Response"
              description="AI responds faster than any human could. Customers feel heard immediately."
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Natural Conversations"
              description="Our AI sounds like you — friendly, professional, and helpful. Not robotic."
            />
            <FeatureCard
              icon={<Bell className="h-6 w-6" />}
              title="Emergency Detection"
              description="Gas leak? Burst pipe? AI recognizes urgency and notifies you immediately."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="TCPA Compliant"
              description="All messages include proper opt-out language. We handle compliance for you."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="After-Hours Coverage"
              description="Captures leads 24/7. Emergencies notify you immediately; others queue for morning."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="CRM Integration"
              description="Leads automatically become jobs in TradesCaptain CRM. (Silver/Gold plans)"
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <Card className="border-2 border-primary">
              <CardContent className="p-8">
                <div className="text-5xl font-bold mb-2">$29<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                <p className="text-muted-foreground mb-6">Everything included. No hidden fees.</p>
                <ul className="text-left space-y-3 mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Unlimited missed call texts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>700 SMS included (then $0.01/SMS)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>AI conversation & lead capture</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Emergency detection & routing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>SMS, email, & push notifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>No contracts — cancel anytime</span>
                  </li>
                </ul>
                <Button size="lg" className="w-full text-lg" onClick={handleGetStarted}>
                  Start 14-Day Free Trial
                </Button>
                <p className="text-xs text-muted-foreground mt-4">No credit card required to start trial</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <FAQItem
              question="How does Leads Captain know when I miss a call?"
              answer="Leads Captain integrates with your business phone number. When a call goes unanswered or to voicemail, we automatically trigger the AI text response."
            />
            <FAQItem
              question="What if I don't want texts sent at 2am?"
              answer="You set your 'quiet hours'. During quiet hours, non-emergency leads are queued and you're notified first thing in the morning. True emergencies (gas leaks, burst pipes) always notify you immediately."
            />
            <FAQItem
              question="Can customers opt out of texts?"
              answer="Absolutely. We're fully TCPA compliant. Customers can reply STOP at any time to opt out, and we'll never message them again."
            />
            <FAQItem
              question="What if I already have a CRM?"
              answer="Leads Captain works standalone for $29/month. If you want CRM integration, calendar booking, and more, check out our Silver or Gold plans which include Leads Captain."
            />
            <FAQItem
              question="Is there a contract or commitment?"
              answer="Nope. Cancel anytime with one click. We're confident you'll stay because Leads Captain pays for itself many times over."
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop Losing Leads. Start Today.</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            For less than a dollar a day, turn every missed call into a potential job.
          </p>
          <Button size="lg" variant="secondary" onClick={handleGetStarted} className="text-lg px-12">
            Get Leads Captain — $29/mo
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 TradesCaptain. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="/privacy" className="hover:text-foreground">Privacy Policy</a>
            <a href="/terms" className="hover:text-foreground">Terms of Service</a>
            <a href="/contact" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-primary mb-4">{icon}</div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border-b pb-4">
      <h3 className="font-semibold mb-2">{question}</h3>
      <p className="text-muted-foreground">{answer}</p>
    </div>
  );
}

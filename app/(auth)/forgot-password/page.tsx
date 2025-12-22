'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Label, Alert, AlertDescription } from '@/components/ui';
import { resetPassword } from '@/lib/supabase/client';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await resetPassword(email);

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        
        <h1 className="text-2xl font-bold text-text mb-2 text-center">Check your email</h1>
        <p className="text-text-muted text-center mb-8">
          We&apos;ve sent a password reset link to <span className="font-medium text-text">{email}</span>
        </p>
        
        <p className="text-sm text-text-muted text-center mb-6">
          Click the link in the email to reset your password. The link will expire in 1 hour.
        </p>
        
        <Link href="/login" className="w-full">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-sm mx-auto w-full">
      <Link
        href="/login"
        className="flex items-center text-text-muted hover:text-text mb-6 -ml-1"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to sign in
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text mb-2">Reset your password</h1>
        <p className="text-text-muted">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
            <Input
              id="email"
              type="email"
              placeholder="mike@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-12"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Send Reset Link
        </Button>
      </form>
    </div>
  );
}

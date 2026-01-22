'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Alert, AlertDescription } from '@/components/ui';
import { signIn, signInWithMagicLink } from '@/lib/supabase/client';
import { Mail, Lock, Wand2 } from 'lucide-react';

type AuthMode = 'password' | 'magic-link';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
        return;
      }

      if (data?.user) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await signInWithMagicLink(email);
      
      if (error) {
        setError(error.message);
        return;
      }

      setMagicLinkSent(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-6">
          <Mail className="w-8 h-8 text-success" />
        </div>
        
        <h1 className="text-2xl font-bold text-text mb-2 text-center">Check your email</h1>
        <p className="text-text-muted text-center mb-8">
          We&apos;ve sent a magic link to <span className="font-medium text-text">{email}</span>
        </p>
        
        <p className="text-sm text-text-muted text-center mb-6">
          Click the link in the email to sign in. The link will expire in 1 hour.
        </p>
        
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            setMagicLinkSent(false);
            setEmail('');
          }}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-sm mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text mb-2">Welcome back</h1>
        <p className="text-text-muted">Sign in to your CRM</p>
      </div>

      {error && (
        <Alert variant="danger" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Auth Mode Tabs */}
      <div className="flex bg-muted rounded-lg p-1 mb-6">
        <button
          type="button"
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === 'password'
              ? 'bg-surface text-text shadow-sm'
              : 'text-text-muted hover:text-text'
          }`}
          onClick={() => setMode('password')}
        >
          Password
        </button>
        <button
          type="button"
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === 'magic-link'
              ? 'bg-surface text-text shadow-sm'
              : 'text-text-muted hover:text-text'
          }`}
          onClick={() => setMode('magic-link')}
        >
          Magic Link
        </button>
      </div>

      {mode === 'password' ? (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
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

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Sign In
          </Button>
        </form>
      ) : (
        <form onSubmit={handleMagicLinkLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="magic-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
              <Input
                id="magic-email"
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
            <Wand2 className="mr-2 h-4 w-4" />
            Send Magic Link
          </Button>

          <p className="text-sm text-text-muted text-center">
            We&apos;ll email you a link that signs you in instantly. No password needed.
          </p>
        </form>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
        <p className="text-sm text-text-muted mt-2">
          Admin access?{' '}
          <Link href="/admin/login" className="text-primary hover:underline font-medium">
            Enter Admin Portal
          </Link>
        </p>
      </div>
    </div>
  );
}

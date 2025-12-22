'use client';

import { useState } from 'react';
import { Shield, Smartphone, Mail, MessageSquare, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Method = 'totp' | 'sms' | 'email';
type Step = 'select' | 'setup' | 'verify' | 'backup' | 'complete';

interface BackupCodesDisplayProps {
  codes: string[];
  onContinue: () => void;
}

function BackupCodesDisplay({ codes, onContinue }: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Save these backup codes in a safe place. Each code can only be used once.
        </AlertDescription>
      </Alert>

      <div className="bg-muted p-4 rounded-lg font-mono text-sm grid grid-cols-2 gap-2">
        {codes.map((code, i) => (
          <div key={i} className="text-center py-1">
            {code}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleCopy} className="flex-1">
          {copied ? 'Copied!' : 'Copy codes'}
        </Button>
        <Button onClick={onContinue} className="flex-1">
          I've saved these codes
        </Button>
      </div>
    </div>
  );
}

export function TwoFactorSetup() {
  const [method, setMethod] = useState<Method | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const startTOTPSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/setup/totp');
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setQrCode(data.qrCode);
      setManualKey(data.manualKey);
      setStep('setup');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startSMSSetup = async () => {
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/setup/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup', phone }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setStep('verify');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startEmailSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/setup/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setStep('verify');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = '/api/auth/2fa/setup/totp';
      let body: any = { code };

      if (method === 'sms') {
        endpoint = '/api/auth/2fa/setup/sms';
        body = { action: 'verify', code };
      } else if (method === 'email') {
        endpoint = '/api/auth/2fa/setup/email';
        body = { action: 'verify', code };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // Fetch backup codes
      const backupResponse = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
      });
      const backupData = await backupResponse.json();

      if (backupResponse.ok && backupData.codes) {
        setBackupCodes(backupData.codes);
        setStep('backup');
      } else {
        setStep('complete');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Method Selection
  if (step === 'select') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enable Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => {
              setMethod('totp');
              startTOTPSetup();
            }}
            disabled={loading}
          >
            <Smartphone className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Authenticator App</div>
              <div className="text-sm text-muted-foreground">
                Google Authenticator, Authy, or similar
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => {
              setMethod('sms');
              setStep('setup');
            }}
            disabled={loading}
          >
            <MessageSquare className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">SMS Text Message</div>
              <div className="text-sm text-muted-foreground">
                Receive codes via text message
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-4"
            onClick={() => {
              setMethod('email');
              startEmailSetup();
            }}
            disabled={loading}
          >
            <Mail className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Email</div>
              <div className="text-sm text-muted-foreground">
                Receive codes via email
              </div>
            </div>
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // TOTP Setup (QR Code)
  if (step === 'setup' && method === 'totp' && qrCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Scan this QR code with your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-lg" />
          </div>

          {manualKey && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Can't scan? Enter this code manually:
              </p>
              <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                {manualKey}
              </code>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Enter the 6-digit code from your app:
            </label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
              Back
            </Button>
            <Button
              onClick={verifyCode}
              disabled={code.length !== 6 || loading}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // SMS Setup (Phone Number Entry)
  if (step === 'setup' && method === 'sms') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Set Up SMS Verification</CardTitle>
          <CardDescription>
            Enter your phone number to receive verification codes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              type="tel"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
              Back
            </Button>
            <Button onClick={startSMSSetup} disabled={!phone || loading} className="flex-1">
              {loading ? 'Sending...' : 'Send Code'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verification Step (SMS/Email)
  if (step === 'verify' && (method === 'sms' || method === 'email')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enter Verification Code</CardTitle>
          <CardDescription>
            {method === 'sms'
              ? 'Enter the code sent to your phone'
              : 'Enter the code sent to your email'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">
              Back
            </Button>
            <Button
              onClick={verifyCode}
              disabled={code.length !== 6 || loading}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Backup Codes
  if (step === 'backup' && backupCodes.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Save Your Backup Codes</CardTitle>
          <CardDescription>
            Use these codes if you lose access to your authentication method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BackupCodesDisplay codes={backupCodes} onContinue={() => setStep('complete')} />
        </CardContent>
      </Card>
    );
  }

  // Complete
  if (step === 'complete') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            Two-Factor Authentication Enabled
          </CardTitle>
          <CardDescription>
            Your account is now protected with an additional layer of security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()} className="w-full">
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Crown,
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
  Send,
  Users,
  Gift,
} from 'lucide-react';

export default function NewFoundersSubmissionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [foundersStatus, setFoundersStatus] = useState<{
    is_open: boolean;
    slots_remaining: number;
    total_slots: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    client_company_name: '',
    client_email: '',
    client_phone: '',
    web_invoice_number: '',
    web_plan_type: '',
  });

  useEffect(() => {
    async function checkFoundersStatus() {
      try {
        const res = await fetch('/api/admin/founders/status');
        if (res.ok) {
          const data = await res.json();
          setFoundersStatus(data);
        }
      } catch (err) {
        console.error('Failed to check founders status:', err);
      } finally {
        setLoadingStatus(false);
      }
    }

    checkFoundersStatus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/submissions/founders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create submission');
      }

      setSuccess({
        id: data.submission.id,
        url: data.registration_url,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyUrl() {
    if (success?.url) {
      navigator.clipboard.writeText(success.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function sendInvite() {
    if (!success?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions/${success.id}/send-invite`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to send invite');
      alert('Invite email sent successfully!');
      router.push('/admin-portal/submissions');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!foundersStatus?.is_open) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Founders Program Closed
          </h1>
          <p className="text-gray-500 mb-6">
            All {foundersStatus?.total_slots || 100} slots have been claimed. The Founders Program is no longer accepting new members.
          </p>
          <Link
            href="/admin-portal/submissions"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="h-8 w-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Founders Submission Created!
          </h1>
          <p className="text-gray-500 mb-2">
            A Founders slot has been claimed for {formData.client_company_name}.
          </p>
          <p className="text-sm text-purple-600 mb-6">
            They will receive 3 months free on the Blue Starter plan!
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
              Registration URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={success.url}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={copyUrl}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={sendInvite}
              disabled={loading}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Invite Email
            </button>
            <Link
              href="/admin-portal/submissions"
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              View All Submissions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin-portal/submissions"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Submissions
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Crown className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Founders Submission</h1>
            <p className="text-gray-500">Add a client to the exclusive Founders Program</p>
          </div>
        </div>
      </div>

      {/* Founders Status Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="font-semibold text-purple-900">Founders Program Status</div>
              <div className="text-sm text-purple-700">
                {foundersStatus.slots_remaining} of {foundersStatus.total_slots} slots remaining
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-purple-700">
              <Gift className="h-4 w-4" />
              <span className="font-medium">3 Months Free</span>
            </div>
            <div className="text-xs text-purple-600">Blue Starter Plan</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-purple-600 rounded-full h-2 transition-all"
              style={{
                width: `${((foundersStatus.total_slots - foundersStatus.slots_remaining) / foundersStatus.total_slots) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Client Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            Client Information
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.client_company_name}
              onChange={(e) => setFormData({ ...formData, client_company_name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              placeholder="ABC Plumbing"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="h-4 w-4 inline mr-1" />
                Email Address *
              </label>
              <input
                type="email"
                value={formData.client_email}
                onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                placeholder="client@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.client_phone}
                onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Web Invoice Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            Web Project Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Web Invoice Number
              </label>
              <input
                type="text"
                value={formData.web_invoice_number}
                onChange={(e) => setFormData({ ...formData, web_invoice_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                placeholder="INV-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Web Plan Type
              </label>
              <input
                type="text"
                value={formData.web_plan_type}
                onChange={(e) => setFormData({ ...formData, web_plan_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                placeholder="e.g., Premium Website"
              />
            </div>
          </div>
        </div>

        {/* Plan Info */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Gift className="h-6 w-6 text-purple-600" />
            <div>
              <div className="font-medium text-purple-900">Founders Benefit</div>
              <div className="text-sm text-purple-700">
                Client will receive 3 months free on the Blue Starter plan ($49/mo value)
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link
            href="/admin-portal/submissions"
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crown className="h-4 w-4" />
            )}
            Create Founders Submission
          </button>
        </div>
      </form>
    </div>
  );
}

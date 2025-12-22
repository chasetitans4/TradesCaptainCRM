'use client';

import { useState, useEffect } from 'react';
import {
  PhoneCall,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCcw,
  DollarSign,
  Calendar,
  Building2,
  FileText,
  Send,
} from 'lucide-react';
import { format, formatDistanceToNow, addMonths, isAfter, isBefore, addDays } from 'date-fns';

interface RetentionTask {
  id: string;
  crm_account_id?: string;
  web_customer_id?: string;
  agent_id: string;
  month_3_call_completed: boolean;
  month_3_call_date?: string;
  month_3_call_notes?: string;
  month_3_audit_sent: boolean;
  month_3_bonus_paid: boolean;
  month_4_retained: boolean;
  month_4_bonus_paid: boolean;
  month_6_retained: boolean;
  month_6_bonus_paid: boolean;
  month_12_retained: boolean;
  month_12_bonus_paid: boolean;
  total_retention_bonus: number;
  created_at: string;
  crm_account?: { business_name: string; created_at: string };
  web_customer?: { business_name: string; created_at: string };
}

export default function RetentionPage() {
  const [tasks, setTasks] = useState<RetentionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<RetentionTask | null>(null);
  const [callNotes, setCallNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/retention');
      if (!res.ok) throw new Error('Failed to fetch retention tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function completeMonth3Call(taskId: string) {
    if (!callNotes.trim()) {
      alert('Please enter call notes');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/retention/${taskId}/complete-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: callNotes }),
      });
      if (!res.ok) throw new Error('Failed to complete call');
      setSelectedTask(null);
      setCallNotes('');
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendAudit(taskId: string) {
    if (!confirm('Send the Month 3 audit to this customer?')) return;
    try {
      const res = await fetch(`/api/admin/retention/${taskId}/send-audit`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to send audit');
      fetchTasks();
    } catch (err: any) {
      alert(err.message);
    }
  }

  function getCustomerAge(createdAt: string) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMonths = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
    return diffMonths;
  }

  function getTaskStatus(task: RetentionTask) {
    const account = task.crm_account || task.web_customer;
    if (!account) return 'unknown';

    const ageMonths = getCustomerAge(account.created_at);

    if (ageMonths < 3) {
      return 'upcoming';
    } else if (ageMonths < 4 && !task.month_3_call_completed) {
      return 'due_month_3';
    } else if (ageMonths >= 4 && ageMonths < 6 && !task.month_4_retained) {
      return 'check_month_4';
    } else if (ageMonths >= 6 && ageMonths < 12 && !task.month_6_retained) {
      return 'check_month_6';
    } else if (ageMonths >= 12 && !task.month_12_retained) {
      return 'check_month_12';
    }
    return 'completed';
  }

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    upcoming: { label: 'Upcoming', color: 'bg-gray-100 text-gray-700', icon: Clock },
    due_month_3: { label: 'Month 3 Call Due', color: 'bg-orange-100 text-orange-700', icon: PhoneCall },
    check_month_4: { label: 'Check Month 4', color: 'bg-yellow-100 text-yellow-700', icon: Calendar },
    check_month_6: { label: 'Check Month 6', color: 'bg-blue-100 text-blue-700', icon: Calendar },
    check_month_12: { label: 'Check Month 12', color: 'bg-purple-100 text-purple-700', icon: Calendar },
    completed: { label: 'On Track', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    unknown: { label: 'Unknown', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
  };

  // Sort tasks by urgency
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = ['due_month_3', 'check_month_4', 'check_month_6', 'check_month_12', 'upcoming', 'completed', 'unknown'];
    return statusOrder.indexOf(getTaskStatus(a)) - statusOrder.indexOf(getTaskStatus(b));
  });

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retention Tasks</h1>
          <p className="text-gray-500">Month 3 calls and retention milestone tracking</p>
        </div>
        <button
          onClick={fetchTasks}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Retention Bonuses Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900">Retention Bonuses</h3>
            <div className="text-sm text-green-700 mt-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="font-medium">Month 3 Call:</span> $15
              </div>
              <div>
                <span className="font-medium">Month 4 Retained:</span> $25
              </div>
              <div>
                <span className="font-medium">Month 6 Retained:</span> $50
              </div>
              <div>
                <span className="font-medium">Month 12 Retained:</span> $100
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <PhoneCall className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No retention tasks found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedTasks.map((task) => {
              const account = task.crm_account || task.web_customer;
              const taskStatus = getTaskStatus(task);
              const config = statusConfig[taskStatus];
              const StatusIcon = config.icon;
              const ageMonths = account ? getCustomerAge(account.created_at) : 0;

              return (
                <div key={task.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Building2 className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {account?.business_name || 'Unknown'}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{task.crm_account ? 'CRM' : 'Web'}</span>
                          <span>•</span>
                          <span>Customer for {ageMonths} months</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${config.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </span>
                          {task.month_3_call_completed && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Month 3 call done
                            </span>
                          )}
                          {task.month_3_audit_sent && (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Audit sent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Month 3 Call Button */}
                      {taskStatus === 'due_month_3' && !task.month_3_call_completed && (
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center gap-1"
                        >
                          <PhoneCall className="h-4 w-4" />
                          Log Call
                        </button>
                      )}
                      {/* Send Audit Button */}
                      {task.month_3_call_completed && !task.month_3_audit_sent && (
                        <button
                          onClick={() => sendAudit(task.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                        >
                          <Send className="h-4 w-4" />
                          Send Audit
                        </button>
                      )}
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          ${task.total_retention_bonus} earned
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Tracker */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className={`flex-1 h-2 rounded-full ${task.month_3_call_completed ? 'bg-green-500' : 'bg-gray-200'}`} title="Month 3" />
                    <div className={`flex-1 h-2 rounded-full ${task.month_4_retained ? 'bg-green-500' : 'bg-gray-200'}`} title="Month 4" />
                    <div className={`flex-1 h-2 rounded-full ${task.month_6_retained ? 'bg-green-500' : 'bg-gray-200'}`} title="Month 6" />
                    <div className={`flex-1 h-2 rounded-full ${task.month_12_retained ? 'bg-green-500' : 'bg-gray-200'}`} title="Month 12" />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-400">
                    <span>M3</span>
                    <span>M4</span>
                    <span>M6</span>
                    <span>M12</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Call Notes Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Log Month 3 Call</h2>
            <p className="text-gray-600 mb-4">
              Customer: {selectedTask.crm_account?.business_name || selectedTask.web_customer?.business_name}
            </p>

            {/* Call Script */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4 text-sm">
              <h3 className="font-medium text-blue-900 mb-2">Call Script:</h3>
              <ol className="list-decimal list-inside text-blue-800 space-y-1">
                <li>Ask how they're finding the software</li>
                <li>Identify any challenges or pain points</li>
                <li>Offer tips for features they might not be using</li>
                <li>Ask about business goals and how we can help</li>
                <li>Remind them of the audit review coming up</li>
              </ol>
            </div>

            <textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="Enter call notes and key takeaways..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setSelectedTask(null); setCallNotes(''); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => completeMonth3Call(selectedTask.id)}
                disabled={submitting}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Complete Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

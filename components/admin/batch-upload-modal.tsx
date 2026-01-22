'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/lib/toast';
import {
  Upload,
  FileText,
  Sparkles,
  Users,
  AlertCircle,
  CheckCircle,
  X,
  Loader2,
} from 'lucide-react';
import { AIFormattedLead, AssignmentStrategy, BatchUploadResult } from '@/lib/admin/types';

interface BatchUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

type UploadStep = 'upload' | 'preview' | 'assign' | 'result';

export function BatchUploadModal({ open, onOpenChange, onSuccess }: BatchUploadModalProps) {
  const [step, setStep] = React.useState<UploadStep>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [fileContent, setFileContent] = React.useState<string>('');
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = React.useState<string>('');
  const [assignmentStrategy, setAssignmentStrategy] = React.useState<AssignmentStrategy>('manual');
  const [formattedLeads, setFormattedLeads] = React.useState<AIFormattedLead[]>([]);
  const [isFormatting, setIsFormatting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadResult, setUploadResult] = React.useState<BatchUploadResult | null>(null);
  const [useAIFormatting, setUseAIFormatting] = React.useState(false);
  const [loadingAgents, setLoadingAgents] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!open) {
      setStep('upload');
      setFile(null);
      setFileContent('');
      setSelectedAgent('');
      setAssignmentStrategy('manual');
      setFormattedLeads([]);
      setUploadResult(null);
      setUseAIFormatting(false);
    }
  }, [open]);

  // Fetch agents when modal opens
  React.useEffect(() => {
    if (open && agents.length === 0) {
      fetchAgents();
    }
  }, [open]);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/admin/leads/batch');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['.csv', '.json', 'text/csv', 'application/json'];
    const isValidType = validTypes.some(
      type => selectedFile.name.endsWith(type) || selectedFile.type === type
    );

    if (!isValidType) {
      showError('Please upload a CSV or JSON file');
      return;
    }

    // Validate file size (5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      showError('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    const content = await selectedFile.text();
    setFileContent(content);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const event = { target: { files: [droppedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(event);
    }
  };

  const handleFormat = async () => {
    if (!file) return;

    setIsFormatting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/leads/batch/format', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to format leads');
      }

      const data = await res.json();
      setFormattedLeads(data.formatted_leads || []);
      setStep('preview');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to format leads');
    } finally {
      setIsFormatting(false);
    }
  };

  const handleSkipFormatting = async () => {
    // Parse file without AI formatting
    try {
      const formData = new FormData();
      formData.append('file', file!);

      // Just parse the file on the client side using basic normalization
      const res = await fetch(`/api/admin/leads/batch/format?sample=${encodeURIComponent(fileContent.slice(0, 10000))}`);
      if (res.ok) {
        const data = await res.json();
        // Create basic formatted leads without AI
        const basicLeads: AIFormattedLead[] = (data.preview || []).map((lead: Record<string, string>) => ({
          formatted_lead: lead,
          changes: [],
          confidence: 70,
          warnings: [],
        }));
        setFormattedLeads(basicLeads);
      }
      setStep('preview');
    } catch {
      setStep('assign');
    }
  };

  const handleUpload = async () => {
    if (assignmentStrategy === 'manual' && !selectedAgent) {
      showError('Please select an agent for assignment');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file!);
      formData.append('assignment_strategy', assignmentStrategy);
      if (assignmentStrategy === 'manual') {
        formData.append('agent_id', selectedAgent);
      }

      const res = await fetch('/api/admin/leads/batch', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload leads');
      }

      setUploadResult(data);
      setStep('result');

      if (data.imported > 0) {
        showSuccess(`Successfully imported ${data.imported} leads`);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to upload leads');
    } finally {
      setIsUploading(false);
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* File Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          file ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setFileContent('');
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">
              Drop your file here or click to browse
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports CSV and JSON files (max 5MB, 1000 leads)
            </p>
          </>
        )}
      </div>

      {/* AI Formatting Option */}
      {file && (
        <div className="bg-gray-50 rounded-lg p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useAIFormatting}
              onChange={(e) => setUseAIFormatting(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-gray-900">Use AI Formatting</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Automatically clean and standardize your lead data (names, phones, addresses)
              </p>
            </div>
          </label>
        </div>
      )}

      {/* CSV Format Help */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">CSV Format</h4>
        <p className="text-sm text-blue-700">
          Your CSV should have a header row. Common columns:
        </p>
        <code className="text-xs text-blue-600 block mt-2">
          company_name, contact_name, email, phone, address, city, state, zip, trade_type
        </code>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">
          Preview ({formattedLeads.length} leads)
        </h3>
        {useAIFormatting && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            AI Formatted
          </span>
        )}
      </div>

      <div className="max-h-[300px] overflow-y-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Company</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Contact</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Phone</th>
              <th className="px-3 py-2 text-center font-medium text-gray-700">Quality</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {formattedLeads.slice(0, 20).map((lead, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 truncate max-w-[150px]">
                  {lead.formatted_lead.company_name || '-'}
                </td>
                <td className="px-3 py-2 truncate max-w-[150px]">
                  {lead.formatted_lead.contact_name || '-'}
                </td>
                <td className="px-3 py-2 truncate max-w-[150px]">
                  {lead.formatted_lead.email || '-'}
                </td>
                <td className="px-3 py-2">{lead.formatted_lead.phone || '-'}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                      lead.confidence >= 80
                        ? 'bg-green-100 text-green-700'
                        : lead.confidence >= 60
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {lead.confidence}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {formattedLeads.length > 20 && (
          <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
            + {formattedLeads.length - 20} more leads
          </div>
        )}
      </div>

      {/* Warnings */}
      {formattedLeads.some((l) => l.warnings.length > 0) && (
        <div className="bg-amber-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-amber-700 font-medium text-sm">
            <AlertCircle className="h-4 w-4" />
            Some leads have warnings
          </div>
          <ul className="text-sm text-amber-600 mt-2 space-y-1">
            {formattedLeads
              .flatMap((l, i) => l.warnings.map((w) => ({ row: i + 1, warning: w })))
              .slice(0, 5)
              .map((w, i) => (
                <li key={i}>Row {w.row}: {w.warning}</li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderAssignStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-gray-900 mb-4">Agent Assignment</h3>

        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="strategy"
              value="manual"
              checked={assignmentStrategy === 'manual'}
              onChange={() => setAssignmentStrategy('manual')}
              className="mt-1"
            />
            <div>
              <span className="font-medium text-gray-900">Manual Assignment</span>
              <p className="text-sm text-gray-500">Assign all leads to a specific agent</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="strategy"
              value="round_robin"
              checked={assignmentStrategy === 'round_robin'}
              onChange={() => setAssignmentStrategy('round_robin')}
              className="mt-1"
            />
            <div>
              <span className="font-medium text-gray-900">Round Robin</span>
              <p className="text-sm text-gray-500">Distribute leads evenly across all agents</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="strategy"
              value="capacity"
              checked={assignmentStrategy === 'capacity'}
              onChange={() => setAssignmentStrategy('capacity')}
              className="mt-1"
            />
            <div>
              <span className="font-medium text-gray-900">Capacity Based</span>
              <p className="text-sm text-gray-500">Assign to agents with fewest active leads</p>
            </div>
          </label>
        </div>
      </div>

      {assignmentStrategy === 'manual' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Agent
          </label>
          {loadingAgents ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading agents...
            </div>
          ) : (
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select an agent...</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.email})
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {assignmentStrategy !== 'manual' && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Users className="h-5 w-5" />
            <span className="font-medium">{agents.length} agents available</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Leads will be distributed among: {agents.map((a) => a.name).join(', ')}
          </p>
        </div>
      )}
    </div>
  );

  const renderResultStep = () => (
    <div className="space-y-6 text-center">
      {uploadResult && (
        <>
          {uploadResult.imported > 0 ? (
            <div className="text-green-600">
              <CheckCircle className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-bold">Upload Complete!</h3>
              <p className="text-gray-600 mt-2">
                Successfully imported {uploadResult.imported} of {uploadResult.total} leads
              </p>
            </div>
          ) : (
            <div className="text-red-600">
              <AlertCircle className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-xl font-bold">Upload Failed</h3>
              <p className="text-gray-600 mt-2">
                Could not import any leads
              </p>
            </div>
          )}

          {uploadResult.errors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 text-left">
              <h4 className="font-medium text-red-700 mb-2">
                {uploadResult.errors.length} Error{uploadResult.errors.length > 1 ? 's' : ''}
              </h4>
              <ul className="text-sm text-red-600 space-y-1 max-h-[150px] overflow-y-auto">
                {uploadResult.errors.slice(0, 10).map((error, idx) => (
                  <li key={idx}>
                    Row {error.row}: {error.field} - {error.message}
                  </li>
                ))}
                {uploadResult.errors.length > 10 && (
                  <li>...and {uploadResult.errors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          )}

          <p className="text-sm text-gray-500">
            Batch ID: {uploadResult.batch_id}
          </p>
        </>
      )}
    </div>
  );

  const getStepContent = () => {
    switch (step) {
      case 'upload':
        return renderUploadStep();
      case 'preview':
        return renderPreviewStep();
      case 'assign':
        return renderAssignStep();
      case 'result':
        return renderResultStep();
    }
  };

  const getStepActions = () => {
    switch (step) {
      case 'upload':
        return (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {useAIFormatting ? (
              <Button onClick={handleFormat} disabled={!file || isFormatting}>
                {isFormatting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Formatting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Format with AI
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={() => setStep('assign')} disabled={!file}>
                Continue
              </Button>
            )}
          </>
        );
      case 'preview':
        return (
          <>
            <Button variant="outline" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button onClick={() => setStep('assign')}>
              Continue to Assignment
            </Button>
          </>
        );
      case 'assign':
        return (
          <>
            <Button
              variant="outline"
              onClick={() => setStep(formattedLeads.length > 0 ? 'preview' : 'upload')}
            >
              Back
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                'Upload Leads'
              )}
            </Button>
          </>
        );
      case 'result':
        return (
          <Button
            onClick={() => {
              onOpenChange(false);
              if (uploadResult?.imported && uploadResult.imported > 0) {
                onSuccess?.();
              }
            }}
          >
            Done
          </Button>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Batch Upload Leads'}
            {step === 'preview' && 'Preview Leads'}
            {step === 'assign' && 'Assign to Agents'}
            {step === 'result' && 'Upload Results'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV or JSON file with your leads'}
            {step === 'preview' && 'Review the formatted leads before uploading'}
            {step === 'assign' && 'Choose how to assign leads to agents'}
            {step === 'result' && 'Summary of your batch upload'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">{getStepContent()}</div>

        <DialogFooter className="mt-6 gap-2">{getStepActions()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/Select';
import { FileText, Upload, CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { useParentData } from '../../lib/parentData';
import { DOCUMENT_TYPES } from '../../lib/schema/phase2';

const STATUS_BADGE: Record<string, { className: string; label: string; icon: React.ReactNode }> = {
  PENDING: {
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Pending Verification',
    icon: <CircleDashed className="w-3.5 h-3.5 mr-1.5 animate-spin-slow" />
  },
  APPROVED: {
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    label: 'Approved',
    icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
  },
  REJECTED: {
    className: 'bg-rose-100 text-rose-700 border-rose-200',
    label: 'Rejected',
    icon: <XCircle className="w-3.5 h-3.5 mr-1.5" />
  }
};

export function RequirementsView() {
  const { children, documents, documentsLoading, uploadRequirementDocument } = useParentData();
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  React.useEffect(() => {
    if (!selectedEnrollmentId && children.length > 0) {
      // Sort children so the most recent is first (optional, but assume they are in some order)
      // Actually just grab the first one if we don't have a selection
      // If we just enrolled someone, they might be at the end, so let's pick the last one added
      // Or if `submittedAt` is available, sort by it. For simplicity, just pick the last one in the list (newest locally).
      setSelectedEnrollmentId(children[children.length - 1].id);
    }
  }, [children, selectedEnrollmentId]);

  const selectedChild = children.find((child) => child.id === selectedEnrollmentId) || null;

  const childDocuments = useMemo(
    () => documents.filter((doc) => doc.enrollmentId === selectedEnrollmentId),
    [documents, selectedEnrollmentId]
  );

  const latestPsa = useMemo(
    () => childDocuments.find((doc) => doc.documentType === DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE) || null,
    [childDocuments]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEnrollmentId) return;

    setUploadError(null);
    setUploading(true);
    try {
      await uploadRequirementDocument({
        enrollmentId: selectedEnrollmentId,
        documentType: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE,
        file
      });
    } catch (error) {
      const err = error as Error;
      setUploadError(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Enrollment Requirements</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Upload PSA/Birth Certificate and monitor verification status from school administration.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        <Card className="bg-white border-slate-200/60 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Learner</p>
            <Select value={selectedEnrollmentId} onValueChange={setSelectedEnrollmentId}>
              <SelectTrigger className="max-w-md rounded-xl bg-slate-50 border-slate-200">
                <SelectValue placeholder="Choose a child profile">
                  {selectedChild
                    ? `${selectedChild.lastName}, ${selectedChild.firstName} — Grade ${selectedChild.gradeLevel}`
                    : 'Choose a child profile'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.lastName}, {child.firstName} — Grade {child.gradeLevel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {selectedChild && (
          <Card className="bg-white border-slate-200/60 p-6 rounded-2xl shadow-sm space-y-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {selectedChild.firstName} {selectedChild.lastName}
                </h2>
                <p className="text-sm text-slate-500">PSA/Birth Certificate</p>
              </div>
              {latestPsa ? (
                <Badge className={STATUS_BADGE[latestPsa.status]?.className || 'bg-slate-100 text-slate-700'}>
                  {STATUS_BADGE[latestPsa.status]?.icon}
                  {STATUS_BADGE[latestPsa.status]?.label || latestPsa.status}
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-700 border-slate-200">No Upload Yet</Badge>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <span className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 h-10 text-sm font-semibold cursor-pointer hover:bg-primary/90 transition-colors">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </span>
              </label>
              <p className="text-xs text-slate-500">Allowed files: PDF, JPG, PNG (max 10MB)</p>
            </div>

            {uploadError && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                {uploadError}
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upload History</p>
              {documentsLoading ? (
                <p className="text-sm text-slate-500">Loading document records...</p>
              ) : childDocuments.length === 0 ? (
                <p className="text-sm text-slate-500">No documents uploaded for this learner yet.</p>
              ) : (
                <div className="space-y-2">
                  {childDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{document.fileName}</p>
                        <p className="text-xs text-slate-500">
                          {document.mimeType} | {(document.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Badge className={STATUS_BADGE[document.status]?.className || 'bg-slate-100 text-slate-700'}>
                        {STATUS_BADGE[document.status]?.icon}
                        {STATUS_BADGE[document.status]?.label || document.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

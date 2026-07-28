import React, { useMemo, useState, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/Select';
import {
  FileText,
  Upload,
  CheckCircle2,
  CircleDashed,
  XCircle,
  Eye,
  RefreshCw,
  Trash2,
  X,
  AlertTriangle,
  Info,
  Clock,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { useParentData } from '../../lib/parentData';
import { DOCUMENT_TYPES, DOCUMENT_STATUS, DocumentType } from '../../lib/schema/phase2';
import { db } from '../../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

const STATUS_BADGE: Record<string, { className: string; label: string; icon: React.ReactNode }> = {
  NOT_UPLOADED: {
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    label: '• Not Uploaded',
    icon: <CircleDashed className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
  },
  PENDING: {
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    label: '• Under Review',
    icon: <CircleDashed className="w-3.5 h-3.5 mr-1.5 animate-spin-slow text-amber-600" />
  },
  APPROVED: {
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    label: '• Verified',
    icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
  },
  REJECTED: {
    className: 'bg-rose-100 text-rose-800 border-rose-200',
    label: '• Needs Re-upload',
    icon: <XCircle className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
  }
};

export function RequirementsView() {
  const { children, documents, documentsLoading, uploadRequirementDocument } = useParentData();
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; isPdf: boolean } | null>(null);

  // Hidden File Input Refs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Auto-select latest child if none selected
  React.useEffect(() => {
    if (!selectedEnrollmentId && children.length > 0) {
      setSelectedEnrollmentId(children[children.length - 1].id);
    }
  }, [children, selectedEnrollmentId]);

  const selectedChild = children.find((child) => child.id === selectedEnrollmentId) || null;
  const classification = (selectedChild as any)?.studentClassification || (selectedChild?.isReturning ? 'Transferee' : 'New Student');

  const childDocuments = useMemo(
    () => documents.filter((doc) => doc.enrollmentId === selectedEnrollmentId),
    [documents, selectedEnrollmentId]
  );

  const requiredDocList = useMemo(() => {
    if (classification === 'Transferee') {
      return [
        {
          key: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE,
          title: 'PSA Birth Certificate',
          description: 'Official Philippine Statistics Authority (PSA) Birth Certificate.'
        },
        {
          key: DOCUMENT_TYPES.REPORT_CARD,
          title: 'Report Card (SF9)',
          description: 'Official Form 138 / SF9 Report Card from previous school.'
        },
        {
          key: DOCUMENT_TYPES.GOOD_MORAL,
          title: 'Good Moral Certificate',
          description: 'Certificate of Good Moral Character from previous school.'
        }
      ];
    }
    if (classification === 'Balik-Aral') {
      return [
        {
          key: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE,
          title: 'PSA Birth Certificate',
          description: 'Official Philippine Statistics Authority (PSA) Birth Certificate.'
        },
        {
          key: DOCUMENT_TYPES.REPORT_CARD,
          title: 'Most Recent Report Card (if available)',
          description: 'Most recent Form 138 / SF9 report card prior to school interruption.'
        }
      ];
    }
    return [
      {
        key: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE,
        title: 'PSA Birth Certificate',
        description: 'Official Philippine Statistics Authority (PSA) Birth Certificate.'
      }
    ];
  }, [classification]);

  // Handle File Upload
  const handleUpload = async (docType: DocumentType, file: File) => {
    if (!file || !selectedEnrollmentId) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit.');
      return;
    }

    setUploadError(null);
    setSuccessMsg(null);
    setUploadingDocType(docType);

    try {
      await uploadRequirementDocument({
        enrollmentId: selectedEnrollmentId,
        documentType: docType,
        file
      });
      setSuccessMsg(`Successfully uploaded ${file.name}!`);
    } catch (err: any) {
      console.error('Error uploading requirement:', err);
      setUploadError(err.message || 'Failed to upload document.');
    } finally {
      setUploadingDocType(null);
    }
  };

  // Handle Delete Document
  const handleDeleteDoc = async (docRecordId: string, docName: string) => {
    if (!docRecordId) return;
    setUploadError(null);
    setSuccessMsg(null);

    try {
      await deleteDoc(doc(db, 'enrollment_documents', docRecordId));
      setSuccessMsg(`Document ${docName} deleted successfully.`);
    } catch (err: any) {
      console.error('Error deleting document:', err);
      setUploadError('Failed to delete document record.');
    }
  };

  // Open Preview Modal
  const openPreview = (title: string, url: string, fileName: string) => {
    const isPdf = fileName.toLowerCase().endsWith('.pdf') || url.includes('.pdf');
    setPreviewDoc({ title, url, isPdf });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 font-sans">
      
      {/* Header */}
      <header className="px-6 py-8 border-b border-slate-200/80 bg-white shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-6xl mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-[#0C3B99]">
              <FileCheck className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Document Management Center</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Upload, preview, and manage required documents for registered learners.
            </p>
          </div>

          {/* Student Selector Dropdown */}
          {children.length > 0 && (
            <div className="w-full md:w-72 shrink-0 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Select Registered Student</label>
              <Select value={selectedEnrollmentId} onValueChange={setSelectedEnrollmentId}>
                <SelectTrigger className="px-4 py-3 bg-slate-50 border-slate-200/80 rounded-2xl text-slate-900 font-bold text-xs h-12 shadow-xs">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200">
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.gradeLevel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-in fade-in-50 duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{successMsg}</span>
          </div>
        )}
        {uploadError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 animate-in fade-in-50 duration-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{uploadError}</span>
          </div>
        )}

        {selectedChild ? (
          <>
            {/* Registration Progress & Document Checklist Banner */}
            <Card className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Registration & Document Status: <span className="text-[#0C3B99]">{selectedChild.firstName} {selectedChild.lastName}</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Student Classification: <strong className="text-slate-700 font-bold">{classification}</strong> • Grade: <strong className="text-slate-700 font-bold">{selectedChild.gradeLevel}</strong>
                  </p>
                </div>

                <Badge className="bg-blue-50 text-[#0C3B99] border-blue-200 px-3.5 py-1.5 rounded-xl font-bold text-xs shrink-0 self-start sm:self-auto">
                  {selectedChild.status === 'Enrolled' ? 'Officially Enrolled' : 'Registration Submitted'}
                </Badge>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-900 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Registration Submitted</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-900 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Student Info Completed</span>
                </div>
                
                {requiredDocList.map(req => {
                  const uploaded = childDocuments.find(d => d.documentType === req.key);
                  const isVerified = uploaded?.status === DOCUMENT_STATUS.APPROVED;
                  return (
                    <div
                      key={req.key}
                      className={`p-3 rounded-xl border font-bold flex items-center gap-2 ${
                        isVerified
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : uploaded
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      {uploaded ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span className="truncate">{req.title} {uploaded ? 'Uploaded' : 'Missing'}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Document Cards */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Required Registration Documents</h3>

              <div className="grid grid-cols-1 gap-4">
                {requiredDocList.map(req => {
                  const existingDoc = childDocuments.find(d => d.documentType === req.key) || null;
                  const statusKey = existingDoc ? existingDoc.status : 'NOT_UPLOADED';
                  const badgeInfo = STATUS_BADGE[statusKey] || STATUS_BADGE.NOT_UPLOADED;
                  const isUploadingThis = uploadingDocType === req.key;

                  return (
                    <Card key={req.key} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4 hover:border-blue-200 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-extrabold text-slate-900">{req.title}</h4>
                            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-black uppercase tracking-wider">
                              Required
                            </span>
                            <span className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center ${badgeInfo.className}`}>
                              {badgeInfo.icon}
                              {badgeInfo.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{req.description}</p>
                        </div>

                        {/* Action Controls */}
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
                          <input
                            ref={el => { fileInputRefs.current[req.key] = el; }}
                            type="file"
                            accept="image/*, application/pdf"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(req.key as DocumentType, f);
                            }}
                            className="hidden"
                          />

                          {!existingDoc ? (
                            <button
                              type="button"
                              disabled={isUploadingThis}
                              onClick={() => fileInputRefs.current[req.key]?.click()}
                              className="px-4 py-2.5 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-2xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                            >
                              {isUploadingThis ? <CircleDashed className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                              Upload Document
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openPreview(req.title, existingDoc.fileUrl, existingDoc.fileName)}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#0C3B99]" /> View
                              </button>
                              
                              <button
                                type="button"
                                disabled={isUploadingThis}
                                onClick={() => fileInputRefs.current[req.key]?.click()}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                {isUploadingThis ? <CircleDashed className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-amber-600" />} Replace
                              </button>

                              {existingDoc.status !== DOCUMENT_STATUS.APPROVED && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDoc(existingDoc.id, req.title)}
                                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* File Details Bar */}
                      {existingDoc && (
                        <div className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5 truncate">
                            <FileCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                            <span className="font-bold text-slate-800 truncate">{existingDoc.fileName}</span>
                            <span className="text-[11px] text-slate-400 font-medium">({(existingDoc.sizeBytes / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Uploaded {existingDoc.uploadedAt ? new Date((existingDoc.uploadedAt as any)?.seconds ? (existingDoc.uploadedAt as any).seconds * 1000 : Date.now()).toLocaleDateString() : 'Recently'}</span>
                          </div>
                        </div>
                      )}

                      {/* Rejection Note */}
                      {existingDoc?.status === DOCUMENT_STATUS.REJECTED && existingDoc.rejectionReason && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold space-y-1">
                          <span className="font-bold block uppercase tracking-wider text-[10px] text-rose-600">Rejection Reason:</span>
                          <p>{existingDoc.rejectionReason}</p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <Card className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-4">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">No Registered Learners Found</h3>
            <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
              You have not registered any learners yet. Complete the Student Registration Form first to manage documents.
            </p>
          </Card>
        )}
      </div>

      {/* ── DOCUMENT PREVIEW MODAL ── */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm truncate">
                <FileText className="w-4 h-4 text-[#0C3B99] shrink-0" />
                <span className="truncate">{previewDoc.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-2 min-h-[400px] max-h-[75vh] overflow-auto flex items-center justify-center border border-slate-200/70">
              {previewDoc.isPdf ? (
                <iframe src={previewDoc.url} title={previewDoc.title} className="w-full h-[65vh] rounded-xl border-none" />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.title} className="max-h-[65vh] object-contain rounded-xl shadow-xs" />
              )}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="bg-[#0C3B99] hover:bg-blue-800 text-white font-bold rounded-xl px-5 py-2.5 text-xs shadow-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

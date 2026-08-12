import React, { useMemo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Plus,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  Trash2,
  X,
  AlertTriangle,
  Info,
  ShieldCheck,
  FileCheck,
  FilePlus2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Loader2,
  User,
  GraduationCap,
  Tag,
  BarChart3,
  CircleDot,
  CircleAlert,
  Download,
  History
} from 'lucide-react';
import { useParentData } from '../../lib/parentData';
import { DOCUMENT_TYPES, DOCUMENT_STATUS, DocumentType, EnrollmentDocument } from '../../lib/schema/phase2';
import { documentTypeToRequirementKey, deleteRequirementDocument } from '../../lib/services/enrollmentDocumentsService';
import { db } from '../../lib/firebase';
import { doc, deleteDoc, updateDoc, deleteField, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// ─── Status Config ───────────────────────────────────────────────────────────

type StatusKey = 'NOT_UPLOADED' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_CONFIG: Record<StatusKey, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  icon: React.ReactNode;
}> = {
  NOT_UPLOADED: {
    label: 'Not Uploaded',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    icon: <CircleDot className="w-3.5 h-3.5" />
  },
  PENDING: {
    label: 'Under Review',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    icon: <Clock className="w-3.5 h-3.5 animate-pulse" />
  },
  APPROVED: {
    label: 'Verified',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    icon: <ShieldCheck className="w-3.5 h-3.5" />
  },
  REJECTED: {
    label: 'Needs Re-upload',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    icon: <XCircle className="w-3.5 h-3.5" />
  }
};

const DOC_ICONS: Record<string, React.ReactNode> = {
  PSA_BIRTH_CERTIFICATE: <FileText className="w-5 h-5 text-[#0038A8]" />,
  REPORT_CARD:            <BarChart3 className="w-5 h-5 text-violet-600" />,
  GOOD_MORAL:             <ShieldCheck className="w-5 h-5 text-emerald-600" />
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatUploadDate = (uploadedAt: unknown): string => {
  if (!uploadedAt) return 'Just now';
  if (typeof uploadedAt === 'string') return uploadedAt;
  if (uploadedAt instanceof Date) {
    return uploadedAt.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  // Firestore Timestamp
  const ts = uploadedAt as any;
  if (ts?.seconds) {
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return 'Just now';
};

const formatBytes = (bytes: number): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ─── StatusBadge Component ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusKey }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
      {cfg.label}
    </span>
  );
}

// ─── UploadProgressBar ────────────────────────────────────────────────────────

function UploadProgressBar({ progress }: { progress: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="text-[#D8232A] flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Uploading document...
        </span>
        <span className="text-slate-500">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#D8232A] to-red-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

// ─── DocHistoryEntry type ─────────────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  status: StatusKey;
  uploadedAt: unknown;
  rejectionReason?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RequirementsView() {
  const { children, documents, documentsLoading, uploadRequirementDocument } = useParentData();
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Staged files selected for confirmation per document type
  const [stagedFiles, setStagedFiles] = useState<Record<string, File>>({});
  // Optimistic tracking for instant document deletion from UI
  const [deletedDocTypes, setDeletedDocTypes] = useState<Record<string, boolean>>({});

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; isPdf: boolean } | null>(null);

  // Warning modal for document deletion confirmation
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{
    docRecordId?: string;
    docType: string;
    docName: string;
  } | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Auto-select latest child
  React.useEffect(() => {
    if (!selectedEnrollmentId && children.length > 0) {
      setSelectedEnrollmentId(children[children.length - 1].id);
    }
  }, [children, selectedEnrollmentId]);

  if (documentsLoading) {
    return (
      <div className="flex flex-col h-full bg-[#F4F7F9] font-sans">
        <header className="px-6 py-6 lg:py-0 lg:h-28 border-b border-slate-100 bg-white flex items-center shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 animate-pulse rounded-lg" />
              <div className="h-3 w-80 bg-slate-100 animate-pulse rounded-md" />
            </div>
            <div className="h-9 w-44 bg-slate-100 animate-pulse rounded-xl" />
          </div>
        </header>
        <div className="flex-1 p-6 sm:p-10 space-y-6 max-w-7xl mx-auto w-full">
          <div className="h-24 bg-white border border-slate-100 rounded-2xl animate-pulse p-6" />
          <div className="space-y-3 pt-4">
            <div className="h-4 w-32 bg-slate-200 animate-pulse rounded-md" />
            <div className="h-20 bg-white border border-slate-100 rounded-xl animate-pulse" />
            <div className="h-20 bg-white border border-slate-100 rounded-xl animate-pulse" />
            <div className="h-20 bg-white border border-slate-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const selectedChild = children.find((c) => c.id === selectedEnrollmentId) || null;
  const classification: string = (selectedChild as any)?.studentClassification
    || (selectedChild?.isReturning ? 'Transferee' : 'New Student');

  const childDocuments = useMemo(
    () => documents.filter((d) => d.enrollmentId === selectedEnrollmentId),
    [documents, selectedEnrollmentId]
  );

  // Required docs by classification
  const requiredDocList = useMemo(() => {
    if (classification === 'Transferee') {
      return [
        { key: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE, title: 'PSA Birth Certificate', description: 'Official copy from Statistics Authority.' },
        { key: DOCUMENT_TYPES.REPORT_CARD,            title: 'Report Card (SF9)',           description: 'Official Form 138 from previous school.' },
        { key: DOCUMENT_TYPES.GOOD_MORAL,             title: 'Medical Certificate',         description: 'Requirement for specific cases.' }
      ];
    }
    if (classification === 'Balik-Aral') {
      return [
        { key: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE, title: 'PSA Birth Certificate',                     description: 'Official PSA birth certificate.' },
        { key: DOCUMENT_TYPES.REPORT_CARD,            title: 'Most Recent Report Card (if available)',    description: 'Most recent Form 138 / SF9 prior to school interruption.' }
      ];
    }
    return [
      { key: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE, title: 'PSA Birth Certificate', description: 'Official PSA birth certificate.' }
    ];
  }, [classification]);

  // Summary stats
  const uploadedCount = requiredDocList.filter(req => {
    const deleteKey = `${selectedEnrollmentId}_${req.key}`;
    if (deletedDocTypes[deleteKey]) return false;
    const reqKey = documentTypeToRequirementKey(req.key as DocumentType);
    const reqMeta = (selectedChild as any)?.requirementUploads?.[reqKey];
    return childDocuments.some(d => d.documentType === req.key) || !!reqMeta;
  }).length;

  const getCleanName = (child: any) => {
    if (!child) return 'Learner';
    return `${child.firstName || ''} ${child.lastName || ''}`.trim() || 'Learner';
  };

  // ─── Upload Handler ─────────────────────────────────────────────────────────
  const handleUpload = async (docType: DocumentType, file: File) => {
    if (!file || !selectedEnrollmentId) return;
    setUploadError(null);
    setSuccessMsg(null);
    setUploadingDocType(docType);

    // Clear deleted state if re-uploading
    setDeletedDocTypes(prev => {
      const next = { ...prev };
      delete next[`${selectedEnrollmentId}_${docType}`];
      return next;
    });

    // Fake progress simulation (real upload is async)
    let prog = 0;
    const interval = setInterval(() => {
      prog = Math.min(prog + Math.random() * 18, 85);
      setUploadProgress(p => ({ ...p, [docType]: prog }));
    }, 200);

    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit. Please choose a smaller file.');
      }
      await uploadRequirementDocument({ enrollmentId: selectedEnrollmentId, documentType: docType, file });
      clearInterval(interval);
      setUploadProgress(p => ({ ...p, [docType]: 100 }));
      setTimeout(() => setUploadProgress(p => { const n = { ...p }; delete n[docType]; return n; }), 1200);
      setSuccessMsg(`"${file.name}" uploaded successfully and is now synchronized with registration.`);
      setTimeout(() => setSuccessMsg(null), 5000);
      // Clear staged file after successful upload
      setStagedFiles(prev => { const n = { ...prev }; delete n[docType]; return n; });
    } catch (err: any) {
      clearInterval(interval);
      setUploadProgress(p => { const n = { ...p }; delete n[docType]; return n; });
      setUploadError(err.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploadingDocType(null);
      if (fileInputRefs.current[docType]) {
        fileInputRefs.current[docType]!.value = '';
      }
    }
  };

  // ─── Delete Handler ─────────────────────────────────────────────────────────
  const handleDelete = async (docRecordId: string | undefined, docType: string, docName: string) => {
    const isEnrolled = selectedChild?.status === 'Enrolled' || selectedChild?.status === 'Approved';
    if (isEnrolled) {
      setUploadError('Documents cannot be deleted once the student is officially enrolled.');
      return;
    }

    if (!selectedEnrollmentId) return;

    // Optimistic UI update: instantly hide the document from the card
    const deleteKey = `${selectedEnrollmentId}_${docType}`;
    setDeletedDocTypes(prev => ({ ...prev, [deleteKey]: true }));
    setStagedFiles(prev => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });

    setUploadError(null);
    setSuccessMsg(null);

    try {
      await deleteRequirementDocument({
        enrollmentId: selectedEnrollmentId,
        documentType: docType as DocumentType,
        docRecordId
      });

      setSuccessMsg(`"${docName}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Delete document error:', err);
      // Revert optimistic delete on error
      setDeletedDocTypes(prev => {
        const next = { ...prev };
        delete next[deleteKey];
        return next;
      });
      setUploadError(err?.message || 'Failed to delete document. Please try again.');
    }
  };

  // ─── Preview Handler ────────────────────────────────────────────────────────
  const openPreview = (title: string, url: string, mimeType: string) => {
    const isPdf = mimeType === 'application/pdf' || url.toLowerCase().includes('.pdf');
    setPreviewDoc({ title, url, isPdf });
  };

  const regStatusLabel = (status: string) => {
    if (status === 'Enrolled') return { label: 'Officially Enrolled', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (status === 'Approved') return { label: 'Approved', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (status === 'Rejected') return { label: 'Rejected', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    return { label: 'Registration Submitted', color: 'text-red-700 bg-red-50 border-red-200' };
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] font-sans relative">

      {/* PAGE HEADER */}
      <header className="px-6 py-6 lg:py-0 lg:h-28 border-b border-slate-100 bg-white flex items-center shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#D8232A] shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">Document Center</h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage and sync required documents for your learner's registration.
              </p>
            </div>
          </div>

          {/* Learner Selector */}
          {children.length > 0 && (
            <div className="space-y-1 shrink-0 w-full md:w-auto text-left md:text-right">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                LEARNER
              </label>
              <Select value={selectedEnrollmentId} onValueChange={setSelectedEnrollmentId}>
                <SelectTrigger className="h-9 px-4 bg-white border-slate-200 rounded-xl text-xs font-bold text-slate-900 shadow-2xs hover:bg-slate-50 transition-colors min-w-[200px] text-left">
                  <SelectValue placeholder="Choose a learner..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="font-semibold text-xs">
                      {getCleanName(c)} — Grade {c.gradeLevel || 'Level'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 sm:px-10 py-6 space-y-5 max-w-7xl mx-auto">

          {/* Toast Alerts */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 shadow-sm"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-sm font-semibold">{successMsg}</span>
              </motion.div>
            )}
            {uploadError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 shadow-sm"
              >
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-semibold">{uploadError}</span>
                </div>
                <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-rose-600 transition-colors bg-transparent border-0 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedChild ? (
            <>
              {/* Student Summary Card */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xs">
                  {/* Left Side: Avatar + Name + Grade */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-slate-300" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 leading-tight uppercase tracking-tight">
                        {getCleanName(selectedChild)}
                      </h2>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                        {selectedChild.status || 'PENDING'} • {
                          (selectedChild.gradeLevel || '').toString().toLowerCase().startsWith('grade')
                            ? selectedChild.gradeLevel.toUpperCase()
                            : `GRADE ${selectedChild.gradeLevel || '4'}`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Middle / Right: Classification and Progress Bar */}
                  <div className="flex items-center gap-12 flex-wrap">
                    {/* Classification */}
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                        CLASSIFICATION
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {classification}
                      </span>
                    </div>

                    {/* Upload Progress */}
                    <div className="w-48">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        <span>UPLOAD PROGRESS</span>
                        <span className="text-[#D8232A] font-extrabold">
                          {Math.round((uploadedCount / requiredDocList.length) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#D8232A] rounded-full transition-all duration-500"
                          style={{ width: `${(uploadedCount / requiredDocList.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Required Items Section */}
              <div className="space-y-4 pt-2">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    REQUIRED ITEMS
                  </h3>
                </div>

                {/* Table Headers */}
                <div className="hidden md:grid grid-cols-[1fr_200px_200px] gap-4 px-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <div>DOCUMENT DETAILS</div>
                  <div className="text-center">STATUS</div>
                  <div className="text-right pr-4">ACTIONS</div>
                </div>

                {/* Document Rows */}
                <div className="space-y-3">
                  {requiredDocList.map((req, idx) => {
                    const deleteKey = `${selectedEnrollmentId}_${req.key}`;
                    const isDeletedLocally = deletedDocTypes[deleteKey];
                    const reqKey = documentTypeToRequirementKey(req.key as DocumentType);
                    const reqMeta = (selectedChild as any)?.requirementUploads?.[reqKey];

                    const docRecord = isDeletedLocally ? undefined : (childDocuments.find(d => d.documentType === req.key) || (reqMeta ? {
                      id: reqMeta.documentId || '',
                      enrollmentId: selectedEnrollmentId,
                      documentType: req.key as DocumentType,
                      fileName: reqMeta.fileName || req.title,
                      fileUrl: reqMeta.fileUrl || '',
                      mimeType: reqMeta.mimeType || 'application/pdf',
                      sizeBytes: reqMeta.sizeBytes || 0,
                      status: reqMeta.status || 'PENDING'
                    } as EnrollmentDocument : undefined));

                    const statusKey: StatusKey = reqMeta?.status 
                      ? (reqMeta.status as StatusKey) 
                      : docRecord 
                        ? (docRecord.status as StatusKey) ?? 'PENDING'
                        : 'NOT_UPLOADED';
                    const isUploading = uploadingDocType === req.key;
                    const progress = uploadProgress[req.key] ?? 0;
                    const docRec = docRecord as (EnrollmentDocument & { rejectionReason?: string }) | undefined;

                    return (
                      <motion.div
                        key={req.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                      >
                        <div className={`bg-white rounded-xl border border-slate-100 p-5 shadow-2xs transition-all duration-200 ${
                          !docRec && !stagedFiles[req.key] ? 'opacity-80' : ''
                        }`}>
                          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_200px] gap-4 items-center">
                            {/* Column 1: Document Details */}
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                {docRec || stagedFiles[req.key] ? (
                                  <FileText className="w-5 h-5 text-slate-400" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                                    <Plus className="w-3.5 h-3.5 text-slate-300" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className={`text-sm font-bold ${!docRec && !stagedFiles[req.key] ? 'text-slate-400' : 'text-slate-900'}`}>
                                  {req.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">{req.description}</p>
                                {(docRec || stagedFiles[req.key]) && (
                                  <p className="text-[10px] font-semibold text-[#D8232A] mt-1.5 truncate">
                                    {stagedFiles[req.key] ? stagedFiles[req.key].name : docRec?.fileName}{' '}
                                    <span className="text-slate-400 font-normal ml-1">
                                      {formatBytes(stagedFiles[req.key] ? stagedFiles[req.key].size : docRec?.sizeBytes || 0)}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Column 2: Status */}
                            <div className="flex items-center md:justify-center">
                              {isUploading ? (
                                <div className="w-full max-w-[120px]">
                                  <UploadProgressBar progress={progress} />
                                </div>
                              ) : (
                                <span className={`text-[10px] font-extrabold tracking-widest uppercase ${
                                  statusKey === 'APPROVED' ? 'text-emerald-600' :
                                  statusKey === 'PENDING' ? 'text-red-600' :
                                  statusKey === 'REJECTED' ? 'text-rose-600' :
                                  stagedFiles[req.key] ? 'text-amber-600' :
                                  'text-slate-300'
                                }`}>
                                  {statusKey === 'APPROVED' ? 'VERIFIED' :
                                   statusKey === 'PENDING' ? 'UNDER REVIEW' :
                                   statusKey === 'REJECTED' ? 'NEEDS RE-UPLOAD' :
                                   stagedFiles[req.key] ? 'DOCUMENT INSERTED' :
                                   'MISSING'}
                                </span>
                              )}
                            </div>

                            {/* Column 3: Actions */}
                            <div className="flex items-center justify-start md:justify-end gap-5">
                              {stagedFiles[req.key] ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const file = stagedFiles[req.key];
                                      const localUrl = URL.createObjectURL(file);
                                      openPreview(req.title, localUrl, file.type);
                                    }}
                                    className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 hover:text-slate-800 border-0 bg-transparent p-0 cursor-pointer outline-none transition-colors"
                                  >
                                    VIEW
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => fileInputRefs.current[req.key]?.click()}
                                    className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 hover:text-slate-800 border-0 bg-transparent p-0 cursor-pointer outline-none transition-colors"
                                  >
                                    REPLACE
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setStagedFiles(prev => {
                                        const next = { ...prev };
                                        delete next[req.key];
                                        return next;
                                      });
                                      if (fileInputRefs.current[req.key]) {
                                        fileInputRefs.current[req.key]!.value = '';
                                      }
                                    }}
                                    className="text-[10px] font-extrabold tracking-widest uppercase text-rose-600 hover:text-rose-700 border-0 bg-transparent p-0 cursor-pointer outline-none transition-colors"
                                  >
                                    DELETE
                                  </button>
                                </>
                              ) : docRec ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openPreview(req.title, docRec.fileUrl, docRec.mimeType)}
                                    className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 hover:text-slate-800 border-0 bg-transparent p-0 cursor-pointer outline-none transition-colors"
                                  >
                                    VIEW
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => fileInputRefs.current[req.key]?.click()}
                                    className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 hover:text-slate-800 border-0 bg-transparent p-0 cursor-pointer outline-none transition-colors"
                                  >
                                    REPLACE
                                  </button>
                                  {(() => {
                                    const isEnrolled = selectedChild?.status === 'Enrolled' || selectedChild?.status === 'Approved';
                                    return (
                                      <button
                                        type="button"
                                        disabled={isEnrolled}
                                        onClick={() => {
                                          if (isEnrolled) return;
                                          setDeleteConfirmDoc({
                                            docRecordId: docRec.id,
                                            docType: req.key,
                                            docName: req.title
                                          });
                                        }}
                                        className={`text-[10px] font-extrabold tracking-widest uppercase border-0 bg-transparent p-0 transition-colors outline-none ${
                                          isEnrolled
                                            ? 'text-slate-200 cursor-not-allowed'
                                            : 'text-rose-600 hover:text-rose-700 cursor-pointer'
                                        }`}
                                      >
                                        DELETE
                                      </button>
                                    );
                                  })()}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => fileInputRefs.current[req.key]?.click()}
                                  className="px-5 py-2 bg-[#D8232A] hover:bg-red-700 text-white rounded-lg text-[10px] font-black tracking-widest uppercase cursor-pointer border-0 outline-none transition-colors shadow-2xs"
                                >
                                  UPLOAD
                                </button>
                              )}
                              <input
                                type="file"
                                ref={el => { fileInputRefs.current[req.key] = el; }}
                                accept="image/*,.pdf,application/pdf"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 10 * 1024 * 1024) {
                                      setUploadError('File size exceeds 10MB limit. Please choose a smaller file.');
                                      return;
                                    }
                                    setUploadError(null);
                                    setStagedFiles(prev => ({ ...prev, [req.key]: file }));
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* ── EMPTY STATE ── */
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-12 text-center space-y-5">
                <div className="w-20 h-20 bg-[#0038A8]/8 rounded-full flex items-center justify-center mx-auto">
                  <FolderOpen className="w-10 h-10 text-[#0038A8]/60" />
                </div>
                <div className="space-y-2 max-w-sm mx-auto">
                  <h3 className="text-base font-black text-[#1E293B]">No Registered Learner Found</h3>
                  <p className="text-sm text-[#64748B] font-medium leading-relaxed">
                    You haven't registered any learners yet. Complete the student registration to start uploading verification documents here.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Footer for Staged Documents or Submission */}
      <footer className="h-20 sm:h-24 bg-white border-t border-slate-100 px-6 sm:px-10 flex items-center shrink-0">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-end gap-6 sm:gap-8">
          <button
            type="button"
            onClick={() => {
              setStagedFiles({});
              requiredDocList.forEach(req => {
                if (fileInputRefs.current[req.key]) {
                  fileInputRefs.current[req.key]!.value = '';
                }
              });
            }}
            className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-0 cursor-pointer p-0 outline-none"
          >
            DISCARD CHANGES
          </button>
          <button
            type="button"
            disabled={uploading || Object.keys(stagedFiles).length === 0}
            onClick={async () => {
              if (Object.keys(stagedFiles).length === 0 || !selectedEnrollmentId) return;
              setUploading(true);
              setUploadError(null);
              setSuccessMsg(null);
              try {
                for (const [docType, file] of Object.entries(stagedFiles)) {
                  setUploadingDocType(docType);
                  
                  // Progress simulation for batch uploads
                  let prog = 0;
                  const interval = setInterval(() => {
                    prog = Math.min(prog + Math.random() * 20, 90);
                    setUploadProgress(p => ({ ...p, [docType]: prog }));
                  }, 150);

                  try {
                    await uploadRequirementDocument({
                      enrollmentId: selectedEnrollmentId,
                      documentType: docType as DocumentType,
                      file
                    });
                    clearInterval(interval);
                    setUploadProgress(p => ({ ...p, [docType]: 100 }));
                    setTimeout(() => setUploadProgress(p => { const n = { ...p }; delete n[docType]; return n; }), 1000);
                  } catch (e) {
                    clearInterval(interval);
                    throw e;
                  }
                }
                setStagedFiles({});
                setSuccessMsg('Documents successfully submitted and saved!');
                setTimeout(() => setSuccessMsg(null), 5000);
              } catch (err: any) {
                console.error('Batch upload error:', err);
                setUploadError(err?.message || 'Failed to upload documents. Please try again.');
              } finally {
                setUploading(false);
                setUploadingDocType(null);
                setUploadProgress({});
              }
            }}
            className={`px-6 py-3 rounded-xl text-xs font-extrabold transition-all shadow-md border-0 outline-none flex items-center gap-2 cursor-pointer ${
              Object.keys(stagedFiles).length > 0
                ? 'bg-[#D8232A] hover:bg-red-700 text-white shadow-red-500/10'
                : 'bg-[#D8232A]/50 text-white opacity-80 cursor-not-allowed'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>UPLOADING...</span>
              </>
            ) : (
              <span>SUBMIT DOCUMENTS</span>
            )}
          </button>
        </div>
      </footer>

      {/* ── DOCUMENT PREVIEW MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreviewDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-[#0038A8]/10 rounded-xl flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#0038A8]" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{previewDoc.title}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">Document Preview</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 bg-slate-50 rounded-2xl overflow-auto flex items-center justify-center border border-slate-200/70 min-h-[300px]">
                {previewDoc.isPdf ? (
                  <iframe
                    src={previewDoc.url}
                    title={previewDoc.title}
                    className="w-full h-[60vh] rounded-xl border-none"
                  />
                ) : (
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.title}
                    className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-sm"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-1 shrink-0">
                <button
                  onClick={() => window.open(previewDoc.url, '_blank')}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#0038A8] hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Download Original
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-5 py-2 bg-[#0038A8] hover:bg-[#002d86] text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DELETE WARNING CONFIRMATION MODAL ────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirmDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-5 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-rose-100/80 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Delete Requirement Document?
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-slate-900">"{deleteConfirmDoc.docName}"</span>? This document will be permanently removed and you will need to re-upload it to complete verification.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmDoc(null)}
                  className="flex-1 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { docRecordId, docType, docName } = deleteConfirmDoc;
                    setDeleteConfirmDoc(null);
                    handleDelete(docRecordId, docType, docName);
                  }}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Document</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RequirementsView;

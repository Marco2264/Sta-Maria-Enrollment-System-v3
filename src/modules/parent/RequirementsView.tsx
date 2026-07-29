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
import { db } from '../../lib/firebase';
import { doc, deleteDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

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
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
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
        <span className="text-[#0038A8] flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Uploading document...
        </span>
        <span className="text-slate-500">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[#0038A8] to-blue-400 rounded-full"
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

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string; isPdf: boolean } | null>(null);

  // Upload history panel toggle per doc
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  // History records per doc type (loaded from Firestore on expand)
  const [historyData, setHistoryData] = useState<Record<string, HistoryEntry[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Auto-select latest child
  React.useEffect(() => {
    if (!selectedEnrollmentId && children.length > 0) {
      setSelectedEnrollmentId(children[children.length - 1].id);
    }
  }, [children, selectedEnrollmentId]);

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
        { key: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE, title: 'PSA Birth Certificate', description: 'Official Philippine Statistics Authority (PSA) birth certificate.' },
        { key: DOCUMENT_TYPES.REPORT_CARD,            title: 'Report Card (SF9)',           description: 'Official Form 138 / SF9 from previous school.' },
        { key: DOCUMENT_TYPES.GOOD_MORAL,             title: 'Good Moral Certificate',      description: 'Certificate of Good Moral Character from previous school.' }
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
  const uploadedCount = requiredDocList.filter(req =>
    childDocuments.some(d => d.documentType === req.key)
  ).length;

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
      // Reload history if expanded
      if (expandedHistory[docType]) loadHistory(docType);
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
  const handleDelete = async (docRecordId: string, docType: string, docName: string) => {
    setUploadError(null);
    setSuccessMsg(null);
    try {
      await deleteDoc(doc(db, 'enrollment_documents', docRecordId));
      setSuccessMsg(`"${docName}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setUploadError('Failed to delete document. Please try again.');
    }
  };

  // ─── History Loader ─────────────────────────────────────────────────────────
  const loadHistory = useCallback(async (docType: string) => {
    if (!selectedEnrollmentId) return;
    setHistoryLoading(h => ({ ...h, [docType]: true }));
    try {
      const q = query(
        collection(db, 'enrollment_documents'),
        where('enrollmentId', '==', selectedEnrollmentId),
        where('documentType', '==', docType),
        orderBy('uploadedAt', 'desc')
      );
      const snap = await getDocs(q);
      const entries: HistoryEntry[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      setHistoryData(h => ({ ...h, [docType]: entries }));
    } catch {
      setHistoryData(h => ({ ...h, [docType]: [] }));
    } finally {
      setHistoryLoading(h => ({ ...h, [docType]: false }));
    }
  }, [selectedEnrollmentId]);

  const toggleHistory = (docType: string) => {
    const willOpen = !expandedHistory[docType];
    setExpandedHistory(e => ({ ...e, [docType]: willOpen }));
    if (willOpen && !historyData[docType]) loadHistory(docType);
  };

  // ─── Preview Handler ────────────────────────────────────────────────────────
  const openPreview = (title: string, url: string, mimeType: string) => {
    const isPdf = mimeType === 'application/pdf' || url.toLowerCase().includes('.pdf');
    setPreviewDoc({ title, url, isPdf });
  };

  // ─── Registration status label ──────────────────────────────────────────────
  const regStatusLabel = (status: string) => {
    if (status === 'Enrolled') return { label: 'Officially Enrolled', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (status === 'Approved') return { label: 'Approved', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (status === 'Rejected') return { label: 'Rejected', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    return { label: 'Registration Submitted', color: 'text-blue-700 bg-blue-50 border-blue-200' };
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] font-sans">

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <header className="px-6 py-7 bg-white border-b border-slate-200/80 shrink-0">
        <div className="w-full">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-[#0038A8]/10 rounded-2xl flex items-center justify-center shrink-0">
                  <FolderOpen className="w-5 h-5 text-[#0038A8]" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-[#1E293B] tracking-tight leading-tight">Document Center</h1>
                  <p className="text-xs text-[#64748B] font-medium mt-0.5">
                    Manage and upload your learner's required documents. Uploads sync automatically with the Student Registration Form.
                  </p>
                </div>
              </div>
            </div>

            {/* Learner Selector */}
            {children.length > 0 && (
              <div className="w-full lg:w-80 space-y-1.5 shrink-0">
                <label className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest block">
                  Select Learner
                </label>
                <Select value={selectedEnrollmentId} onValueChange={setSelectedEnrollmentId}>
                  <SelectTrigger className="h-12 px-4 bg-slate-50 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 shadow-sm hover:bg-white transition-colors">
                    <SelectValue placeholder="Choose a learner..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200 shadow-lg">
                    {children.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="font-semibold">
                        {getCleanName(c)} — Grade {c.gradeLevel || 'Level'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-6 sm:px-8 py-6 space-y-6">

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
                <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-rose-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedChild ? (
            <>
              {/* ── REGISTRATION SUMMARY CARD ──────────────────────────── */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                  {/* Card top gradient accent */}
                  <div className="h-1 bg-gradient-to-r from-[#0038A8] via-blue-400 to-violet-500" />

                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#0038A8]/10 to-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                            <User className="w-6 h-6 text-[#0038A8]" />
                          </div>
                          <div>
                            <h2 className="text-lg font-black text-[#1E293B] leading-tight">{getCleanName(selectedChild)}</h2>
                            <p className="text-xs text-[#64748B] font-medium">Enrolled Learner</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {/* Grade */}
                          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                              <GraduationCap className="w-3 h-3" /> Grade
                            </div>
                            <p className="text-sm font-black text-[#1E293B]">Grade {selectedChild.gradeLevel}</p>
                          </div>

                          {/* Classification */}
                          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                              <Tag className="w-3 h-3" /> Classification
                            </div>
                            <p className="text-sm font-black text-[#1E293B] leading-tight">{classification}</p>
                          </div>

                          {/* Reg Status */}
                          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                              <FileCheck className="w-3 h-3" /> Status
                            </div>
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${regStatusLabel(selectedChild.status || '').color}`}>
                              {regStatusLabel(selectedChild.status || '').label}
                            </span>
                          </div>

                          {/* Documents progress */}
                          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                              <FilePlus2 className="w-3 h-3" /> Documents
                            </div>
                            <p className="text-sm font-black text-[#1E293B]">
                              <span className={uploadedCount === requiredDocList.length ? 'text-emerald-600' : 'text-[#0038A8]'}>
                                {uploadedCount}
                              </span>
                              <span className="text-slate-400"> of {requiredDocList.length}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Overall upload progress circle */}
                      <div className="shrink-0 flex flex-col items-center gap-1.5">
                        <div className="relative w-20 h-20">
                          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="32" fill="none" stroke="#E2E8F0" strokeWidth="7" />
                            <circle
                              cx="40" cy="40" r="32" fill="none"
                              stroke={uploadedCount === requiredDocList.length ? '#10B981' : '#0038A8'}
                              strokeWidth="7"
                              strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 32}`}
                              strokeDashoffset={`${2 * Math.PI * 32 * (1 - uploadedCount / requiredDocList.length)}`}
                              className="transition-all duration-700"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg font-black text-[#1E293B]">{Math.round((uploadedCount / requiredDocList.length) * 100)}%</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#64748B]">Completion</span>
                      </div>
                    </div>

                    {/* All-complete banner */}
                    {uploadedCount === requiredDocList.length && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <p className="text-xs font-bold text-emerald-800">
                          All required documents have been uploaded. No further action is required at this time.
                        </p>
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* ── SYNC INFO BANNER ───────────────────────────────────── */}
              <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3">
                <Info className="w-4 h-4 text-[#0038A8] shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 font-medium leading-relaxed">
                  <strong className="font-bold">Auto-sync enabled.</strong> Any document you upload, replace, or delete here is automatically reflected in your learner's Student Registration Form and registration summary. There is only one copy of every document in the system.
                </p>
              </div>

              {/* ── DOCUMENT CARDS ─────────────────────────────────────── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#1E293B] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0038A8]" />
                    Required Documents
                    <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold border border-slate-200">
                      {requiredDocList.length}
                    </span>
                  </h3>
                  <span className="text-[11px] font-semibold text-[#64748B]">
                    {uploadedCount} of {requiredDocList.length} uploaded
                  </span>
                </div>

                {documentsLoading ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-semibold">Loading documents...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requiredDocList.map((req, idx) => {
                      const docRecord = childDocuments.find(d => d.documentType === req.key);
                      const statusKey: StatusKey = docRecord
                        ? (docRecord.status as StatusKey) ?? 'PENDING'
                        : 'NOT_UPLOADED';
                      const isUploading = uploadingDocType === req.key;
                      const progress = uploadProgress[req.key] ?? 0;
                      const isHistoryOpen = expandedHistory[req.key] ?? false;
                      const docRec = docRecord as (EnrollmentDocument & { rejectionReason?: string }) | undefined;

                      return (
                        <motion.div
                          key={req.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.06 }}
                        >
                          <Card className="bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                            {/* Status accent line */}
                            <div className={`h-1 ${
                              statusKey === 'APPROVED' ? 'bg-emerald-400' :
                              statusKey === 'PENDING' ? 'bg-blue-400' :
                              statusKey === 'REJECTED' ? 'bg-rose-400' :
                              'bg-slate-200'
                            }`} />

                            <div className="p-5 sm:p-6 space-y-4">
                              {/* ── Card Header ── */}
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                    {DOC_ICONS[req.key] || <FileText className="w-5 h-5 text-slate-500" />}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="text-sm font-black text-[#1E293B]">{req.title}</h4>
                                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-black uppercase rounded-full border border-rose-200">
                                        Required
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#64748B] font-medium">{req.description}</p>
                                    {docRec && (
                                      <p className="text-[11px] font-bold text-[#0038A8] flex items-center gap-1.5 pt-0.5">
                                        <FileText className="w-3.5 h-3.5" />
                                        {docRec.fileName} <span className="text-[10px] text-slate-400 font-medium">({formatBytes(docRec.sizeBytes)})</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <StatusBadge status={statusKey} />
                              </div>

                              {/* ── Upload Progress ── */}
                              {isUploading && <UploadProgressBar progress={progress} />}

                              {/* Rejection feedback if any */}
                              {docRec && statusKey === 'REJECTED' && docRec.rejectionReason && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2">
                                  <CircleAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-[11px] font-bold text-rose-800">Rejection Reason:</p>
                                    <p className="text-[11px] text-rose-700 font-medium">{docRec.rejectionReason}</p>
                                  </div>
                                </div>
                              )}

                              {/* ── Not Uploaded hint ── */}
                              {!docRec && !isUploading && (
                                <div className="bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200 flex items-center gap-3">
                                  <FilePlus2 className="w-5 h-5 text-slate-300 shrink-0" />
                                  <p className="text-xs text-[#64748B] font-medium">
                                    No file has been uploaded for this requirement yet.
                                    Upload your document using the button below.
                                  </p>
                                </div>
                              )}

                              {/* ── Action Buttons ── */}
                              {!isUploading && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Hidden file input */}
                                  <input
                                    type="file"
                                    ref={el => { fileInputRefs.current[req.key] = el; }}
                                    accept="image/*,.pdf,application/pdf"
                                    className="hidden"
                                    onChange={e => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUpload(req.key as DocumentType, file);
                                    }}
                                  />

                                  {!docRec ? (
                                    <button
                                      type="button"
                                      onClick={() => fileInputRefs.current[req.key]?.click()}
                                      className="px-4 py-2 bg-[#0038A8] hover:bg-[#002d86] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                                    >
                                      <Upload className="w-3.5 h-3.5" /> Upload Document
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => openPreview(req.title, docRec.fileUrl, docRec.mimeType)}
                                        className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-[#0038A8]" /> View
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => fileInputRefs.current[req.key]?.click()}
                                        className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                      >
                                        <RefreshCw className="w-3.5 h-3.5 text-amber-500" /> Replace
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => window.open(docRec.fileUrl, '_blank')}
                                        className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                      >
                                        <Download className="w-3.5 h-3.5 text-violet-500" /> Download
                                      </button>

                                      {statusKey !== 'APPROVED' && (
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(docRec.id, req.key, req.title)}
                                          className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}

                              {/* ── Upload History Collapsible ── */}
                              <div className="border-t border-slate-100 pt-3">
                                <button
                                  type="button"
                                  onClick={() => toggleHistory(req.key)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-[#64748B] hover:text-[#0038A8] transition-colors"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  Upload History
                                  {isHistoryOpen
                                    ? <ChevronUp className="w-3.5 h-3.5" />
                                    : <ChevronDown className="w-3.5 h-3.5" />
                                  }
                                </button>

                                <AnimatePresence>
                                  {isHistoryOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="pt-3 space-y-2">
                                        {historyLoading[req.key] ? (
                                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading history...
                                          </div>
                                        ) : (historyData[req.key]?.length ?? 0) === 0 ? (
                                          <p className="text-[11px] text-slate-400 font-medium italic">
                                            No upload history available for this document.
                                          </p>
                                        ) : (
                                          historyData[req.key].map((entry, vi) => {
                                            const eStatus = (entry.status as StatusKey) ?? 'PENDING';
                                            const eCfg = STATUS_CONFIG[eStatus];
                                            return (
                                              <div key={entry.id} className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                                                <div className="flex items-start gap-2 min-w-0">
                                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${eCfg.bg} border ${eCfg.border}`}>
                                                    <span className={`text-[9px] font-black ${eCfg.text}`}>{vi + 1}</span>
                                                  </div>
                                                  <div className="min-w-0">
                                                    <p className="font-bold text-[#1E293B] truncate">{entry.fileName}</p>
                                                    <p className="text-[#64748B] font-medium">{formatUploadDate(entry.uploadedAt)}</p>
                                                    {entry.rejectionReason && (
                                                      <p className="text-rose-600 font-medium mt-0.5">Reason: {entry.rejectionReason}</p>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                  <span className={`px-2 py-1 rounded-full font-bold border ${eCfg.bg} ${eCfg.text} ${eCfg.border}`}>
                                                    {eCfg.label}
                                                  </span>
                                                  <button
                                                    onClick={() => openPreview(req.title, entry.fileUrl, entry.mimeType)}
                                                    className="text-[#0038A8] hover:underline font-bold flex items-center gap-0.5"
                                                  >
                                                    <Eye className="w-3 h-3" /> View
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
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
    </div>
  );
}

export default RequirementsView;

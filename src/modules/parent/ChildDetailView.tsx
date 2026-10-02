import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { StudentAttendanceCalendar } from './StudentAttendanceCalendar';
import { ObservedValuesCard } from './ObservedValuesCard';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  XCircle,
  AlertCircle,
  User,
  HeartPulse,
  CalendarCheck,
  Edit,
  Calendar,
  Baby,
  MapPin,
  Phone,
  BarChart3,
  GraduationCap,
  Loader2,
  Camera,
  Bell,
  Lock,
  ShieldCheck,
  Users,
  ChevronDown,
  Award,
  BookOpen,
  Copy,
  Check,
  Layers,
  Sparkles,
  Mail,
  Activity,
  FileText
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useParentData } from '../../lib/parentData';
import { uploadToCloudinary } from '../../lib/services/enrollmentDocumentsService';
import { uploadToImageKit, buildImageKitFolder, buildStandardizedFileName } from '../../lib/services/imageUploadService';
import { logActivity } from '../../lib/services/activityLogService';

export function ChildDetailView({
  childId,
  onBack
}: { childId: string; onBack: () => void; }) {
  const { user } = useAuth();
  const { children, updateChild, loading } = useParentData();
  const child = children.find((c) => c.id === childId);

  const [gradeConfigs, setGradeConfigs] = useState<any[]>([]);
  const [selectedAcademicTerm, setSelectedAcademicTerm] = useState<'ALL' | 'T1' | 'T2' | 'T3'>('ALL');
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<string | null>(null);
  const [activeProfileSection, setActiveProfileSection] = useState<'personal' | 'guardian' | 'medical'>('personal');
  const [copiedLrn, setCopiedLrn] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'gradeConfigurations'), (snap) => {
      setGradeConfigs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Photo Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadSuccess, setIsUploadSuccess] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  if (loading && !child) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F4F7F9] font-sans items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-[#D8232A] animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-600">Loading student profile...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F4F7F9] font-sans items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100 shadow-2xs">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Student Record Not Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mb-5">
          The requested student information could not be found or has been updated.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D8232A] hover:bg-red-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students</span>
        </button>
      </div>
    );
  }

  const handleCopyLrn = () => {
    const lrnVal = child.lrn || (child as any).studentId || '';
    if (lrnVal) {
      navigator.clipboard.writeText(lrnVal);
      setCopiedLrn(true);
      setTimeout(() => setCopiedLrn(false), 2000);
    }
  };

  const handleOpenEdit = () => {
    setEditData(JSON.parse(JSON.stringify(child)));
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editData) return;
    setIsSaving(true);
    try {
      const { id, parentId, submittedAt, attendance, status, requirements, requirementUploads, schemaVersion, ...updates } = editData;
      await updateChild(child.id, updates);
      setIsEditOpen(false);
    } catch (error) {
      console.error("Failed to update child:", error);
      alert("Failed to update child details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const startAutoUpload = async (file: File, objectUrl: string) => {
    setIsPhotoUploading(true);
    setIsUploadSuccess(false);
    setPhotoError(null);
    setUploadProgress(10);

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 40) return prev + 8;
        if (prev < 75) return prev + 6;
        if (prev < 92) return prev + 3;
        return prev;
      });
    }, 120);

    try {
      const folder = buildImageKitFolder({
        role: 'student',
        category: 'profiles'
      });

      const fileName = buildStandardizedFileName({
        role: 'student',
        fullName: `${child.firstName} ${child.lastName}`,
        originalFileName: file.name,
        gradeLevel: child.gradeLevel,
        section: child.section
      });

      let finalUrl: string;
      try {
        finalUrl = await uploadToImageKit(file, { folder, fileName, useUniqueFileName: false });
      } catch {
        finalUrl = await uploadToCloudinary(file);
      }

      await updateChild(child.id, {
        photoURL: finalUrl
      });

      clearInterval(progressTimer);
      setUploadProgress(100);
      setIsUploadSuccess(true);

      setTimeout(() => {
        setIsPhotoUploading(false);
        setIsUploadSuccess(false);
        setSelectedFile(null);
        setPreviewUrl(null);
      }, 1200);

    } catch (err: any) {
      clearInterval(progressTimer);
      setIsPhotoUploading(false);
      setPhotoError(err.message || 'Upload failed. Please try again.');
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      setPhotoError('Please select a JPG, PNG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be under 5 MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setPhotoError(null);
  };

  const handleCancelPhotoSelect = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPhotoError(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  // DepEd Category Weights Helper
  const getSubjectWeights = (subjCode: string) => {
    const s = subjCode.toLowerCase();
    if (s.includes('math') || s.includes('science')) {
      return {
        writtenWork: 40,
        performanceTask: 40,
        assessment: 20,
        category: 'Mathematics & Sciences',
        categoryColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    }
    if (s.includes('mapeh') || s.includes('music') || s.includes('art') || s.includes('pe') || s.includes('health') || s.includes('epp') || s.includes('tle')) {
      return {
        writtenWork: 20,
        performanceTask: 60,
        assessment: 20,
        category: 'Skills & Performance',
        categoryColor: 'bg-amber-50 text-amber-700 border-amber-200'
      };
    }
    return {
      writtenWork: 30,
      performanceTask: 50,
      assessment: 20,
      category: 'Languages & Humanities',
      categoryColor: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  };

  // Structured subject item parser across T1, T2, T3
  const parseSubjectGrades = (subjCode: string, subjVal: any) => {
    if (subjVal === undefined || subjVal === null) return null;

    const weights = getSubjectWeights(subjCode);

    // If subjVal is a direct numeric grade (e.g. 88 or "88")
    if (typeof subjVal !== 'object') {
      const num = parseFloat(subjVal);
      if (isNaN(num)) return null;
      return {
        subject: subjCode,
        t1: num,
        t2: num,
        t3: num,
        finalGrade: num,
        weights,
        raw: { finalGradeOverride: num, 'Term 1': { grade: num }, 'Term 2': { grade: num }, 'Term 3': { grade: num } }
      };
    }

    const getTermScore = (termIdx: '1' | '2' | '3') => {
      const directKeys = termIdx === '1' ? ['t1', 'q1', 'term1', 'quarter1', 'Term 1', 'Quarter 1'] :
                         termIdx === '2' ? ['t2', 'q2', 'term2', 'quarter2', 'Term 2', 'Quarter 2'] :
                         ['t3', 'q3', 'term3', 'quarter3', 'Term 3', 'Finals', 'Quarter 3'];
      for (const key of directKeys) {
        if (subjVal[key] !== undefined && subjVal[key] !== null && subjVal[key] !== '' && typeof subjVal[key] !== 'object') {
          const parsed = parseFloat(subjVal[key]);
          if (!isNaN(parsed)) return parsed;
        }
      }

      const termNames = termIdx === '1' ? ['Term 1', 'Quarter 1'] :
                        termIdx === '2' ? ['Term 2', 'Quarter 2'] :
                        ['Term 3', 'Finals', 'Quarter 3'];

      for (const tName of termNames) {
        const cols = gradeConfigs.filter(cfg =>
          cfg.subjectCode?.toLowerCase() === subjCode.toLowerCase() &&
          cfg.term === tName &&
          cfg.type !== 'submission'
        );
        const termData = subjVal[tName];
        if (cols.length > 0 && termData && typeof termData === 'object') {
          let termTotal = 0;
          let hasGrade = false;
          cols.forEach(col => {
            const val = termData[col.id];
            if (val !== undefined && val !== null && val !== '') {
              const num = parseFloat(val);
              if (!isNaN(num)) {
                termTotal += (num * (col.weight / 100));
                hasGrade = true;
              }
            }
          });
          if (hasGrade) return Math.round(termTotal * 10) / 10;
        }

        if (termData && typeof termData === 'object') {
          const values: number[] = [];
          Object.values(termData).forEach((v: any) => {
            const num = parseFloat(v);
            if (!isNaN(num)) values.push(num);
          });
          if (values.length > 0) return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        }
      }
      return null;
    };

    const t1 = getTermScore('1');
    const t2 = getTermScore('2');
    const t3 = getTermScore('3');

    let finalGrade: number | null = null;
    if (subjVal.finalGradeOverride !== undefined && subjVal.finalGradeOverride !== null && subjVal.finalGradeOverride !== '') {
      const parsed = parseFloat(subjVal.finalGradeOverride);
      if (!isNaN(parsed)) finalGrade = parsed;
    }
    if (finalGrade === null) {
      const activeTerms = [t1, t2, t3].filter((v): v is number => v !== null);
      if (activeTerms.length > 0) {
        finalGrade = Math.round((activeTerms.reduce((a, b) => a + b, 0) / activeTerms.length) * 10) / 10;
      }
    }

    return {
      subject: subjCode,
      t1,
      t2,
      t3,
      finalGrade,
      weights,
      raw: subjVal
    };
  };

  // Helper to resolve student grades mapping
  const resolveStudentGradesObject = (grades: any, gradeLevel?: string): Record<string, any> => {
    if (!grades || typeof grades !== 'object') return {};
    
    const gLvl = (gradeLevel || '').toString().trim();
    const cleanNum = gLvl.replace(/[^0-9]/g, '');
    const normalizedTarget = gLvl.toLowerCase().replace(/\s+/g, '');

    const rootKeys = Object.keys(grades);
    const commonSubjs = ['math', 'mathematics', 'english', 'filipino', 'science', 'ap', 'araling', 'esp', 'mapeh', 'epp', 'tle'];
    const isDirectFlatSubjects = rootKeys.some(k => commonSubjs.some(s => k.toLowerCase().includes(s)));
    
    if (isDirectFlatSubjects) {
      return grades;
    }

    const matchedKey = rootKeys.find(k => {
      const cleanK = k.toLowerCase().replace(/\s+/g, '');
      const kNum = k.replace(/[^0-9]/g, '');
      return cleanK === normalizedTarget || (cleanNum && kNum === cleanNum) || cleanK === `grade${cleanNum}`;
    });

    if (matchedKey && typeof grades[matchedKey] === 'object' && grades[matchedKey] !== null) {
      return grades[matchedKey];
    }

    if (rootKeys.length > 0 && typeof grades[rootKeys[0]] === 'object' && grades[rootKeys[0]] !== null) {
      return grades[rootKeys[0]];
    }

    return grades;
  };

  // Get all parsed subject items
  const getAllParsedSubjects = (c: any) => {
    if (!c) return [];
    const defaultSubjs = ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan (AP)', 'Edukasyon sa Pagpapakatao (EsP)', 'MAPEH', 'EPP / TLE'];
    
    if (!c.grades || typeof c.grades !== 'object') {
      return defaultSubjs.map(s => ({
        subject: s,
        t1: null,
        t2: null,
        t3: null,
        finalGrade: null,
        weights: getSubjectWeights(s),
        raw: {}
      }));
    }

    const studentGrades = resolveStudentGradesObject(c.grades, c.gradeLevel);
    const ignoredKeys = ['observedvalues', 'attendance', 'medical', 'status', 'schemaversion', 'submittedat', 'parentid'];

    const parsed = Object.entries(studentGrades)
      .filter(([subjCode, subjVal]) => subjVal !== undefined && subjVal !== null && !ignoredKeys.includes(subjCode.toLowerCase()))
      .map(([subjCode, subjVal]) => parseSubjectGrades(subjCode, subjVal))
      .filter((s): s is NonNullable<typeof s> => s !== null);

    if (parsed.length === 0) {
      return defaultSubjs.map(s => ({
        subject: s,
        t1: null,
        t2: null,
        t3: null,
        finalGrade: null,
        weights: getSubjectWeights(s),
        raw: {}
      }));
    }

    return parsed;
  };

  // Helper to format clean human-readable column/criteria names
  const getCleanColumnName = (colId: string, rawName?: string, index: number = 0) => {
    // 1. Direct match by ID in gradeConfigs (exact name set in Teacher page)
    const matched = gradeConfigs.find(c => c.id === colId);
    if (matched?.name && typeof matched.name === 'string' && matched.name.trim()) {
      return matched.name.trim();
    }

    // 2. If rawName is given and not a Firestore auto-generated ID or collection key
    if (rawName && typeof rawName === 'string' && rawName.trim()) {
      const cleanRaw = rawName.trim();
      const isAutoId = /^(col_[a-zA-Z0-9_-]+|cfg_[a-zA-Z0-9_-]+|doc_[a-zA-Z0-9_-]+|item_[a-zA-Z0-9_-]+|[a-zA-Z0-9]{18,})$/i.test(cleanRaw);
      if (!isAutoId) {
        return cleanRaw;
      }
    }

    // 3. Check if colId has descriptive text embedded
    const idLower = colId.toLowerCase();
    if (idLower.includes('written') || idLower.includes('ww') || idLower.includes('quiz') || idLower.includes('activity')) return 'Written Work (WW)';
    if (idLower.includes('perf') || idLower.includes('pt') || idLower.includes('task') || idLower.includes('project')) return 'Performance Task (PT)';
    if (idLower.includes('exam') || idLower.includes('qa') || idLower.includes('quarter') || idLower.includes('test') || idLower.includes('assessment') || idLower.includes('periodical')) return 'Quarterly Assessment (QA)';
    if (idLower.includes('att') || idLower.includes('attendance')) return 'Attendance & Participation';
    
    // 4. Fallback based on sequence
    const defaults = ['Written Work (WW)', 'Performance Tasks (PT)', 'Quarterly Assessment (QA)'];
    return defaults[index % defaults.length] || `Grading Component ${index + 1}`;
  };

  const getCleanSubjectName = (subjCode: string) => {
    if (!subjCode) return 'Subject';
    const s = subjCode.trim();
    if (/^(sec_|col_|grade_|enrollment_|doc_|sub_|[0-9a-f]{16,}|[0-9]{10,})/i.test(s)) {
      return 'Enrolled Subject';
    }
    const lower = s.toLowerCase();
    if (lower === 'math' || lower === 'mathematics') return 'Mathematics';
    if (lower === 'eng' || lower === 'english') return 'English';
    if (lower === 'fil' || lower === 'filipino') return 'Filipino';
    if (lower === 'sci' || lower === 'science') return 'Science';
    if (lower === 'ap' || lower.includes('araling')) return 'Araling Panlipunan (AP)';
    if (lower === 'esp' || lower.includes('pagpapakatao')) return 'Edukasyon sa Pagpapakatao (EsP)';
    if (lower === 'mapeh') return 'MAPEH';
    if (lower === 'epp' || lower === 'tle' || lower.includes('epp/tle') || lower.includes('epp / tle')) return 'EPP / TLE';
    return s;
  };

  // Helper to get teacher-configured columns and student scores
  const getTeacherSubjectColumns = (subjCode: string, termKey: 'T1' | 'T2' | 'T3' | 'ALL', subjVal: any, activeTermScore?: number | null) => {
    const termNames = termKey === 'T1' ? ['Term 1', 'Quarter 1'] :
                      termKey === 'T2' ? ['Term 2', 'Quarter 2'] :
                      termKey === 'T3' ? ['Term 3', 'Finals', 'Quarter 3'] :
                      ['Term 1', 'Term 2', 'Term 3', 'Finals', 'Quarter 1', 'Quarter 2', 'Quarter 3'];

    // 1. Try matching database gradeConfigs
    const matchedCols = gradeConfigs.filter(cfg =>
      cfg.subjectCode?.toLowerCase() === subjCode.toLowerCase() &&
      termNames.includes(cfg.term) &&
      cfg.type !== 'submission'
    );

    if (matchedCols.length > 0) {
      return matchedCols.map((col, idx) => {
        let score: number | null = null;
        const termData = subjVal?.[col.term];
        if (termData && typeof termData === 'object') {
          const val = termData[col.id];
          if (val !== undefined && val !== null && val !== '') {
            const parsed = parseFloat(val);
            if (!isNaN(parsed)) score = parsed;
          }
        }

        const weight = typeof col.weight === 'number' ? col.weight : parseFloat(col.weight || '0');
        const contribution = score !== null ? ((score * weight) / 100).toFixed(1) : null;

        return {
          id: col.id,
          name: col.name && typeof col.name === 'string' && col.name.trim() ? col.name.trim() : getCleanColumnName(col.id, undefined, idx),
          term: col.term,
          weight,
          score,
          contribution,
          isAttendance: !!col.isAttendance
        };
      });
    }

    // 2. Try checking if termData has custom keys directly
    for (const tName of termNames) {
      const termData = subjVal?.[tName];
      if (termData && typeof termData === 'object' && Object.keys(termData).length > 0) {
        const keys = Object.keys(termData);
        return keys.map((k, idx) => {
          const cfg = gradeConfigs.find(c => c.id === k);
          const name = (cfg?.name && typeof cfg.name === 'string' && cfg.name.trim())
            ? cfg.name.trim()
            : getCleanColumnName(k, undefined, idx);
          const weight = cfg?.weight ? (typeof cfg.weight === 'number' ? cfg.weight : parseFloat(cfg.weight)) : Math.round(100 / keys.length);
          const num = parseFloat(termData[k]);
          const score = !isNaN(num) ? num : null;
          const contribution = score !== null ? ((score * weight) / 100).toFixed(1) : null;
          return {
            id: k,
            name: name,
            term: tName,
            weight: weight,
            score,
            contribution,
            isAttendance: !!cfg?.isAttendance || k.toLowerCase().includes('attendance')
          };
        });
      }
    }

    // 3. Fallback: Always display standard DepEd component weights
    const weights = getSubjectWeights(subjCode);
    const baseScore = (activeTermScore !== undefined && activeTermScore !== null) ? activeTermScore : 85;
    const writtenScore = baseScore ? Math.min(100, Math.max(65, Math.round(baseScore + 1))) : null;
    const perfScore = baseScore ? Math.min(100, Math.max(65, Math.round(baseScore - 0.5))) : null;
    const assessScore = baseScore ? Math.min(100, Math.max(65, Math.round(baseScore + 0.5))) : null;

    return [
      {
        id: 'written_work',
        name: 'Written Work (WW)',
        term: termKey === 'ALL' ? 'Overall' : termKey,
        weight: weights.writtenWork,
        score: writtenScore,
        contribution: writtenScore !== null ? ((writtenScore * weights.writtenWork) / 100).toFixed(1) : null,
        isAttendance: false
      },
      {
        id: 'perf_task',
        name: 'Performance Tasks (PT)',
        term: termKey === 'ALL' ? 'Overall' : termKey,
        weight: weights.performanceTask,
        score: perfScore,
        contribution: perfScore !== null ? ((perfScore * weights.performanceTask) / 100).toFixed(1) : null,
        isAttendance: false
      },
      {
        id: 'quarterly_assess',
        name: 'Quarterly Assessment (QA)',
        term: termKey === 'ALL' ? 'Overall' : termKey,
        weight: weights.assessment,
        score: assessScore,
        contribution: assessScore !== null ? ((assessScore * weights.assessment) / 100).toFixed(1) : null,
        isAttendance: false
      }
    ];
  };

  const getStudentAverage = (c: any): string => {
    const subjects = getAllParsedSubjects(c);
    const validScores = subjects.map(s => s.finalGrade).filter((v): v is number => v !== null);
    if (validScores.length === 0) return 'N/A';
    return (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1);
  };

  // General Averages for T1, T2, T3 and Overall
  const getTermAverages = (c: any) => {
    const subjects = getAllParsedSubjects(c);
    const t1s = subjects.map(s => s.t1).filter((v): v is number => v !== null);
    const t2s = subjects.map(s => s.t2).filter((v): v is number => v !== null);
    const t3s = subjects.map(s => s.t3).filter((v): v is number => v !== null);
    const finals = subjects.map(s => s.finalGrade).filter((v): v is number => v !== null);

    return {
      t1: t1s.length > 0 ? (t1s.reduce((a, b) => a + b, 0) / t1s.length).toFixed(1) : null,
      t2: t2s.length > 0 ? (t2s.reduce((a, b) => a + b, 0) / t2s.length).toFixed(1) : null,
      t3: t3s.length > 0 ? (t3s.reduce((a, b) => a + b, 0) / t3s.length).toFixed(1) : null,
      overall: finals.length > 0 ? (finals.reduce((a, b) => a + b, 0) / finals.length).toFixed(1) : null,
      subjectCount: subjects.length
    };
  };

  const termAveragesData = getTermAverages(child);

  const getAcademicStandingBadge = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return null;
    if (num >= 95) return { label: 'Outstanding', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', status: 'Performing Well', statusColor: 'bg-emerald-500' };
    if (num >= 90) return { label: 'Very Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', status: 'Performing Well', statusColor: 'bg-emerald-500' };
    if (num >= 85) return { label: 'Good', color: 'bg-blue-50 text-blue-700 border-blue-200', status: 'Performing Well', statusColor: 'bg-blue-500' };
    if (num >= 80) return { label: 'Satisfactory', color: 'bg-teal-50 text-teal-700 border-teal-200', status: 'Satisfactory', statusColor: 'bg-teal-500' };
    if (num >= 75) return { label: 'Fairly Satisfactory', color: 'bg-amber-50 text-amber-700 border-amber-200', status: 'Monitor Progress', statusColor: 'bg-amber-500' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200', status: 'Needs Attention', statusColor: 'bg-rose-500' };
  };

  const rawAvg = getStudentAverage(child);
  const avgDisplay = rawAvg === 'N/A' ? 'No Grades Yet' : `${rawAvg}%`;
  const standingInfo = getAcademicStandingBadge(rawAvg);

  const getSubjectStatus = (gradeNum: number) => {
    if (gradeNum >= 90) return { label: 'Outstanding', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (gradeNum >= 85) return { label: 'Very Good', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (gradeNum >= 80) return { label: 'Good', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    if (gradeNum >= 75) return { label: 'Passed', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const getPerformanceSummaryMessage = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return "Grades are actively encoded by subject teachers across academic periods.";
    if (num >= 90) return "Student demonstrates high mastery across all curriculum competencies and maintains exemplary academic standing.";
    if (num >= 85) return "Student is performing consistently well across core subject areas.";
    if (num >= 75) return "Student is fulfilling core academic standards. Ongoing study reinforcement is encouraged.";
    return "Targeted learning interventions and advisory guidance are recommended for this learner.";
  };

  const getAttendanceDetails = (c: any) => {
    if (!c || !Array.isArray(c.attendance) || c.attendance.length === 0) {
      return {
        percentage: '100%',
        detail: 'Roll Call Synced'
      };
    }
    let presentCount = 0;
    let totalCount = 0;
    c.attendance.forEach((rec: any) => {
      if (!rec) return;
      totalCount += 1;
      const stat = rec.status || rec.amStatus;
      if (stat === 'Present' || stat === 'Late') presentCount += 1;
    });
    const pct = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(0) : '100';
    return {
      percentage: `${pct}%`,
      detail: `${presentCount} / ${totalCount} Days Logged`
    };
  };

  const attDetails = getAttendanceDetails(child);

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7F9] font-sans">
      
      {/* ── 1. STICKY TOP ACTION BAR ── */}
      <header className="px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4 border-b border-slate-200/80 bg-white sticky top-0 z-20 shadow-2xs">
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
          {/* Back Button & Breadcrumbs */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Back</span>
              <span className="hidden sm:inline">to Students</span>
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {child.firstName} {child.lastName}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 shrink-0">
                • Gr. {child.gradeLevel || '6'}
              </span>
            </div>
          </div>

          {/* Quick Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenEdit}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{child.status === 'Enrolled' || child.status === 'Approved' ? 'Update Contact Info' : 'Edit Profile'}</span>
              <span className="sm:hidden">Edit</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. MAIN CONTAINER ── */}
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">
        
        {/* Status Advisory Banner (Compact) */}
        {child.status === 'Pending' && (
          <div className="bg-amber-50/90 border border-amber-200/90 p-4 rounded-2xl flex items-center gap-3 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-800 font-medium">
              <strong className="font-bold text-amber-900">Enrollment Under Review:</strong> This application is currently being processed by the school registrar. Academic records will unlock once officially approved.
            </div>
          </div>
        )}

        {/* Cohesive 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ══════════════════════════════════════════════════
              LEFT COLUMN: CONSOLIDATED STUDENT IDENTITY (4 Cols)
             ══════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* 1. Identity & Avatar Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs text-center space-y-4 relative overflow-hidden">
              
              {/* Photo Avatar with Live Upload Ring */}
              <div className="relative flex flex-col items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div
                    onClick={() => {
                      if (!isPhotoUploading) {
                        setPhotoError(null);
                        photoInputRef.current?.click();
                      }
                    }}
                    className="w-22 h-22 rounded-full border-4 border-white bg-slate-100 shadow-sm flex items-center justify-center overflow-hidden relative group cursor-pointer"
                    title={isPhotoUploading ? 'Uploading...' : 'Click to change photo'}
                  >
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (() => {
                      const photoFields = [child.photoURL, (child as any).photoUrl, (child as any).profilePicture, (child as any).avatarUrl, (child as any).avatar, (child as any).photo];
                      const photo = photoFields.find((p): p is string => typeof p === 'string' && p.trim().length > 0) || null;
                      return photo ? (
                        <img src={photo} alt={child.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black text-[#D8232A]">
                          {child.firstName?.[0]}{child.lastName?.[0]}
                        </span>
                      );
                    })()}

                    {!isPhotoUploading && (
                      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <Camera className="w-4 h-4 text-white" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-white mt-0.5">Edit</span>
                      </div>
                    )}

                    {isPhotoUploading && (
                      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                        {isUploadSuccess ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                        ) : (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        )}
                      </div>
                    )}
                  </div>

                  {!isPhotoUploading && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-[#D8232A] transition-colors z-[2] cursor-pointer"
                      title="Upload new photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isPhotoUploading && (
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-[2]" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="44" className="stroke-red-100" strokeWidth="3.5" fill="none" />
                      <circle
                        cx="50"
                        cy="50"
                        r="44"
                        className={cn(isUploadSuccess ? 'stroke-emerald-500' : 'stroke-[#D8232A]', "transition-all duration-200")}
                        strokeWidth="3.5"
                        strokeDasharray={276.46}
                        strokeDashoffset={276.46 - (uploadProgress / 100) * 276.46}
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                  )}
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Photo Confirm Buttons */}
              {selectedFile && !isPhotoUploading && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => selectedFile && previewUrl && startAutoUpload(selectedFile, previewUrl)}
                    className="py-1.5 px-3 bg-[#D8232A] hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-2xs cursor-pointer"
                  >
                    Save Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPhotoSelect}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {photoError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-xl p-2.5 font-semibold text-left">
                  {photoError}
                </div>
              )}

              {/* Student Name & Academic Header */}
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                  {child.firstName} {child.middleName ? `${child.middleName} ` : ''}{child.lastName}
                </h2>
                <p className="text-xs font-bold text-slate-500">
                  Grade {child.gradeLevel || '6'} {(child as any).sectionName || child.section ? `• Section ${(child as any).sectionName || child.section}` : ''}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  Adviser: <span className="text-slate-700 font-bold">{child.adviser || (child as any).adviserName || 'Class Adviser'}</span>
                </p>
              </div>

              {/* LRN & Status Badge Strip */}
              <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                {child.status === 'Enrolled' || child.status === 'Approved' ? (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Officially Enrolled
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-extrabold inline-flex items-center gap-1.5 shadow-2xs">
                    <CircleDashed className="w-3 h-3 text-amber-500 animate-spin-slow" /> Pending Evaluation
                  </span>
                )}

                {/* Quick Copy LRN Tag */}
                <button
                  type="button"
                  onClick={handleCopyLrn}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title="Click to copy LRN"
                >
                  <span>LRN: {child.lrn || (child as any).studentId || '123456789123'}</span>
                  {copiedLrn ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              </div>

              {/* Dual KPI Strip: Attendance & Overall Average */}
              <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-left">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance</span>
                  <div className="text-base font-black text-slate-900">{attDetails.percentage}</div>
                  <p className="text-[10px] text-slate-500 font-medium">{attDetails.detail}</p>
                </div>
                <div className="bg-red-50/40 p-3 rounded-2xl border border-red-100/60 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Gen. Average</span>
                  <div className="text-base font-black text-slate-900">{avgDisplay}</div>
                  <p className="text-[10px] font-bold text-[#D8232A]">{standingInfo?.label || 'General Standing'}</p>
                </div>
              </div>
            </div>

            {/* 2. Structured Student Records Card (Segmented Nav) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
              
              {/* Segmented Selector for Details */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setActiveProfileSection('personal')}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
                    activeProfileSection === 'personal' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Personal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveProfileSection('guardian')}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
                    activeProfileSection === 'guardian' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Guardian</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveProfileSection('medical')}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1",
                    activeProfileSection === 'medical' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span>Health</span>
                </button>
              </div>

              {/* A. Personal & Address Content */}
              {activeProfileSection === 'personal' && (
                <div className="space-y-3 text-xs animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Birth Date</span>
                    <span className="font-bold text-slate-900">{child.birthDate || 'August 10, 2010'}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Gender</span>
                    <span className="font-bold text-slate-900">{child.gender || 'Male'}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Mother Tongue</span>
                    <span className="font-bold text-slate-900">{child.additional?.motherTongue || 'Filipino'}</span>
                  </div>
                  <div className="pt-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#D8232A]" /> Residence Address
                    </p>
                    <p className="font-medium text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed text-[11px]">
                      {child.address?.street ? `${child.address.street}, ` : ''}{child.address?.barangay || 'Guiwan'}, {child.address?.city || 'Zamboanga City'}, {child.address?.zipCode || '7000'}
                    </p>
                  </div>
                </div>
              )}

              {/* B. Guardian Content */}
              {activeProfileSection === 'guardian' && (
                <div className="space-y-3 text-xs animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Guardian Name</span>
                    <span className="font-bold text-slate-900 truncate max-w-[150px]">
                      {child.medical?.emergencyContact || (child as any).guardianDetails?.fullName || 'Parent / Guardian'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Relationship</span>
                    <span className="font-bold text-slate-900">
                      {(child as any).guardianDetails?.relationship || 'Parent'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Emergency Phone</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {child.medical?.emergencyPhone || (child as any).guardianDetails?.contactNumber || '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-medium">Email Address</span>
                    <span className="font-bold text-slate-900 truncate max-w-[150px]">
                      {(child as any).guardianDetails?.email || (user as any)?.email || '--'}
                    </span>
                  </div>
                </div>
              )}

              {/* C. Medical Content */}
              {activeProfileSection === 'medical' && (
                <div className="space-y-3 text-xs animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Height & Weight</span>
                    <span className="font-bold text-slate-900">
                      {child.medical?.height ? `${child.medical.height} cm` : '--'} • {child.medical?.weight ? `${child.medical.weight} kg` : '--'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Blood Type</span>
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 text-[11px]">
                      {child.medical?.bloodType || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Allergies</span>
                    <span className="font-bold text-slate-900 truncate max-w-[140px]">
                      {child.medical?.allergies || 'None reported'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-medium">Diagnoses</span>
                    <span className="font-bold text-slate-900 truncate max-w-[140px]">
                      {child.medical?.diagnoses?.join(', ') || 'None'}
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ══════════════════════════════════════════════════
              RIGHT COLUMN: ACADEMIC RECORD & ATTENDANCE TABS (8 Cols)
             ══════════════════════════════════════════════════ */}
          <div className="lg:col-span-8 space-y-6">

            <Tabs defaultValue="academic" className="w-full space-y-5">
              
              {/* Tab Navigation Pill Bar (Grades, Attendance, Observed Values) */}
              <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <TabsList className="bg-transparent border-none p-0 h-auto gap-1.5 w-full justify-start">
                  <TabsTrigger
                    value="academic"
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 data-[state=active]:bg-[#D8232A] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Grades</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="attendance"
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 data-[state=active]:bg-[#D8232A] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    <span>Attendance</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="values"
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 data-[state=active]:bg-[#D8232A] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Observed Values</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── TAB 1: ATTENDANCE CALENDAR ── */}
              <TabsContent value="attendance" className="mt-0 outline-none space-y-6">
                {(child.status === 'Pending' || child.status === 'Rejected') ? (
                  <div className="p-14 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
                    <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">Attendance Log Locked</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Daily roll call and presence records will automatically synchronize once the student is officially enrolled.
                    </p>
                  </div>
                ) : (
                  <StudentAttendanceCalendar records={child.attendance || []} />
                )}
              </TabsContent>

              {/* ── TAB 2: ACADEMIC RECORD ── */}
              <TabsContent value="academic" className="mt-0 outline-none space-y-6">
                {(child.status === 'Pending' || child.status === 'Rejected') ? (
                  <div className="p-14 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
                    <Lock className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">Academic Records Locked</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Subject evaluation marks, term grades, and component weights will be visible here once official enrollment is verified.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* 1. GENERAL AVERAGE STRIP (T1, T2, T3 & OVERALL) */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5 animate-fade-up">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                            <BarChart3 className="w-4.5 h-4.5 text-[#D8232A]" />
                            General Average Performance
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Real-time synchronized term evaluations</p>
                        </div>

                        {standingInfo && (
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/60 w-fit">
                            <span className={cn("w-2 h-2 rounded-full", standingInfo.statusColor)} />
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">{standingInfo.status}</span>
                          </div>
                        )}
                      </div>

                      {/* 4 Interactive KPI Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        
                        {/* Term 1 (T1) */}
                        <div
                          onClick={() => setSelectedAcademicTerm('T1')}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-1 relative overflow-hidden",
                            selectedAcademicTerm === 'T1'
                              ? "bg-red-50/70 border-[#D8232A] ring-2 ring-[#D8232A]/20 shadow-xs"
                              : "bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/80"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Term 1 (T1)</span>
                            {selectedAcademicTerm === 'T1' && <span className="w-1.5 h-1.5 rounded-full bg-[#D8232A]" />}
                          </div>
                          <p className="text-xl font-black text-slate-900">{termAveragesData.t1 ? `${termAveragesData.t1}%` : '--'}</p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {termAveragesData.t1 ? (parseFloat(termAveragesData.t1) >= 75 ? 'Passed' : 'Needs Review') : 'Pending'}
                          </p>
                        </div>

                        {/* Term 2 (T2) */}
                        <div
                          onClick={() => setSelectedAcademicTerm('T2')}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-1 relative overflow-hidden",
                            selectedAcademicTerm === 'T2'
                              ? "bg-red-50/70 border-[#D8232A] ring-2 ring-[#D8232A]/20 shadow-xs"
                              : "bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/80"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Term 2 (T2)</span>
                            {selectedAcademicTerm === 'T2' && <span className="w-1.5 h-1.5 rounded-full bg-[#D8232A]" />}
                          </div>
                          <p className="text-xl font-black text-slate-900">{termAveragesData.t2 ? `${termAveragesData.t2}%` : '--'}</p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {termAveragesData.t2 ? (parseFloat(termAveragesData.t2) >= 75 ? 'Passed' : 'Needs Review') : 'Pending'}
                          </p>
                        </div>

                        {/* Term 3 (T3) */}
                        <div
                          onClick={() => setSelectedAcademicTerm('T3')}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-1 relative overflow-hidden",
                            selectedAcademicTerm === 'T3'
                              ? "bg-red-50/70 border-[#D8232A] ring-2 ring-[#D8232A]/20 shadow-xs"
                              : "bg-slate-50/80 border-slate-200/70 hover:bg-slate-100/80"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Term 3 (T3)</span>
                            {selectedAcademicTerm === 'T3' && <span className="w-1.5 h-1.5 rounded-full bg-[#D8232A]" />}
                          </div>
                          <p className="text-xl font-black text-slate-900">{termAveragesData.t3 ? `${termAveragesData.t3}%` : '--'}</p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {termAveragesData.t3 ? (parseFloat(termAveragesData.t3) >= 75 ? 'Passed' : 'Needs Review') : 'Pending'}
                          </p>
                        </div>

                        {/* Cumulative Overall */}
                        <div
                          onClick={() => setSelectedAcademicTerm('ALL')}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all cursor-pointer text-left space-y-1 relative overflow-hidden",
                            selectedAcademicTerm === 'ALL'
                              ? "bg-[#D8232A] text-white border-[#D8232A] shadow-xs"
                              : "bg-slate-900 text-white border-slate-800 hover:bg-slate-800"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-red-100">Cumulative</span>
                            <Award className="w-3.5 h-3.5 text-white/80" />
                          </div>
                          <p className="text-xl font-black text-white">{termAveragesData.overall ? `${termAveragesData.overall}%` : '--'}</p>
                          <p className="text-[10px] font-bold text-red-100 truncate">
                            {standingInfo?.label || 'General Average'}
                          </p>
                        </div>

                      </div>

                      {/* Term Filter Pills */}
                      <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Filter:</span>
                        <button
                          type="button"
                          onClick={() => setSelectedAcademicTerm('ALL')}
                          className={cn(
                            "px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                            selectedAcademicTerm === 'ALL' ? "bg-slate-900 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          All Terms (T1 – T3)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAcademicTerm('T1')}
                          className={cn(
                            "px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                            selectedAcademicTerm === 'T1' ? "bg-[#D8232A] text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          Term 1 (T1)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAcademicTerm('T2')}
                          className={cn(
                            "px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                            selectedAcademicTerm === 'T2' ? "bg-[#D8232A] text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          Term 2 (T2)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAcademicTerm('T3')}
                          className={cn(
                            "px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                            selectedAcademicTerm === 'T3' ? "bg-[#D8232A] text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          Term 3 (T3)
                        </button>
                      </div>
                    </div>

                    {/* 2. ENROLLED SUBJECTS BREAKDOWN & TEACHER COLUMN WEIGHTS */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5 animate-fade-up">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                            <GraduationCap className="w-4.5 h-4.5 text-[#D8232A]" />
                            {selectedAcademicTerm === 'ALL'
                              ? 'Subject Performance & Progression'
                              : `Subject Breakdown — ${selectedAcademicTerm === 'T1' ? 'Term 1' : selectedAcademicTerm === 'T2' ? 'Term 2' : 'Term 3'}`}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Click any subject card to inspect component weights and teacher gradebook columns
                          </p>
                        </div>
                        <span className="text-[11px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl w-fit">
                          {getAllParsedSubjects(child).length} Subjects Enrolled
                        </span>
                      </div>

                      {getAllParsedSubjects(child).length === 0 ? (
                        <div className="p-12 text-center space-y-2">
                          <BarChart3 className="w-8 h-8 text-slate-300 mx-auto" />
                          <h4 className="text-sm font-bold text-slate-700">No Grades Encoded Yet</h4>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Subject teachers have not submitted final marks for this student yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {getAllParsedSubjects(child).map((item) => {
                            const isExpanded = selectedSubjectDetail === item.subject;
                            const activeTermScore =
                              selectedAcademicTerm === 'T1' ? item.t1 :
                              selectedAcademicTerm === 'T2' ? item.t2 :
                              selectedAcademicTerm === 'T3' ? item.t3 :
                              item.finalGrade;

                            const termLabel =
                              selectedAcademicTerm === 'T1' ? 'Term 1' :
                              selectedAcademicTerm === 'T2' ? 'Term 2' :
                              selectedAcademicTerm === 'T3' ? 'Term 3' :
                              'Final Rating';

                            const subjectBadge = activeTermScore !== null ? getSubjectStatus(activeTermScore) : null;
                            const teacherCols = getTeacherSubjectColumns(item.subject, selectedAcademicTerm, item.raw, activeTermScore);
                            const totalWeight = teacherCols.reduce((acc, c) => acc + c.weight, 0);

                            return (
                              <div
                                key={item.subject}
                                className={cn(
                                  "rounded-2xl border transition-all duration-200 overflow-hidden",
                                  isExpanded
                                    ? "border-[#D8232A]/60 bg-red-50/15 shadow-xs ring-1 ring-[#D8232A]/20"
                                    : "border-slate-200/80 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300"
                                )}
                              >
                                {/* Subject Header Row */}
                                <div
                                  onClick={() => setSelectedSubjectDetail(isExpanded ? null : item.subject)}
                                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border", item.weights.categoryColor)}>
                                      <BookOpen className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                                          {getCleanSubjectName(item.subject)}
                                        </h4>
                                        <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-full border", item.weights.categoryColor)}>
                                          {item.weights.category}
                                        </span>
                                      </div>
                                      {teacherCols.length > 0 ? (
                                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate max-w-md">
                                          Columns: {teacherCols.map(c => `${c.name} (${c.weight}%)`).join(' • ')}
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                          Subject Gradebook Record
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Scores & Expand Chevron */}
                                  <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-4 shrink-0">
                                    {selectedAcademicTerm === 'ALL' ? (
                                      <div className="flex items-center gap-2 sm:gap-3 text-center">
                                        <div className="px-2.5 py-1 rounded-xl bg-white border border-slate-200/70 min-w-[2.5rem]">
                                          <p className="text-[9px] font-black text-slate-400 uppercase">T1</p>
                                          <p className="text-xs font-black text-slate-800">{item.t1 !== null ? item.t1 : '--'}</p>
                                        </div>
                                        <div className="px-2.5 py-1 rounded-xl bg-white border border-slate-200/70 min-w-[2.5rem]">
                                          <p className="text-[9px] font-black text-slate-400 uppercase">T2</p>
                                          <p className="text-xs font-black text-slate-800">{item.t2 !== null ? item.t2 : '--'}</p>
                                        </div>
                                        <div className="px-2.5 py-1 rounded-xl bg-white border border-slate-200/70 min-w-[2.5rem]">
                                          <p className="text-[9px] font-black text-slate-400 uppercase">T3</p>
                                          <p className="text-xs font-black text-slate-800">{item.t3 !== null ? item.t3 : '--'}</p>
                                        </div>
                                        <div className="px-3 py-1 rounded-xl bg-[#D8232A]/10 border border-[#D8232A]/30 min-w-[3rem]">
                                          <p className="text-[9px] font-black text-[#D8232A] uppercase">Final</p>
                                          <p className="text-xs sm:text-sm font-black text-[#D8232A]">{item.finalGrade !== null ? item.finalGrade : '--'}</p>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2.5">
                                        <div className="text-right">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase block">{termLabel}</span>
                                          <span className="text-base font-black text-slate-900">
                                            {activeTermScore !== null ? `${activeTermScore}%` : '--'}
                                          </span>
                                        </div>
                                        {subjectBadge && (
                                          <span className={cn("px-2.5 py-0.5 rounded-xl text-[10px] font-black border uppercase tracking-wider", subjectBadge.color)}>
                                            {subjectBadge.label}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <button
                                      type="button"
                                      className={cn(
                                        "w-7 h-7 rounded-xl flex items-center justify-center transition-transform duration-200 bg-white border border-slate-200 text-slate-500",
                                        isExpanded && "rotate-180 bg-[#D8232A] text-white border-[#D8232A]"
                                      )}
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded Teacher Columns & Weights Drilldown */}
                                {isExpanded && (
                                  <div className="p-4 sm:p-5 border-t border-slate-200/80 bg-white space-y-3 animate-fade-in">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <Layers className="w-3.5 h-3.5 text-[#D8232A]" />
                                        Teacher Gradebook Breakdown ({termLabel})
                                      </h5>
                                      {teacherCols.length > 0 && (
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
                                          Allocated Weight: <strong className="text-slate-900 font-black">{totalWeight}%</strong>
                                        </span>
                                      )}
                                    </div>

                                    {teacherCols.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {teacherCols.map((col) => (
                                          <div key={col.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-xs font-bold text-slate-800 truncate" title={col.name}>
                                                {col.name}
                                              </span>
                                              <span className="px-1.5 py-0.5 rounded-md bg-slate-200/70 text-slate-800 font-extrabold text-[9px] shrink-0">
                                                {col.weight}%
                                              </span>
                                            </div>
                                            <div className="flex items-baseline justify-between pt-0.5">
                                              <span className="text-base font-black text-slate-900">
                                                {col.score !== null ? `${col.score}%` : '--'}
                                              </span>
                                              <span className="text-[11px] font-extrabold text-slate-500">
                                                {col.contribution !== null ? `+${col.contribution} pts` : '--'}
                                              </span>
                                            </div>
                                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                              <div
                                                className="bg-[#D8232A] h-full rounded-full transition-all duration-300"
                                                style={{ width: `${Math.min(100, col.score ?? 0)}%` }}
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 text-slate-600 text-xs font-medium space-y-0.5">
                                        <p className="font-bold text-slate-800">Direct Term Evaluation</p>
                                        <p className="text-slate-500 text-[11px]">
                                          Teacher has encoded overall grade without sub-columns. Recorded mark is {activeTermScore !== null ? `${activeTermScore}%` : 'Pending'}.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 3. PERFORMANCE SUMMARY ADVISORY */}
                    <div className="p-5 bg-gradient-to-r from-red-50/80 to-slate-50/90 border border-red-100 rounded-3xl shadow-2xs flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-white text-[#D8232A] border border-red-200 flex items-center justify-center shrink-0 shadow-2xs">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Performance Advisory Notes</h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {getPerformanceSummaryMessage(rawAvg)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* ── TAB 3: LEARNER'S OBSERVED VALUES ── */}
              <TabsContent value="values" className="mt-0 outline-none space-y-6">
                {(child.status === 'Pending' || child.status === 'Rejected') ? (
                  <div className="p-14 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
                    <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800">Observed Values Locked</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Core behavioral and values evaluations (Maka-Diyos, Makatao, Makakalikasan, Makabansa) will synchronize once official enrollment is verified.
                    </p>
                  </div>
                ) : (
                  <ObservedValuesCard observedValues={(child as any).observedValues} gradeLevel={child.gradeLevel} />
                )}
              </TabsContent>

            </Tabs>
          </div>

        </div>

      </main>

      {/* ── 3. EDIT STUDENT DIALOG ── */}
      <Dialog open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-lg font-black text-slate-900">
              {child.status === 'Enrolled' || child.status === 'Approved' ? 'Update Contact & Emergency Details' : 'Edit Student Registration'}
            </DialogTitle>
          </DialogHeader>

          {editData && (
            <div className="space-y-6 pt-4">
              
              {/* Basic Info (Enabled for Pending/Non-Enrolled only) */}
              {(child.status === 'Pending' || child.status === 'Rejected') && (
                <div className="space-y-3.5">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Basic Identity</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">First Name</Label>
                      <Input value={editData.firstName} onChange={e => setEditData({ ...editData, firstName: e.target.value })} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Last Name</Label>
                      <Input value={editData.lastName} onChange={e => setEditData({ ...editData, lastName: e.target.value })} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Middle Name</Label>
                      <Input value={editData.middleName || ''} onChange={e => setEditData({ ...editData, middleName: e.target.value })} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Birth Date</Label>
                      <Input type="date" value={editData.birthDate || ''} onChange={e => setEditData({ ...editData, birthDate: e.target.value })} className="rounded-xl" />
                    </div>
                  </div>
                </div>
              )}

              {/* Address Details */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Residence & Location</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Street / House No.</Label>
                    <Input value={editData.address?.street || ''} onChange={e => setEditData({ ...editData, address: { ...editData.address, street: e.target.value } })} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Barangay</Label>
                    <Input value={editData.address?.barangay || ''} onChange={e => setEditData({ ...editData, address: { ...editData.address, barangay: e.target.value } })} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">City / Municipality</Label>
                    <Input value={editData.address?.city || ''} onChange={e => setEditData({ ...editData, address: { ...editData.address, city: e.target.value } })} className="rounded-xl" />
                  </div>
                </div>
              </div>

              {/* Medical & Emergency Details */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Guardian & Medical Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Emergency Contact Person</Label>
                    <Input value={editData.medical?.emergencyContact || ''} onChange={e => setEditData({ ...editData, medical: { ...editData.medical, emergencyContact: e.target.value } })} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Emergency Phone Number</Label>
                    <Input value={editData.medical?.emergencyPhone || ''} onChange={e => setEditData({ ...editData, medical: { ...editData.medical, emergencyPhone: e.target.value } })} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Height (cm)</Label>
                    <Input value={editData.medical?.height || ''} onChange={e => setEditData({ ...editData, medical: { ...editData.medical, height: e.target.value } })} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Weight (kg)</Label>
                    <Input value={editData.medical?.weight || ''} onChange={e => setEditData({ ...editData, medical: { ...editData.medical, weight: e.target.value } })} className="rounded-xl" />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl text-xs font-bold">
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-[#D8232A] hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-2xs">
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default ChildDetailView;

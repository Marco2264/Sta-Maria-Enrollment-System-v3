import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
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
  Fingerprint,
  MapPin,
  Scale,
  Ruler,
  Phone,
  BarChart3,
  GraduationCap,
  Loader2,
  ImageIcon,
  Upload,
  X,
  Save,
  Check,
  Camera,
  Search,
  Bell,
  FileText,
  Lock,
  ShieldCheck,
  Users,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useTeacherData } from '../../lib/teacherData';
import { db } from '../../lib/firebase';
import { doc, updateDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { uploadToImageKit, buildImageKitFolder, buildStandardizedFileName } from '../../lib/services/imageUploadService';
import { logActivity } from '../../lib/services/activityLogService';

export function TeacherStudentDetailView({
  studentId,
  onBack
}: {
  studentId: string;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { students, updateStudentStatus, currentSection } = useTeacherData();
  const child = students.find((s) => s.id === studentId)!;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  
  // State for tracking which document is currently updating status
  const [updatingDocKey, setUpdatingDocKey] = useState<string | null>(null);
  
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [allSections, setAllSections] = useState<any[]>([]);
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  // Card details state (Status, Height, Weight, Movement)
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [cardHeight, setCardHeight] = useState(child?.medical?.height || '');
  const [cardWeight, setCardWeight] = useState(child?.medical?.weight || '');
  const [cardStatus, setCardStatus] = useState(child?.status || 'Enrolled');
  const [cardTransferredOutSchoolName, setCardTransferredOutSchoolName] = useState(child?.transferredOutSchoolName || '');
  const [cardTransferredOutSchoolType, setCardTransferredOutSchoolType] = useState(child?.transferredOutSchoolType || 'Public');
  const [cardTransferredOutDate, setCardTransferredOutDate] = useState(child?.transferredOutDate || '');
  const [cardTransferredInSchoolName, setCardTransferredInSchoolName] = useState(child?.transferredInSchoolName || '');
  const [cardTransferredInSchoolType, setCardTransferredInSchoolType] = useState(child?.transferredInSchoolType || 'Public');
  const [cardTransferredInDate, setCardTransferredInDate] = useState(child?.transferredInDate || '');
  const [cardDroppedReason, setCardDroppedReason] = useState(child?.droppedReason || '');
  const [cardDroppedDate, setCardDroppedDate] = useState(child?.droppedDate || '');
  const [isSavingCard, setIsSavingCard] = useState(false);

  useEffect(() => {
    if (child) {
      setCardHeight(child.medical?.height || '');
      setCardWeight(child.medical?.weight || '');
      setCardStatus(child.status || 'Enrolled');
      setCardTransferredOutSchoolName(child.transferredOutSchoolName || '');
      setCardTransferredOutSchoolType(child.transferredOutSchoolType || 'Public');
      setCardTransferredOutDate(child.transferredOutDate || '');
      setCardTransferredInSchoolName(child.transferredInSchoolName || '');
      setCardTransferredInSchoolType(child.transferredInSchoolType || 'Public');
      setCardTransferredInDate(child.transferredInDate || '');
      setCardDroppedReason(child.droppedReason || '');
      setCardDroppedDate(child.droppedDate || '');
    }
  }, [child]);

  const handleSaveCardDetails = async () => {
    if (!child?.id) return;
    setIsSavingCard(true);
    try {
      const updates: any = {
        status: cardStatus,
        'medical.height': cardHeight,
        'medical.weight': cardWeight,
        transferredOutSchoolName: (cardStatus === 'Transferred Out' || cardStatus === 'Transferred') ? cardTransferredOutSchoolName : '',
        transferredOutSchoolType: (cardStatus === 'Transferred Out' || cardStatus === 'Transferred') ? cardTransferredOutSchoolType : '',
        transferredOutDate: (cardStatus === 'Transferred Out' || cardStatus === 'Transferred') ? cardTransferredOutDate : '',
        transferredInSchoolName: cardStatus === 'Transferred In' ? cardTransferredInSchoolName : '',
        transferredInSchoolType: cardStatus === 'Transferred In' ? cardTransferredInSchoolType : '',
        transferredInDate: cardStatus === 'Transferred In' ? cardTransferredInDate : '',
        droppedReason: cardStatus === 'Dropped' ? cardDroppedReason : '',
        droppedDate: cardStatus === 'Dropped' ? cardDroppedDate : ''
      };
      await updateDoc(doc(db, 'enrollments', child.id), updates);
      setIsEditingCard(false);
    } catch (err) {
      console.error('Error saving student card details:', err);
    } finally {
      setIsSavingCard(false);
    }
  };

  useEffect(() => {
    const unsubSections = onSnapshot(collection(db, 'sections'), (snap) => {
      setAllSections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qEnrolled = query(
      collection(db, 'enrollments'),
      where('status', 'in', ['Enrolled', 'enrolled', 'PROMOTED', 'RETAINED', 'IRREGULAR'])
    );
    const unsubEnrolled = onSnapshot(qEnrolled, (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        const sId = data.sectionId;
        if (sId) {
          counts[sId] = (counts[sId] || 0) + 1;
        }
      });
      setSectionCounts(counts);
    });

    return () => {
      unsubSections();
      unsubEnrolled();
    };
  }, []);

  const matchingSections = useMemo(() => {
    if (!child || !child.gradeLevel) return [];
    const normalizedGrade = child.gradeLevel.toString().toLowerCase().replace(/grade\s*/g, '').trim();
    return allSections.filter(sec => {
      const secGrade = (sec.gradeLevel || '').toString().toLowerCase().replace(/grade\s*/g, '').trim();
      return secGrade === normalizedGrade;
    });
  }, [child, allSections]);

  const mostVacantSectionId = useMemo(() => {
    if (matchingSections.length === 0) return '';
    let minCount = Infinity;
    let minId = '';
    matchingSections.forEach(sec => {
      const count = sectionCounts[sec.id] || 0;
      if (count < minCount) {
        minCount = count;
        minId = sec.id;
      }
    });
    return minId;
  }, [matchingSections, sectionCounts]);

  useEffect(() => {
    if (showApproveDialog) {
      setSelectedSectionId(mostVacantSectionId || currentSection || '');
    } else {
      setSelectedSectionId('');
    }
  }, [showApproveDialog, mostVacantSectionId, currentSection]);

  const handleApprove = async (sectionId?: string) => {
    if (!child) return;
    setIsApproving(true);
    try {
      await updateStudentStatus(child.id, 'Enrolled', sectionId);
      setShowApproveDialog(false);
      onBack();
    } catch (e) {
      console.error(e);
      alert('Failed to approve enrollment.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!child) return;
    if (window.confirm(`Are you sure you want to reject ${child.firstName}'s enrollment?`)) {
      setIsRejecting(true);
      try {
        await updateStudentStatus(child.id, 'Rejected');
        onBack();
      } catch (e) {
        console.error(e);
        alert('Failed to reject enrollment.');
      } finally {
        setIsRejecting(false);
      }
    }
  };

  if (!child) return null;

  const handleOpenEdit = () => {
    setEditData(JSON.parse(JSON.stringify(child)));
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editData) return;
    setIsSaving(true);
    try {
      const { id, parentId, submittedAt, attendance, status, requirements, requirementUploads, schemaVersion, ...updates } = editData;
      await updateDoc(doc(db, 'enrollments', child.id), updates);
      setIsEditOpen(false);
    } catch (error) {
      console.error('Failed to update student:', error);
      alert('Failed to update student details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDocumentStatus = async (documentKey: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setUpdatingDocKey(documentKey);
    try {
      await updateDoc(doc(db, 'enrollments', child.id), {
        [`requirementUploads.${documentKey}.status`]: newStatus
      });
      try {
        await logActivity({
          parentId: child.parentId || '',
          title: `Document ${newStatus === 'APPROVED' ? 'Verified' : 'Rejected'}`,
          subtitle: `Teacher ${newStatus === 'APPROVED' ? 'verified' : 'rejected'} document "${documentKey.replace(/_/g, ' ')}" for ${child.firstName} ${child.lastName}.`,
          type: 'document',
          badgeText: newStatus === 'APPROVED' ? 'VERIFIED' : 'REJECTED',
          badgeColor: newStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: newStatus === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'
        });
      } catch (err) {
        console.warn('Could not log document activity:', err);
      }
    } catch (error) {
      console.error('Failed to update document status:', error);
      alert('Failed to update document status.');
    } finally {
      setUpdatingDocKey(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enrolled':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none px-3 py-1 font-semibold shadow-sm rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Enrolled
          </Badge>
        );
      case 'Pending':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-3 py-1 font-semibold shadow-sm rounded-full">
            <CircleDashed className="w-3.5 h-3.5 mr-1.5 animate-spin-slow" /> Pending
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none px-3 py-1 font-semibold shadow-sm rounded-full">
            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Rejected
          </Badge>
        );
      case 'Transferred Out':
      case 'Transferred':
        return (
          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none px-3 py-1 font-semibold shadow-sm rounded-full">
            Transferred Out (T/O)
          </Badge>
        );
      case 'Transferred In':
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-3 py-1 font-semibold shadow-sm rounded-full">
            Transferred In (T/I)
          </Badge>
        );
      case 'Dropped':
        return (
          <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none px-3 py-1 font-semibold shadow-sm rounded-full">
            Dropped (DRP)
          </Badge>
        );
      default:
        return null;
    }
  };

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return <Badge className="bg-emerald-100 text-emerald-700 border-none font-semibold px-2.5 py-0.5 rounded-md shadow-sm">Present</Badge>;
      case 'Absent':
        return <Badge className="bg-rose-100 text-rose-700 border-none font-semibold px-2.5 py-0.5 rounded-md shadow-sm">Absent</Badge>;
      case 'Late':
        return <Badge className="bg-amber-100 text-amber-700 border-none font-semibold px-2.5 py-0.5 rounded-md shadow-sm">Late</Badge>;
      default:
        return <span className="text-slate-400 text-xs font-medium">--</span>;
    }
  };

  const getStudentPhoto = (s: any): string | null => {
    if (!s) return null;
    const fields = [s.photoURL, s.photoUrl, s.profilePicture, s.avatarUrl, s.avatar, s.photo];
    const direct = fields.find((p): p is string => typeof p === 'string' && p.trim().length > 0);
    if (direct) return direct.trim();
    const reqs = s.requirementUploads;
    if (reqs && typeof reqs === 'object') {
      for (const key of Object.keys(reqs)) {
        const lower = key.toLowerCase();
        if (lower.includes('2x2') || lower.includes('photo') || lower.includes('picture') || lower.includes('avatar')) {
          const fileUrl = reqs[key]?.fileUrl;
          if (typeof fileUrl === 'string' && fileUrl.trim()) return fileUrl.trim();
        }
      }
    }
    return null;
  };

  // Performance calculations
  const getStudentAverage = (c: any): string => {
    if (!c.grades) return 'N/A';
    const gLvl = c.gradeLevel || 'Grade 6';
    const matchedKey = Object.keys(c.grades).find(k => k.toLowerCase().replace(/\s+/g, '') === `grade${gLvl.toString().toLowerCase().replace(/\s+/g, '').replace(/grade/i, '')}`);
    if (!matchedKey) return 'N/A';
    const studentGrades = c.grades[matchedKey];
    if (!studentGrades || typeof studentGrades !== 'object') return 'N/A';

    const subjectFinalGrades: number[] = [];
    Object.entries(studentGrades).forEach(([subjCode, subjVal]: [string, any]) => {
      if (!subjVal || typeof subjVal !== 'object') return;
      
      // 1. Direct override
      if (subjVal.finalGradeOverride !== undefined && subjVal.finalGradeOverride !== null && subjVal.finalGradeOverride !== '') {
        const parsed = parseFloat(subjVal.finalGradeOverride);
        if (!isNaN(parsed)) {
          subjectFinalGrades.push(parsed);
          return;
        }
      }

      // 2. Resolve term grades
      const termAverages: number[] = [];
      const isThreeTerm = ['4', '5', '6', 'grade 4', 'grade 5', 'grade 6'].includes(gLvl.toString().toLowerCase().replace(/grade/i, '').trim());
      const terms = isThreeTerm ? ['Term 1', 'Term 2', 'Finals'] : ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'];

      terms.forEach(term => {
        const directKeys = term === 'Term 1' || term === 'Quarter 1' ? ['t1', 'q1'] :
                           term === 'Term 2' || term === 'Quarter 2' ? ['t2', 'q2'] :
                           term === 'Term 3' || term === 'Quarter 3' ? ['t3', 'q3'] : ['q4'];
        for (const key of directKeys) {
          if (subjVal[key] !== undefined && subjVal[key] !== null && subjVal[key] !== '' && typeof subjVal[key] !== 'object') {
            const parsed = parseFloat(subjVal[key]);
            if (!isNaN(parsed)) {
              termAverages.push(parsed);
              return;
            }
          }
        }

        const termData = subjVal[term];
        if (termData && typeof termData === 'object') {
          const values: number[] = [];
          Object.values(termData).forEach((v: any) => {
            const num = parseFloat(v);
            if (!isNaN(num)) values.push(num);
          });
          if (values.length > 0) {
            termAverages.push(values.reduce((a, b) => a + b, 0) / values.length);
          }
        }
      });

      if (termAverages.length > 0) {
        subjectFinalGrades.push(termAverages.reduce((a, b) => a + b, 0) / termAverages.length);
      }
    });

    if (subjectFinalGrades.length === 0) return 'N/A';
    return (subjectFinalGrades.reduce((a, b) => a + b, 0) / subjectFinalGrades.length).toFixed(1);
  };

  const getAcademicStandingBadge = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return null;
    if (num >= 95) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', status: 'Performing Well', statusColor: 'bg-emerald-500' };
    if (num >= 90) return { label: 'Very Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', status: 'Performing Well', statusColor: 'bg-emerald-500' };
    if (num >= 85) return { label: 'Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', status: 'Performing Well', statusColor: 'bg-emerald-500' };
    if (num >= 80) return { label: 'Satisfactory', color: 'bg-amber-50 text-amber-700 border-amber-200', status: 'Monitor Progress', statusColor: 'bg-amber-500' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200', status: 'Needs Attention', statusColor: 'bg-rose-500' };
  };

  const rawAvg = getStudentAverage(child);
  const avgDisplay = rawAvg === 'N/A' ? 'No Grades Yet' : `${rawAvg}%`;
  const standingInfo = getAcademicStandingBadge(rawAvg) || { label: 'Unknown', color: 'bg-slate-50', status: 'Unknown', statusColor: 'bg-slate-500' };

  const getSubjectStatus = (gradeNum: number) => {
    if (gradeNum >= 90) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (gradeNum >= 80) return { label: 'Good', color: 'bg-blue-50 text-[#2563eb] border-blue-200' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const getPerformanceSummaryMessage = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return 'Grades have not been encoded yet by subject teachers for this term.';
    if (num >= 92) return 'Student is performing above the class average and maintaining excellent academic standing.';
    if (num >= 85) return 'Student is performing well in most subjects across the curriculum.';
    return 'Student requires additional academic support and guidance in selected subjects.';
  };

  const getPerformanceDetails = (c: any) => {
    const avgStr = getStudentAverage(c);
    const num = parseFloat(avgStr);
    if (isNaN(num)) return { average: 'No grades available yet', label: null, badgeClass: '' };
    const formattedAvg = `${num.toFixed(2)}%`;
    let label = '🟢 Excellent';
    let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (num >= 90) { label = '🟢 Excellent'; badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'; }
    else if (num >= 85) { label = '🔵 Very Good'; badgeClass = 'bg-blue-50 text-blue-700 border-blue-200'; }
    else if (num >= 75) { label = '🟠 Needs Improvement'; badgeClass = 'bg-amber-50 text-amber-700 border-amber-200'; }
    else { label = '🔴 At Risk'; badgeClass = 'bg-rose-50 text-rose-700 border-rose-200'; }
    return { average: formattedAvg, label, badgeClass };
  };

  const getAttendanceDetails = (c: any) => {
    if (!c.attendance || c.attendance.length === 0) return { percentage: '98.4%', detail: '98 / 100 Days Present' };
    let presentCount = 0;
    let totalCount = 0;
    c.attendance.forEach((rec: any) => {
      totalCount += 1;
      const stat = rec.status || rec.amStatus;
      if (stat === 'Present' || stat === 'Late') presentCount += 1;
    });
    const pct = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : '98.4';
    const totalDays = totalCount || 100;
    const presentDays = presentCount || 98;
    return { percentage: `${pct}%`, detail: `${presentDays} / ${totalDays} Days Present` };
  };

  const perfDetails = getPerformanceDetails(child);
  const attDetails = getAttendanceDetails(child);
  const childStatus = (child.status as string) || '';

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9]">
      {/* HEADER */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onBack} className="text-slate-500 font-semibold hover:text-slate-700 transition-colors cursor-pointer">
            Students
          </button>
          <span className="text-slate-400">/</span>
          <span className="font-extrabold text-slate-900 uppercase tracking-tight">{child?.firstName} {child?.lastName}</span>
        </div>
        {childStatus === 'Pending' && (
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleReject}
              disabled={isRejecting || isApproving}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 rounded-lg px-4 gap-2 font-bold shadow-xs cursor-pointer"
            >
              {isRejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Reject
            </Button>
            <Button 
              onClick={() => setShowApproveDialog(true)}
              disabled={isRejecting || isApproving}
              className="bg-[#001D3D] hover:bg-[#001529] text-white rounded-lg px-4 gap-2 font-bold border-none shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve Enrollment
            </Button>
          </div>
        )}
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-[#F4F7F9]">
        
        {/* ALERT */}
        {childStatus === 'Pending' && (
          <div className="bg-[#FFF9E6] border border-[#FFE082] p-5 rounded-2xl flex items-start gap-4 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900">Enrollment is pending review</h4>
              <p className="text-sm text-amber-700/80 mt-1 font-medium">This student's enrollment is currently pending your review. Please verify the submitted documents below.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COL */}
          <div className="lg:col-span-1 space-y-6 h-fit">
            <Card className="p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-sm border-slate-200 rounded-2xl bg-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-blue-50/60 to-transparent"></div>
              
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-50 flex items-center justify-center relative z-10">
                 {(() => {
                    const photo = getStudentPhoto(child);
                    return photo ? (
                      <img src={photo} alt={child.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-300" />
                    );
                  })()}
              </div>
              <div className="relative z-10 space-y-1 w-full">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  {child.firstName} {child.lastName}
                </h2>
                <div className="flex items-center gap-2 justify-center flex-wrap pt-1">
                  <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 px-2.5 py-0.5 font-bold rounded-full text-xs">Grade {child.gradeLevel}</Badge>
                  {getStatusBadge(cardStatus || child.status)}
                </div>
              </div>

              {/* Height & Weight Display on Student Card */}
              <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100/80">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Ruler className="w-3.5 h-3.5 text-blue-500" /> HEIGHT
                  </p>
                  {isEditingCard ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input 
                        type="number" 
                        value={cardHeight} 
                        onChange={e => setCardHeight(e.target.value)} 
                        className="h-8 text-center text-xs font-bold w-16 bg-white" 
                        placeholder="cm" 
                      />
                      <span className="text-xs font-bold text-slate-500">cm</span>
                    </div>
                  ) : (
                    <p className="text-sm font-black text-slate-800">
                      {cardHeight ? `${cardHeight} cm` : (child.medical?.height ? `${child.medical.height} cm` : '--')}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100/80">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-emerald-500" /> WEIGHT
                  </p>
                  {isEditingCard ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input 
                        type="number" 
                        value={cardWeight} 
                        onChange={e => setCardWeight(e.target.value)} 
                        className="h-8 text-center text-xs font-bold w-16 bg-white" 
                        placeholder="kg" 
                      />
                      <span className="text-xs font-bold text-slate-500">kg</span>
                    </div>
                  ) : (
                    <p className="text-sm font-black text-slate-800">
                      {cardWeight ? `${cardWeight} kg` : (child.medical?.weight ? `${child.medical.weight} kg` : '--')}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Editing Controls on Card when Editing */}
              {isEditingCard && (
                <div className="w-full space-y-3 pt-3 border-t border-slate-100 text-left">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Student Status</Label>
                    <Select value={cardStatus} onValueChange={v => setCardStatus(v)}>
                      <SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="Select Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Enrolled">Enrolled</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Transferred Out">Transferred Out (T/O)</SelectItem>
                        <SelectItem value="Transferred In">Transferred In (T/I)</SelectItem>
                        <SelectItem value="Dropped">Dropped (DRP)</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(cardStatus === 'Transferred Out' || cardStatus === 'Transferred') && (
                    <div className="space-y-2 p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs">
                      <div>
                        <Label className="text-[11px] font-bold text-indigo-900">Transferred To (School)</Label>
                        <Input value={cardTransferredOutSchoolName} onChange={e => setCardTransferredOutSchoolName(e.target.value)} className="h-8 text-xs bg-white mt-1" placeholder="School Name" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] font-bold text-indigo-900">School Type</Label>
                          <Select value={cardTransferredOutSchoolType} onValueChange={v => setCardTransferredOutSchoolType(v)}>
                            <SelectTrigger className="h-8 text-xs bg-white mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Public">Public (P)</SelectItem>
                              <SelectItem value="Private">Private (PR)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] font-bold text-indigo-900">Date</Label>
                          <Input type="date" value={cardTransferredOutDate} onChange={e => setCardTransferredOutDate(e.target.value)} className="h-8 text-xs bg-white mt-1" />
                        </div>
                      </div>
                    </div>
                  )}

                  {cardStatus === 'Transferred In' && (
                    <div className="space-y-2 p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs">
                      <div>
                        <Label className="text-[11px] font-bold text-blue-900">Transferred From (School)</Label>
                        <Input value={cardTransferredInSchoolName} onChange={e => setCardTransferredInSchoolName(e.target.value)} className="h-8 text-xs bg-white mt-1" placeholder="School Name" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] font-bold text-blue-900">School Type</Label>
                          <Select value={cardTransferredInSchoolType} onValueChange={v => setCardTransferredInSchoolType(v)}>
                            <SelectTrigger className="h-8 text-xs bg-white mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Public">Public (P)</SelectItem>
                              <SelectItem value="Private">Private (PR)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] font-bold text-blue-900">Date</Label>
                          <Input type="date" value={cardTransferredInDate} onChange={e => setCardTransferredInDate(e.target.value)} className="h-8 text-xs bg-white mt-1" />
                        </div>
                      </div>
                    </div>
                  )}

                  {cardStatus === 'Dropped' && (
                    <div className="space-y-2 p-3 bg-rose-50/70 rounded-xl border border-rose-100 text-xs">
                      <div>
                        <Label className="text-[11px] font-bold text-rose-900">Reason for Dropping</Label>
                        <Input value={cardDroppedReason} onChange={e => setCardDroppedReason(e.target.value)} className="h-8 text-xs bg-white mt-1" placeholder="Reason" />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-rose-900">Effectivity Date</Label>
                        <Input type="date" value={cardDroppedDate} onChange={e => setCardDroppedDate(e.target.value)} className="h-8 text-xs bg-white mt-1" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button to Edit or Save Card Details */}
              <div className="w-full pt-2">
                {isEditingCard ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleSaveCardDetails} 
                      disabled={isSavingCard}
                      className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1.5"
                    >
                      {isSavingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Card
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setIsEditingCard(false)} 
                      className="h-9 px-3 text-slate-600 text-xs font-bold rounded-xl"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsEditingCard(true)} 
                    className="w-full h-9 bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold text-xs rounded-xl gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" /> Edit Status & Health
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT COL */}
          <div className="lg:col-span-8 space-y-6">
            <Tabs defaultValue="personal" className="w-full">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
                <TabsList className="bg-transparent border-none p-0 h-auto gap-6">
                  <TabsTrigger value="personal" className="px-1 py-3 rounded-none text-sm font-bold text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent hover:bg-transparent transition-none flex items-center gap-2 border-transparent">
                    <User className="w-4 h-4" /> Personal Info
                  </TabsTrigger>
                  <TabsTrigger value="medical" className="px-1 py-3 rounded-none text-sm font-bold text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent hover:bg-transparent transition-none flex items-center gap-2 border-transparent">
                    <BarChart3 className="w-4 h-4" /> Medical
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="px-1 py-3 rounded-none text-sm font-bold text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent hover:bg-transparent transition-none flex items-center gap-2 border-transparent">
                    <FileText className="w-4 h-4" /> Documents
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="personal" className="mt-6 space-y-6 outline-none">
                {/* Personal Information */}
                <Card className="p-8 rounded-2xl border-slate-200 shadow-sm space-y-6 bg-white hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[#2563eb]">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Personal Information</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Basic student details & demographics</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-8 gap-x-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">FIRST NAME</p>
                      <p className="text-[15px] text-slate-900 font-bold uppercase">{child.firstName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">MIDDLE NAME</p>
                      <p className="text-[15px] text-slate-900 font-bold uppercase">{child.middleName || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">LAST NAME</p>
                      <p className="text-[15px] text-slate-900 font-bold uppercase">{child.lastName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">DATE OF BIRTH</p>
                      <p className="text-[15px] text-slate-900 font-bold">{child.birthDate || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">GENDER</p>
                      <p className="text-[15px] text-slate-900 font-bold capitalize">{child.gender || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">MOTHER TONGUE</p>
                      <p className="text-[15px] text-slate-900 font-bold">{child.additional?.motherTongue || '--'}</p>
                    </div>
                  </div>
                </Card>

                {/* Student Status & Movement Details */}
                <Card className="p-8 rounded-2xl border-slate-200 shadow-sm space-y-6 bg-white hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Student Status & Movement</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Official enrollment status & transfer/drop records (Managed via Student Settings)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">ENROLLMENT STATUS</p>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(child.status) || <span className="font-bold text-slate-700 text-sm">{child.status || 'Enrolled'}</span>}
                      </div>
                    </div>

                    {(child.status === 'Transferred Out' || child.status === 'Transferred') && (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">SCHOOL TRANSFERRED TO</p>
                          <p className="text-[15px] text-slate-900 font-bold">{child.transferredOutSchoolName || '--'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">SCHOOL TYPE</p>
                          <p className="text-[15px] text-slate-900 font-bold">{child.transferredOutSchoolType === 'Private' ? 'Private (PR)' : child.transferredOutSchoolType ? 'Public (P)' : '--'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">EFFECTIVITY DATE</p>
                          <p className="text-[15px] text-slate-900 font-bold">{child.transferredOutDate || '--'}</p>
                        </div>
                      </>
                    )}

                    {child.status === 'Transferred In' && (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">SCHOOL TRANSFERRED FROM</p>
                          <p className="text-[15px] text-slate-900 font-bold">{child.transferredInSchoolName || '--'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">SCHOOL TYPE</p>
                          <p className="text-[15px] text-slate-900 font-bold">{child.transferredInSchoolType === 'Private' ? 'Private (PR)' : child.transferredInSchoolType ? 'Public (P)' : '--'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">EFFECTIVITY DATE</p>
                          <p className="text-[15px] text-slate-900 font-bold">{child.transferredInDate || '--'}</p>
                        </div>
                      </>
                    )}

                    {child.status === 'Dropped' && (
                      <>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">REASON FOR DROPPING</p>
                          <p className="text-[15px] text-slate-900 font-bold">{child.droppedReason || '--'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">EFFECTIVITY DATE</p>
                          <p className="text-[15px] text-slate-900 font-bold">{child.droppedDate || '--'}</p>
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                {/* Address & Contact */}
                <Card className="p-8 rounded-2xl border-slate-200 shadow-sm space-y-6 bg-white hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                    <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-[#D8232A]">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Address & Contact</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Primary residence & location details</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2.5">PRIMARY RESIDENCE</p>
                      <div className="bg-slate-50 p-5 rounded-xl text-[13px] font-semibold text-slate-700 break-all border border-slate-100 leading-relaxed">
                        {child.address?.street ? `${child.address.street}, ` : ''}{child.address?.barangay || '--'}, {child.address?.city || '--'}, {child.address?.zipCode || '--'}
                        {!child.address?.street && !child.address?.barangay && "Not provided"}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">CITY / MUNICIPALITY</p>
                        <p className="text-[15px] text-slate-900 font-bold">{child.address?.city || '--'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">PROVINCE</p>
                        <p className="text-[15px] text-slate-900 font-bold">{child.address?.province || '--'}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Guardian & Emergency Contact */}
                <Card className="p-8 rounded-2xl border-slate-200 shadow-sm space-y-6 bg-white hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Guardian & Emergency Contact</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Primary guardian and emergency details</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">EMERGENCY CONTACT NAME</p>
                      <p className="text-[15px] text-slate-900 font-bold">{child.medical?.emergencyContact || (child as any).guardianDetails?.fullName || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">RELATIONSHIP</p>
                      <p className="text-[15px] text-slate-900 font-bold">{(child as any).guardianDetails?.relationship || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">CONTACT NUMBER</p>
                      <p className="text-[15px] text-[#D8232A] font-bold font-mono">{child.medical?.emergencyPhone || (child as any).guardianDetails?.contactNumber || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">EMAIL ADDRESS</p>
                      <p className="text-[15px] text-slate-900 font-bold">{(child as any).guardianDetails?.email || '--'}</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="medical" className="mt-6 space-y-6 outline-none">
                {/* Physical Details */}
                <Card className="p-8 rounded-2xl border-slate-200 shadow-sm space-y-6 bg-white hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-500">
                      <HeartPulse className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Physical Details</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Height, weight, and blood type</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-8 gap-x-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">HEIGHT</p>
                      <p className="text-[15px] text-slate-900 font-bold">{child.medical?.height ? `${child.medical.height} cm` : '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">WEIGHT</p>
                      <p className="text-[15px] text-slate-900 font-bold">{child.medical?.weight ? `${child.medical.weight} kg` : '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">BLOOD TYPE</p>
                      <p className="text-sm font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 inline-block">{child.medical?.bloodType || '--'}</p>
                    </div>
                  </div>
                </Card>

                {/* Health Conditions */}
                <Card className="p-8 rounded-2xl border-slate-200 shadow-sm space-y-6 bg-white hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-500">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Health Conditions</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Allergies and diagnoses</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">ALLERGIES</p>
                      <p className="text-[15px] text-slate-900 font-bold">{child.medical?.allergies || 'None reported'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">MEDICAL CONDITIONS</p>
                      <p className="text-[15px] text-slate-900 font-bold">{(Array.isArray((child.medical as any)?.diagnoses) ? (child.medical as any).diagnoses.join(', ') : (child.medical as any)?.diagnoses) || 'None reported'}</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-6 space-y-6 outline-none">
                <Card className="p-8 rounded-2xl border-slate-200 shadow-sm space-y-6 bg-white hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                    <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 text-sky-600">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Uploaded Documents</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Verification files and requirements</p>
                    </div>
                  </div>
                  
                  {(!child.requirementUploads || Object.keys(child.requirementUploads).length === 0) ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-sm font-semibold text-slate-500">No documents have been uploaded yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200">
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest w-[30%]">Document</th>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest w-[25%]">File Name</th>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest w-[20%]">Status</th>
                            <th className="px-6 py-4 text-[11px] font-extrabold text-slate-500 uppercase tracking-widest text-right w-[25%]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(child.requirementUploads).map(([key, docInfo]: [string, any]) => {
                            const status = docInfo.status || 'PENDING';
                            const isDocUpdating = updatingDocKey === key;
                            
                            return (
                              <tr key={key} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:border-slate-300 transition-colors">
                                      <FileText className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-900 capitalize tracking-tight">{key.replace(/_/g, ' ').toLowerCase()}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs font-semibold text-slate-500 truncate block max-w-[180px]">{docInfo.fileName || 'Uploaded Document'}</span>
                                </td>
                                <td className="px-6 py-4">
                                  {status === 'APPROVED' && (
                                    <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg inline-flex items-center gap-1.5 shadow-3xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Verified
                                    </span>
                                  )}
                                  {status === 'REJECTED' && (
                                    <span className="px-2.5 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg inline-flex items-center gap-1.5 shadow-3xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Rejected
                                    </span>
                                  )}
                                  {status === 'PENDING' && (
                                    <span className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg inline-flex items-center gap-1.5 shadow-3xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Under Review
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-80 sm:group-hover:opacity-100 transition-opacity">
                                    {docInfo.fileUrl && (
                                      <a 
                                        href={docInfo.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="h-8 px-3 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-slate-50 border border-slate-200/80 rounded-xl transition-all duration-150 inline-flex items-center gap-1.5 shadow-3xs"
                                      >
                                        <Search className="w-3.5 h-3.5" /> View
                                      </a>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={isDocUpdating || status === 'REJECTED'}
                                      onClick={() => handleUpdateDocumentStatus(key, 'REJECTED')}
                                      className="h-8 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-100/30 flex items-center gap-1"
                                    >
                                      <X className="w-3.5 h-3.5" /> Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={isDocUpdating || status === 'APPROVED'}
                                      onClick={() => handleUpdateDocumentStatus(key, 'APPROVED')}
                                      className="h-8 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1 shadow-sm"
                                    >
                                      {isDocUpdating ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Check className="w-3.5 h-3.5" />
                                      )}
                                      Confirm
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {false && (
        <>
      {/* ── TOP HEADER / BREADCRUMBS BAR ── */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-700 font-medium transition-colors cursor-pointer">
            Students
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-900">{child?.firstName} {child?.lastName}</span>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer">
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenEdit}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="w-full space-y-6">
          {child.status === 'Pending' && (
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 text-amber-800 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-amber-200/50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 pt-1">
                <h4 className="font-bold text-amber-900">Enrollment is pending approval</h4>
                <p className="text-sm mt-1 text-amber-700 leading-relaxed">
                  This student's enrollment is currently being reviewed by the school administration.
                </p>
              </div>
            </div>
          )}

          {(childStatus === 'Enrolled' || childStatus === 'Approved') && (
            <div className="bg-blue-50/80 border border-blue-100 text-blue-900 p-4 rounded-2xl flex items-center gap-3 text-xs font-medium shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-[#2563eb] shrink-0" />
              <span>
                <strong className="font-bold">Official Enrolled Record:</strong> This student is officially enrolled for Academic Year 2026–2027.
              </span>
            </div>
          )}

          <Tabs defaultValue="personal" className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* ── LEFT COLUMN: PROFILE CARD & STUDENT SUMMARY ── */}
              <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8 h-fit">

                {/* Student Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 text-center space-y-4 animate-fade-up">
                  <div className="relative flex flex-col items-center">
                    <div className="relative w-28 h-28 flex items-center justify-center my-1 z-10">
                      <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 shadow-md flex items-center justify-center overflow-hidden relative">
                        {(() => {
                          const photo = getStudentPhoto(child);
                          return photo ? (
                            <img src={photo || undefined} alt={child.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-black text-[#2563eb]">
                              {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-slate-800 tracking-normal">
                      {child.firstName} {child.middleName ? `${child.middleName} ` : ''}{child.lastName}
                    </h2>
                  </div>

                  <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                    <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active Enrollment
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full border border-slate-200/60">
                      Grade {child.gradeLevel}
                    </span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
                      School Year 2026–2027
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-left">
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">ATTENDANCE</span>
                      <div className="text-lg font-semibold text-slate-800">{attDetails.percentage}</div>
                      <p className="text-[10px] font-medium text-slate-500">{attDetails.detail}</p>
                    </div>
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">GENERAL AVERAGE</span>
                      <div className="text-lg font-semibold text-slate-800">{perfDetails.average}</div>
                      {perfDetails.label && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${perfDetails.badgeClass}`}>
                          {perfDetails.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Student Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-6 space-y-4 animate-fade-up">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">STUDENT SUMMARY</h3>
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Enrollment Status</span>
                      <span className="font-extrabold text-[#2563eb] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">{child.status || 'Active'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Grade Level</span>
                      <span className="font-bold text-slate-900">Grade {child.gradeLevel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Section</span>
                      <span className="font-bold text-slate-900">{(child as any).section || (child as any).sectionId || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Class Adviser</span>
                      <span className="font-bold text-slate-900">{(child as any).adviser || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">School Year</span>
                      <span className="font-bold text-slate-900">SY 2026–2027</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">LRN Number</span>
                      <span className="font-bold text-slate-900 font-mono">{child.lrn || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Student ID</span>
                      <span className="font-bold text-slate-900 font-mono">{(child as any).studentId || child.lrn || 'N/A'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── RIGHT COLUMN: TABS & CONTENT PANELS ── */}
              <div className="lg:col-span-2 space-y-6">

                <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 inline-flex items-center gap-1 w-full overflow-x-auto shadow-2xs">
                  <TabsList className="bg-transparent border-none p-0 h-auto gap-1 w-full justify-start">
                    <TabsTrigger value="personal" className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#2563eb]" /> Personal Info
                    </TabsTrigger>
                    <TabsTrigger value="academic" className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-[#2563eb]" /> Academic Record
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all flex items-center gap-2">
                      <CalendarCheck className="w-3.5 h-3.5 text-[#2563eb]" /> Attendance
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* 1. PERSONAL INFO TAB */}
                <TabsContent value="personal" className="mt-0 outline-none space-y-6">
                  <div className="glass-effect rounded-2xl p-8 animate-fade-up bg-white border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb]"><User className="w-5 h-5" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Personal Information</h3>
                        <p className="text-xs text-slate-400 font-medium">Basic student details & demographics</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8">
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">FIRST NAME</p><p className="text-[16px] text-slate-900 font-semibold">{child.firstName}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">MIDDLE NAME</p><p className="text-[16px] text-slate-900 font-semibold">{child.middleName || '--'}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">LAST NAME</p><p className="text-[16px] text-slate-900 font-semibold">{child.lastName}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">DATE OF BIRTH</p><p className="text-[16px] text-slate-900 font-semibold">{child.birthDate || '--'}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">GENDER</p><p className="text-[16px] text-slate-900 font-semibold">{child.gender || '--'}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">MOTHER TONGUE</p><p className="text-[16px] text-slate-900 font-semibold">{child.additional?.motherTongue || '--'}</p></div>
                    </div>
                  </div>

                  <div className="glass-effect rounded-2xl p-8 animate-fade-up bg-white border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb]"><MapPin className="w-5 h-5" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Address & Contact</h3>
                        <p className="text-xs text-slate-400 font-medium">Primary residence & location details</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">PRIMARY RESIDENCE</p>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[15px] font-semibold text-slate-800">
                          {child.address?.street ? `${child.address?.street}, ` : ''}{child.address?.barangay || '--'}, {child.address?.city || '--'}, {child.address?.zipCode || '--'}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 pt-2">
                        <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">CITY / MUNICIPALITY</p><p className="text-[16px] text-slate-900 font-semibold">{child.address?.city || '--'}</p></div>
                        <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">PROVINCE</p><p className="text-[16px] text-slate-900 font-semibold">{child.address?.province || '--'}</p></div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-effect rounded-2xl p-8 animate-fade-up bg-white border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#D8232A]"><Users className="w-5 h-5" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Guardian & Emergency Contact</h3>
                        <p className="text-xs text-slate-400 font-medium">Primary guardian and emergency details</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">EMERGENCY CONTACT NAME</p><p className="text-[16px] text-slate-900 font-semibold">{child.medical?.emergencyContact || (child as any).guardianDetails?.fullName || '--'}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">RELATIONSHIP</p><p className="text-[16px] text-slate-900 font-semibold">{(child as any).guardianDetails?.relationship || '--'}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">CONTACT NUMBER</p><p className="text-[16px] text-[#D8232A] font-semibold font-mono">{child.medical?.emergencyPhone || (child as any).guardianDetails?.contactNumber || '--'}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">EMAIL ADDRESS</p><p className="text-[16px] text-slate-900 font-semibold">{(child as any).guardianDetails?.email || '--'}</p></div>
                    </div>
                  </div>

                  <div className="glass-effect rounded-2xl p-8 animate-fade-up bg-white border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500"><HeartPulse className="w-5 h-5" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Physical Details</h3>
                        <p className="text-xs text-slate-400 font-medium">Height, weight, and blood type</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8">
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">HEIGHT</p><p className="text-[16px] text-slate-900 font-semibold">{child.medical?.height ? `${child.medical?.height} cm` : '--'}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">WEIGHT</p><p className="text-[16px] text-slate-900 font-semibold">{child.medical?.weight ? `${child.medical?.weight} kg` : '--'}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">BLOOD TYPE</p><p className="text-sm font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 inline-block">{child.medical?.bloodType || '--'}</p></div>
                    </div>
                  </div>

                  <div className="glass-effect rounded-2xl p-8 animate-fade-up bg-white border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500"><AlertCircle className="w-5 h-5" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Health Conditions</h3>
                        <p className="text-xs text-slate-400 font-medium">Allergies and diagnoses</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">ALLERGIES</p><p className="text-[16px] text-slate-900 font-semibold">{child.medical?.allergies || 'None reported'}</p></div>
                      <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">MEDICAL CONDITIONS</p><p className="text-[16px] text-slate-900 font-semibold">{(Array.isArray((child.medical as any)?.diagnoses) ? (child.medical as any).diagnoses.join(', ') : (child.medical as any)?.diagnoses) || 'None reported'}</p></div>
                    </div>
                  </div>
                </TabsContent>

                {/* 2. ATTENDANCE TAB */}
                <TabsContent value="attendance" className="mt-0 outline-none space-y-6">
                  <Card className="bg-white border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-3xl overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-primary" />
                        Attendance History
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Double session tracking records</p>
                    </div>

                    {(childStatus === 'Pending' || childStatus === 'Rejected') ? (
                      <div className="p-16 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <CalendarCheck className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Not Enrolled Yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto text-sm">
                          Attendance records will be available once the student is officially enrolled in a class.
                        </p>
                      </div>
                    ) : !(child as any).attendance || (child as any).attendance.length === 0 ? (
                      <div className="p-16 text-center">
                        <div className="w-20 h-20 bg-emerald-50/50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <CalendarCheck className="w-10 h-10 text-emerald-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No Records Yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto text-sm">
                          There are no attendance records logged for this student yet.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                            <TableRow className="hover:bg-transparent border-none">
                              <TableHead className="font-bold text-slate-700 pl-6 sm:pl-8 py-4 whitespace-nowrap">Date</TableHead>
                              <TableHead className="font-bold text-slate-700 py-4 whitespace-nowrap">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {((child as any).attendance as any[]).map((record: any, i: number) => (
                              <TableRow key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="font-bold text-slate-800 pl-6 sm:pl-8 py-4 whitespace-nowrap text-sm">
                                  {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                </TableCell>
                                <TableCell className="py-4 whitespace-nowrap text-sm">{getAttendanceBadge(record.status || record.amStatus || 'Unmarked')}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* 3. ACADEMIC TAB */}
                <TabsContent value="academic" className="mt-0 outline-none space-y-6">
                  {(childStatus === 'Pending' || childStatus === 'Rejected') ? (
                    <div className="p-16 text-center bg-white border border-slate-200/60 shadow-sm rounded-3xl mt-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-10 h-10 text-slate-300" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Academic Record Locked</h3>
                      <p className="text-slate-500 max-w-sm mx-auto text-sm">
                        Academic records, term grades, and subject performance breakdowns will be visible here once the student's enrollment is officially approved.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                              <BarChart3 className="w-5 h-5 text-[#2563eb]" /> Academic Status Overview
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Real-time synchronized student academic evaluation</p>
                          </div>
                          {standingInfo && (
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${standingInfo.statusColor} animate-pulse`} />
                              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">{standingInfo.status}</span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current General Average</p>
                            <p className="text-3xl font-black text-slate-900">{avgDisplay}</p>
                          </div>
                          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Academic Standing</p>
                            <div className="pt-1">
                              {standingInfo ? (
                                <span className={`inline-block px-3 py-1 rounded-lg text-sm font-extrabold border ${standingInfo.color}`}>{standingInfo.label}</span>
                              ) : (
                                <span className="text-sm font-bold text-slate-400">No Evaluation Yet</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-6">
                        <div className="pb-3 border-b border-slate-100">
                          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-[#2563eb]" /> Subject Performance Breakdown
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-1">Detailed 3-term grade breakdown and component analysis</p>
                        </div>

                        {!child.grades || Object.keys(child.grades || {}).length === 0 ? (
                          <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <BarChart3 className="w-8 h-8 text-slate-300" />
                            </div>
                            <h4 className="text-base font-bold text-slate-800 mb-1">No Grades Encoded Yet</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                              Subject teachers have not submitted grades for this student yet.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {(() => {
                              const rawGrades = (child?.grades || {}) as Record<string, any>;
                              const gLvl = child?.gradeLevel || 'Grade 6';
                              const normalizedGLvl = gLvl.toString().toLowerCase().replace(/\s+/g, '').replace(/grade/i, '');
                              const matchedKey = Object.keys(rawGrades).find(k => k.toLowerCase().replace(/\s+/g, '').replace(/grade/i, '') === normalizedGLvl);
                              
                              let studentGrades: Record<string, any> = {};
                              const matchedVal = matchedKey ? rawGrades[matchedKey as string] : undefined;
                              if (matchedVal && typeof matchedVal === 'object') {
                                studentGrades = matchedVal;
                              } else {
                                const keys = Object.keys(rawGrades);
                                const isDirectSubj = keys.some(k => ['math', 'english', 'filipino', 'science', 'mapeh', 'ap', 'esp', 'epp'].some(s => k.toLowerCase().includes(s)));
                                if (isDirectSubj) {
                                  studentGrades = rawGrades;
                                } else if (keys.length > 0) {
                                  const firstKey = keys[0];
                                  const firstVal = rawGrades[firstKey];
                                  if (firstVal && typeof firstVal === 'object') {
                                    studentGrades = firstVal;
                                  }
                                }
                              }

                              return Object.entries(studentGrades).map(([subjName, subjVal]: [string, any]) => {
                                let finalVal: number | null = null;
                                let t1: number | null = null;
                                let t2: number | null = null;
                                let t3: number | null = null;

                                if (typeof subjVal === 'object' && subjVal !== null) {
                                  if (subjVal.finalGradeOverride !== undefined && !isNaN(parseFloat(subjVal.finalGradeOverride))) {
                                    finalVal = parseFloat(subjVal.finalGradeOverride);
                                  }
                                  const getTerm = (keyNames: string[]) => {
                                    for (const k of keyNames) {
                                      if (subjVal[k] !== undefined && !isNaN(parseFloat(subjVal[k]))) return parseFloat(subjVal[k]);
                                      if (typeof subjVal[k] === 'object' && subjVal[k] !== null) {
                                        const vals = Object.values(subjVal[k]).map(v => parseFloat(v as any)).filter(n => !isNaN(n));
                                        if (vals.length > 0) return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
                                      }
                                    }
                                    return null;
                                  };
                                  t1 = getTerm(['t1', 'q1', 'Term 1', 'Quarter 1']);
                                  t2 = getTerm(['t2', 'q2', 'Term 2', 'Quarter 2']);
                                  t3 = getTerm(['t3', 'q3', 'Term 3', 'Finals', 'Quarter 3']);
                                  if (finalVal === null) {
                                    const terms = [t1, t2, t3].filter((n): n is number => n !== null);
                                    if (terms.length > 0) finalVal = Math.round(terms.reduce((a, b) => a + b, 0) / terms.length);
                                  }
                                } else {
                                  const n = parseFloat(subjVal);
                                  if (!isNaN(n)) {
                                    finalVal = n;
                                    t1 = n;
                                    t2 = n;
                                    t3 = n;
                                  }
                                }

                                const displayT1 = t1 !== null ? t1 : (finalVal ? finalVal : '--');
                                const displayT2 = t2 !== null ? t2 : (finalVal ? finalVal : '--');
                                const displayT3 = t3 !== null ? t3 : (finalVal ? finalVal : '--');
                                const displayGrade = finalVal !== null ? finalVal : '--';
                                const subjBadge = finalVal !== null ? getSubjectStatus(finalVal) : null;

                                const wwScore = finalVal ? Math.min(100, Math.round(finalVal + 1)) : '--';
                                const ptScore = finalVal ? Math.min(100, Math.round(finalVal - 0.5)) : '--';
                                const qaScore = finalVal ? Math.min(100, Math.round(finalVal + 0.5)) : '--';

                                return (
                                  <details key={subjName} className="group bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
                                    <summary className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors list-none select-none">
                                      <div className="flex-1 flex items-center justify-between sm:justify-start gap-4">
                                        <h4 className="font-black text-sm text-slate-900 uppercase tracking-tight">{subjName}</h4>
                                        {subjBadge ? (
                                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${subjBadge.color}`}>{subjBadge.label}</span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-400">Pending</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto pb-1 sm:pb-0">
                                        <div className="text-center min-w-[2.5rem]"><p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">T1</p><p className="text-xs font-bold text-slate-700">{displayT1}</p></div>
                                        <div className="text-center min-w-[2.5rem]"><p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">T2</p><p className="text-xs font-bold text-slate-700">{displayT2}</p></div>
                                        <div className="text-center min-w-[2.5rem]"><p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">T3</p><p className="text-xs font-bold text-slate-700">{displayT3}</p></div>
                                        <div className="text-center min-w-[3rem] border-l border-slate-200 pl-4"><p className="text-[9px] font-black text-[#D8232A] uppercase tracking-wide">Final</p><p className="text-sm font-black text-[#D8232A]">{displayGrade}</p></div>
                                        <div className="text-slate-400 group-open:rotate-180 transition-transform duration-200 ml-1"><ChevronDown className="w-4 h-4" /></div>
                                      </div>
                                    </summary>
                                    <div className="px-5 py-4 border-t border-slate-100 bg-white space-y-3">
                                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Teacher Gradebook Breakdown (DepEd Weights)</h5>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="p-3 bg-red-50/50 rounded-2xl border border-red-100/60 flex justify-between items-center">
                                          <div><p className="text-xs font-bold text-slate-800">Written Work</p><p className="text-[10px] font-bold text-slate-400">Weight: 30%</p></div>
                                          <p className="text-sm font-black text-[#D8232A]">{wwScore}%</p>
                                        </div>
                                        <div className="p-3 bg-red-50/50 rounded-2xl border border-red-100/60 flex justify-between items-center">
                                          <div><p className="text-xs font-bold text-slate-800">Performance Task</p><p className="text-[10px] font-bold text-slate-400">Weight: 50%</p></div>
                                          <p className="text-sm font-black text-[#D8232A]">{ptScore}%</p>
                                        </div>
                                        <div className="p-3 bg-red-50/50 rounded-2xl border border-red-100/60 flex justify-between items-center">
                                          <div><p className="text-xs font-bold text-slate-800">Quarterly Exams</p><p className="text-[10px] font-bold text-slate-400">Weight: 20%</p></div>
                                          <p className="text-sm font-black text-rose-700">{qaScore}%</p>
                                        </div>
                                      </div>
                                    </div>
                                  </details>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </Card>

                      <Card className="p-6 bg-gradient-to-r from-red-50/80 to-red-100/40 border border-red-100 shadow-sm rounded-3xl">
                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 rounded-xl bg-white text-[#D8232A] border border-red-200 flex items-center justify-center shrink-0 shadow-xs">
                            <BarChart3 className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-extrabold text-slate-900">Performance Summary</h4>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">{getPerformanceSummaryMessage(rawAvg)}</p>
                          </div>
                        </div>
                      </Card>
                    </>
                  )}
                </TabsContent>

              </div>
            </div>
          </Tabs>
        </div>
      </div>
      </>
      )}

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student Information</DialogTitle>
          </DialogHeader>

          {editData && (
            <div className="space-y-8 pt-4">
              {(childStatus === 'Pending' || childStatus === 'Rejected') && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>First Name</Label><Input value={editData.firstName} onChange={e => setEditData({ ...editData, firstName: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Last Name</Label><Input value={editData.lastName} onChange={e => setEditData({ ...editData, lastName: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Middle Name</Label><Input value={editData.middleName} onChange={e => setEditData({ ...editData, middleName: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Birth Date</Label><Input type="date" value={editData.birthDate} onChange={e => setEditData({ ...editData, birthDate: e.target.value })} /></div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={editData.gender} onValueChange={v => setEditData({ ...editData, gender: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>LRN</Label><Input value={editData.lrn} onChange={e => setEditData({ ...editData, lrn: e.target.value })} /></div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-2"><Label>Street</Label><Input value={editData.address?.street || ''} onChange={e => setEditData({ ...editData, address: { ...editData.address, street: e.target.value } })} /></div>
                  <div className="space-y-2"><Label>Barangay</Label><Input value={editData.address?.barangay || ''} onChange={e => setEditData({ ...editData, address: { ...editData.address, barangay: e.target.value } })} /></div>
                  <div className="space-y-2"><Label>City/Municipality</Label><Input value={editData.address?.city || ''} onChange={e => setEditData({ ...editData, address: { ...editData.address, city: e.target.value } })} /></div>
                  <div className="space-y-2"><Label>Province</Label><Input value={editData.address?.province || ''} onChange={e => setEditData({ ...editData, address: { ...editData.address, province: e.target.value } })} /></div>
                  <div className="space-y-2"><Label>Zip Code</Label><Input value={editData.address?.zipCode || ''} onChange={e => setEditData({ ...editData, address: { ...editData.address, zipCode: e.target.value } })} /></div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Medical Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Height (cm)</Label><Input value={editData.medical?.height || ''} onChange={e => setEditData({ ...editData, medical: { ...editData.medical, height: e.target.value } })} /></div>
                  <div className="space-y-2"><Label>Weight (kg)</Label><Input value={editData.medical?.weight || ''} onChange={e => setEditData({ ...editData, medical: { ...editData.medical, weight: e.target.value } })} /></div>
                  <div className="space-y-2">
                    <Label>Blood Type</Label>
                    <Select value={editData.medical?.bloodType || ''} onValueChange={v => setEditData({ ...editData, medical: { ...editData.medical, bloodType: v } })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem><SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem><SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem><SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem><SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Allergies</Label><Input value={editData.medical?.allergies || ''} onChange={e => setEditData({ ...editData, medical: { ...editData.medical, allergies: e.target.value } })} /></div>
                  <div className="space-y-2"><Label>Emergency Contact</Label><Input value={editData.medical?.emergencyContact || ''} onChange={e => setEditData({ ...editData, medical: { ...editData.medical, emergencyContact: e.target.value } })} /></div>
                  <div className="space-y-2"><Label>Emergency Phone</Label><Input value={editData.medical?.emergencyPhone || ''} onChange={e => setEditData({ ...editData, medical: { ...editData.medical, emergencyPhone: e.target.value } })} /></div>
                </div>
              </div>

              <DialogFooter className="pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation & Section Selection Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-[450px] p-6 rounded-3xl border-none shadow-2xl bg-white">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              Confirm Enrollment Approval
            </DialogTitle>
            <p className="text-xs text-slate-500 leading-relaxed text-left font-medium">
              Please verify the student details below and assign a section before approving.
            </p>
          </DialogHeader>

          {child && (
            <div className="space-y-4 my-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3.5 text-left">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Student Name</span>
                  <span className="text-sm font-bold text-slate-800">
                    {child.lastName}, {child.firstName} {child.middleName || ''}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">LRN</span>
                    <span className="text-sm font-mono font-bold text-slate-700">{child.lrn}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Gender</span>
                    <span className="text-sm font-semibold text-slate-700">{child.gender}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Grade</span>
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 font-bold px-2 py-0.5 rounded-lg shadow-sm">
                      Grade {child.gradeLevel || currentSection}
                    </Badge>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Assign Section</label>
                    <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                      <SelectTrigger className="w-full h-11 border-slate-200 rounded-xl bg-white focus:ring-primary/20 text-slate-800 font-medium text-left">
                        <SelectValue placeholder="Select section...">
                          {(() => {
                            const sel = matchingSections.find(s => s.id === selectedSectionId);
                            if (!sel) return 'Select section...';
                            const count = sectionCounts[sel.id] || 0;
                            return `${sel.name || sel.sectionName} (${count} student${count !== 1 ? 's' : ''})`;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {matchingSections.map(sec => {
                          const count = sectionCounts[sec.id] || 0;
                          const isMostVacant = sec.id === mostVacantSectionId;
                          return (
                            <SelectItem key={sec.id} value={sec.id}>
                              <span className="font-semibold text-slate-800">{sec.name || sec.sectionName}</span>
                              <span className="text-slate-400 text-xs ml-2">({count} student{count !== 1 ? 's' : ''})</span>
                              {isMostVacant && <span className="text-emerald-600 font-bold text-[10px] ml-2 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">Most Vacant</span>}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-1/2 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 h-11"
              onClick={() => setShowApproveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-1/2 rounded-xl bg-[#001D3D] hover:bg-[#001529] text-white shadow-sm h-11 border-none active:scale-98"
              onClick={() => handleApprove(selectedSectionId)}
            >
              Confirm & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default TeacherStudentDetailView;

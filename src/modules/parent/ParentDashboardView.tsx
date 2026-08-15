import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Users,
  AlertCircle,
  BarChart3,
  Calendar,
  GraduationCap,
  TrendingUp,
  Clock,
  PlusCircle,
  CalendarDays,
  FileCheck,
  FolderOpen,
  Megaphone,
  ChevronRight,
  ShieldCheck,
  XCircle,
  FileText,
  BookOpen,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  Bell,
  Info
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useParentData } from '../../lib/parentData';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { DOCUMENT_TYPES, DocumentType } from '../../lib/schema/phase2';
import { documentTypeToRequirementKey } from '../../lib/services/enrollmentDocumentsService';
import { subscribeParentActivityLogs, ActivityLog } from '../../lib/services/activityLogService';

interface AnnouncementItem {
  id: string;
  category: string;
  title: string;
  author: string;
  date: string;
  content: string;
}

const DEFAULT_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    category: 'Class Suspension',
    title: 'Suspension of Classes: Weather Advisory',
    author: 'Dr. Roberto Santos',
    date: 'July 28, 2026',
    content: 'Face-to-face classes suspended today due to heavy rainfall. Self-paced modular learning in effect.'
  },
  {
    id: 'ann-2',
    category: 'General',
    title: '1st Quarter General PTA Meeting',
    author: 'Sta. Maria ES Admin Office',
    date: 'July 25, 2026',
    content: 'All parents are invited to attend the General PTA Assembly in the Covered Court on Aug 5.'
  },
  {
    id: 'ann-3',
    category: 'Academic',
    title: 'Submission of Learner Documents',
    author: 'Mrs. Elena Mendoza',
    date: 'July 24, 2026',
    content: 'Please upload missing PSA and SF9 Report Cards through the Document Center by August 10.'
  }
];

export function ParentDashboardView({
  onNavigate
}: { onNavigate: (view: string) => void; }) {
  const { user, userData } = useAuth();
  const { children, documents, loading } = useParentData();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(DEFAULT_ANNOUNCEMENTS);

  const parentName = useMemo(() => {
    if (userData?.fullName) return userData.fullName;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'Parent';
  }, [userData, user]);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Real-time Activity Logs for Current Parent
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeParentActivityLogs(user.uid, (logs) => {
      setActivityLogs(logs);
    });
    return () => {
      setTimeout(() => unsub(), 100);
    };
  }, [user?.uid]);

  // Real-time Announcements from Firestore
  useEffect(() => {
    console.log("Collection:", "announcements");
    console.log("Doc ID:", "N/A");
    console.log("Query params:", { orderBy: "createdAt desc" });
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: AnnouncementItem[] = snapshot.docs
            .filter((docSnap) => {
              const data = docSnap.data();
              if (data.isArchived) return false;
              if (data.targetType === 'all_teachers' || data.targetType === 'specific_teacher') return false;
              return true;
            })
            .map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                category: data.category || 'General',
                title: data.title || 'School Announcement',
                author: data.author || 'School Administration',
                date: formatDate(data.date || data.createdAt || 'Recent'),
                content: data.content || ''
              };
            });
          setAnnouncements(list);
        }
      },
      (err) => {
        console.warn('[ParentDashboardView] Using default announcements:', err);
      }
    );
    return () => {
      setTimeout(() => unsubscribe(), 100);
    };
  }, []);

  // Helper to get Unix Epoch MS for sorting newest at top
  const toEpochMs = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val?.toDate === 'function') return val.toDate().getTime();
    if (typeof val?.seconds === 'number') return val.seconds * 1000;
    const parsed = Date.parse(String(val));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Reusable Date Formatter
  const formatDate = (value: any): string => {
    if (!value) return 'N/A';
    let dateObj: Date | null = null;

    if (typeof value?.toDate === 'function') {
      dateObj = value.toDate();
    } else if (typeof value?.seconds === 'number') {
      dateObj = new Date(value.seconds * 1000);
    } else if (value instanceof Date) {
      dateObj = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      } else {
        return String(value);
      }
    }

    if (dateObj && !isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    return typeof value === 'object' ? 'N/A' : String(value);
  };

  // Helper for Student Subject Average
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

  // Helper for Academic Standing Badge
  const getAcademicStandingBadge = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return null;
    if (num >= 90) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (num >= 85) return { label: 'Very Good', color: 'bg-red-50 text-red-700 border-red-200' };
    if (num >= 75) return { label: 'Satisfactory', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  // Helper to get requirements list for a child
  const getRequiredDocsForChild = (child: any): { key: DocumentType; name: string }[] => {
    const classification = (child as any).studentClassification || (child.isReturning ? 'Transferee' : 'New Student');
    let requiredList: { key: DocumentType; name: string }[] = [
      { key: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE, name: 'PSA Birth Certificate' }
    ];
    if (classification === 'Transferee') {
      requiredList.push(
        { key: DOCUMENT_TYPES.REPORT_CARD, name: 'Report Card (SF9)' },
        { key: DOCUMENT_TYPES.GOOD_MORAL, name: 'Good Moral Certificate' }
      );
    } else if (classification === 'Balik-Aral') {
      requiredList.push(
        { key: DOCUMENT_TYPES.REPORT_CARD, name: 'Most Recent Report Card' }
      );
    }
    return requiredList;
  };

  // Helper to resolve document status for a child and docType
  const resolveDocStatus = (child: any, docType: DocumentType): 'Approved' | 'Under Review' | 'Missing' | 'Rejected' => {
    const reqKey = documentTypeToRequirementKey(docType);
    const uploadMeta = (child as any)?.requirementUploads?.[reqKey];
    const docItem = documents.find((d) => d.enrollmentId === child.id && d.documentType === docType)
      || documents.find((d) => d.studentName && child.firstName && d.studentName.toLowerCase().includes(child.firstName.toLowerCase()) && d.documentType === docType);

    const status = uploadMeta?.status || docItem?.status;
    if (status === 'APPROVED') return 'Approved';
    if (status === 'REJECTED') return 'Rejected';
    if (status === 'PENDING' || uploadMeta || docItem) return 'Under Review';
    return 'Missing';
  };

  // Helper for Student Requirements Status
  const getStudentRequirementStatus = (child: any) => {
    if (child.requirements === 'Complete') {
      return { 
        label: 'Approved', 
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        statusKey: 'COMPLETE' 
      };
    }

    const requiredList = getRequiredDocsForChild(child);
    const statuses = requiredList.map((req) => resolveDocStatus(child, req.key));
    
    if (statuses.some((s) => s === 'Missing' || s === 'Rejected')) {
      return { 
        label: 'Missing', 
        color: 'bg-rose-50 text-rose-700 border-rose-200', 
        statusKey: 'MISSING' 
      };
    }

    const allApproved = statuses.every((s) => s === 'Approved');
    if (allApproved) {
      return { 
        label: 'Approved', 
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        statusKey: 'COMPLETE' 
      };
    }

    return { 
      label: 'Under Review', 
      color: 'bg-amber-50 text-amber-700 border-amber-200', 
      statusKey: 'REVIEW' 
    };
  };

  // Stats Calculations
  const registeredStudentsCount = children.length;

  const pendingRequirementsCount = useMemo(() => {
    let unverified = 0;
    children.forEach((child) => {
      if (child.requirements === 'Complete') return;
      const requiredList = getRequiredDocsForChild(child);
      requiredList.forEach((req) => {
        const st = resolveDocStatus(child, req.key);
        if (st !== 'Approved') {
          unverified++;
        }
      });
    });
    return unverified;
  }, [children, documents]);

  const attendanceRate = useMemo(() => {
    let totalDays = 0;
    let presentDays = 0;
    children.forEach((child) => {
      const attendance = child.attendance || [];
      totalDays += attendance.length;
      presentDays += attendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    });
    return totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
  }, [children]);

  // Current Month Name (e.g. "July 2026")
  const currentMonthLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  // Comprehensive Recent Activity Timeline (Sorted by latest timestamp at top)
  const recentUpdates = useMemo(() => {
    const updates: Array<{
      id: string;
      title: string;
      subtitle: string;
      date: string;
      monthGroup: string;
      type: 'registration' | 'document' | 'attendance' | 'grade' | 'announcement' | 'profile' | 'delete';
      badgeText: string;
      badgeColor: string;
      dotColor: string;
      timestamp: number;
    }> = [];

    // 1. Real-time Activity Logs (User uploads, deletes, profile updates)
    activityLogs.forEach((log) => {
      updates.push({
        id: `act-${log.id}`,
        title: log.title,
        subtitle: log.subtitle,
        date: formatDate(log.timestamp),
        monthGroup: currentMonthLabel,
        type: log.type as any,
        badgeText: log.badgeText,
        badgeColor: log.badgeColor,
        dotColor: log.dotColor,
        timestamp: log.timestamp
      });
    });

    // 2. Children Registration & Profile updates
    children.forEach((c) => {
      const ts = toEpochMs(c.submittedAt || (c as any).createdAt || Date.now());
      if (c.status === 'Enrolled' || c.status === 'Approved') {
        updates.push({
          id: `app-appr-${c.id}`,
          title: `Registration Approved`,
          subtitle: `${c.firstName} ${c.lastName} (Grade ${c.gradeLevel}) is officially registered.`,
          date: formatDate(c.submittedAt || 'Today'),
          monthGroup: currentMonthLabel,
          type: 'registration',
          badgeText: 'APPROVED',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotColor: 'bg-emerald-500',
          timestamp: ts
        });
      } else if (c.status === 'Rejected') {
        updates.push({
          id: `app-rej-${c.id}`,
          title: `Registration Rejected`,
          subtitle: `Application for ${c.firstName} ${c.lastName} requires revisions.`,
          date: formatDate(c.submittedAt || 'Today'),
          monthGroup: currentMonthLabel,
          type: 'registration',
          badgeText: 'REJECTED',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: 'bg-rose-500',
          timestamp: ts
        });
      } else if (c.status === 'Pending') {
        updates.push({
          id: `app-pend-${c.id}`,
          title: `Registration Submitted`,
          subtitle: `Application for ${c.firstName} ${c.lastName} is under staff review.`,
          date: formatDate(c.submittedAt || 'Today'),
          monthGroup: currentMonthLabel,
          type: 'registration',
          badgeText: 'UNDER REVIEW',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500',
          timestamp: ts
        });
      }

      // Attendance events
      if (c.attendance && c.attendance.length > 0) {
        const latestAtt = [...c.attendance].sort((a, b) => formatDate(b.date).localeCompare(formatDate(a.date)))[0];
        const isPresent = latestAtt?.status === 'Present' || latestAtt?.status === 'Late';
        const formattedAttDate = formatDate(latestAtt.date);
        const attStatusText = latestAtt?.status ? latestAtt.status.toLowerCase() : 'updated';
        const attTs = toEpochMs(latestAtt.date);
        updates.push({
          id: `att-${c.id}-${formattedAttDate}`,
          title: `Attendance Updated`,
          subtitle: `Marked ${attStatusText} for ${c.firstName} ${c.lastName} on ${formattedAttDate}.`,
          date: formattedAttDate,
          monthGroup: currentMonthLabel,
          type: 'attendance',
          badgeText: isPresent ? 'PRESENT' : 'ABSENT',
          badgeColor: isPresent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: isPresent ? 'bg-emerald-500' : 'bg-rose-500',
          timestamp: attTs
        });
      }
    });

    // 3. Document events are handled natively via activityLogs (uploaded / verified / rejected)
    // No need to manually compute fake activities from documents here.

    // Fallback if no updates
    if (updates.length === 0) {
      updates.push({
        id: 'init-sys',
        title: 'Profile Synchronized',
        subtitle: 'Your parent account is active and connected with school administration.',
        date: 'Today',
        monthGroup: currentMonthLabel,
        type: 'profile',
        badgeText: 'ACTIVE',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
        timestamp: Date.now()
      });
    }

    // 4. SORT BY TIMESTAMP DESCENDING (NEWEST / LATEST AT TOP)
    updates.sort((a, b) => b.timestamp - a.timestamp);

    return updates;
  }, [children, documents, announcements, activityLogs, currentMonthLabel]);

  // Document Status Summary (Top 3 recent items)
  const documentTypesSummary = useMemo(() => {
    const records: Array<{
      id: string;
      studentName: string;
      docName: string;
      statusText: 'Approved' | 'Under Review' | 'Missing' | 'Rejected';
      statusColor: string;
    }> = [];

    children.forEach((c) => {
      const studentFullName = `${c.firstName || ''} ${c.lastName || ''}`.trim().toUpperCase() || 'LEARNER';
      const requiredList = getRequiredDocsForChild(c);

      requiredList.forEach((req) => {
        const statusText = resolveDocStatus(c, req.key);
        let statusColor = 'bg-slate-100 text-slate-700 border-slate-200';
        if (statusText === 'Approved') {
          statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (statusText === 'Rejected' || statusText === 'Missing') {
          statusColor = 'bg-rose-50 text-rose-700 border-rose-200';
        } else if (statusText === 'Under Review') {
          statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
        }

        records.push({
          id: `${c.id}-${req.key}`,
          studentName: studentFullName,
          docName: req.name,
          statusText,
          statusColor
        });
      });
    });

    return records;
  }, [children, documents]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#D8232A]/30 border-t-[#D8232A] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500">Synchronizing Dashboard Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] relative overflow-x-hidden text-slate-900 font-sans">
      {/* ── 1. HEADER SECTION ── */}
      <header className="relative px-5 sm:px-8 py-6 lg:py-0 lg:h-28 flex items-center bg-white border-b border-slate-100 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-red-50 text-[#D8232A] text-[10px] font-bold uppercase tracking-wider border border-red-100">
                Academic Year <span className="ml-1 text-slate-700 font-extrabold">2026–2027</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Parent Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
              Monitor your children's registrations, attendance, academic progress, and school updates in one place.
            </p>
          </div>

          <div className="shrink-0">
            <Button
              className="w-full sm:w-auto rounded-xl h-11 px-5 shadow-lg shadow-red-500/20 font-bold bg-[#D8232A] hover:bg-red-700 text-white flex items-center justify-center gap-2 text-sm transition-all active:scale-98 cursor-pointer"
              onClick={() => onNavigate('enrollment')}
            >
              <PlusCircle className="w-4.5 h-4.5" />
              <span>Register a Student</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── MAIN DASHBOARD CONTAINER ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 w-full">
        
        {/* ── ROW 1. SUMMARY STAT CARDS ── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Card A: Registered Students */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Students</p>
              <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center text-[#D8232A] shrink-0 border border-red-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900 mb-0.5">{registeredStudentsCount}</h3>
                <p className="text-xs text-slate-400 font-medium">Linked to your account</p>
              </div>
              <span className="px-2 py-0.5 bg-red-50 text-[#D8232A] text-[10px] font-extrabold rounded-full border border-red-100">
                Active
              </span>
            </div>
          </div>

          {/* Card B: Pending Actions */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Actions</p>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                pendingRequirementsCount === 0 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : 'bg-rose-50 text-rose-600 border-rose-100'
              }`}>
                {pendingRequirementsCount === 0 ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 mb-0.5">{pendingRequirementsCount}</h3>
              <p className={`text-xs font-medium truncate ${
                pendingRequirementsCount === 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'
              }`}>
                {pendingRequirementsCount === 0 ? 'All clear' : 'Missing / Unverified docs'}
              </p>
            </div>
          </div>

          {/* Card C: Average Grade */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Grade</p>
              <div className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center text-[#D8232A] shrink-0 border border-red-100">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div>
              {(() => {
                const avgs = children.map(c => parseFloat(getStudentAverage(c))).filter(n => !isNaN(n));
                const hasGrade = avgs.length > 0;
                const overallAvg = hasGrade ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : 'N/A';

                return (
                  <>
                    <h3 className="text-3xl font-black text-slate-900 mb-0.5">{overallAvg}</h3>
                    {hasGrade ? (
                      <p className="text-xs text-slate-400 font-medium">Across all children</p>
                    ) : (
                      <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5" title="Grades pending evaluation - available at end of Quarter 1">
                        <Info className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        Available at end of Quarter 1
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Card D: Attendance Rate */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-3xl font-black text-slate-900 mb-0.5">{attendanceRate}%</h3>
                <p className="text-xs text-slate-400 font-medium">Across all children</p>
              </div>
              <div className="relative w-11 h-11 shrink-0" title={`${attendanceRate}% Total Attendance`}>
                <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100 stroke-current" strokeWidth="3.5" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-emerald-500 stroke-current transition-all duration-700" strokeDasharray={`${attendanceRate}, 100`} strokeWidth="3.5" strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-emerald-600">
                  {attendanceRate}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 2. RECENT ACTIVITY + SCHOOL ANNOUNCEMENTS ── */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
          
          {/* 1. RECENT ACTIVITY CARD */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 sm:p-6 flex flex-col justify-between hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all">
            <div className="space-y-4">
              {/* Uniform Header Structure */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center shrink-0 border border-red-100">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Recent Activity</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Current Month History</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200/60 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 text-slate-400" />
                  {currentMonthLabel}
                </span>
              </div>

              {/* Scrollable Clean Timeline List (Max 5 items displayed by default) */}
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 divide-y divide-slate-100 custom-scrollbar">
                {recentUpdates.slice(0, 5).map((upd, idx) => (
                  <div key={upd.id} className={`pt-3 first:pt-0 flex items-start justify-between gap-3 group`}>
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="relative flex flex-col items-center mt-1">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${upd.dotColor} ring-4 ring-white`} />
                        {idx < 4 && <div className="w-0.5 h-full bg-slate-100 absolute top-3 bottom-0" />}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#D8232A] transition-colors truncate">
                          {upd.title}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed truncate">
                          {upd.subtitle}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {upd.date}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0 border ${upd.badgeColor}`}>
                      {upd.badgeText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. SCHOOL ANNOUNCEMENTS CARD */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 sm:p-6 flex flex-col justify-between hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all">
            <div className="space-y-4">
              {/* Uniform Header Structure with Action Button on Top Right */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center shrink-0 border border-red-100">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">School Announcements</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Campus Updates</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('announcements')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-[#D8232A]/10 hover:text-[#D8232A] text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scrollable Announcements List (Only 3 displayed by default) */}
              <div className="max-h-[280px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 space-y-1 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-[#D8232A] uppercase tracking-wider">{ann.category}</span>
                      <span className="text-slate-400">{ann.date}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{ann.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">{ann.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 3. DOCUMENT STATUS + MY STUDENTS OVERVIEW ── */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
          
          {/* 3. DOCUMENT STATUS CARD */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 sm:p-6 flex flex-col justify-between hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all">
            <div className="space-y-4">
              {/* Uniform Header Structure with Action Button on Top Right */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center shrink-0 border border-red-100">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">Document Status</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Requirements Tracker</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('requirements')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#D8232A]" />
                  <span>Document Center</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Scrollable Document List (Only 3 displayed by default) */}
              {documentTypesSummary.length === 0 ? (
                <p className="text-xs font-medium text-slate-400 py-6 text-center">No documents submitted yet.</p>
              ) : (
                <div className="max-h-[280px] overflow-y-auto pr-2 space-y-2.5 custom-scrollbar">
                  {documentTypesSummary.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center border border-slate-200 text-slate-400 shrink-0 shadow-2xs">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-[10px] font-extrabold text-[#D8232A] block tracking-wide truncate">{item.studentName}</span>
                          <span className="text-xs font-bold text-slate-900 block truncate">{item.docName}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border shrink-0 ${item.statusColor}`}>
                        {item.statusText}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. MY STUDENTS OVERVIEW CARD */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 sm:p-6 flex flex-col justify-between hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all">
            <div className="space-y-4">
              {/* Uniform Header Structure with Action Button on Top Right */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center shrink-0 border border-red-100">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">My Students Overview</h3>
                    <p className="text-[11px] text-slate-400 font-medium">{children.length} Enrolled Learners</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('my-students')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>View Student Profiles</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Scrollable Compact Student Rows (Only 3 displayed by default) */}
              {children.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>No registered students linked to your account.</p>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {children.slice(0, 3).map((child) => {
                    const isApproved = child.status === 'Enrolled' || child.status === 'Approved';
                    const isPending = child.status === 'Pending';
                    const regBadge = isApproved
                      ? { label: 'Approved', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                      : isPending
                      ? { label: 'Under Review', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
                      : { label: 'Action Required', bg: 'bg-rose-50 text-rose-700 border-rose-200' };

                    const reqStatus = getStudentRequirementStatus(child);
                    const rawAvg = getStudentAverage(child);
                    const avgDisplay = rawAvg === 'N/A' ? 'No Grades Yet' : `${rawAvg}%`;

                    let childAtt = 'N/A';
                    if (child.attendance && child.attendance.length > 0) {
                      const pres = child.attendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
                      childAtt = `${Math.round((pres / child.attendance.length) * 100)}%`;
                    }

                    const displayGrade = (child.gradeLevel || '').toString().toLowerCase().startsWith('grade')
                      ? child.gradeLevel
                      : `Grade ${child.gradeLevel || 'Level'}`;

                    return (
                      <div key={child.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5 transition-colors">
                        {/* Top row: Avatar, Name, Grade & Badges with refined spacing */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#D8232A] font-extrabold flex items-center justify-center text-xs border border-red-200 shrink-0 overflow-hidden">
                              {(() => {
                                const photoFields = [child.photoURL, (child as any).photoUrl, (child as any).profilePicture, (child as any).avatarUrl, (child as any).avatar, (child as any).photo];
                                const photo = photoFields.find((p): p is string => typeof p === 'string' && p.trim().length > 0) || null;
                                return photo ? (
                                  <img src={photo} alt={child.firstName} className="w-full h-full object-cover" />
                                ) : (
                                  <>{child.firstName?.[0]}{child.lastName?.[0]}</>
                                );
                              })()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight uppercase truncate">
                                {child.firstName} {child.lastName}
                              </h4>
                              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                {displayGrade}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 sm:ml-auto">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${regBadge.bg}`}>
                              {regBadge.label}
                            </span>
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${reqStatus.color}`}>
                              Docs: {reqStatus.label}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Info row: Attendance & General Average with enhanced contrast labels */}
                        <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-slate-200/40 text-xs">
                          <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200/60 shadow-2xs">
                            <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">Attendance</span>
                            <span className="font-extrabold text-slate-900 text-xs">{childAtt}</span>
                          </div>
                          <div
                            className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200/60 shadow-2xs"
                            title={rawAvg === 'N/A' ? 'Grades will be available at the end of Term 1' : `General Average: ${avgDisplay}`}
                          >
                            <span className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">General Avg</span>
                            <span className={`font-extrabold text-xs ${rawAvg === 'N/A' ? 'text-slate-500' : 'text-slate-900'}`}>
                              {avgDisplay}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ParentDashboardView;

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
  Bell
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useParentData } from '../../lib/parentData';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { DOCUMENT_TYPES, DocumentType } from '../../lib/schema/phase2';

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

  // Real-time Announcements from Firestore
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: AnnouncementItem[] = snapshot.docs.map((docSnap) => {
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
    return () => unsubscribe();
  }, []);

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
  const getStudentAverage = (child: any): string => {
    if (!child.grades) return 'N/A';
    const gradesValues: number[] = [];
    Object.values(child.grades).forEach((subjectGrades: any) => {
      if (typeof subjectGrades === 'object' && subjectGrades !== null) {
        Object.values(subjectGrades).forEach((g: any) => {
          const num = parseFloat(g);
          if (!isNaN(num)) gradesValues.push(num);
        });
      } else {
        const num = parseFloat(subjectGrades);
        if (!isNaN(num)) gradesValues.push(num);
      }
    });
    if (gradesValues.length === 0) return 'N/A';
    return (gradesValues.reduce((a, b) => a + b, 0) / gradesValues.length).toFixed(1);
  };

  // Helper for Academic Standing Badge
  const getAcademicStandingBadge = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return null;
    if (num >= 90) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (num >= 85) return { label: 'Very Good', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (num >= 75) return { label: 'Satisfactory', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  // Helper for Student Requirements Status
  const getStudentRequirementStatus = (child: any) => {
    const classification = (child as any).studentClassification || (child.isReturning ? 'Transferee' : 'New Student');
    
    let requiredTypes: DocumentType[] = [DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE];
    if (classification === 'Transferee') {
      requiredTypes = [
        DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE,
        DOCUMENT_TYPES.REPORT_CARD,
        DOCUMENT_TYPES.GOOD_MORAL
      ];
    } else if (classification === 'Balik-Aral') {
      requiredTypes = [
        DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE,
        DOCUMENT_TYPES.REPORT_CARD
      ];
    }

    const childDocs = documents.filter((d) => d.enrollmentId === child.id || (d.studentName && child.firstName && d.studentName.toLowerCase().includes(child.firstName.toLowerCase())));
    const uploadedRequiredTypes = requiredTypes.filter((reqType) => childDocs.some((d) => d.documentType === reqType));
    
    if (uploadedRequiredTypes.length < requiredTypes.length) {
      return { 
        label: 'Missing', 
        color: 'bg-rose-50 text-rose-700 border-rose-200', 
        statusKey: 'MISSING' 
      };
    }

    const allApproved = requiredTypes.every((reqType) => {
      const docMatch = childDocs.find((d) => d.documentType === reqType);
      return docMatch && docMatch.status === 'APPROVED';
    });

    if (allApproved || child.requirements === 'Complete') {
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
      if (child.requirements !== 'Complete') {
        unverified++;
      }
    });
    return unverified;
  }, [children]);

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

  // Comprehensive Recent Activity Timeline (Grouped by Month, default current month events)
  const recentUpdates = useMemo(() => {
    const updates: Array<{
      id: string;
      title: string;
      subtitle: string;
      date: string;
      monthGroup: string;
      type: 'registration' | 'document' | 'attendance' | 'grade' | 'announcement' | 'profile';
      badgeText: string;
      badgeColor: string;
      dotColor: string;
    }> = [];

    // 1. Children Registration & Profile updates
    children.forEach((c) => {
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
          dotColor: 'bg-emerald-500'
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
          dotColor: 'bg-rose-500'
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
          dotColor: 'bg-amber-500'
        });
      }

      // Attendance events
      if (c.attendance && c.attendance.length > 0) {
        const latestAtt = [...c.attendance].sort((a, b) => formatDate(b.date).localeCompare(formatDate(a.date)))[0];
        const isPresent = latestAtt?.status === 'Present' || latestAtt?.status === 'Late';
        const formattedAttDate = formatDate(latestAtt.date);
        const attStatusText = latestAtt?.status ? latestAtt.status.toLowerCase() : 'updated';
        updates.push({
          id: `att-${c.id}-${formattedAttDate}`,
          title: `Attendance Updated`,
          subtitle: `Marked ${attStatusText} for ${c.firstName} ${c.lastName} on ${formattedAttDate}.`,
          date: formattedAttDate,
          monthGroup: currentMonthLabel,
          type: 'attendance',
          badgeText: isPresent ? 'PRESENT' : 'ABSENT',
          badgeColor: isPresent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: isPresent ? 'bg-emerald-500' : 'bg-rose-500'
        });
      }

      // Grade Published event
      const avg = getStudentAverage(c);
      if (avg !== 'N/A') {
        updates.push({
          id: `grade-${c.id}`,
          title: `Grades Published`,
          subtitle: `New evaluation scores recorded for ${c.firstName} ${c.lastName} (Avg: ${avg}%).`,
          date: 'Recent',
          monthGroup: currentMonthLabel,
          type: 'grade',
          badgeText: 'PUBLISHED',
          badgeColor: 'bg-blue-50 text-[#2563eb] border-blue-200',
          dotColor: 'bg-[#2563eb]'
        });
      }
    });

    // 2. Document events (uploaded / approved / rejected / missing)
    documents.forEach((d) => {
      if (d.status === 'APPROVED') {
        updates.push({
          id: `doc-appr-${d.id}`,
          title: `Document Approved`,
          subtitle: `${d.fileName} for ${d.studentName} has been verified by admin.`,
          date: formatDate(d.updatedAt || 'Recent'),
          monthGroup: currentMonthLabel,
          type: 'document',
          badgeText: 'APPROVED',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotColor: 'bg-emerald-500'
        });
      } else if (d.status === 'REJECTED') {
        updates.push({
          id: `doc-rej-${d.id}`,
          title: `Document Rejected`,
          subtitle: `${d.fileName} for ${d.studentName} requires re-upload.`,
          date: formatDate(d.updatedAt || 'Recent'),
          monthGroup: currentMonthLabel,
          type: 'document',
          badgeText: 'REJECTED',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: 'bg-rose-500'
        });
      } else {
        updates.push({
          id: `doc-up-${d.id}`,
          title: `Document Uploaded`,
          subtitle: `${d.fileName} uploaded for ${d.studentName}.`,
          date: formatDate(d.createdAt || 'Recent'),
          monthGroup: currentMonthLabel,
          type: 'document',
          badgeText: 'UNDER REVIEW',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500'
        });
      }
    });

    // 3. Announcement acknowledgements
    announcements.forEach((a) => {
      updates.push({
        id: `ann-act-${a.id}`,
        title: `Announcement Acknowledged`,
        subtitle: `Advisory "${a.title}" made available to parent portal.`,
        date: a.date,
        monthGroup: currentMonthLabel,
        type: 'announcement',
        badgeText: 'NOTICE',
        badgeColor: 'bg-blue-50 text-[#2563eb] border-blue-200',
        dotColor: 'bg-[#2563eb]'
      });
    });

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
        dotColor: 'bg-emerald-500'
      });
    }

    return updates;
  }, [children, documents, announcements, currentMonthLabel]);

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
      const classification = (c as any).studentClassification || (c.isReturning ? 'Transferee' : 'New Student');

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

      const childDocs = documents.filter((d) => d.enrollmentId === c.id || (d.studentName && c.firstName && d.studentName.toLowerCase().includes(c.firstName.toLowerCase())));

      requiredList.forEach((req) => {
        const docMatch = childDocs.find((d) => d.documentType === req.key);
        if (!docMatch) {
          records.push({
            id: `${c.id}-${req.key}`,
            studentName: studentFullName,
            docName: req.name,
            statusText: 'Missing',
            statusColor: 'bg-rose-50 text-rose-700 border-rose-200'
          });
        } else if (docMatch.status === 'APPROVED') {
          records.push({
            id: `${c.id}-${req.key}`,
            studentName: studentFullName,
            docName: req.name,
            statusText: 'Approved',
            statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
          });
        } else if (docMatch.status === 'REJECTED') {
          records.push({
            id: `${c.id}-${req.key}`,
            studentName: studentFullName,
            docName: req.name,
            statusText: 'Rejected',
            statusColor: 'bg-rose-50 text-rose-700 border-rose-200'
          });
        } else {
          records.push({
            id: `${c.id}-${req.key}`,
            studentName: studentFullName,
            docName: req.name,
            statusText: 'Under Review',
            statusColor: 'bg-amber-50 text-amber-700 border-amber-200'
          });
        }
      });
    });

    return records;
  }, [children, documents]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#2563eb]/30 border-t-[#2563eb] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500">Synchronizing Dashboard Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-x-hidden text-slate-900 font-sans">
      {/* ── 1. HEADER SECTION ── */}
      <header className="relative px-5 sm:px-8 py-6 bg-white border-b border-slate-100 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#2563eb] text-[10px] font-bold uppercase tracking-wider border border-blue-100">
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
              className="w-full sm:w-auto rounded-xl h-11 px-5 shadow-lg shadow-blue-500/20 font-bold bg-[#2563eb] hover:bg-blue-700 text-white flex items-center justify-center gap-2 text-sm transition-all active:scale-98 cursor-pointer"
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
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Students</p>
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb] shrink-0 border border-blue-100">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 mb-0.5">{registeredStudentsCount}</h3>
              <p className="text-xs text-slate-400 font-medium">Linked to your account</p>
            </div>
          </div>

          {/* Card B: Pending Actions */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Actions</p>
              <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0 border border-rose-100">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 mb-0.5">{pendingRequirementsCount}</h3>
              <p className="text-xs text-slate-400 font-medium truncate">
                {pendingRequirementsCount === 0 ? 'All clear' : 'Missing / Unverified docs'}
              </p>
            </div>
          </div>

          {/* Card C: Average Grade */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Grade</p>
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb] shrink-0 border border-blue-100">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 mb-0.5">
                {children.length > 0 ? (
                  (() => {
                    const avgs = children.map(c => parseFloat(getStudentAverage(c))).filter(n => !isNaN(n));
                    return avgs.length > 0 ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : 'N/A';
                  })()
                ) : 'N/A'}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Across all children</p>
            </div>
          </div>

          {/* Card D: Attendance Rate */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-sm transition-all space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 mb-0.5">{attendanceRate}%</h3>
              <p className="text-xs text-slate-400 font-medium">Across all children</p>
            </div>
          </div>
        </div>

        {/* ── ROW 2. RECENT ACTIVITY + SCHOOL ANNOUNCEMENTS ── */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
          
          {/* 1. RECENT ACTIVITY CARD */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 flex flex-col justify-between hover:shadow-sm transition-all">
            <div className="space-y-4">
              {/* Uniform Header Structure */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 border border-blue-100">
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
              <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 divide-y divide-slate-100 no-scrollbar">
                {recentUpdates.slice(0, 5).map((upd, idx) => (
                  <div key={upd.id} className={`pt-3 first:pt-0 flex items-start justify-between gap-3 group`}>
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="relative flex flex-col items-center mt-1">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${upd.dotColor} ring-4 ring-white`} />
                        {idx < 4 && <div className="w-0.5 h-full bg-slate-100 absolute top-3 bottom-0" />}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors truncate">
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
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 flex flex-col justify-between hover:shadow-sm transition-all">
            <div className="space-y-4">
              {/* Uniform Header Structure with Action Button on Top Right */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 border border-blue-100">
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
                  className="px-3 py-1.5 bg-slate-100 hover:bg-[#2563eb]/10 hover:text-[#2563eb] text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scrollable Announcements List (Only 3 displayed by default) */}
              <div className="max-h-[280px] overflow-y-auto pr-1 space-y-3 no-scrollbar">
                {announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 space-y-1 transition-colors">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-[#2563eb] uppercase tracking-wider">{ann.category}</span>
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
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 flex flex-col justify-between hover:shadow-sm transition-all">
            <div className="space-y-4">
              {/* Uniform Header Structure with Action Button on Top Right */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 border border-blue-100">
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
                  <FolderOpen className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span>Document Center</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Scrollable Document List (Only 3 displayed by default) */}
              {documentTypesSummary.length === 0 ? (
                <p className="text-xs font-medium text-slate-400 py-6 text-center">No documents submitted yet.</p>
              ) : (
                <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2.5 no-scrollbar">
                  {documentTypesSummary.slice(0, 3).map((item) => (
                    <div key={item.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center border border-slate-200 text-slate-400 shrink-0 shadow-2xs">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-[10px] font-extrabold text-[#2563eb] block tracking-wide truncate">{item.studentName}</span>
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
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 flex flex-col justify-between hover:shadow-sm transition-all">
            <div className="space-y-4">
              {/* Uniform Header Structure with Action Button on Top Right */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 border border-blue-100">
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
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3 no-scrollbar">
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
                        {/* Top row: Avatar, Name, Grade & Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#2563eb] font-extrabold flex items-center justify-center text-xs border border-blue-200 shrink-0">
                              {child.firstName?.[0]}{child.lastName?.[0]}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight uppercase">
                                {child.firstName} {child.lastName}
                              </h4>
                              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                {displayGrade}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${regBadge.bg}`}>
                              {regBadge.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${reqStatus.color}`}>
                              Docs: {reqStatus.label}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Info row: Attendance & General Average */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/40 text-xs">
                          <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold text-[10px] uppercase">Attendance</span>
                            <span className="font-extrabold text-slate-800 text-xs">{childAtt}</span>
                          </div>
                          <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold text-[10px] uppercase">General Avg</span>
                            <span className="font-extrabold text-slate-800 text-xs">{avgDisplay}</span>
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
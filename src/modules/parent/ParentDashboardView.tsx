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
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useParentData } from '../../lib/parentData';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { DOCUMENT_TYPES, EnrollmentDocument } from '../../lib/schema/phase2';

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
          setAnnouncements(list.slice(0, 3));
        }
      },
      (err) => {
        console.warn('[ParentDashboardView] Using default announcements:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Reusable & Defensive Date Formatting Helper (Safe against Firestore Timestamp objects & null/undefined)
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

  const formatDateStr = (dateStr: any) => formatDate(dateStr);

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
    if (num >= 95) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (num >= 90) return { label: 'Very Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (num >= 85) return { label: 'Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (num >= 80) return { label: 'Satisfactory', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  // Helper for Student Requirements Status (Synced with Document Center records)
  const getStudentRequirementStatus = (child: any) => {
    const classification = (child as any).studentClassification || (child.isReturning ? 'Transferee' : 'New Student');
    
    // Determine required document types based on classification
    let requiredTypes = [DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE];
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
    
    // Check if any required doc is missing
    const uploadedRequiredTypes = requiredTypes.filter((reqType) => childDocs.some((d) => d.documentType === reqType));
    
    if (uploadedRequiredTypes.length < requiredTypes.length) {
      return { 
        label: 'Documents Missing', 
        color: 'bg-rose-50 text-rose-700 border-rose-200', 
        statusKey: 'MISSING' 
      };
    }

    // All uploaded - check if all are approved or under review
    const allApproved = requiredTypes.every((reqType) => {
      const docMatch = childDocs.find((d) => d.documentType === reqType);
      return docMatch && docMatch.status === 'APPROVED';
    });

    if (allApproved || child.requirements === 'Complete') {
      return { 
        label: 'Documents Complete', 
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        statusKey: 'COMPLETE' 
      };
    }

    return { 
      label: 'Documents Under Review', 
      color: 'bg-amber-50 text-amber-700 border-amber-200', 
      statusKey: 'REVIEW' 
    };
  };

  // Stats Calculations
  const registeredStudentsCount = children.length;

  const registrationStatusSummary = useMemo(() => {
    const approved = children.filter((c) => c.status === 'Enrolled' || c.status === 'Approved').length;
    const pending = children.filter((c) => c.status === 'Pending').length;
    const rejected = children.filter((c) => c.status === 'Rejected').length;

    if (children.length === 0) return { label: 'No Applications', color: 'text-slate-500', count: 0 };
    if (rejected > 0) return { label: `${rejected} Requires Action`, color: 'text-rose-600', count: rejected };
    if (pending > 0) return { label: `${pending} Under Review`, color: 'text-amber-600', count: pending };
    return { label: `${approved} Approved`, color: 'text-emerald-600', count: approved };
  }, [children]);

  // Unverified or Missing Requirements Count
  const pendingRequirementsCount = useMemo(() => {
    let unverified = 0;
    children.forEach((child) => {
      if (child.requirements !== 'Complete') {
        unverified++;
      }
    });
    return unverified;
  }, [children]);

  // Overall Attendance Rate
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

  // Recent Updates Feed (Latest 5)
  const recentUpdates = useMemo(() => {
    const updates: Array<{
      id: string;
      title: string;
      subtitle: string;
      date: string;
      type: 'approved' | 'document' | 'attendance' | 'grade' | 'announcement';
      badgeText: string;
      badgeColor: string;
      dotColor: string;
    }> = [];

    // Add children updates
    children.forEach((c) => {
      if (c.status === 'Enrolled' || c.status === 'Approved') {
        updates.push({
          id: `app-${c.id}`,
          title: `Registration Approved`,
          subtitle: `${c.firstName} ${c.lastName} (Grade ${c.gradeLevel}) is officially registered.`,
          date: 'Recently',
          type: 'approved',
          badgeText: 'STATUS: SUCCESS',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotColor: 'bg-emerald-500'
        });
      } else if (c.status === 'Rejected') {
        updates.push({
          id: `rej-${c.id}`,
          title: `Registration Requires Action`,
          subtitle: `Application for ${c.firstName} ${c.lastName} was returned for revisions.`,
          date: 'Recently',
          type: 'approved',
          badgeText: 'STATUS: FAILED',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: 'bg-rose-500'
        });
      } else if (c.status === 'Pending') {
        updates.push({
          id: `pend-${c.id}`,
          title: `Registration Under Review`,
          subtitle: `Application for ${c.firstName} ${c.lastName} is being reviewed by school staff.`,
          date: 'In Progress',
          type: 'approved',
          badgeText: 'STATUS: PENDING',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500'
        });
      }

      if (c.attendance && c.attendance.length > 0) {
        const latestAtt = [...c.attendance].sort((a, b) => formatDate(b.date).localeCompare(formatDate(a.date)))[0];
        const isAttPresent = latestAtt.status === 'Present' || latestAtt.status === 'Late';
        const formattedAttDate = formatDate(latestAtt.date);
        updates.push({
          id: `att-${c.id}-${formattedAttDate}`,
          title: `Attendance Updated`,
          subtitle: `Attendance marked for ${c.firstName} ${c.lastName} on ${formattedAttDate}.`,
          date: formattedAttDate,
          type: 'attendance',
          badgeText: isAttPresent ? 'STATUS: SUCCESS' : 'STATUS: ABSENT',
          badgeColor: isAttPresent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: isAttPresent ? 'bg-emerald-500' : 'bg-rose-500'
        });
      }
    });

    // Add verified documents updates
    documents.forEach((d) => {
      if (d.status === 'APPROVED') {
        updates.push({
          id: `doc-${d.id}`,
          title: `Document Verified`,
          subtitle: `${d.fileName} for ${d.studentName} has been verified by administration.`,
          date: 'Verified',
          type: 'document',
          badgeText: 'STATUS: SUCCESS',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dotColor: 'bg-emerald-500'
        });
      } else if (d.status === 'REJECTED') {
        updates.push({
          id: `doc-rej-${d.id}`,
          title: `Document Rejected`,
          subtitle: `${d.fileName} for ${d.studentName} requires re-upload.`,
          date: 'Action Required',
          type: 'document',
          badgeText: 'STATUS: FAILED',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          dotColor: 'bg-rose-500'
        });
      }
    });

    // Fallback if low activity
    if (updates.length === 0) {
      updates.push({
        id: 'init-update',
        title: 'System Ready',
        subtitle: 'Your dashboard is fully synchronized with school administration records.',
        date: 'Today',
        type: 'announcement',
        badgeText: 'STATUS: SUCCESS',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500'
      });
    }

    return updates.slice(0, 5);
  }, [children, documents]);

  // Document Center Status Summary (Grouped by Student)
  const documentTypesSummary = useMemo(() => {
    const records: Array<{
      id: string;
      studentName: string;
      docName: string;
      statusText: string;
      statusColor: string;
    }> = [];

    children.forEach((c) => {
      const studentFullName = `${c.firstName || ''} ${c.lastName || ''}`.trim().toUpperCase() || 'LEARNER';
      const classification = (c as any).studentClassification || (c.isReturning ? 'Transferee' : 'New Student');

      let requiredList = [
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
            statusText: 'Complete',
            statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
          <div className="w-10 h-10 border-4 border-[#0C3B99]/30 border-t-[#0C3B99] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500">Synchronizing Dashboard Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-x-hidden text-slate-900 font-sans">
      {/* ── 1. HEADER SECTION ── */}
      <header className="relative px-5 sm:px-8 py-6 bg-white border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#2563eb] text-[10px] font-bold uppercase tracking-wider">
                Academic Year <span className="ml-1 text-slate-600 font-bold">2026–2027</span>
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
              className="w-full sm:w-auto rounded-xl h-11 px-5 shadow-lg shadow-blue-500/20 font-bold bg-[#2563eb] hover:bg-blue-700 text-white flex items-center justify-center gap-2 text-sm transition-all active:scale-98"
              onClick={() => onNavigate('enrollment')}
            >
              <PlusCircle className="w-4.5 h-4.5" />
              <span>Register a Student</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
        {/* ── ROW 1. SUMMARY CARDS (4 CARDS) ── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Card A: Total Registered Students */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Students</p>
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb] shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-slate-900 mb-0.5">{registeredStudentsCount}</h3>
              <p className="text-xs text-slate-400 font-medium">Linked to your account</p>
            </div>
          </div>

          {/* Card B: Pending Actions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Actions</p>
              <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
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
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Average Grade</p>
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb] shrink-0">
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
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
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
          {/* Section: Recent Activity */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#2563eb]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
                </div>
                <span className="text-xs font-medium text-slate-400">Latest 5 activities</span>
              </div>

              <div className="divide-y divide-slate-100">
                {recentUpdates.map((upd) => (
                  <div key={upd.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${upd.dotColor}`} />
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-bold text-slate-900 truncate">{upd.title}</p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed truncate">{upd.subtitle}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0 border ${upd.badgeColor}`}>
                      {upd.badgeText}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section: School Announcements */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-50 pb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#2563eb]">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">School Announcements</h3>
              </div>

              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.id} className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-1">
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

            <Button
              onClick={() => onNavigate('announcements')}
              className="w-full mt-2 bg-slate-50 hover:bg-blue-50 hover:text-[#2563eb] text-slate-600 border border-slate-100 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              View All Announcements <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ── ROW 3. DOCUMENT STATUS + MY STUDENTS OVERVIEW ── */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
          {/* Section: Document Status */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-xs p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#2563eb]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Document Status</h3>
                </div>
              </div>

              {documentTypesSummary.length === 0 ? (
                <p className="text-xs font-medium text-slate-400 py-4 text-center">No documents submitted yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {documentTypesSummary.map((item) => (
                    <div key={item.id} className="p-3.5 bg-slate-50/60 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center border border-slate-200 text-slate-400 shrink-0">
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

            <Button
              onClick={() => onNavigate('requirements')}
              className="w-full mt-2 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all"
            >
              <FolderOpen className="w-4 h-4" /> Go to Document Center
            </Button>
          </div>

          {/* Section: My Students Overview */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100 shadow-xs p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-[#2563eb]">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">My Students Overview</h3>
                </div>
                <span className="w-5 h-5 bg-slate-100 text-slate-600 rounded-full text-[11px] font-bold flex items-center justify-center">
                  {children.length}
                </span>
              </div>

              {children.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>No registered students linked to your account.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {children.map((child) => {
                    const isApproved = child.status === 'Enrolled' || child.status === 'Approved';
                    const isPending = child.status === 'Pending';
                    const regBadge = isApproved
                      ? { label: 'Approved', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                      : isPending
                      ? { label: 'Under Review', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
                      : { label: 'Action Required', bg: 'bg-rose-50 text-rose-700 border-rose-200' };

                    const reqStatus = getStudentRequirementStatus(child);

                    const rawAvg = getStudentAverage(child);
                    const avgDisplay = rawAvg === 'N/A' ? 'No Grades Yet' : rawAvg;
                    const academicStanding = getAcademicStandingBadge(rawAvg);

                    let childAtt = 'N/A';
                    if (child.attendance && child.attendance.length > 0) {
                      const pres = child.attendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
                      childAtt = `${Math.round((pres / child.attendance.length) * 100)}%`;
                    }

                    const lastUpdated = formatDate(child.submittedAt || (child as any).updatedAt || (child as any).createdAt || 'Jul 29, 2026');

                    return (
                      <div key={child.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-3 hover:bg-slate-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-[#2563eb] font-extrabold flex items-center justify-center text-sm border border-blue-200 shrink-0">
                              {child.firstName?.[0]}{child.lastName?.[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm leading-tight uppercase">
                                {child.firstName} {child.lastName}
                              </h4>
                              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                Grade {child.gradeLevel || 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${regBadge.bg}`}>
                              Registration: {regBadge.label}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${reqStatus.color}`}>
                              {reqStatus.statusKey === 'COMPLETE' && '🟢 '}
                              {reqStatus.statusKey === 'REVIEW' && '🟡 '}
                              {reqStatus.statusKey === 'MISSING' && '🔴 '}
                              {reqStatus.label}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 text-xs">
                          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold text-[11px]">General Average</span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{avgDisplay}</span>
                              {academicStanding && (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${academicStanding.color}`}>
                                  {academicStanding.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-100">
                            <span className="text-slate-400 font-semibold text-[11px]">Attendance Rate</span>
                            <span className="font-bold text-slate-800">{childAtt}</span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-0.5">
                          <span className="text-[10px] font-medium text-slate-400">Last Updated: {lastUpdated}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={() => onNavigate('my-students')}
              className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              View Student Profiles <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParentDashboardView;
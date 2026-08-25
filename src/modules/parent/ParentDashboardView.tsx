import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { cn } from '../../components/ui/utils';
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
  Award,
  CalendarCheck,
  CircleDashed,
  Bell,
  Info,
  Pin
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useParentData } from '../../lib/parentData';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { DOCUMENT_TYPES, DocumentType } from '../../lib/schema/phase2';
import { documentTypeToRequirementKey } from '../../lib/services/enrollmentDocumentsService';
import { subscribeParentActivityLogs, ActivityLog } from '../../lib/services/activityLogService';
import { AttachmentViewerModal, AttachmentViewerData } from '../../components/shared/AttachmentViewerModal';
import { NotificationBell } from '../../components/shared/NotificationBell';

interface AnnouncementItem {
  id: string;
  category: string;
  title: string;
  author: string;
  date: string;
  content: string;
  isPinned?: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf' | 'doc';
  attachmentSize?: string;
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
    title: 'Distribution of Learning Modules',
    author: 'Maria Clara Santos',
    date: 'July 26, 2026',
    content: 'Quarter 1 self-learning modules (SLMs) and activity worksheets are ready for claiming at the school gym.'
  },
  {
    id: 'ann-3',
    category: 'Academic',
    title: 'Diagnostic Assessment Schedule',
    author: 'Academic Department',
    date: 'July 24, 2026',
    content: 'Diagnostic tests for Grade 1-6 learners will be administered next week. Review materials uploaded.'
  }
];

export function ParentDashboardView({
  onNavigate
}: { onNavigate: (view: string) => void; }) {
  const { user, userData } = useAuth();
  const { children, documents, loading } = useParentData();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(DEFAULT_ANNOUNCEMENTS);
  const [viewerAttachment, setViewerAttachment] = useState<AttachmentViewerData | null>(null);

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
                content: data.content || '',
                isPinned: !!data.isPinned,
                attachmentName: data.attachmentName || undefined,
                attachmentUrl: data.attachmentUrl || undefined,
                attachmentType: data.attachmentType || undefined,
                attachmentSize: data.attachmentSize || undefined
              };
            })
            .sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return 0;
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

  // Helper for Academic Standing Badge
  const getAcademicStandingBadge = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return null;
    if (num >= 90) return { label: 'Outstanding', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (num >= 85) return { label: 'Very Satisfactory', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (num >= 80) return { label: 'Satisfactory', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    if (num >= 75) return { label: 'Fairly Satisfactory', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Did Not Meet Expectations', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  // Helper for Today's Real-time Attendance Status
  const getTodayAttendanceStatus = (child: any) => {
    const today = new Date();
    const isoToday = today.toISOString().split('T')[0];
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const todayEntry = child.attendance?.find((a: any) => {
      if (!a.date) return false;
      const dStr = typeof a.date === 'string' ? a.date.split('T')[0] : '';
      return dStr === isoToday || dStr === localToday;
    });

    if (!todayEntry || !todayEntry.status || todayEntry.status === 'Unmarked') {
      return {
        status: 'Unmarked',
        badgeTitle: 'Attendance Not Yet Taken',
        description: 'Adviser has not logged today’s roll call yet',
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
        dotColor: 'bg-slate-400',
        isTaken: false
      };
    }

    if (todayEntry.status === 'Present') {
      return {
        status: 'Present',
        badgeTitle: 'Marked Present Today',
        description: 'Confirmed present in classroom roll call by Adviser',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
        isTaken: true
      };
    }

    if (todayEntry.status === 'Late') {
      return {
        status: 'Late',
        badgeTitle: 'Marked Tardy / Late Today',
        description: 'Adviser recorded late arrival in today’s session',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
        isTaken: true
      };
    }

    if (todayEntry.status === 'Absent') {
      return {
        status: 'Absent',
        badgeTitle: 'Marked Absent Today',
        description: 'Adviser recorded student absent for today’s session',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500',
        isTaken: true
      };
    }

    return {
      status: 'Unmarked',
      badgeTitle: 'Attendance Not Yet Taken',
      description: 'Awaiting daily roll call from class adviser',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      dotColor: 'bg-slate-400',
      isTaken: false
    };
  };

  // Helper for Child Attendance Monthly Rates
  const getAttendanceStats = (child: any) => {
    const records = child.attendance || [];
    if (records.length === 0) {
      return { present: 0, late: 0, absent: 0, rate: '100%' };
    }
    const present = records.filter((r: any) => r.status === 'Present').length;
    const late = records.filter((r: any) => r.status === 'Late').length;
    const absent = records.filter((r: any) => r.status === 'Absent').length;
    const total = present + late + absent;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { present, late, absent, rate: `${rate}%` };
  };

  // Helper for Child Grades Summary & Analytics across T1, T2, T3
  const getChildGradesSummary = (c: any) => {
    if (!c || !c.grades) {
      return {
        average: 'N/A',
        standing: null,
        quarters: [
          { name: 'T1', grade: '--' },
          { name: 'T2', grade: '--' },
          { name: 'T3', grade: '--' }
        ],
        subjectCount: 0
      };
    }

    const gLvl = c.gradeLevel || 'Grade 6';
    const normalizedGLvl = gLvl.toString().toLowerCase().replace(/\s+/g, '').replace(/grade/i, '');
    const matchedKey = Object.keys(c.grades).find(k => k.toLowerCase().replace(/\s+/g, '').replace(/grade/i, '') === normalizedGLvl) || Object.keys(c.grades)[0];
    const studentGrades = matchedKey ? c.grades[matchedKey] : null;

    if (!studentGrades || typeof studentGrades !== 'object') {
      return {
        average: 'N/A',
        standing: null,
        quarters: [
          { name: 'T1', grade: '--' },
          { name: 'T2', grade: '--' },
          { name: 'T3', grade: '--' }
        ],
        subjectCount: 0
      };
    }

    const t1Scores: number[] = [];
    const t2Scores: number[] = [];
    const t3Scores: number[] = [];
    const finalGrades: number[] = [];
    let subjectCount = 0;

    const extractTermVal = (subjVal: any, termNames: string[], directKeys: string[]) => {
      if (!subjVal || typeof subjVal !== 'object') return null;

      // Direct property keys
      for (const k of directKeys) {
        if (subjVal[k] !== undefined && subjVal[k] !== null && subjVal[k] !== '' && typeof subjVal[k] !== 'object') {
          const num = parseFloat(subjVal[k]);
          if (!isNaN(num)) return num;
        }
      }

      // Term object keys
      for (const tName of termNames) {
        const termData = subjVal[tName];
        if (termData !== undefined && termData !== null) {
          if (typeof termData === 'number') return termData;
          if (typeof termData === 'string') {
            const num = parseFloat(termData);
            if (!isNaN(num)) return num;
          }
          if (typeof termData === 'object') {
            const vals: number[] = [];
            Object.values(termData).forEach((v: any) => {
              if (v !== undefined && v !== null && v !== '' && typeof v !== 'object') {
                const num = parseFloat(v);
                if (!isNaN(num)) vals.push(num);
              }
            });
            if (vals.length > 0) {
              return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
            }
          }
        }
      }
      return null;
    };

    Object.entries(studentGrades).forEach(([subjCode, subjVal]: [string, any]) => {
      if (!subjVal || typeof subjVal !== 'object') return;
      subjectCount++;

      const t1 = extractTermVal(subjVal, ['Term 1', 'Quarter 1', 'T1', 'Q1'], ['t1', 'q1']);
      const t2 = extractTermVal(subjVal, ['Term 2', 'Quarter 2', 'T2', 'Q2'], ['t2', 'q2']);
      const t3 = extractTermVal(subjVal, ['Term 3', 'Finals', 'Quarter 3', 'T3', 'Q3'], ['t3', 'q3']);

      if (t1 !== null) t1Scores.push(t1);
      if (t2 !== null) t2Scores.push(t2);
      if (t3 !== null) t3Scores.push(t3);

      let subjectFinal: number | null = null;
      if (subjVal.finalGradeOverride !== undefined && subjVal.finalGradeOverride !== null && subjVal.finalGradeOverride !== '') {
        const num = parseFloat(subjVal.finalGradeOverride);
        if (!isNaN(num)) subjectFinal = num;
      }
      if (subjectFinal === null) {
        const activeTerms = [t1, t2, t3].filter((v): v is number => v !== null);
        if (activeTerms.length > 0) {
          subjectFinal = activeTerms.reduce((a, b) => a + b, 0) / activeTerms.length;
        }
      }
      if (subjectFinal !== null) {
        finalGrades.push(subjectFinal);
      }
    });

    const t1Avg = t1Scores.length > 0 ? (t1Scores.reduce((a, b) => a + b, 0) / t1Scores.length).toFixed(1) : '--';
    const t2Avg = t2Scores.length > 0 ? (t2Scores.reduce((a, b) => a + b, 0) / t2Scores.length).toFixed(1) : '--';
    const t3Avg = t3Scores.length > 0 ? (t3Scores.reduce((a, b) => a + b, 0) / t3Scores.length).toFixed(1) : '--';

    let generalAvg = 'N/A';
    if (finalGrades.length > 0) {
      generalAvg = (finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length).toFixed(1);
    } else {
      const activeAverages = [t1Avg, t2Avg, t3Avg].filter(v => v !== '--').map(v => parseFloat(v));
      if (activeAverages.length > 0) {
        generalAvg = (activeAverages.reduce((a, b) => a + b, 0) / activeAverages.length).toFixed(1);
      }
    }

    return {
      average: generalAvg,
      standing: generalAvg !== 'N/A' ? getAcademicStandingBadge(generalAvg) : null,
      quarters: [
        { name: 'T1', grade: t1Avg },
        { name: 'T2', grade: t2Avg },
        { name: 'T3', grade: t3Avg }
      ],
      subjectCount
    };
  };

  // Helper for Student Subject Average (legacy compat)
  const getStudentAverage = (c: any): string => {
    return getChildGradesSummary(c).average;
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

  const parentFirstName = userData?.firstName || (typeof userData?.displayName === 'string' ? userData.displayName.split(' ')[0] : 'Parent');
  const parentFullName = userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'Parent User';

  // Digital clock
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#D8232A]/30 border-t-[#D8232A] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500">Synchronizing Dashboard Data...</p>
        </div>
      </div>
    );
  }

  // Calculate overall average
  const avgs = children.map(c => parseFloat(getStudentAverage(c))).filter(n => !isNaN(n));
  const hasGrade = avgs.length > 0;
  const overallAvg = hasGrade ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : 'N/A';

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-x-hidden text-slate-900 font-sans">
      {/* ── 1. HEADER SECTION ── */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200/80 bg-white sticky top-0 z-30 shadow-2xs flex items-center justify-between shrink-0">
        <div className="flex items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D8232A] to-[#9E171D] text-white flex items-center justify-center shadow-md shadow-red-500/15 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                  Parent Homepage
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex bg-red-50 text-[#D8232A] border-red-200 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                  S.Y. 2026–2027
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-none mt-1 hidden md:block">
                Quick access to your children's records, academic progress, and school updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Live Clock / Date */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>

            {/* Notification Bell */}
            <NotificationBell onNavigate={onNavigate} />

            {/* Register a Student Button */}
            <Button
              className="h-9 px-4 rounded-xl shadow-md shadow-red-500/20 font-bold bg-[#D8232A] hover:bg-red-700 text-white flex items-center justify-center gap-2 text-xs transition-all active:scale-95 cursor-pointer"
              onClick={() => onNavigate('enrollment')}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Student</span>
            </Button>

            {/* Quick Profile Summary Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {typeof userData?.photoURL === 'string' && userData.photoURL.length > 0 ? (
                <img src={userData.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-inner border border-slate-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D8232A] to-[#f87171] text-white flex items-center justify-center font-bold text-xs shadow-inner">
                  {parentFullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {parentFullName}
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#D8232A] leading-tight">
                  Parent / Guardian
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN HOMEPAGE CONTAINER ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-[1600px] mx-auto w-full">
        
        {/* ── 2. CLEAN & PROFESSIONAL WELCOME CARD ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
              Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 18 ? 'Afternoon' : 'Evening'}, {String(parentFirstName)}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              Quickly access your child's records, grades, attendance, and announcements.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Button
              onClick={() => onNavigate('children')}
              className="h-9 sm:h-10 px-4 rounded-xl bg-[#D8232A] hover:bg-[#b91c22] text-white text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>My Children</span>
            </Button>
            <Button
              onClick={() => onNavigate('requirements')}
              variant="outline"
              className="h-9 sm:h-10 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-slate-500" />
              <span>Document Center</span>
            </Button>
          </div>
        </div>

        {/* ── 3. UNIFIED STUDENT OVERVIEW & PERFORMANCE (ATTENDANCE + GRADES IN 1 CARD) ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-5 rounded-full bg-[#D8232A]" />
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Student Overview & Performance</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium pl-4">
                Today's attendance status and academic standing for {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <Button
              onClick={() => onNavigate('children')}
              variant="ghost"
              className="text-xs font-bold text-[#D8232A] hover:bg-red-50 h-8 px-3 rounded-xl cursor-pointer self-start sm:self-auto"
            >
              View Detailed Records <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>

          {children.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
              <GraduationCap className="w-9 h-9 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No Enrolled Children Found</p>
              <p className="text-xs text-slate-400">Enroll your student to view real-time attendance and quarterly grades.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {children.map((child) => {
                const todayStatus = getTodayAttendanceStatus(child);
                const stats = getAttendanceStats(child);
                const gradesSummary = getChildGradesSummary(child);
                const displayGrade = (child.gradeLevel || '').toString().toLowerCase().startsWith('grade')
                  ? child.gradeLevel
                  : `Grade ${child.gradeLevel || 'Level'}`;

                return (
                  <div
                    key={child.id}
                    className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-5 group"
                  >
                    {/* 1. Card Top: Student Profile Info & Enrollment Badge */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#D8232A] font-extrabold flex items-center justify-center text-sm border border-red-200 shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
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
                          <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight uppercase truncate group-hover:text-[#D8232A] transition-colors">
                            {child.firstName} {child.middleName ? `${child.middleName.charAt(0)}. ` : ''}{child.lastName}
                          </h4>
                          <p className="text-xs font-bold text-slate-600 truncate mt-0.5">
                            {displayGrade} {(child as any).sectionName || (child as any).section ? `• Section ${(child as any).sectionName || (child as any).section}` : ''}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                            LRN: <span className="font-bold text-slate-600">{(child as any).lrn || (child as any).studentId || '123456789123'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {child.status === 'Enrolled' || child.status === 'Approved' ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-full border border-emerald-200/80 inline-flex items-center gap-1.5 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Officially Enrolled
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-extrabold rounded-full border border-amber-200/80 inline-flex items-center gap-1.5 shadow-2xs">
                            <CircleDashed className="w-3 h-3 text-amber-500 animate-spin-slow" /> Pending Evaluation
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Card Middle: Clean & Minimalist Attendance (Today) + Grades Block */}
                    <div className="space-y-4">
                      {/* Attendance Section */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                            <CalendarCheck className="w-3.5 h-3.5 text-[#D8232A]" />
                            Today's Attendance
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {stats.rate} Presence
                          </span>
                        </div>

                        {/* Real-time Status Badge */}
                        <div className={cn("p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-colors", todayStatus.badgeColor)}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("w-2 h-2 rounded-full shrink-0", todayStatus.dotColor, todayStatus.isTaken && "animate-pulse")} />
                            <p className="text-xs font-extrabold truncate">
                              {todayStatus.badgeTitle}
                            </p>
                          </div>
                          <span className="text-[10px] opacity-75 font-medium shrink-0">
                            {todayStatus.isTaken ? 'Recorded by Adviser' : 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Academic Performance & General Average */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-[#D8232A]" />
                            Academic Grades
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">
                              {gradesSummary.average !== 'N/A' ? `Avg: ${gradesSummary.average}%` : 'Avg: --'}
                            </span>
                            {gradesSummary.standing && (
                              <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-extrabold border uppercase tracking-wider", gradesSummary.standing.color)}>
                                {gradesSummary.standing.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 3 Term Progression Strip */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {gradesSummary.quarters.map((q) => (
                            <div key={q.name} className="p-1.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                              <p className="text-[9px] font-extrabold text-slate-400 uppercase">{q.name}</p>
                              <p className="text-xs font-black text-slate-800 mt-0.5">{q.grade}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3. Card Bottom / Clean Action Footer */}
                    <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Button
                        onClick={() => onNavigate('children')}
                        className="w-full h-9 bg-[#D8232A] hover:bg-[#b91c22] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>View Full Profile</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 4. SECONDARY SUPPORTING SECTIONS (Requirements Tracker) ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center shrink-0 border border-red-100 shadow-2xs">
                  <FolderOpen className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Document Tracker</h3>
                  <p className="text-xs text-slate-500 font-medium">Requirements & Verification Status</p>
                </div>
              </div>

              <Button
                onClick={() => onNavigate('requirements')}
                variant="ghost"
                className="text-xs font-bold text-[#D8232A] hover:bg-red-50 h-7 px-2 rounded-lg cursor-pointer"
              >
                Manage All Requirements <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>

            {documentTypesSummary.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">No Documents Uploaded</p>
                <p className="text-[11px] text-slate-400">Submitted requirements will track here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {documentTypesSummary.slice(0, 6).map((item) => (
                  <div key={item.id} className="p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-slate-200 text-slate-400 shrink-0 shadow-2xs">
                        <FileText className="w-4 h-4 text-[#D8232A]" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-extrabold text-[#D8232A] block tracking-wide truncate">{item.studentName}</span>
                        <span className="text-xs font-bold text-slate-900 block truncate">{item.docName}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg border shrink-0 ${item.statusColor}`}>
                      {item.statusText}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>Official Enrollment Files</span>
            <span className="font-bold text-slate-700">{documentTypesSummary.length} Documents Logged</span>
          </div>
        </div>

      </div>

      {/* ── IN-APP ATTACHMENT VIEWER LIGHTBOX MODAL ── */}
      <AttachmentViewerModal
        isOpen={!!viewerAttachment}
        onClose={() => setViewerAttachment(null)}
        attachment={viewerAttachment}
      />
    </div>
  );
}

export default ParentDashboardView;

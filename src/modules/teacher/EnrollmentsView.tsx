import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '../../components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/Dialog';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  User,
  Search,
  FileText,
  Download,
  Printer,
  ClipboardCheck,
  Users,
  Filter,
  AlertCircle,
  GraduationCap,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';
import { getCurrentSchoolYear } from '../../lib/utils';
import { cn } from '../../components/ui/utils';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import TeacherStudentDetailView from './TeacherStudentDetailView';
import toast from 'react-hot-toast';

export function EnrollmentsView() {
  const { 
    students, 
    updateStudentStatus, 
    loading, 
    currentGradeLevel, 
    currentSectionName, 
    currentSection,
    assignedSections 
  } = useTeacherData();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentToEnroll, setStudentToEnroll] = useState<any | null>(null);
  const [studentToReject, setStudentToReject] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Incomplete requirements');
  const [psaViewUrl, setPsaViewUrl] = useState<string | null>(null);
  const [psaViewName, setPsaViewName] = useState<string>('');
  
  // Filters & Tabs
  const [statusTab, setStatusTab] = useState<'Pending' | 'Enrolled' | 'Rejected' | 'All'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');

  // Section occupancy data
  const [allSections, setAllSections] = useState<any[]>([]);
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [directEnrollments, setDirectEnrollments] = useState<any[]>([]);

  const normalizeGrade = (g: any): string => {
    if (!g) return '';
    const str = g.toString().toLowerCase().trim();
    if (str.includes('kinder')) return 'kinder';
    const match = str.match(/\d+/);
    return match ? match[0] : str;
  };

  const currentGradeNorm = normalizeGrade(currentGradeLevel);

  useEffect(() => {
    const unsubSections = onSnapshot(collection(db, 'sections'), (snap) => {
      setAllSections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubDirectEnrollments = onSnapshot(collection(db, 'enrollments'), (snap) => {
      setDirectEnrollments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qEnrolled = query(
      collection(db, 'enrollments'),
      where('status', 'in', ['Enrolled', 'enrolled', 'PROMOTED', 'RETAINED', 'IRREGULAR'])
    );
    const unsubEnrolled = onSnapshot(qEnrolled, (snap) => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const sId = data.sectionId;
        if (sId) {
          counts[sId] = (counts[sId] || 0) + 1;
        }
      });
      setSectionCounts(counts);
    });

    return () => {
      unsubSections();
      unsubDirectEnrollments();
      unsubEnrolled();
    };
  }, []);

  // Merge direct enrollment snapshot with context students to ensure zero dropped registrations
  const allAvailableStudents = useMemo(() => {
    const map = new Map<string, any>();
    
    // First seed with teacherData students
    (students || []).forEach(s => {
      if (s && s.id) map.set(s.id, s);
    });

    // Merge direct snapshot registrations
    directEnrollments.forEach(d => {
      if (!d || !d.id) return;
      const rawStatus = (d.status || '').toLowerCase().trim();
      const isPending = rawStatus === 'pending' || rawStatus === 'under review' || rawStatus === 'submitted' || rawStatus === 'pending verification';
      const docGradeNorm = normalizeGrade(d.gradeLevel || d.grade || d.enrollingGrade);
      
      const matchesGrade = !currentGradeNorm || docGradeNorm === currentGradeNorm;
      const matchesSection = d.sectionId === currentSection;
      
      if (isPending && (matchesGrade || matchesSection)) {
        map.set(d.id, { ...d, status: 'Pending' });
      } else if (matchesSection) {
        map.set(d.id, d);
      }
    });

    return Array.from(map.values());
  }, [directEnrollments, students, currentGradeNorm, currentSection]);

  const matchingSections = useMemo(() => {
    if (!studentToEnroll) return [];
    const studentGradeNorm = normalizeGrade(studentToEnroll.gradeLevel || studentToEnroll.grade || currentGradeLevel);
    return allSections.filter(sec => {
      const secGradeNorm = normalizeGrade(sec.gradeLevel);
      return !studentGradeNorm || secGradeNorm === studentGradeNorm;
    });
  }, [studentToEnroll, allSections, currentGradeLevel]);

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
    if (studentToEnroll) {
      setSelectedSectionId(currentSection || mostVacantSectionId || '');
    } else {
      setSelectedSectionId('');
    }
  }, [studentToEnroll, mostVacantSectionId, currentSection]);

  const isImageFile = (url: string | null) => {
    if (!url) return false;
    if (url.startsWith('data:image/')) return true;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.jpg') || 
           cleanUrl.endsWith('.jpeg') || 
           cleanUrl.endsWith('.png') || 
           cleanUrl.endsWith('.webp') || 
           cleanUrl.endsWith('.gif');
  };

  const formatStudentName = (firstName?: string, lastName?: string) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (!last) return first || 'Unnamed Student';
    if (!first) return last || 'Unnamed Student';
    return `${last}, ${first}`;
  };

  // Metrics
  const pendingCount = useMemo(() => allAvailableStudents.filter(s => (s.status || '').toLowerCase() === 'pending').length, [allAvailableStudents]);
  const enrolledCount = useMemo(() => allAvailableStudents.filter(s => (s.status || '').toLowerCase() === 'enrolled').length, [allAvailableStudents]);
  const rejectedCount = useMemo(() => allAvailableStudents.filter(s => (s.status || '').toLowerCase() === 'rejected').length, [allAvailableStudents]);
  const totalCount = allAvailableStudents.length;

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return allAvailableStudents
      .filter((s) => {
        // Status filter
        const rawStatus = (s.status || 'Pending').toLowerCase();
        if (statusTab === 'Pending' && rawStatus !== 'pending') return false;
        if (statusTab === 'Enrolled' && rawStatus !== 'enrolled') return false;
        if (statusTab === 'Rejected' && rawStatus !== 'rejected') return false;

        // Gender filter
        if (genderFilter !== 'All' && s.gender !== genderFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const fullName = `${s.firstName || ''} ${s.lastName || ''} ${s.middleName || ''}`.toLowerCase();
          const lrn = (s.lrn || '').toLowerCase();
          const guardian = ((s as any).guardianName || (s as any).parentName || '').toLowerCase();
          return fullName.includes(q) || lrn.includes(q) || guardian.includes(q);
        }

        return true;
      })
      .sort((a, b) => {
        const nameA = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase();
        const nameB = `${b.lastName || ''} ${b.firstName || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [students, statusTab, genderFilter, searchQuery]);

  // Handle Approve & Enroll
  const handleConfirmEnroll = async () => {
    if (!studentToEnroll || isProcessing) return;
    setIsProcessing(true);
    const toastId = toast.loading(`Enrolling ${studentToEnroll.firstName}...`);
    try {
      await updateStudentStatus(studentToEnroll.id, 'Enrolled', selectedSectionId);
      toast.success(`${studentToEnroll.firstName} successfully enrolled!`, { id: toastId });
      setStudentToEnroll(null);
    } catch (err) {
      console.error("Error approving enrollment:", err);
      toast.error("Failed to approve enrollment. Please try again.", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!studentToReject || isProcessing) return;
    setIsProcessing(true);
    const toastId = toast.loading(`Declining ${studentToReject.firstName}'s application...`);
    try {
      await updateDoc(doc(db, 'enrollments', studentToReject.id), {
        status: 'Rejected',
        rejectedReason: rejectReason,
        rejectedAt: new Date().toISOString()
      });
      toast.success(`Application declined.`, { id: toastId });
      setStudentToReject(null);
    } catch (err) {
      console.error("Error declining enrollment:", err);
      toast.error("Failed to decline enrollment.", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedStudentId) {
    return (
      <TeacherStudentDetailView 
        studentId={selectedStudentId} 
        onBack={() => setSelectedStudentId(null)} 
      />
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Enrollment Requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      
      {/* 1. Header Bar */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs sticky top-0 z-30">
        <div className="flex flex-row items-center justify-between gap-4 w-full max-w-[1600px] mx-auto">
          
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A] shadow-2xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  Enrollment Applications
                </h1>
                <Badge variant="outline" className="text-[10px] font-extrabold bg-slate-50 border-slate-200 text-slate-600 px-2 py-0.5">
                  S.Y. {getCurrentSchoolYear()}
                </Badge>
                {pendingCount > 0 && (
                  <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                    {pendingCount} Needs Review
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Review, verify documents, and assign sections for incoming learners
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 text-xs font-bold shadow-2xs">
              <GraduationCap className="w-4 h-4 text-[#D8232A]" />
              <span>{currentGradeLevel ? `Grade ${currentGradeLevel}` : 'My Section'} {currentSectionName ? `• ${currentSectionName}` : ''}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* KPI Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div 
            onClick={() => setStatusTab('Pending')}
            className={cn(
              "bg-white rounded-2xl border p-4.5 shadow-xs transition-all duration-200 flex items-center gap-3.5 cursor-pointer group hover:shadow-md",
              statusTab === 'Pending' ? "border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/20" : "border-slate-200/70"
            )}
          >
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Pending Review</p>
              <p className="text-xl sm:text-2xl font-black text-amber-700">{pendingCount}</p>
              <p className="text-[10.5px] font-semibold text-amber-600">Action Required</p>
            </div>
          </div>

          <div 
            onClick={() => setStatusTab('Enrolled')}
            className={cn(
              "bg-white rounded-2xl border p-4.5 shadow-xs transition-all duration-200 flex items-center gap-3.5 cursor-pointer group hover:shadow-md",
              statusTab === 'Enrolled' ? "border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-50/20" : "border-slate-200/70"
            )}
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Approved / Enrolled</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-700">{enrolledCount}</p>
              <p className="text-[10.5px] font-semibold text-emerald-600">Official Students</p>
            </div>
          </div>

          <div 
            onClick={() => setStatusTab('Rejected')}
            className={cn(
              "bg-white rounded-2xl border p-4.5 shadow-xs transition-all duration-200 flex items-center gap-3.5 cursor-pointer group hover:shadow-md",
              statusTab === 'Rejected' ? "border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20" : "border-slate-200/70"
            )}
          >
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Declined</p>
              <p className="text-xl sm:text-2xl font-black text-rose-700">{rejectedCount}</p>
              <p className="text-[10.5px] font-semibold text-slate-400">Rejected</p>
            </div>
          </div>

          <div 
            onClick={() => setStatusTab('All')}
            className={cn(
              "bg-white rounded-2xl border p-4.5 shadow-xs transition-all duration-200 flex items-center gap-3.5 cursor-pointer group hover:shadow-md",
              statusTab === 'All' ? "border-blue-400 ring-2 ring-blue-400/20 bg-blue-50/20" : "border-slate-200/70"
            )}
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Applications</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{totalCount}</p>
              <p className="text-[10.5px] font-semibold text-slate-400">All Records</p>
            </div>
          </div>
        </div>

        {/* Controls and Table Container */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          
          {/* Unified Controls Bar (Search on Left, Status & Gender Dropdowns on Right) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-200/70">
            
            {/* Search Input (Left side) */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search by student name, LRN, or parent..."
                className="pl-9.5 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdowns (Right side) */}
            <div className="flex items-center gap-2.5 shrink-0">
              
              {/* Status Dropdown */}
              <Select value={statusTab} onValueChange={(v) => setStatusTab(v as 'Pending' | 'Enrolled' | 'Rejected' | 'All')}>
                <SelectTrigger className="w-[170px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-bold text-slate-800 shadow-2xs">
                  <SelectValue placeholder="Status">
                    {statusTab === 'Pending' ? `Pending (${pendingCount})` :
                     statusTab === 'Enrolled' ? `Enrolled (${enrolledCount})` :
                     statusTab === 'Rejected' ? `Declined (${rejectedCount})` :
                     `All Statuses (${totalCount})`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All" className="text-xs font-bold">
                    <span>All Applications</span>
                    <span className="text-slate-400 ml-1.5 font-medium">({totalCount})</span>
                  </SelectItem>
                  <SelectItem value="Pending" className="text-xs font-bold text-amber-700">
                    <span>Pending Review</span>
                    <span className="text-amber-600/70 ml-1.5 font-medium">({pendingCount})</span>
                  </SelectItem>
                  <SelectItem value="Enrolled" className="text-xs font-bold text-emerald-700">
                    <span>Approved / Enrolled</span>
                    <span className="text-emerald-600/70 ml-1.5 font-medium">({enrolledCount})</span>
                  </SelectItem>
                  <SelectItem value="Rejected" className="text-xs font-bold text-rose-700">
                    <span>Declined</span>
                    <span className="text-rose-600/70 ml-1.5 font-medium">({rejectedCount})</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Gender Dropdown */}
              <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as 'All' | 'Male' | 'Female')}>
                <SelectTrigger className="w-[130px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-bold text-slate-800 shadow-2xs">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All" className="text-xs font-bold">All Genders</SelectItem>
                  <SelectItem value="Male" className="text-xs font-bold">Male</SelectItem>
                  <SelectItem value="Female" className="text-xs font-bold">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Applications Table */}
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                <TableRow className="hover:bg-transparent border-none h-11">
                  <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-4">#</TableHead>
                  <TableHead className="w-40 text-[10px] font-bold uppercase tracking-wider text-slate-500">LRN</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learner Name</TableHead>
                  <TableHead className="w-28 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Grade Level</TableHead>
                  <TableHead className="w-24 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Gender</TableHead>
                  <TableHead className="w-32 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">PSA Document</TableHead>
                  <TableHead className="w-28 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Status</TableHead>
                  <TableHead className="w-56 text-right pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                      <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-bold text-slate-700">No applications found</p>
                      <p className="text-xs text-slate-400 mt-0.5">There are no student records matching the selected status or search filter.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const isMale = (student.gender || '').toLowerCase().startsWith('m');
                    const initials = `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`;
                    const photo = (student as any).photoURL || (student as any).photoUrl;
                    const psaUrl = (student as any).psaBirthCertificate || (student as any).psaUrl || (student as any).psaDocument;
                    const st = (student.status || 'Pending').toLowerCase();

                    return (
                      <TableRow key={student.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors h-16">
                        <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                        <TableCell className="font-mono font-bold text-slate-600 text-xs">{student.lrn || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {photo ? (
                              <img
                                src={photo}
                                alt={student.firstName}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className={cn(
                                "w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border uppercase",
                                isMale ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-pink-50 text-pink-700 border-pink-200"
                              )}>
                                {initials || 'ST'}
                              </div>
                            )}
                            <div>
                              <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                {student.lastName}, {student.firstName} {student.middleName || ''}
                              </p>
                              <p className="text-[10.5px] text-slate-400 font-medium">
                                {(student as any).guardianName || (student as any).parentName || 'Parent not listed'}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-extrabold text-xs px-2.5 py-0.5 bg-slate-50 border-slate-200 text-slate-700">
                            Grade {student.gradeLevel || currentGradeLevel || '1'}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center text-xs font-semibold">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] font-extrabold",
                            isMale ? "text-blue-700 bg-blue-50" : "text-pink-700 bg-pink-50"
                          )}>
                            {student.gender || 'N/A'}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          {psaUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPsaViewUrl(psaUrl);
                                setPsaViewName(`${student.lastName}_${student.firstName}_PSA`);
                              }}
                              className="h-8 px-2.5 rounded-lg border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1 mx-auto"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View PSA</span>
                            </Button>
                          ) : (
                            <span className="text-slate-300 text-xs font-semibold">None</span>
                          )}
                        </TableCell>

                        <TableCell className="text-center">
                          {st === 'enrolled' ? (
                            <Badge className="bg-emerald-50 hover:bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold text-[11px] px-2.5 py-0.5">
                              Enrolled
                            </Badge>
                          ) : st === 'rejected' ? (
                            <Badge className="bg-rose-50 hover:bg-rose-50 text-rose-700 border-rose-200 font-extrabold text-[11px] px-2.5 py-0.5">
                              Declined
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 hover:bg-amber-50 text-amber-700 border-amber-200 font-extrabold text-[11px] px-2.5 py-0.5">
                              Pending
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedStudentId(student.id)}
                              className="h-8.5 px-2.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1 transition-all"
                              title="Inspect Full Student Profile"
                            >
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              <span>Profile</span>
                            </Button>

                            {st === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setStudentToEnroll(student)}
                                  className="h-8.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 active:scale-95 transition-all"
                                  title="Approve and Assign Section"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setStudentToReject(student)}
                                  className="h-8.5 px-2.5 rounded-xl border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-bold shadow-2xs flex items-center gap-1 active:scale-95 transition-all"
                                  title="Decline Enrollment"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredStudents.length} of {totalCount} total applicants
            </span>
          </div>
        </div>

      </div>

      {/* 3. Confirm Enrollment Modal (with Section Picker & Most Vacant recommendation) */}
      <Dialog open={!!studentToEnroll} onOpenChange={(open) => !open && setStudentToEnroll(null)}>
        <DialogContent className="sm:max-w-[480px] p-6 rounded-3xl border border-slate-200 shadow-2xl bg-white animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader className="space-y-2.5">
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              Approve Student Enrollment
            </DialogTitle>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Verify student identity and select the official classroom section for enrollment.
            </p>
          </DialogHeader>

          {studentToEnroll && (
            <div className="space-y-4 my-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3.5 text-left">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Learner Name</span>
                  <span className="text-sm font-black text-slate-900">
                    {formatStudentName(studentToEnroll.firstName, studentToEnroll.lastName)} {studentToEnroll.middleName || ''}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">LRN</span>
                    <span className="text-xs font-mono font-bold text-slate-700">{studentToEnroll.lrn || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Grade &amp; Gender</span>
                    <span className="text-xs font-bold text-slate-700">Grade {studentToEnroll.gradeLevel || currentGradeLevel || '1'} • {studentToEnroll.gender || 'N/A'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/70 space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    Assign Classroom Section
                  </label>
                  <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                    <SelectTrigger className="w-full h-11 border-slate-200 rounded-xl bg-white focus:ring-red-500/20 text-slate-800 font-bold text-xs text-left">
                      <SelectValue placeholder="Select section...">
                        {(() => {
                          const sel = matchingSections.find(s => s.id === selectedSectionId);
                          if (!sel) return 'Select section...';
                          const count = sectionCounts[sel.id] || 0;
                          return `${sel.name || sel.sectionName} (${count} students enrolled)`;
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[220px] overflow-y-auto">
                      {matchingSections.map(sec => {
                        const count = sectionCounts[sec.id] || 0;
                        const isMostVacant = sec.id === mostVacantSectionId;
                        return (
                          <SelectItem key={sec.id} value={sec.id} className="text-xs font-bold">
                            <span>{sec.name || sec.sectionName}</span>
                            <span className="text-slate-400 font-medium text-[11px] ml-2">({count} students)</span>
                            {isMostVacant && (
                              <span className="text-emerald-700 font-extrabold text-[9px] ml-2 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                                Most Vacant
                              </span>
                            )}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isProcessing}
              className="w-full sm:w-1/2 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 h-10 text-xs font-bold"
              onClick={() => setStudentToEnroll(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isProcessing || !selectedSectionId}
              className="w-full sm:w-1/2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-10 text-xs font-bold active:scale-98 transition-all"
              onClick={handleConfirmEnroll}
            >
              {isProcessing ? "Enrolling..." : "Confirm & Enroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Reject Enrollment Dialog */}
      <Dialog open={!!studentToReject} onOpenChange={(open) => !open && setStudentToReject(null)}>
        <DialogContent className="sm:max-w-[440px] p-6 rounded-3xl border border-slate-200 shadow-2xl bg-white animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader className="space-y-2.5">
            <DialogTitle className="text-lg font-black text-rose-700 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              Decline Application
            </DialogTitle>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Please specify the reason for declining this student application.
            </p>
          </DialogHeader>

          {studentToReject && (
            <div className="space-y-3.5 my-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-bold text-slate-900">
                  {studentToReject.lastName}, {studentToReject.firstName}
                </p>
                <p className="text-[11px] font-mono text-slate-500">LRN: {studentToReject.lrn || 'N/A'}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Reason for declining</label>
                <Select value={rejectReason} onValueChange={setRejectReason}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Incomplete requirements" className="text-xs font-bold">Incomplete requirements (PSA / SF9)</SelectItem>
                    <SelectItem value="Duplicate application" className="text-xs font-bold">Duplicate application</SelectItem>
                    <SelectItem value="Incorrect grade level" className="text-xs font-bold">Incorrect grade level</SelectItem>
                    <SelectItem value="Section capacity full" className="text-xs font-bold">Section capacity full</SelectItem>
                    <SelectItem value="Other reasons" className="text-xs font-bold">Other administrative reasons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isProcessing}
              className="w-full sm:w-1/2 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 h-10 text-xs font-bold"
              onClick={() => setStudentToReject(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isProcessing}
              className="w-full sm:w-1/2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm h-10 text-xs font-bold active:scale-98 transition-all"
              onClick={handleConfirmReject}
            >
              {isProcessing ? "Declining..." : "Decline Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. PSA Document Viewer Modal */}
      <Dialog open={!!psaViewUrl} onOpenChange={(open) => !open && setPsaViewUrl(null)}>
        <DialogContent className="sm:max-w-4xl w-[95vw] h-[85vh] p-0 rounded-3xl border border-slate-200 shadow-2xl bg-white flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between gap-4 bg-slate-50/70 shrink-0">
            <div className="text-left">
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                PSA Birth Certificate Preview
              </DialogTitle>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {psaViewName || 'Birth Certificate Document'}
              </p>
            </div>
            <div className="flex items-center gap-2 pr-8 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-8.5 text-xs font-bold bg-white border-slate-200 text-slate-700 shadow-2xs hover:bg-slate-50"
                onClick={() => {
                  if (psaViewUrl) {
                    const link = document.createElement('a');
                    link.href = psaViewUrl;
                    link.download = psaViewName || 'PSA_Birth_Certificate';
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 bg-slate-900/90 relative flex items-center justify-center p-4 overflow-hidden">
            {psaViewUrl && (
              isImageFile(psaViewUrl) ? (
                <img
                  src={psaViewUrl}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg bg-white"
                  alt="PSA Document Preview"
                />
              ) : (
                <iframe
                  src={psaViewUrl}
                  className="w-full h-full rounded-lg border-0 bg-white shadow-inner"
                  title="PSA Document Preview"
                />
              )
            )}
          </div>

          <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
            <Button onClick={() => setPsaViewUrl(null)} className="rounded-xl px-5 h-9 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

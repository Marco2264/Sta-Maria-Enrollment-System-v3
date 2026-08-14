import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Search, GraduationCap, FileEdit, Users, Loader2, Filter, Download } from 'lucide-react';
import { AdminEditStudentModal } from './AdminEditStudentModal';
import { AdminStudentDetailView } from './AdminStudentDetailView';
import { useAdminData } from '../../lib/adminData';
import { generateAdminSF1 } from '../../lib/excelGenerator';

export function StudentsView() {
  const { sections } = useAdminData();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [gradeFilter, setGradeFilter] = useState<string>('All Grades');
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, gradeFilter]);

  useEffect(() => {
    // Fetch all enrollments
    const q = query(collection(db, 'enrollments'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    let result = students;

    if (statusFilter !== 'All Statuses') {
      result = result.filter(s => s.status === statusFilter);
    }
    if (gradeFilter !== 'All Grades') {
      result = result.filter(s => s.gradeLevel === gradeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        `${s.firstName} ${s.lastName} ${s.lrn}`.toLowerCase().includes(q)
      );
    }

    // Sort Alphabetically by Last Name then First Name
    result.sort((a, b) => {
      const aName = `${a.lastName} ${a.firstName}`.toLowerCase();
      const bName = `${b.lastName} ${b.firstName}`.toLowerCase();
      return aName.localeCompare(bName);
    });

    return result;
  }, [students, searchQuery, statusFilter, gradeFilter]);

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const currentStudents = filteredStudents.slice((currentPage - 1) * studentsPerPage, currentPage * studentsPerPage);

  const handleEditClick = (student: any) => {
    setSelectedStudentId(student.id);
    setIsModalOpen(true);
  };

  const handleViewProfile = (student: any) => {
    setSelectedProfileId(student.id);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (filteredStudents.length === 0) {
      alert("No student records available to export.");
      return;
    }
    setIsExporting(true);
    try {
      const toDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (timestamp instanceof Date) return timestamp;
        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        const parsed = new Date(timestamp);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      const calcAge = (birthDateStr?: string): number | undefined => {
        if (!birthDateStr) return undefined;
        const birthDate = new Date(birthDateStr);
        if (isNaN(birthDate.getTime())) return undefined;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const formatBirthDate = (dateStr?: string): string => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      };

      const learners = filteredStudents.map(s => {
        const bdate: string | undefined =
          typeof s.birthDate === 'string'
            ? s.birthDate
            : toDate(s.birthDate)?.toISOString().split('T')[0];

        return {
          id: s.id,
          lrn: s.lrn ?? '',
          lastName: s.lastName ?? s.familyName ?? '',
          firstName: s.firstName ?? s.givenName ?? '',
          middleName: s.middleName ?? '',
          gender: s.gender ?? '',
          birthDate: formatBirthDate(bdate),
          age: calcAge(bdate),
          birthCity: s.address?.birthCity ?? s.birthCity ?? '',
          birthProvince: s.address?.birthProvince ?? s.birthProvince ?? '',
          motherTongue: s.additional?.motherTongue ?? s.motherTongue ?? '',
          indigenousGroup:
            s.additional?.isIndigenous
              ? (s.additional?.indigenousGroup ?? '')
              : '',
          religion: s.additional?.religion ?? s.religion ?? '',
          addressStreet: s.address?.street ?? '',
          addressBarangay: s.address?.barangay ?? '',
          addressCity: s.address?.city ?? '',
          addressProvince: s.address?.province ?? '',
          fatherName: s.fatherName ?? '',
          motherName: s.motherName ?? '',
          guardianName: s.medical?.emergencyContact ?? s.guardianName ?? '',
          guardianRelationship: s.guardianRelationship ?? 'Parent',
          contactNumber: s.medical?.emergencyPhone ?? s.contactNumber ?? '',
          remarks: s.remarks ?? '',
        };
      });

      let gradeLevel = "All Grades";
      if (gradeFilter !== 'All Grades') {
        gradeLevel = `Grade ${gradeFilter}`;
      } else if (filteredStudents[0]?.gradeLevel) {
        gradeLevel = filteredStudents[0].gradeLevel;
      }

      const section = filteredStudents[0]?.sectionName || "All Sections";
      const schoolYear = filteredStudents[0]?.schoolYear || "2025-2026";

      await generateAdminSF1({
        schoolYear,
        gradeLevel,
        section,
        learners
      });
    } catch (err) {
      console.error("Failed to export SF1:", err);
      alert("An error occurred while exporting SF1 Excel sheet. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enrolled': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Dropped': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Transferred': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStudentPhoto = (s: any): string | null => {
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // If a profile is selected, show the full profile view
  if (selectedProfileId) {
    const profileStudent = students.find(s => s.id === selectedProfileId);
    if (profileStudent) {
      return (
        <AdminStudentDetailView
          student={profileStudent}
          onBack={() => setSelectedProfileId(null)}
        />
      );
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9]">
      {/* HEADER */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between z-10">
        <div className="flex flex-row items-center justify-between gap-6 w-full">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2.5 bg-[#D8232A]/10 text-[#D8232A] border border-[#D8232A]/20 rounded-2xl shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D8232A] leading-none mb-1">Admin Portal</span>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Students Management</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name or LRN..."
                className="pl-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-slate-300 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/15 transition-all text-sm w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[130px] h-10 rounded-xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-[#D8232A]/15 focus:border-[#D8232A] font-medium text-sm">
                <div className="flex items-center"><Filter className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" /><SelectValue placeholder="Grade" /></div>
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-slate-200">
                <SelectItem value="All Grades">All Grades</SelectItem>
                {[1, 2, 3, 4, 5, 6].map(g => (<SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-10 rounded-xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-[#D8232A]/15 focus:border-[#D8232A] font-medium text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-lg border-slate-200">
                <SelectItem value="All Statuses">All Statuses</SelectItem>
                <SelectItem value="Enrolled">Enrolled</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="h-10 px-4 bg-[#D8232A] hover:bg-[#b01c22] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 duration-100 border-none disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : 'Export Excel'}
            </Button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <Card className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-slate-100 bg-white/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-xl text-slate-900">
                {statusFilter === 'All Statuses' ? 'All Students' : `${statusFilter} Students`}
              </h3>
              <p className="text-xs text-slate-400 font-medium">Click <strong>Edit</strong> to view a student's full profile</p>
            </div>
            <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#D8232A]/10 text-[#D8232A] uppercase tracking-wider border border-[#D8232A]/20">
              {filteredStudents.length} {filteredStudents.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider pl-6 py-4">Student</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">LRN</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">Grade</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">Gender</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider text-right pr-6 py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-slate-400 font-medium">
                      No students found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentStudents.map((s) => {
                    const photo = getStudentPhoto(s);
                    const initials = `${s.firstName?.charAt(0) || ''}${s.lastName?.charAt(0) || ''}`.toUpperCase();
                    return (
                      <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3.5">
                            {photo ? (
                              <img src={photo} alt={s.firstName} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-50/80 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-blue-100/80 uppercase">
                                {initials}
                              </div>
                            )}
                            <span className="font-bold text-slate-800 text-sm tracking-tight">
                              {s.lastName}, {s.firstName}{s.middleName ? ` ${s.middleName.charAt(0)}.` : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-xs font-medium py-4">{s.lrn || 'N/A'}</TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 px-2.5 py-0.5 rounded-md font-semibold text-xs">
                            Grade {s.gradeLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className={`font-bold text-sm ${
                            s.gender === 'Male' ? 'text-blue-600' : s.gender === 'Female' ? 'text-pink-600' : 'text-slate-500'
                          }`}>{s.gender || '--'}</span>
                        </TableCell>
                        <TableCell className="pr-6 py-4 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3.5 text-[#D8232A] hover:bg-[#D8232A]/10 hover:text-[#D8232A] transition-colors rounded-xl font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 duration-100"
                            onClick={() => handleViewProfile(s)}
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              Showing <strong className="text-slate-700">{Math.min((currentPage - 1) * studentsPerPage + 1, filteredStudents.length)}</strong> to <strong className="text-slate-700">{Math.min(currentPage * studentsPerPage, filteredStudents.length)}</strong> of <strong className="text-slate-700">{filteredStudents.length}</strong> students
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 rounded-lg">Previous</Button>
                <span className="text-sm text-slate-600 font-medium px-2">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 rounded-lg">Next</Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      <AdminEditStudentModal
        student={selectedStudent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

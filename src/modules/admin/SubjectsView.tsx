import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '../../components/ui/Table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter 
} from '../../components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Filter, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Sparkles,
  GraduationCap,
  Layers,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2
} from 'lucide-react';
import { useAdminData, Subject } from '../../lib/adminData';
import { getCurrentSchoolYear } from '../../lib/utils';
import { cn } from '../../components/ui/utils';
import toast from 'react-hot-toast';

const subjectRowMap: Record<string, string> = {
  'filipino': 'FILIPINO',
  'english': 'ENGLISH',
  'mathematics': 'MATH',
  'math': 'MATH',
  'science': 'SCIENCE',
  'araling panlipunan': 'AP',
  'ap': 'AP',
  'good manners and right conduct (gmrc)': 'ESP',
  'gmrc': 'ESP',
  'edukasyon sa pagpapakatao': 'ESP',
  'esp': 'ESP',
  'epp': 'EPP_TLE',
  'tle': 'EPP_TLE',
  'epp/tle': 'EPP_TLE',
  'epp/tle (epp)': 'EPP_TLE',
  'epp/tle (tle)': 'EPP_TLE',
  'music & arts': 'MAPEH',
  'music and arts': 'MAPEH',
  'music': 'MUSIC',
  'arts': 'ARTS',
  'pe & health': 'PE_HEALTH',
  'pe and health': 'PE_HEALTH',
  'physical education': 'PE',
  'health': 'HEALTH',
  'mapeh': 'MAPEH',
  'language': 'LANGUAGE',
  'reading': 'READING',
  'literacy': 'LITERACY',
  'makabansa': 'MAKABANSA'
};

const getSubjectBadgeTheme = (name: string = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('math')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', iconBg: 'bg-blue-100 text-blue-700' };
  if (lower.includes('science')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-100 text-emerald-700' };
  if (lower.includes('english')) return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', iconBg: 'bg-indigo-100 text-indigo-700' };
  if (lower.includes('filipino')) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', iconBg: 'bg-amber-100 text-amber-700' };
  if (lower.includes('araling') || lower.includes('ap')) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', iconBg: 'bg-orange-100 text-orange-700' };
  if (lower.includes('mapeh') || lower.includes('music') || lower.includes('art') || lower.includes('pe') || lower.includes('health')) return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', iconBg: 'bg-rose-100 text-rose-700' };
  if (lower.includes('esp') || lower.includes('gmrc') || lower.includes('edukasyon')) return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', iconBg: 'bg-teal-100 text-teal-700' };
  if (lower.includes('epp') || lower.includes('tle')) return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', iconBg: 'bg-cyan-100 text-cyan-700' };
  return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', iconBg: 'bg-slate-100 text-slate-700' };
};

export function SubjectsView() {
  const { 
    subjects, 
    addSubject, 
    updateSubject, 
    deleteSubject, 
    loading 
  } = useAdminData();

  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filters & Sorting
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'grade' | 'year' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const uniqueYears = useMemo(() => {
    return Array.from(new Set(subjects.map(s => s.academicYear).filter(Boolean))).sort().reverse();
  }, [subjects]);

  const [newSubject, setNewSubject] = useState({
    name: '',
    gradeLevel: 'Grade 1',
    status: 'Active' as 'Active' | 'Inactive',
    credits: 1,
    academicYear: getCurrentSchoolYear()
  });

  const getDateString = (ts: unknown) => {
    if (!ts) return 'N/A';
    if (typeof ts === 'object' && 'toDate' in ts && typeof (ts as { toDate?: () => Date }).toDate === 'function') {
      return (ts as { toDate: () => Date }).toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return new Date(ts as string | number | Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSort = (field: 'name' | 'grade' | 'year' | 'status') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const cleanName = newSubject.name.toLowerCase().trim();
      const code = subjectRowMap[cleanName] || newSubject.name.toUpperCase().replace(/\s+/g, '_');
      await addSubject({
        ...newSubject,
        code
      });
      toast.success("Subject added successfully!");
      setIsOpen(false);
      setNewSubject({
        name: '',
        gradeLevel: 'Grade 1',
        status: 'Active',
        credits: 1,
        academicYear: getCurrentSchoolYear()
      });
    } catch (error) {
      console.error("Error adding subject: ", error);
      toast.error("Failed to add subject.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubject && !isSaving) {
      setIsSaving(true);
      try {
        const { id, ...dataToUpdate } = editingSubject;
        await updateSubject(id, dataToUpdate);
        toast.success("Subject updated successfully!");
        setIsEditOpen(false);
      } catch (error) {
        console.error("Error updating subject: ", error);
        toast.error("Failed to update subject.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteSubject(id);
      toast.success("Subject deleted successfully!");
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Failed to delete subject.");
    }
  };

  const handleAutoSeed = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const defaultYear = getCurrentSchoolYear();
      const grade1 = [
        'Language',
        'Reading and Literacy',
        'Mathematics',
        'Makabansa',
        'Good Manners and Right Conduct (GMRC)'
      ];
      const grade2 = [
        'Filipino',
        'English',
        'Mathematics',
        'Makabansa',
        'Good Manners and Right Conduct (GMRC)'
      ];
      const grade3 = [
        'Filipino',
        'English',
        'Mathematics',
        'Science',
        'Makabansa',
        'Good Manners and Right Conduct (GMRC)'
      ];
      const grade4and5 = [
        'Filipino',
        'English',
        'Mathematics',
        'Science',
        'Araling Panlipunan (AP)',
        'MAPEH',
        'Music',
        'Arts',
        'Physical Education',
        'Health',
        'Edukasyong Pantahanan at Pangkabuhayan (EPP)',
        'Good Manners and Right Conduct (GMRC)'
      ];
      const grade6 = [
        'Filipino',
        'English',
        'Mathematics',
        'Science',
        'Araling Panlipunan',
        'MAPEH',
        'Music',
        'Arts',
        'Physical Education',
        'Health',
        'Technology and Livelihood Education (TLE)',
        'Good Manners and Right Conduct (GMRC)'
      ];

      let addedCount = 0;
      let skippedCount = 0;

      const addForGrade = async (grade: string, subjectsList: string[]) => {
        for (const name of subjectsList) {
          const exists = subjects.some(s => 
            (s.name || '').trim().toLowerCase() === name.trim().toLowerCase() && 
            s.gradeLevel === grade && 
            s.academicYear === defaultYear
          );

          if (exists) {
            skippedCount++;
            continue;
          }

          const cleanName = name.toLowerCase().trim();
          const code = subjectRowMap[cleanName] || name.toUpperCase().replace(/\s+/g, '_');
          await addSubject({
            name,
            code,
            gradeLevel: grade,
            status: 'Active',
            academicYear: defaultYear
          });
          addedCount++;
        }
      };

      await addForGrade('Grade 1', grade1);
      await addForGrade('Grade 2', grade2);
      await addForGrade('Grade 3', grade3);
      await addForGrade('Grade 4', grade4and5);
      await addForGrade('Grade 5', grade4and5);
      await addForGrade('Grade 6', grade6);

      if (addedCount === 0) {
        toast.success("All default DepEd subjects already seeded!");
      } else {
        toast.success(`Seeded ${addedCount} new subjects! (${skippedCount} already existed)`);
      }
    } catch (error) {
      console.error("Error seeding subjects:", error);
      toast.error("Error auto-seeding subjects.");
    } finally {
      setIsSaving(false);
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = subjects.length;
    const active = subjects.filter(s => s.status === 'Active').length;
    const gradeCounts = new Set(subjects.map(s => s.gradeLevel).filter(Boolean)).size;
    return { total, active, gradeCounts };
  }, [subjects]);

  // Filter and sort subjects
  const filteredSubjects = useMemo(() => {
    return subjects
      .filter(s => {
        const matchesYear = selectedYear === 'All' || s.academicYear === selectedYear;
        const matchesGrade = selectedGrade === 'All' || s.gradeLevel === selectedGrade;
        const q = searchQuery.toLowerCase();
        const matchesSearch = (s.name || '').toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q);
        return matchesYear && matchesGrade && matchesSearch;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'name') {
          comp = (a.name || '').localeCompare(b.name || '');
        } else if (sortField === 'grade') {
          const numA = parseInt((a.gradeLevel || '').replace(/\D/g, '')) || 0;
          const numB = parseInt((b.gradeLevel || '').replace(/\D/g, '')) || 0;
          comp = numA - numB;
        } else if (sortField === 'year') {
          comp = (a.academicYear || '').localeCompare(b.academicYear || '');
        } else if (sortField === 'status') {
          comp = (a.status || '').localeCompare(b.status || '');
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [subjects, selectedYear, selectedGrade, searchQuery, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / itemsPerPage));
  const paginatedSubjects = useMemo(() => {
    return filteredSubjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredSubjects, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#D8232A]/20 border-t-[#D8232A]"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Curriculum Subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      {/* 1. Top Header */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex flex-row items-center justify-between gap-4 w-full max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-900">
              <BookOpen className="w-5 h-5 text-[#D8232A]" />
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Curriculum Subjects</h1>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
            <p className="text-xs text-slate-500 max-w-md hidden lg:block truncate">
              Manage school subjects, course codes, grade levels, and academic offerings.
            </p>
          </div>
        </div>
      </header>

      {/* 2. Main Body Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* Stat KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Subjects', value: metrics.total, icon: BookOpen, iconColor: 'text-[#D8232A] bg-red-50/80 border-red-100' },
            { label: 'Active Offerings', value: metrics.active, icon: CheckCircle2, iconColor: 'text-emerald-600 bg-emerald-50/80 border-emerald-100' },
            { label: 'Grade Levels Covered', value: metrics.gradeCounts, icon: GraduationCap, iconColor: 'text-blue-600 bg-blue-50/80 border-blue-100' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4 group"
            >
              <div className={`p-3.5 rounded-xl border ${stat.iconColor} shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{stat.value}</p>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Unified Search Filter & Table Container (Exact match to UsersView) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-200/70">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              
              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by subject name or code..."
                  className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Grade Filter */}
              <div className="flex items-center gap-2">
                <Select value={selectedGrade} onValueChange={(val) => { setSelectedGrade(val); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-semibold text-slate-700">
                    <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                    <SelectValue placeholder="Grade Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Grade Levels</SelectItem>
                    {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Academic Year Filter */}
                <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-semibold text-slate-700">
                    <SelectValue placeholder="Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Years</SelectItem>
                    {uniqueYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions Bar on the Right */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap mr-1">
                {filteredSubjects.length} subject(s)
              </span>

              <Button 
                onClick={handleAutoSeed}
                disabled={isSaving}
                variant="outline"
                className="rounded-xl h-10 px-3.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5"
                title="Automatically seed standard DepEd curriculum subjects for Grades 1-6"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Auto-Seed DepEd</span>
              </Button>

              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl h-10 px-4 bg-[#D8232A] hover:bg-[#b91c22] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 active:scale-98">
                    <Plus className="w-4 h-4" />
                    <span>Create Subject</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl">
                  <div className="bg-gradient-to-r from-red-50/80 via-slate-50 to-white px-6 py-4.5 border-b border-slate-100">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-slate-900 text-base font-black">
                        <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D8232A] flex items-center justify-center">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        Create New Subject
                      </DialogTitle>
                    </DialogHeader>
                  </div>
                  <form onSubmit={handleAdd} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject Name</Label>
                      <Input
                        required
                        value={newSubject.name}
                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        placeholder="e.g. Mathematics, Science, Araling Panlipunan" 
                        className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Grade Level</Label>
                        <Select
                          value={newSubject.gradeLevel}
                          onValueChange={(v) => setNewSubject({ ...newSubject, gradeLevel: v })}>
                          <SelectTrigger className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(level => (
                              <SelectItem key={level} value={level} className="text-xs font-bold">{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</Label>
                        <Select
                          value={newSubject.status}
                          onValueChange={(v) => setNewSubject({ ...newSubject, status: v as 'Active' | 'Inactive' })}>
                          <SelectTrigger className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Active" className="text-xs font-medium text-emerald-700">Active</SelectItem>
                            <SelectItem value="Inactive" className="text-xs font-medium text-slate-500">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Academic Year</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="Start"
                          value={newSubject.academicYear.split('-')[0] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) {
                              const end = newSubject.academicYear.split('-')[1] || '';
                              setNewSubject({ ...newSubject, academicYear: `${val}-${end}` });
                            }
                          }}
                          className="h-10 bg-slate-50/70 focus:bg-white rounded-xl text-center text-xs font-bold"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="End"
                          value={newSubject.academicYear.split('-')[1] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) {
                              const start = newSubject.academicYear.split('-')[0] || '';
                              setNewSubject({ ...newSubject, academicYear: `${start}-${val}` });
                            }
                          }}
                          className="h-10 bg-slate-50/70 focus:bg-white rounded-xl text-center text-xs font-bold"
                        />
                      </div>
                    </div>

                    <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        className="rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSaving} className="rounded-xl bg-[#D8232A] hover:bg-[#b01b21] text-white text-xs font-bold px-5">
                        {isSaving ? "Saving..." : "Save Subject"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                <TableRow className="hover:bg-transparent border-none h-11">
                  <TableHead className="w-14 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 pl-4">#</TableHead>
                  <TableHead 
                    onClick={() => handleSort('name')}
                    className="text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap cursor-pointer hover:bg-slate-100/70 transition-colors group/th"
                    title="Click to sort by subject name"
                  >
                    <div className="flex items-center gap-1.5 group-hover/th:text-[#D8232A] transition-colors">
                      <span>Subject Information</span>
                      {sortField === 'name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#D8232A]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#D8232A]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/th:text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    onClick={() => handleSort('grade')}
                    className="text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap cursor-pointer hover:bg-slate-100/70 transition-colors group/th"
                    title="Click to sort by grade level"
                  >
                    <div className="flex items-center gap-1.5 group-hover/th:text-[#D8232A] transition-colors">
                      <span>Grade Level</span>
                      {sortField === 'grade' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#D8232A]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#D8232A]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/th:text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    onClick={() => handleSort('year')}
                    className="text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap cursor-pointer hover:bg-slate-100/70 transition-colors group/th"
                    title="Click to sort by academic year"
                  >
                    <div className="flex items-center gap-1.5 group-hover/th:text-[#D8232A] transition-colors">
                      <span>Academic Year</span>
                      {sortField === 'year' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#D8232A]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#D8232A]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/th:text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    onClick={() => handleSort('status')}
                    className="text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap cursor-pointer hover:bg-slate-100/70 transition-colors group/th"
                    title="Click to sort by status"
                  >
                    <div className="flex items-center gap-1.5 group-hover/th:text-[#D8232A] transition-colors">
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#D8232A]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#D8232A]" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/th:text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1 text-slate-400">
                          <BookOpen className="w-5 h-5 opacity-60" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">No matching subjects</p>
                        <p className="text-[11px] text-slate-500 leading-normal">Check your spelling or reset grade filters to view more subjects.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSubjects.map((subject, index) => {
                    const theme = getSubjectBadgeTheme(subject.name);
                    const cleanCode = subject.code || subjectRowMap[subject.name?.toLowerCase()?.trim()] || 'SUBJ';

                    return (
                      <TableRow
                        key={subject.id}
                        onClick={() => { setViewingSubject(subject); setIsViewOpen(true); }}
                        className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors group cursor-pointer h-14"
                      >
                        <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center font-black text-xs shrink-0 border border-slate-200/50 shadow-2xs`}>
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-[#D8232A] transition-colors leading-tight text-xs sm:text-sm">
                                {subject.name}
                              </p>
                              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                                CODE: {cleanCode}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 font-extrabold text-[10.5px]">
                            {subject.gradeLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-semibold text-slate-600">
                            AY {subject.academicYear || getCurrentSchoolYear()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1",
                            subject.status === 'Active' 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          )}>
                            <span className={`w-1.5 h-1.5 rounded-full ${subject.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {subject.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setViewingSubject(subject); 
                                setIsViewOpen(true); 
                              }}
                              title="View Subject Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-[#D8232A] hover:bg-red-50 rounded-lg"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setEditingSubject(subject); 
                                setIsEditOpen(true); 
                              }}
                              title="Edit Subject"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setDeleteConfirmId(subject.id);
                              }}
                              title="Delete Subject"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {filteredSubjects.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-semibold">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSubjects.length)} of {filteredSubjects.length} subjects
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0 rounded-lg text-slate-600"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-bold text-slate-700 min-w-[3rem] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-8 p-0 rounded-lg text-slate-600"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Edit Subject Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl">
          <div className="bg-gradient-to-r from-red-50/80 via-slate-50 to-white px-6 py-4.5 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 text-base font-black">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D8232A] flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                Edit Subject Details
              </DialogTitle>
            </DialogHeader>
          </div>
          {editingSubject && (
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject Name</Label>
                <Input
                  required
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Grade Level</Label>
                  <Select
                    value={editingSubject.gradeLevel}
                    onValueChange={(v) => setEditingSubject({ ...editingSubject, gradeLevel: v })}>
                    <SelectTrigger className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold">
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(level => (
                        <SelectItem key={level} value={level} className="text-xs font-bold">{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Status</Label>
                  <Select
                    value={editingSubject.status}
                    onValueChange={(v) => setEditingSubject({ ...editingSubject, status: v as 'Active' | 'Inactive' })}>
                    <SelectTrigger className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Active" className="text-xs font-medium text-emerald-700">Active</SelectItem>
                      <SelectItem value="Inactive" className="text-xs font-medium text-slate-500">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Academic Year</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="Start"
                    value={(editingSubject.academicYear || '').split('-')[0] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        const end = (editingSubject.academicYear || '').split('-')[1] || '';
                        setEditingSubject({ ...editingSubject, academicYear: `${val}-${end}` });
                      }
                    }}
                    className="h-10 bg-slate-50/70 focus:bg-white rounded-xl text-center text-xs font-bold"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="End"
                    value={(editingSubject.academicYear || '').split('-')[1] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        const start = (editingSubject.academicYear || '').split('-')[0] || '';
                        setEditingSubject({ ...editingSubject, academicYear: `${start}-${val}` });
                      }
                    }}
                    className="h-10 bg-slate-50/70 focus:bg-white rounded-xl text-center text-xs font-bold"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="rounded-xl bg-[#D8232A] hover:bg-[#b01b21] text-white text-xs font-bold px-5">
                  {isSaving ? "Saving..." : "Update Subject"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. View Subject Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl">
          <div className="bg-gradient-to-r from-red-50/80 via-slate-50 to-white px-6 py-4.5 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 text-base font-black">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D8232A] flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                Subject Overview
              </DialogTitle>
            </DialogHeader>
          </div>
          {viewingSubject && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-red-100 text-[#D8232A] flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">{viewingSubject.name}</h3>
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    CODE: {viewingSubject.code || subjectRowMap[viewingSubject.name?.toLowerCase()?.trim()] || 'SUBJ'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Grade Level</p>
                  <p className="font-black text-slate-800 text-xs">{viewingSubject.gradeLevel}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider",
                      viewingSubject.status === 'Active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                    )}>
                    {viewingSubject.status}
                  </Badge>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Academic Year</p>
                  <p className="font-bold text-slate-800 text-xs">AY {viewingSubject.academicYear}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date Created</p>
                  <p className="font-semibold text-slate-700 text-xs">
                    {getDateString(viewingSubject.createdAt)}
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setIsViewOpen(false)} className="w-full rounded-xl text-xs font-bold text-slate-600">
                  Close Details
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border-rose-200 p-0 overflow-hidden shadow-2xl">
          <div className="bg-rose-50/80 px-6 py-4 border-b border-rose-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-700 text-base font-black">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Confirm Subject Deletion
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              Are you sure you want to delete this subject? This action will remove it from the school curriculum and active subject listings.
            </p>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="rounded-xl text-xs font-bold text-slate-600">
              Cancel
            </Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold px-4" 
              onClick={() => deleteConfirmId && handleDeleteSubject(deleteConfirmId)}
            >
              Delete Subject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
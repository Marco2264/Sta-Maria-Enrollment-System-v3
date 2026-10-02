import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
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
import { 
  Plus, 
  Home, 
  Users, 
  Edit, 
  Trash2, 
  Search, 
  X, 
  BookOpen, 
  AlertCircle,
  School,
  GraduationCap,
  Eye,
  UserCheck,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';
import { useAdminData, Classroom, Section } from '../../lib/adminData';
import { getCurrentSchoolYear } from '../../lib/utils';
import { cn } from '../../components/ui/utils';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

export function ClassroomsView() {
  const {
    classrooms,
    sections,
    users,
    assignments,
    subjectAssignments,
    subjects,
    addClassroom,
    updateClassroom,
    deleteClassroom,
    addSection,
    updateSection,
    deleteSection,
    addAssignment,
    deleteAssignment,
    addSubjectAssignment,
    deleteSubjectAssignment,
    loading
  } = useAdminData();

  const getDateString = (ts: unknown) => {
    if (!ts) return 'N/A';
    if (typeof ts === 'object' && 'toDate' in ts && typeof (ts as { toDate?: () => Date }).toDate === 'function') {
      return (ts as { toDate: () => Date }).toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return new Date(ts as string | number | Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [mainClassroomSearchQuery, setMainClassroomSearchQuery] = useState('');

  // Modals state
  const [isAddClassroomOpen, setIsAddClassroomOpen] = useState(false);
  const [newClassroom, setNewClassroom] = useState({
    roomName: '',
    roomType: 'Lecture' as 'Lecture' | 'Laboratory' | 'Multipurpose',
    status: 'Available' as 'Available' | 'Full' | 'Maintenance',
    gradeLevel: '',
    academicYear: getCurrentSchoolYear()
  });
  const [newClassroomSection, setNewClassroomSection] = useState<{name: string, gradeLevel: string, adviserId?: string}>({name: '', gradeLevel: ''});
  const [editClassroomSection, setEditClassroomSection] = useState<{id?: string, name: string, gradeLevel: string, adviserId?: string, originalAdviserId?: string}>({name: '', gradeLevel: ''});

  const [isEditClassroomOpen, setIsEditClassroomOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  const [isSubjectTeacherOpen, setIsSubjectTeacherOpen] = useState(false);
  const [subjectTeacherSectionId, setSubjectTeacherSectionId] = useState<string | null>(null);

  const [classroomTeacherSearch, setClassroomTeacherSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [detailsClassroom, setDetailsClassroom] = useState<Classroom | null>(null);
  const [classroomStudents, setClassroomStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const teachers = useMemo(() => {
    return users.filter((u) => u.role?.toLowerCase() === 'teacher');
  }, [users]);

  // Fetch students for classroom details modal
  useEffect(() => {
    if (!detailsClassroom) {
      setClassroomStudents([]);
      return;
    }

    const fetchStudents = async () => {
      setLoadingStudents(true);
      try {
        const classSections = sections.filter(s => s.classroomId === detailsClassroom.id);
        const sectionIds = classSections.map(s => s.id);

        if (sectionIds.length === 0) {
          setClassroomStudents([]);
          return;
        }

        const enrollRef = collection(db, 'enrollments');
        const snap = await getDocs(enrollRef);
        const list = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((st: any) =>
            sectionIds.includes(st.sectionId) &&
            ['Enrolled', 'enrolled', 'Dropped', 'Transferred', 'dropped', 'transferred'].includes(st.status)
          );
        setClassroomStudents(list);
      } catch (err) {
        console.error("Error fetching classroom students:", err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [detailsClassroom, sections]);

  // Handlers
  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newClassroom.gradeLevel) {
      toast.error("Please select a Grade Level for this classroom.");
      return;
    }

    if (!newClassroomSection.name.trim()) {
      toast.error("Please provide a Section Name. A classroom needs at least one section.");
      return;
    }

    try {
      const classroomId = await addClassroom(newClassroom);
      
      if (newClassroomSection.name.trim()) {
        const sectionId = await addSection({
          name: newClassroomSection.name.trim(),
          gradeLevel: newClassroomSection.gradeLevel || newClassroom.gradeLevel || 'Grade 1',
          status: 'Active',
          classroomId: classroomId
        });
        
        if (newClassroomSection.adviserId) {
          await addAssignment({ teacherId: newClassroomSection.adviserId, classroomId: classroomId, sectionId: sectionId });
        }
      }

      toast.success("Classroom and section created successfully!");
      setIsAddClassroomOpen(false);
      setNewClassroom({ roomName: '', roomType: 'Lecture', status: 'Available', gradeLevel: '', academicYear: getCurrentSchoolYear() });
      setNewClassroomSection({name: '', gradeLevel: ''});
    } catch (err) {
      console.error("Error adding classroom", err);
      toast.error("Failed to create classroom.");
    }
  };

  const handleUpdateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClassroom) {
      try {
        const { id, ...dataToUpdate } = editingClassroom;
        await updateClassroom(id, dataToUpdate);
        
        if (editClassroomSection.name.trim()) {
          let sectionId = editClassroomSection.id;
          if (sectionId) {
            await updateSection(sectionId, { name: editClassroomSection.name.trim(), gradeLevel: editClassroomSection.gradeLevel || editingClassroom.gradeLevel || 'Grade 1' });
          } else {
            sectionId = await addSection({
              name: editClassroomSection.name.trim(),
              gradeLevel: editClassroomSection.gradeLevel || editingClassroom.gradeLevel || 'Grade 1',
              status: 'Active',
              classroomId: id
            });
          }
          
          if (editClassroomSection.adviserId !== editClassroomSection.originalAdviserId) {
            const existingAssignment = assignments.find(a => a.sectionId === sectionId);
            if (editClassroomSection.adviserId) {
              if (existingAssignment) await deleteAssignment(existingAssignment.id);
              await addAssignment({ teacherId: editClassroomSection.adviserId, classroomId: id, sectionId: sectionId });
            } else if (existingAssignment) {
              await deleteAssignment(existingAssignment.id);
            }
          }
        } else if (editClassroomSection.id) {
           await deleteSection(editClassroomSection.id);
        }

        toast.success("Classroom updated successfully!");
        setIsEditClassroomOpen(false);
      } catch (err) {
        console.error("Error updating classroom", err);
        toast.error("Failed to update classroom.");
      }
    }
  };

  // Grade styling palette
  const getGradeTheme = (grade: string) => {
    const num = parseInt(grade.replace(/\D/g, '')) || 1;
    switch (num) {
      case 1:
        return { bg: 'bg-blue-500', lightBg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', tag: 'bg-blue-100 text-blue-800' };
      case 2:
        return { bg: 'bg-indigo-500', lightBg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', tag: 'bg-indigo-100 text-indigo-800' };
      case 3:
        return { bg: 'bg-purple-500', lightBg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', tag: 'bg-purple-100 text-purple-800' };
      case 4:
        return { bg: 'bg-emerald-500', lightBg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', tag: 'bg-emerald-100 text-emerald-800' };
      case 5:
        return { bg: 'bg-amber-500', lightBg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', tag: 'bg-amber-100 text-amber-800' };
      case 6:
        return { bg: 'bg-rose-500', lightBg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', tag: 'bg-rose-100 text-rose-800' };
      default:
        return { bg: 'bg-slate-500', lightBg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', tag: 'bg-slate-100 text-slate-800' };
    }
  };

  // Metrics summary
  const metrics = useMemo(() => {
    const totalClassrooms = classrooms.length;
    const totalSections = sections.length;
    const totalAssignedAdvisers = assignments.filter(a => sections.some(s => s.id === a.sectionId)).length;
    return {
      totalClassrooms,
      totalSections,
      totalAssignedAdvisers
    };
  }, [classrooms, sections, assignments]);

  // Unique sorted grades
  const gradeTabs = ['All', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

  // Filtered and grouped classrooms
  const filteredClassrooms = useMemo(() => {
    return classrooms
      .filter(c => selectedGrade === 'All' || c.gradeLevel === selectedGrade)
      .filter(c => {
        const query = mainClassroomSearchQuery.toLowerCase();
        const matchRoom = (c.roomName || '').toLowerCase().includes(query);
        const matchGrade = (c.gradeLevel || '').toLowerCase().includes(query);
        const matchSection = sections.some(s => s.classroomId === c.id && (s.name || '').toLowerCase().includes(query));
        return matchRoom || matchGrade || matchSection;
      })
      .sort((a, b) => {
        const gradeA = parseInt((a.gradeLevel || '').replace(/\D/g, '')) || 99;
        const gradeB = parseInt((b.gradeLevel || '').replace(/\D/g, '')) || 99;
        if (gradeA !== gradeB) return gradeA - gradeB;
        return (a.roomName || '').localeCompare(b.roomName || '');
      });
  }, [classrooms, selectedGrade, mainClassroomSearchQuery, sections]);

  const groupedClassrooms = useMemo(() => {
    return filteredClassrooms.reduce((acc, curr) => {
      const grade = curr.gradeLevel || 'Unassigned Grade';
      if (!acc[grade]) acc[grade] = [];
      acc[grade].push(curr);
      return acc;
    }, {} as Record<string, typeof classrooms>);
  }, [filteredClassrooms]);

  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedClassrooms).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 99;
      const numB = parseInt(b.replace(/\D/g, '')) || 99;
      return numA - numB;
    });
  }, [groupedClassrooms]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#D8232A]/20 border-t-[#D8232A]"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Classrooms &amp; Sections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      {/* 1. Header Bar */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex flex-row items-center justify-between gap-4 w-full max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-900">
              <School className="w-5 h-5 text-[#D8232A]" />
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Classrooms &amp; Sections</h1>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
            <p className="text-xs text-slate-500 max-w-md hidden lg:block truncate">
              Manage and monitor physical classrooms, logical sections, and teacher assignments across the school.
            </p>
          </div>
        </div>
      </header>

      {/* 2. Main Body Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* Stat Cards (Matching UsersView) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Classrooms', value: metrics.totalClassrooms, icon: School, iconColor: 'text-[#D8232A] bg-red-50/80 border-red-100' },
            { label: 'Total Sections', value: metrics.totalSections, icon: Layers, iconColor: 'text-blue-600 bg-blue-50/80 border-blue-100' },
            { label: 'Assigned Advisers', value: metrics.totalAssignedAdvisers, icon: UserCheck, iconColor: 'text-emerald-600 bg-emerald-50/80 border-emerald-100' },
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

        {/* Unified Search Filter Controls Bar (Matching UsersView) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-200/70">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by classroom name, section, or room..."
                  className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                  value={mainClassroomSearchQuery}
                  onChange={(e) => setMainClassroomSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger className="w-full sm:w-[170px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-semibold text-slate-700">
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
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                {filteredClassrooms.length} classroom(s)
              </span>
              
              {/* Create Classroom Dialog */}
              <Dialog open={isAddClassroomOpen} onOpenChange={setIsAddClassroomOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl h-10 px-4 bg-[#D8232A] hover:bg-[#b91c22] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 active:scale-98">
                    <Plus className="w-4 h-4" />
                    <span>Create Classroom</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl">
                  <div className="bg-gradient-to-r from-red-50/80 via-slate-50 to-white px-6 py-4.5 border-b border-slate-100">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-slate-900 text-base font-black">
                        <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D8232A] flex items-center justify-center">
                          <Home className="w-4 h-4" />
                        </div>
                        Create Classroom &amp; Section
                      </DialogTitle>
                    </DialogHeader>
                  </div>
                  <form onSubmit={handleAddClassroom} className="p-6 space-y-5">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Room Name / Number</Label>
                        <Input
                          required
                          value={newClassroom.roomName}
                          onChange={(e) => setNewClassroom({ ...newClassroom, roomName: e.target.value })}
                          placeholder="e.g. Room 101 or FABIAN"
                          className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Grade Level</Label>
                          <Select
                            value={newClassroom.gradeLevel}
                            onValueChange={(v) => setNewClassroom({ ...newClassroom, gradeLevel: v })}>
                            <SelectTrigger className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold">
                              <SelectValue placeholder="Select Grade" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                                <SelectItem key={g} value={g} className="text-xs font-bold">{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Room Type</Label>
                          <Select
                            value={newClassroom.roomType}
                            onValueChange={(v) => setNewClassroom({ ...newClassroom, roomType: v as 'Lecture' | 'Laboratory' | 'Multipurpose' })}>
                            <SelectTrigger className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Lecture" className="text-xs font-medium">Lecture Room</SelectItem>
                              <SelectItem value="Laboratory" className="text-xs font-medium">Science / Computer Lab</SelectItem>
                              <SelectItem value="Multipurpose" className="text-xs font-medium">Multipurpose Hall</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Section & Adviser Card Box */}
                    <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200/80 space-y-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#D8232A]" />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Assigned Section &amp; Adviser</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Section Name</Label>
                          <Input
                            required
                            placeholder="e.g. Fabian, Diamond"
                            value={newClassroomSection.name}
                            onChange={e => setNewClassroomSection({...newClassroomSection, name: e.target.value})}
                            className="h-9.5 bg-white rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Advisory Teacher</Label>
                          <Select
                            value={newClassroomSection.adviserId || 'none'}
                            onValueChange={v => setNewClassroomSection({...newClassroomSection, adviserId: v === 'none' ? undefined : v})}
                          >
                            <SelectTrigger className="h-9.5 bg-white rounded-xl text-xs font-semibold">
                              <SelectValue placeholder="Assign Teacher">
                                {newClassroomSection.adviserId && newClassroomSection.adviserId !== 'none'
                                  ? (() => {
                                      const t = teachers.find(t => t.id === newClassroomSection.adviserId);
                                      return t ? `${t.firstName} ${t.lastName}` : undefined;
                                    })()
                                  : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-[260px] rounded-xl">
                              <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                                <Input
                                  placeholder="Search teacher..."
                                  value={classroomTeacherSearch}
                                  onChange={(e) => setClassroomTeacherSearch(e.target.value)}
                                  onKeyDown={(e) => e.stopPropagation()}
                                  className="h-8 text-xs bg-slate-50 rounded-lg"
                                />
                              </div>
                              <div
                                className="px-2 py-1.5 text-xs text-rose-600 font-bold cursor-pointer hover:bg-rose-50 rounded-md"
                                onClick={() => setNewClassroomSection({...newClassroomSection, adviserId: undefined})}>
                                No Adviser (Unassigned)
                              </div>
                              {teachers
                                .filter(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(classroomTeacherSearch.toLowerCase()))
                                .map((t) => (
                                  <SelectItem key={t.id} value={t.id} className="text-xs font-medium py-1.5">
                                    {t.firstName} {t.lastName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsAddClassroomOpen(false)}
                        className="rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                        Cancel
                      </Button>
                      <Button type="submit" className="rounded-xl bg-[#D8232A] hover:bg-[#b01b21] text-white text-xs font-bold px-5">
                        Save Classroom
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Classroom Cards Section */}
        {sortedGroupKeys.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <School className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No classrooms found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {mainClassroomSearchQuery 
                ? `No classrooms matching "${mainClassroomSearchQuery}" in ${selectedGrade}.` 
                : `No classrooms currently registered under ${selectedGrade}. Click "+ Create Classroom" above to get started.`}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedGroupKeys.map(grade => {
              const theme = getGradeTheme(grade);
              const classList = groupedClassrooms[grade];

              return (
                <div key={grade} className="space-y-4">
                  
                  {/* Grade Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full ${theme.bg}`} />
                      <h2 className="text-base font-black text-slate-900 tracking-tight">{grade}</h2>
                      <span className="text-xs font-bold text-slate-400">({classList.length} {classList.length === 1 ? 'Room' : 'Rooms'})</span>
                    </div>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {classList.map((classroom) => {
                      const classSections = sections.filter(s => s.classroomId === classroom.id);
                      const primarySection = classSections[0];
                      const assignment = primarySection ? assignments.find(a => a.sectionId === primarySection.id) : null;
                      const teacher = assignment ? teachers.find(t => t.id === assignment.teacherId) : null;

                      // Clean section display name
                      const rawSecName = primarySection?.name || '';
                      const cleanSecName = rawSecName.replace(/^(Grade\s*\d+|G\d+)\s*[-–—:_.]*\s*/i, '').trim() || rawSecName;

                      return (
                        <div
                          key={classroom.id}
                          onClick={() => setDetailsClassroom(classroom)}
                          className="group bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer hover:-translate-y-0.5"
                        >
                          {/* Card Top */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-11 h-11 rounded-xl ${theme.lightBg} ${theme.text} flex items-center justify-center font-black text-sm shrink-0 border ${theme.border}`}>
                                  <Home className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="font-black text-base text-slate-900 group-hover:text-[#D8232A] transition-colors leading-tight">
                                    {classroom.roomName || 'Classroom'}
                                  </h3>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                                      {classroom.roomType || 'Lecture'}
                                    </span>
                                    {classroom.academicYear && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-[10px] font-semibold text-slate-500">
                                          AY {classroom.academicYear}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Card Actions */}
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingClassroom(classroom);
                                    if (primarySection) {
                                      setEditClassroomSection({
                                        id: primarySection.id,
                                        name: primarySection.name,
                                        gradeLevel: primarySection.gradeLevel || classroom.gradeLevel || 'Grade 1',
                                        adviserId: assignment?.teacherId,
                                        originalAdviserId: assignment?.teacherId
                                      });
                                    } else {
                                      setEditClassroomSection({
                                        name: '',
                                        gradeLevel: classroom.gradeLevel || 'Grade 1',
                                      });
                                    }
                                    setIsEditClassroomOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#D8232A] hover:bg-red-50 transition-colors"
                                  title="Edit Classroom"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(classroom.id);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete Classroom"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Section & Adviser Info Box */}
                            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2.5 my-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Assigned Section</span>
                                {primarySection ? (
                                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${theme.tag}`}>
                                    {classroom.gradeLevel} - {cleanSecName}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-slate-400 italic">No Section</span>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Adviser</span>
                                {teacher ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-slate-800 text-white font-black text-[9px] flex items-center justify-center">
                                      {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                                    </div>
                                    <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]" title={`${teacher.firstName} ${teacher.lastName}`}>
                                      {teacher.firstName} {teacher.lastName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-medium text-slate-400 italic">Unassigned</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span className="text-[10.5px] font-medium text-slate-400">
                              Created: {getDateString(classroom.createdAt)}
                            </span>
                            <div className="flex items-center gap-1 font-bold text-[#D8232A] group-hover:underline text-xs">
                              <span>View Roster</span>
                              <Eye className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Edit Classroom Modal */}
      <Dialog open={isEditClassroomOpen} onOpenChange={setIsEditClassroomOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl">
          <div className="bg-gradient-to-r from-red-50/80 via-slate-50 to-white px-6 py-4.5 border-b border-slate-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 text-base font-black">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-[#D8232A] flex items-center justify-center">
                  <Edit className="w-4 h-4" />
                </div>
                Edit Classroom Details
              </DialogTitle>
            </DialogHeader>
          </div>
          {editingClassroom && (
            <form onSubmit={handleUpdateClassroom} className="p-6 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Room Name / Number</Label>
                  <Input
                    required
                    value={editingClassroom.roomName}
                    onChange={(e) => setEditingClassroom({ ...editingClassroom, roomName: e.target.value })}
                    className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Grade Level</Label>
                    <Select
                      value={editingClassroom.gradeLevel}
                      onValueChange={(v) => setEditingClassroom({ ...editingClassroom, gradeLevel: v })}>
                      <SelectTrigger className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                          <SelectItem key={g} value={g} className="text-xs font-bold">{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Room Type</Label>
                    <Select
                      value={editingClassroom.roomType}
                      onValueChange={(v) => setEditingClassroom({ ...editingClassroom, roomType: v as 'Lecture' | 'Laboratory' | 'Multipurpose' })}>
                      <SelectTrigger className="bg-slate-50/70 focus:bg-white rounded-xl h-10 text-xs font-semibold">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Lecture" className="text-xs font-medium">Lecture Room</SelectItem>
                        <SelectItem value="Laboratory" className="text-xs font-medium">Science / Computer Lab</SelectItem>
                        <SelectItem value="Multipurpose" className="text-xs font-medium">Multipurpose Hall</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Section & Adviser Edit */}
              <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#D8232A]" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Assigned Section &amp; Adviser</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Section Name</Label>
                    <Input
                      placeholder="e.g. Section A"
                      value={editClassroomSection.name}
                      onChange={e => setEditClassroomSection({...editClassroomSection, name: e.target.value})}
                      className="h-9.5 bg-white rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Advisory Teacher</Label>
                    <Select
                      value={editClassroomSection.adviserId || 'none'}
                      onValueChange={v => setEditClassroomSection({...editClassroomSection, adviserId: v === 'none' ? undefined : v})}
                    >
                      <SelectTrigger className="h-9.5 bg-white rounded-xl text-xs font-semibold">
                        <SelectValue placeholder="Assign Teacher">
                          {editClassroomSection.adviserId && editClassroomSection.adviserId !== 'none'
                            ? (() => {
                                const t = teachers.find(t => t.id === editClassroomSection.adviserId);
                                return t ? `${t.firstName} ${t.lastName}` : undefined;
                              })()
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[260px] rounded-xl">
                        <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                          <Input
                            placeholder="Search teacher..."
                            value={classroomTeacherSearch}
                            onChange={(e) => setClassroomTeacherSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="h-8 text-xs bg-slate-50 rounded-lg"
                          />
                        </div>
                        <div
                          className="px-2 py-1.5 text-xs text-rose-600 font-bold cursor-pointer hover:bg-rose-50 rounded-md"
                          onClick={() => setEditClassroomSection({...editClassroomSection, adviserId: undefined})}>
                          No Adviser (Unassigned)
                        </div>
                        {teachers
                          .filter(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(classroomTeacherSearch.toLowerCase()))
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs font-medium py-1.5">
                              {t.firstName} {t.lastName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100" 
                  onClick={() => setIsEditClassroomOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl bg-[#D8232A] hover:bg-[#b01b21] text-white text-xs font-bold px-5">
                  Update Classroom
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. Classroom Details & Student Roster Portal Modal */}
      {detailsClassroom !== null && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setDetailsClassroom(null)} 
          />
          <div className="relative z-[101] grid w-full gap-5 rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200/80 animate-in fade-in zoom-in-95 duration-200 max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            
            <button
              type="button"
              onClick={() => setDetailsClassroom(null)}
              className="absolute top-5 right-5 inline-flex size-9 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors z-10">
              <X className="size-4" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-[#D8232A] flex items-center justify-center font-black">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  {detailsClassroom.roomName || 'Classroom Details'}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10.5px] font-bold border-slate-200 text-slate-600 bg-slate-50">
                    {detailsClassroom.gradeLevel || 'Any Grade'}
                  </Badge>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {detailsClassroom.roomType || 'Lecture'}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-500">
                    AY {detailsClassroom.academicYear || getCurrentSchoolYear()}
                  </span>
                </div>
              </div>
            </div>

            {/* Sections list with Advisers and Students */}
            <div className="space-y-6">
              {sections.filter(s => s.classroomId === detailsClassroom.id).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No sections assigned to this room yet</p>
                </div>
              ) : (
                sections.filter(s => s.classroomId === detailsClassroom.id).map(section => {
                  const assignment = assignments.find(a => a.sectionId === section.id);
                  const teacher = assignment ? teachers.find(t => t.id === assignment.teacherId) : null;
                  const sectionS = classroomStudents.filter(st => st.sectionId === section.id);

                  // Search filter for students
                  const filteredStudents = sectionS.filter(st => {
                    const q = studentSearchQuery.toLowerCase();
                    const name = `${st.firstName || ''} ${st.lastName || ''}`.toLowerCase();
                    const lrn = (st.lrn ?? '').toString().toLowerCase();
                    return name.includes(q) || lrn.includes(q);
                  });

                  return (
                    <div key={section.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      {/* Section Card Header */}
                      <div className="bg-slate-50/80 p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#D8232A] text-white text-xs font-black">
                              {section.gradeLevel || detailsClassroom.gradeLevel} - {section.name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1.5">
                            Class Adviser: <span className="font-bold text-slate-900">{teacher ? `${teacher.firstName} ${teacher.lastName}` : 'No Adviser Assigned'}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                            {sectionS.length} Enrolled Student{sectionS.length === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>

                      {/* Students Filter Bar */}
                      {sectionS.length > 0 && (
                        <div className="p-3 border-b border-slate-100 bg-white">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input
                              placeholder="Filter students by name or LRN..."
                              value={studentSearchQuery}
                              onChange={(e) => setStudentSearchQuery(e.target.value)}
                              className="h-8 pl-8.5 text-xs bg-slate-50 border-slate-200 rounded-lg"
                            />
                          </div>
                        </div>
                      )}

                      {/* Students Table */}
                      <div className="p-4">
                        {loadingStudents ? (
                          <div className="flex justify-center items-center py-8">
                            <div className="w-6 h-6 border-2 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
                          </div>
                        ) : sectionS.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-4 text-center font-medium">No students currently enrolled in this section.</p>
                        ) : filteredStudents.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-4 text-center font-medium">No students matching search filter.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                                  <th className="py-2.5 pl-3">#</th>
                                  <th className="py-2.5">LRN</th>
                                  <th className="py-2.5">Student Name</th>
                                  <th className="py-2.5">Gender</th>
                                  <th className="py-2.5 pr-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredStudents
                                  .sort((a, b) => {
                                    const isAMale = !a.gender?.toLowerCase().startsWith('f');
                                    const isBMale = !b.gender?.toLowerCase().startsWith('f');
                                    if (isAMale && !isBMale) return -1;
                                    if (!isAMale && isBMale) return 1;
                                    return (a.lastName || '').localeCompare(b.lastName || '');
                                  })
                                  .map((student, index) => (
                                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-100 last:border-0">
                                      <td className="py-2.5 pl-3 font-bold text-slate-400">{index + 1}</td>
                                      <td className="py-2.5 font-mono font-bold text-slate-600">{student.lrn || 'N/A'}</td>
                                      <td className="py-2.5 font-bold text-slate-900">{student.lastName}, {student.firstName}</td>
                                      <td className="py-2.5 text-slate-600 font-medium">{student.gender || 'N/A'}</td>
                                      <td className="py-2.5 pr-3 text-right">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                                          student.status?.toLowerCase() === 'enrolled' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                            student.status?.toLowerCase() === 'dropped' ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-slate-100 text-slate-700"
                                        )}>
                                          {student.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button 
                onClick={() => setDetailsClassroom(null)}
                className="rounded-xl px-5 h-9.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Close Roster
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 5. Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border-rose-200 p-0 overflow-hidden shadow-2xl">
          <div className="bg-rose-50/80 px-6 py-4 border-b border-rose-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-700 text-base font-black">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                Confirm Classroom Deletion
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs font-medium text-slate-600 leading-relaxed">
              Are you sure you want to delete this classroom? This action cannot be undone and will permanently remove all associated section configurations and adviser assignments.
            </p>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteConfirmId(null)} className="rounded-xl text-xs font-bold text-slate-600">
              Cancel
            </Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold px-4" 
              onClick={async () => {
                if (deleteConfirmId) {
                  await deleteClassroom(deleteConfirmId);
                  setDeleteConfirmId(null);
                  toast.success("Classroom deleted successfully");
                }
              }}
            >
              Delete Classroom
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
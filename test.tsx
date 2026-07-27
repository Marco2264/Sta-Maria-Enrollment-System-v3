import React, { useState, useEffect } from 'react';
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
} from
  '../../components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from
  '../../components/ui/Select';
import { Plus, Home, Users, Edit, Trash2, UserMinus, Search, X, BookOpen } from 'lucide-react';
import { useAdminData, Classroom, Section } from '../../lib/adminData';
import { getCurrentSchoolYear } from '../../lib/utils';
import { cn } from '../../components/ui/utils';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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

  const [selectedYear, setSelectedYear] = useState<string>('All');
  const uniqueYears = Array.from(new Set(classrooms.map(c => c.academicYear).filter(Boolean))).sort().reverse() as string[];

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
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSection, setNewSection] = useState({
    name: '',
    classroomId: '',
    gradeLevel: '',
    status: 'Active' as 'Active' | 'Inactive'
  });
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [newAssign, setNewAssign] = useState({
    teacherId: '',
    classroomId: '',
    sectionId: ''
  });
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [classroomAssignSearchQuery, setClassroomAssignSearchQuery] = useState('');
  const [sectionAssignSearchQuery, setSectionAssignSearchQuery] = useState('');
  const [isSubjectTeacherOpen, setIsSubjectTeacherOpen] = useState(false);
  const [subjectTeacherSectionId, setSubjectTeacherSectionId] = useState<string | null>(null);
  const [addSectionClassroomSearchQuery, setAddSectionClassroomSearchQuery] = useState('');
  const [isEditClassroomOpen, setIsEditClassroomOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  const [isEditSectionOpen, setIsEditSectionOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editSectionAdviserId, setEditSectionAdviserId] = useState<string>('');
  const [editSectionTeacherSearch, setEditSectionTeacherSearch] = useState('');

  const [mainClassroomSearchQuery, setMainClassroomSearchQuery] = useState('');

  const [detailsClassroom, setDetailsClassroom] = useState<Classroom | null>(null);
  const [classroomStudents, setClassroomStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

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

        // Fetch all enrollments and filter in-memory to avoid Firestore composite index errors
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

  const teachers = users.filter((u) => u.role?.toLowerCase() === 'teacher');

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
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

      setIsAddClassroomOpen(false);
      setNewClassroom({ roomName: '', roomType: 'Lecture', status: 'Available', gradeLevel: '', academicYear: getCurrentSchoolYear() });
      setNewClassroomSection({name: '', gradeLevel: ''});
    } catch (err) {
      console.error("Error adding classroom", err);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addSection(newSection);
      setIsAddSectionOpen(false);
      setNewSection({ name: '', classroomId: '', gradeLevel: '', status: 'Active' });
    } catch (err) {
      console.error("Error adding section", err);
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

        setIsEditClassroomOpen(false);
      } catch (err) {
        console.error("Error updating classroom", err);
      }
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSection) {
      try {
        const { id, ...dataToUpdate } = editingSection;
        await updateSection(id, dataToUpdate);

        // Handle adviser assignment
        const existingAssignment = assignments.find(a => a.sectionId === id);
        if (editSectionAdviserId) {
          if (existingAssignment) {
            // If adviser changed, remove old and add new
            if (existingAssignment.teacherId !== editSectionAdviserId) {
              await deleteAssignment(existingAssignment.id);
              await addAssignment({ teacherId: editSectionAdviserId, classroomId: editingSection.classroomId, sectionId: id });
            }
          } else {
            // No existing assignment, create new
            await addAssignment({ teacherId: editSectionAdviserId, classroomId: editingSection.classroomId, sectionId: id });
          }
        } else if (existingAssignment) {
          // Adviser cleared, remove existing assignment
          await deleteAssignment(existingAssignment.id);
        }

        setIsEditSectionOpen(false);
        setEditSectionAdviserId('');
        setEditSectionTeacherSearch('');
      } catch (err) {
        console.error("Error updating section", err);
      }
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssign.teacherId || !newAssign.classroomId || !newAssign.sectionId) {
      alert("Please select a teacher, classroom, and section.");
      return;
    }

    // Check if section already has a teacher
    const existingSectionAssignment = assignments.find(a => a.sectionId === newAssign.sectionId);
    if (existingSectionAssignment) {
      alert("This section already has a teacher assigned. Please remove the current assignment first.");
      return;
    }

    // Check if teacher is already assigned to another section (and cleanup ghost assignments)
    const existingTeacherAssignments = assignments.filter(a => a.teacherId === newAssign.teacherId);
    let isAlreadyAssigned = false;

    for (const assignment of existingTeacherAssignments) {
      const sectionExists = sections.some(s => s.id === assignment.sectionId);
      if (sectionExists) {
        isAlreadyAssigned = true;
      } else {
        // This is a ghost/orphaned assignment (section was deleted). Let's clean it up automatically!
        try {
          await deleteAssignment(assignment.id);
        } catch (e) {
          console.error("Failed to cleanup ghost assignment", e);
        }
      }
    }

    if (isAlreadyAssigned) {
      alert("This teacher is already assigned to a section. Please remove their current assignment first.");
      return;
    }

    try {
      await addAssignment(newAssign);
      setIsAssignOpen(false);
      setNewAssign({ teacherId: '', classroomId: '', sectionId: '' });
      setIsAssignOpen(false);
      setAssignSearchQuery('');
      setClassroomAssignSearchQuery('');
    } catch (err) {
      console.error("Error assigning teacher", err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Classrooms & Sections</h1>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed hidden sm:block">
              Manage physical classrooms, logical sections, and teacher assignments {selectedYear === 'All' ? 'across all academic years' : `for Academic Year ${selectedYear}`}.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-96 shrink-0 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search classroom by name..."
                className="pl-10 h-11 rounded-xl bg-white border-2 border-slate-200/80 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/5 shadow-sm transition-all text-sm font-medium text-black w-full"
                value={mainClassroomSearchQuery}
                onChange={(e) => setMainClassroomSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
              <div className="flex items-center bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-xl w-full sm:w-auto">
                <Select value={selectedYear} onValueChange={(val) => setSelectedYear(val)}>
                  <SelectTrigger className="h-8 border-none bg-transparent shadow-none w-full sm:w-[130px] text-xs font-bold">
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

              <Dialog open={isAssignOpen} onOpenChange={(open) => {
                setIsAssignOpen(open);
                if (!open) {
                  setAssignSearchQuery('');
                  setClassroomAssignSearchQuery('');
                  setSectionAssignSearchQuery('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto rounded-xl px-5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm font-semibold transition-all">
                    <UserMinus className="w-4 h-4 mr-2" /> Assign Teacher
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Assign Teacher to Section</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAssign} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Teacher</Label>
                      <Select
                        value={newAssign.teacherId || undefined}
                        onValueChange={(v) =>
                          setNewAssign({
                            ...newAssign,
                            teacherId: v
                          })
                        }>

                        <SelectTrigger>
                          <SelectValue placeholder="Select teacher">
                            {newAssign.teacherId ? (() => { const t = teachers.find(t => t.id === newAssign.teacherId); return t ? `${t.firstName} ${t.lastName}` : undefined; })() : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                            <Input
                              placeholder="Search teacher..."
                              value={assignSearchQuery}
                              onChange={(e) => setAssignSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="h-8 text-sm"
                            />
                          </div>
                          {teachers
                            .filter(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(assignSearchQuery.toLowerCase()))
                            .map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.firstName} {t.lastName}
                              </SelectItem>
                            ))}
                          {teachers.filter(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(assignSearchQuery.toLowerCase())).length === 0 && (
                            <div className="p-2 text-sm text-center text-slate-500">No teachers found.</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Classroom</Label>
                      <Select
                        value={newAssign.classroomId || undefined}
                        onValueChange={(v) =>
                          setNewAssign({
                            ...newAssign,
                            classroomId: v,
                            sectionId: ''
                          })
                        }>

                        <SelectTrigger>
                          <SelectValue placeholder="Select classroom">
                            {newAssign.classroomId ? classrooms.find(c => c.id === newAssign.classroomId)?.roomName : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                            <Input
                              placeholder="Search classroom..."
                              value={classroomAssignSearchQuery}
                              onChange={(e) => setClassroomAssignSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="h-8 text-sm"
                            />
                          </div>
                          {classrooms
                            .filter((c) => (c.roomName || '').toLowerCase().includes(classroomAssignSearchQuery.toLowerCase()))
                            .map((c) =>
                              <SelectItem key={c.id} value={c.id}>
                                {c.roomName || 'Unnamed Room'}
                              </SelectItem>
                            )}
                          {classrooms.filter((c) => (c.roomName || '').toLowerCase().includes(classroomAssignSearchQuery.toLowerCase())).length === 0 && (
                            <div className="p-2 text-sm text-center text-slate-500">No classrooms found.</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Select
                        value={newAssign.sectionId || undefined}
                        onValueChange={(v) =>
                          setNewAssign({
                            ...newAssign,
                            sectionId: v
                          })
                        }
                        disabled={!newAssign.classroomId}>

                        <SelectTrigger>
                          <SelectValue placeholder="Select section">
                            {newAssign.sectionId ? sections.find(s => s.id === newAssign.sectionId)?.name : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                            <Input
                              placeholder="Search section..."
                              value={sectionAssignSearchQuery}
                              onChange={(e) => setSectionAssignSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="h-8 text-sm"
                            />
                          </div>
                          {sections.
                            filter((s) => s.classroomId === newAssign.classroomId).
                            filter((s) => s.name.toLowerCase().includes(sectionAssignSearchQuery.toLowerCase())).
                            map((s) =>
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            )}
                          {sections.filter((s) => s.classroomId === newAssign.classroomId).filter((s) => s.name.toLowerCase().includes(sectionAssignSearchQuery.toLowerCase())).length === 0 && (
                            <div className="p-2 text-sm text-center text-slate-500">No sections found.</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAssignOpen(false)}
                        className="w-full sm:w-auto">

                        Cancel
                      </Button>
                      <Button type="submit" className="w-full sm:w-auto">
                        Assign
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddSectionOpen} onOpenChange={(open) => {
                setIsAddSectionOpen(open);
                if (!open) setAddSectionClassroomSearchQuery('');
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto rounded-xl px-5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm font-semibold transition-all">
                    <Plus className="w-4 h-4 mr-2" /> Add Section
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Section</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddSection} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Section Name</Label>
                      <Input
                        required
                        value={newSection.name}
                        onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                        placeholder="e.g. Section A" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Grade Level</Label>
                        <Select
                          value={newSection.gradeLevel}
                          onValueChange={(v) => setNewSection({ ...newSection, gradeLevel: v })}>
                          <SelectTrigger><SelectValue placeholder="Grade">
                            {newSection.gradeLevel ? `Grade ${newSection.gradeLevel}` : undefined}
                          </SelectValue></SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {[1, 2, 3, 4, 5, 6].map(level => (
                              <SelectItem key={level} value={`Grade ${level}`}>Grade {level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={newSection.status}
                          onValueChange={(v) => setNewSection({ ...newSection, status: v as 'Active' | 'Inactive' })}>
                          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Classroom</Label>
                      <Select
                        value={newSection.classroomId || undefined}
                        onValueChange={(v) =>
                          setNewSection({
                            ...newSection,
                            classroomId: v
                          })
                        }>

                        <SelectTrigger>
                          <SelectValue placeholder="Select classroom">
                            {newSection.classroomId ? classrooms.find(c => c.id === newSection.classroomId)?.roomName : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                            <Input
                              placeholder="Search classroom..."
                              value={addSectionClassroomSearchQuery}
                              onChange={(e) => setAddSectionClassroomSearchQuery(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="h-8 text-sm"
                            />
                          </div>
                          {classrooms
                            .filter(c => c.status === 'Available' || !c.status)
                            .filter(c => (c.roomName || 'Unnamed Room').toLowerCase().includes(addSectionClassroomSearchQuery.toLowerCase()))
                            .map((c) =>
                              <SelectItem key={c.id} value={c.id}>
                                {c.roomName || 'Unnamed Room'}
                              </SelectItem>
                            )}
                          {classrooms.filter(c => c.status === 'Available' || !c.status).filter(c => (c.roomName || 'Unnamed Room').toLowerCase().includes(addSectionClassroomSearchQuery.toLowerCase())).length === 0 && (
                            <div className="p-2 text-sm text-center text-slate-500">No classrooms found.</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddSectionOpen(false)}
                        className="w-full sm:w-auto">

                        Cancel
                      </Button>
                      <Button type="submit" className="w-full sm:w-auto">
                        Save Section
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddClassroomOpen} onOpenChange={setIsAddClassroomOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold transition-all">
                    <Plus className="w-4 h-4 mr-2" /> Add Classroom
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add New Classroom</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddClassroom} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Room Name</Label>
                      <Input
                        required
                        value={newClassroom.roomName}
                        onChange={(e) => setNewClassroom({ ...newClassroom, roomName: e.target.value })}
                        placeholder="e.g. Grade 1 - Room 101" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Room Type</Label>
                        <Select
                          value={newClassroom.roomType}
                          onValueChange={(v) => setNewClassroom({ ...newClassroom, roomType: v as 'Lecture' | 'Laboratory' | 'Multipurpose' })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lecture">Lecture</SelectItem>
                            <SelectItem value="Laboratory">Laboratory</SelectItem>
                            <SelectItem value="Multipurpose">Multipurpose</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Grade Level</Label>
                        <Select
                          value={newClassroom.gradeLevel}
                          onValueChange={(v) => setNewClassroom({ ...newClassroom, gradeLevel: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={newClassroom.status}
                          onValueChange={(v) => setNewClassroom({ ...newClassroom, status: v as 'Available' | 'Full' | 'Maintenance' })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Available">Available</SelectItem>
                            <SelectItem value="Full">Full</SelectItem>
                            <SelectItem value="Maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Academic Year</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="Start"
                          value={newClassroom.academicYear.split('-')[0] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) {
                              const end = newClassroom.academicYear.split('-')[1] || '';
                              setNewClassroom({ ...newClassroom, academicYear: `${val}-${end}` });
                            }
                          }}
                          className="h-9"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="End"
                          value={newClassroom.academicYear.split('-')[1] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*$/.test(val)) {
                              const start = newClassroom.academicYear.split('-')[0] || '';
                              setNewClassroom({ ...newClassroom, academicYear: `${start}-${val}` });
                            }
                          }}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <Label className="flex items-center justify-between text-sm font-semibold text-slate-700">
                        Section Details
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Section Name</Label>
                          <Input
                            placeholder="e.g. Section A"
                            value={newClassroomSection.name}
                            onChange={e => setNewClassroomSection({...newClassroomSection, name: e.target.value})}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Grade Level</Label>
                          <Select
                            value={newClassroomSection.gradeLevel}
                            onValueChange={v => setNewClassroomSection({...newClassroomSection, gradeLevel: v})}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white">
                              <SelectValue placeholder="Grade" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto">
                              {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                                <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Adviser (Teacher)</Label>
                        <Select
                          value={newClassroomSection.adviserId || 'none'}
                          onValueChange={v => setNewClassroomSection({...newClassroomSection, adviserId: v === 'none' ? undefined : v})}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Assign Adviser" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            <SelectItem value="none" className="text-xs italic text-slate-500">No Adviser</SelectItem>
                            {teachers.map(t => (
                              <SelectItem key={t.id} value={t.id} className="text-xs">{t.firstName} {t.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddClassroomOpen(false)}
                        className="w-full sm:w-auto">

                        Cancel
                      </Button>
                      <Button type="submit" className="w-full sm:w-auto">
                        Save Classroom
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Edit Classroom Dialog */}
              <Dialog open={isEditClassroomOpen} onOpenChange={setIsEditClassroomOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Edit Classroom</DialogTitle>
                  </DialogHeader>
                  {editingClassroom && (
                    <form onSubmit={handleUpdateClassroom} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Room Name</Label>
                        <Input
                          required
                          value={editingClassroom.roomName}
                          onChange={(e) => setEditingClassroom({ ...editingClassroom, roomName: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Room Type</Label>
                          <Select
                            value={editingClassroom.roomType}
                            onValueChange={(v) => setEditingClassroom({ ...editingClassroom, roomType: v as 'Lecture' | 'Laboratory' | 'Multipurpose' })}>
                            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Lecture">Lecture</SelectItem>
                              <SelectItem value="Laboratory">Laboratory</SelectItem>
                              <SelectItem value="Multipurpose">Multipurpose</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Grade Level</Label>
                          <Select
                            value={editingClassroom.gradeLevel}
                            onValueChange={(v) => setEditingClassroom({ ...editingClassroom, gradeLevel: v })}>
                            <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto">
                              {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={editingClassroom.status}
                            onValueChange={(v) => setEditingClassroom({ ...editingClassroom, status: v as 'Available' | 'Full' | 'Maintenance' })}>
                            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Available">Available</SelectItem>
                              <SelectItem value="Full">Full</SelectItem>
                              <SelectItem value="Maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Academic Year</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder="Start"
                            value={(editingClassroom.academicYear || '').split('-')[0] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*$/.test(val)) {
                                const end = (editingClassroom.academicYear || '').split('-')[1] || '';
                                setEditingClassroom({ ...editingClassroom, academicYear: `${val}-${end}` });
                              }
                            }}
                            className="h-9"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="text"
                            inputMode="numeric"
                            required
                            placeholder="End"
                            value={(editingClassroom.academicYear || '').split('-')[1] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d*$/.test(val)) {
                                const start = (editingClassroom.academicYear || '').split('-')[0] || '';
                                setEditingClassroom({ ...editingClassroom, academicYear: `${start}-${val}` });
                              }
                            }}
                            className="h-9"
                          />
                        </div>
                      </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <Label className="flex items-center justify-between text-sm font-semibold text-slate-700">
                        Section Details
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Section Name</Label>
                          <Input
                            placeholder="e.g. Section A"
                            value={editClassroomSection.name}
                            onChange={e => setEditClassroomSection({...editClassroomSection, name: e.target.value})}
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Grade Level</Label>
                          <Select
                            value={editClassroomSection.gradeLevel}
                            onValueChange={v => setEditClassroomSection({...editClassroomSection, gradeLevel: v})}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white">
                              <SelectValue placeholder="Grade" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto">
                              {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                                <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Adviser (Teacher)</Label>
                        <Select
                          value={editClassroomSection.adviserId || 'none'}
                          onValueChange={v => setEditClassroomSection({...editClassroomSection, adviserId: v === 'none' ? undefined : v})}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white">
                            <SelectValue placeholder="Assign Adviser" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            <SelectItem value="none" className="text-xs italic text-slate-500">No Adviser</SelectItem>
                            {teachers.map(t => (
                              <SelectItem key={t.id} value={t.id} className="text-xs">{t.firstName} {t.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditClassroomOpen(false)}>Cancel</Button>
                        <Button type="submit">Update Classroom</Button>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>

              {/* Edit Section Dialog */}
              <Dialog open={isEditSectionOpen} onOpenChange={setIsEditSectionOpen}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Edit Section</DialogTitle>
                  </DialogHeader>
                  {editingSection && (
                    <form onSubmit={handleUpdateSection} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Section Name</Label>
                        <Input
                          required
                          value={editingSection.name}
                          onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Grade Level</Label>
                          <Select
                            value={editingSection.gradeLevel}
                            onValueChange={(v) => setEditingSection({ ...editingSection, gradeLevel: v })}>
                            <SelectTrigger><SelectValue placeholder="Grade">
                              {editingSection.gradeLevel ? `Grade ${editingSection.gradeLevel}` : undefined}
                            </SelectValue></SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto">
                              {[1, 2, 3, 4, 5, 6].map(level => (
                                <SelectItem key={level} value={`Grade ${level}`}>Grade {level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={editingSection.status}
                            onValueChange={(v) => setEditingSection({ ...editingSection, status: v as 'Active' | 'Inactive' })}>
                            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Classroom</Label>
                        <Select
                          value={editingSection.classroomId}
                          onValueChange={(v) => setEditingSection({ ...editingSection, classroomId: v })}>
                          <SelectTrigger><SelectValue placeholder="Select Classroom">
                            {editingSection.classroomId ? classrooms.find(c => c.id === editingSection.classroomId)?.roomName : undefined}
                          </SelectValue></SelectTrigger>
                          <SelectContent>
                            {classrooms.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.roomName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Adviser (Teacher)</Label>
                        <Select
                          value={editSectionAdviserId || undefined}
                          onValueChange={(v) => setEditSectionAdviserId(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Adviser">
                              {editSectionAdviserId ? (() => { const t = teachers.find(t => t.id === editSectionAdviserId); return t ? `${t.firstName} ${t.lastName}` : undefined; })() : undefined}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                              <Input
                                placeholder="Search teacher..."
                                value={editSectionTeacherSearch}
                                onChange={(e) => setEditSectionTeacherSearch(e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div
                              className="px-2 py-1.5 text-sm text-slate-500 cursor-pointer hover:bg-accent rounded-md"
                              onClick={() => setEditSectionAdviserId('')}>
                              No Adviser (Remove)
                            </div>
                            {teachers
                              .filter(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(editSectionTeacherSearch.toLowerCase()))
                              .map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.firstName} {t.lastName}
                                </SelectItem>
                              ))}
                            {teachers.filter(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(editSectionTeacherSearch.toLowerCase())).length === 0 && (
                              <div className="p-2 text-sm text-center text-slate-500">No teachers found.</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { setIsEditSectionOpen(false); setEditSectionAdviserId(''); setEditSectionTeacherSearch(''); }}>Cancel</Button>
                        <Button type="submit">Update Section</Button>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>

              {/* Manage Subject Teachers Dialog */}
              <Dialog open={isSubjectTeacherOpen} onOpenChange={setIsSubjectTeacherOpen}>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Manage Subject Teachers</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto pr-2">
                    {(() => {
                      if (!subjectTeacherSectionId) return null;
                      const section = sections.find(s => s.id === subjectTeacherSectionId);
                      if (!section) return null;
                      const sectionGrade = (section.gradeLevel || '').replace(/Grade /i, '').trim();
                      const sectionSubjects = subjects.filter(s => (s.gradeLevel || '').replace(/Grade /i, '').trim() === sectionGrade);
                      
                      if (sectionSubjects.length === 0) {
                         return <p className="text-sm text-muted-foreground italic">No subjects configured for this grade level.</p>;
                      }

                      return sectionSubjects.map(sub => {
                        const subCode = sub.code || sub.name;
                        const currentAssignment = subjectAssignments.find(a => a.sectionId === section.id && a.subjectCode === subCode);
                        return (
                          <div key={sub.id} className="flex flex-col space-y-1.5 p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                            <Label className="text-xs font-bold text-slate-700">{sub.name} {sub.code ? `(${sub.code})` : ''}</Label>
                            <Select 
                              value={currentAssignment?.teacherId || 'remove'} 
                              onValueChange={async (teacherId) => {
                                if (teacherId === 'remove') {
                                  if (currentAssignment) await deleteSubjectAssignment(currentAssignment.id);
                                } else {
                                  if (currentAssignment) {
                                    if (currentAssignment.teacherId === teacherId) return;
                                    await deleteSubjectAssignment(currentAssignment.id);
                                  }
                                  await addSubjectAssignment({ sectionId: section.id, subjectCode: subCode, teacherId });
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="No Teacher Assigned" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="remove" className="text-rose-500 font-medium text-xs">No Teacher (Remove)</SelectItem>
                                {teachers.map(t => (
                                  <SelectItem key={t.id} value={t.id} className="text-xs">{t.firstName} {t.lastName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <DialogFooter>
                    <Button onClick={() => setIsSubjectTeacherOpen(false)}>Done</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms
            .filter(c => selectedYear === 'All' || c.academicYear === selectedYear)
            .filter(c => (c.roomName || '').toLowerCase().includes(mainClassroomSearchQuery.toLowerCase()))
            .sort((a, b) => {
              const gradeA = parseInt((a.gradeLevel || '').replace(/\D/g, '')) || 99;
              const gradeB = parseInt((b.gradeLevel || '').replace(/\D/g, '')) || 99;
              if (gradeA !== gradeB) return gradeA - gradeB;
              return (a.roomName || '').localeCompare(b.roomName || '');
            })
            .map((classroom) => {
              const classSections = sections.filter(
                (s) => s.classroomId === classroom.id
              );
              return (
                <Card
                  key={classroom.id}
                  onClick={() => setTimeout(() => setDetailsClassroom(classroom), 0)}
                  className="bg-card border-border p-6 shadow-sm rounded-xl flex flex-col cursor-pointer hover:shadow-md hover:border-slate-300 transition-all hover:translate-y-[-2px] duration-150">

                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg leading-tight">
                          {classroom.roomName || 'Standard Classroom'}
                        </h3>
                        {classroom.academicYear && (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            AY {classroom.academicYear}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingClassroom(classroom);
                            const section = classSections[0];
                            if (section) {
                              const assignment = assignments.find(a => a.sectionId === section.id);
                              setEditClassroomSection({
                                id: section.id,
                                name: section.name,
                                gradeLevel: section.gradeLevel || classroom.gradeLevel || 'Grade 1',
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
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50"
                          onClick={(e) => { e.stopPropagation(); deleteClassroom(classroom.id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {classroom.roomType || 'Lecture'}
                        </span>
                        {classroom.gradeLevel && (
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500 border-slate-200 bg-white">
                            {classroom.gradeLevel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 mb-4 border-y border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created Date</span>
                      <span className="text-xs font-semibold text-slate-600">
                        {getDateString(classroom.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    {classSections.length === 0 ?
                      <p className="text-sm text-muted-foreground italic">
                        No sections added yet.
                      </p> :

                      classSections.map((section) => {
                        const assignment = assignments.find(
                          (a) => a.sectionId === section.id
                        );
                        const teacher = assignment ?
                          teachers.find((t) => t.id === assignment.teacherId) :
                          null;
                        return (
                          <div
                            key={section.id}
                            className="group flex flex-col p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:shadow-slate-200/50 hover:border-primary/20 transition-all duration-200">

                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-1 h-8 rounded-full shrink-0",
                                section.status === 'Active' ? "bg-emerald-400" : "bg-slate-300"
                              )} />
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm text-slate-800 truncate leading-tight">
                                  {section.name}
                                </span>
                                <span className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                                  {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'No Adviser'}
                                </span>
                              </div>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              className="w-full mt-2 h-7 text-[10px] uppercase font-bold text-slate-500 bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:text-primary transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubjectTeacherSectionId(section.id);
                                setIsSubjectTeacherOpen(true);
                              }}
                            >
                              <BookOpen className="w-3 h-3 mr-1.5" /> Manage Subject Teachers
                            </Button>
                          </div>);

                      })
                    }
                  </div>
                </Card>);

            })}
        </div>
      </div>

      {/* Classroom Details Modal - Direct Portal (bypasses Dialog event issues) */}
      {detailsClassroom !== null && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setDetailsClassroom(null)} />
          <div className="relative z-[101] grid w-full gap-6 rounded-2xl bg-background p-6 shadow-2xl ring-1 ring-border animate-in fade-in zoom-in-95 duration-200 max-w-4xl max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setDetailsClassroom(null)}
              className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground z-10">
              <X className="size-4" />
            </button>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Home className="w-5 h-5 text-primary" />
                {detailsClassroom.roomName || 'Classroom Details'}
              </h2>
            </div>

            <div className="space-y-6 py-4">
              {/* Classroom Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Academic Year</span>
                  <span className="text-sm font-semibold text-slate-800">{detailsClassroom.academicYear || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Room Type</span>
                  <span className="text-sm font-semibold text-slate-800">{detailsClassroom.roomType || 'Lecture'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Grade Level</span>
                  <span className="text-sm font-semibold text-slate-800">{detailsClassroom.gradeLevel || 'Any'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Status</span>
                  <span className="text-sm font-semibold text-slate-800">{detailsClassroom.status || 'Available'}</span>
                </div>
              </div>

              {/* Sections list with Advisers and Students */}
              <div className="space-y-6">
                <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Section &amp; Enrolled Students</span>
                </h3>

                {sections.filter(s => s.classroomId === detailsClassroom.id).length === 0 ? (
                  <p className="text-sm text-slate-500 italic text-center py-4">No sections added to this classroom yet.</p>
                ) : (
                  sections.filter(s => s.classroomId === detailsClassroom.id).map(section => {
                    const assignment = assignments.find(a => a.sectionId === section.id);
                    const teacher = assignment ? teachers.find(t => t.id === assignment.teacherId) : null;
                    const sectionS = classroomStudents.filter(st => st.sectionId === section.id);

                    return (
                      <div key={section.id} className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-sm">
                        {/* Section Header */}
                        <div className="bg-slate-50/70 p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900">{section.name}</h4>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Adviser: <span className="font-semibold text-slate-700">{teacher ? `${teacher.firstName} ${teacher.lastName}` : 'No Adviser Assigned'}</span>
                            </p>
                          </div>
                          <div className="text-xs font-semibold text-slate-600 sm:text-right">
                            {sectionS.length} Student(s) Enrolled
                          </div>
                        </div>

                        {/* Students Table */}
                        <div className="p-4">
                          {loadingStudents ? (
                            <div className="flex justify-center items-center py-6">
                              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            </div>
                          ) : sectionS.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2 text-center">No enrolled students in this section yet.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                                    <th className="py-2 pl-2">No.</th>
                                    <th className="py-2">LRN</th>
                                    <th className="py-2">Name</th>
                                    <th className="py-2">Gender</th>
                                    <th className="py-2 pr-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sectionS
                                    .sort((a, b) => {
                                      const isAMale = !a.gender?.toLowerCase().startsWith('f');
                                      const isBMale = !b.gender?.toLowerCase().startsWith('f');
                                      if (isAMale && !isBMale) return -1;
                                      if (!isAMale && isBMale) return 1;
                                      return (a.lastName || '').localeCompare(b.lastName || '');
                                    })
                                    .map((student, index) => (
                                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/50 last:border-0">
                                        <td className="py-2.5 pl-2 font-medium text-slate-500">{index + 1}</td>
                                        <td className="py-2.5 font-mono text-slate-600">{student.lrn}</td>
                                        <td className="py-2.5 font-semibold text-slate-800">{student.lastName}, {student.firstName}</td>
                                        <td className="py-2.5 text-slate-600">{student.gender}</td>
                                        <td className="py-2.5 pr-2">
                                          <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-semibold",
                                            student.status?.toLowerCase() === 'enrolled' ? "bg-emerald-50 text-emerald-700" :
                                              student.status?.toLowerCase() === 'dropped' ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700"
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
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button onClick={() => setDetailsClassroom(null)}>Close</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>);

}
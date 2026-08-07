import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'../ui/Table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter } from
'../ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../ui/Select';
import { Badge } from '../ui/Badge';
import { BookOpen, Search, Plus, Filter, MoreVertical, Edit2, Edit, Trash2, Calendar, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useAdminData, Subject } from '../../lib/adminData';
import { getCurrentSchoolYear } from '../../lib/utils';
import { cn } from '../ui/utils';

export function SubjectsView() {
  const { 
    subjects, 
    addSubject, 
    updateSubject, 
    deleteSubject, 
    loading 
  } = useAdminData();
  const [isSaving, setIsSaving] = useState(false);

  const getDateString = (ts: unknown) => {
    if (!ts) return 'N/A';
    if (typeof ts === 'object' && 'toDate' in ts && typeof (ts as { toDate?: () => Date }).toDate === 'function') {
      return (ts as { toDate: () => Date }).toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return new Date(ts as string | number | Date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteSubject(id);
    } catch (error) {
      console.error("Error deleting subject:", error);
    }
  };
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);
  const [selectedYear, setSelectedYear] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const uniqueYears = Array.from(new Set(subjects.map(s => s.academicYear))).sort().reverse();

  const [newSubject, setNewSubject] = useState({
    name: '',
    gradeLevel: 'Grade 1',
    status: 'Active' as 'Active' | 'Inactive',
    credits: 1,
    academicYear: getCurrentSchoolYear()
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      await addSubject(newSubject);
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
        setIsEditOpen(false);
      } catch (error) {
        console.error("Error updating subject: ", error);
      } finally {
        setIsSaving(false);
      }
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

          await addSubject({
            name,
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
        alert("All default subjects for this academic year have already been seeded!");
      } else {
        alert(`Subjects auto-seeded successfully! Added ${addedCount} new subjects, skipped ${skippedCount} existing.`);
      }
    } catch (error) {
      console.error("Error seeding subjects:", error);
      alert("Error auto-seeding subjects.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredSubjects = subjects.filter(s => {
    const matchesYear = selectedYear === 'All' || s.academicYear === selectedYear;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesYear && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSubjects.length / itemsPerPage));
  const paginatedSubjects = filteredSubjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="w-5 h-5" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Subjects Management</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed hidden sm:flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              Managing subjects {selectedYear === 'All' ? 'across all academic years' : `for Academic Year ${selectedYear}`}
            </p>
          </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-xl relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <Input
              type="text"
              placeholder="Search subjects..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 border-none bg-transparent shadow-none pl-8 w-full text-sm focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); setCurrentPage(1); }}>
              <SelectTrigger className="h-8 border-none bg-transparent shadow-none w-[140px] text-xs font-bold">
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

          <Button 
            onClick={handleAutoSeed}
            disabled={isSaving}
            className="w-full sm:w-auto rounded-xl px-6 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm font-semibold transition-all mr-2">
            Auto-Add All Subjects
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto rounded-xl px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Subject Name</Label>
                  <Input
                    required
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    placeholder="e.g. Mathematics" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade Level</Label>
                  <Select
                    value={newSubject.gradeLevel}
                    onValueChange={(v) => setNewSubject({ ...newSubject, gradeLevel: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                        <SelectItem key={level} value={`Grade ${level}`}>Grade {level}</SelectItem>
                      ))}
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
                    value={newSubject.academicYear.split('-')[0] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        const end = newSubject.academicYear.split('-')[1] || '';
                        setNewSubject({ ...newSubject, academicYear: `${val}-${end}` });
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
                    value={newSubject.academicYear.split('-')[1] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        const start = newSubject.academicYear.split('-')[0] || '';
                        setNewSubject({ ...newSubject, academicYear: `${start}-${val}` });
                      }
                    }}
                    className="h-9"
                  />
                </div>
              </div>
              <DialogFooter className="pt-4 flex-col sm:flex-row gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="w-full sm:w-auto">
                  
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Save Subject
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        <Card className="bg-white border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table className="table-fixed min-w-[800px]">
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow className="hover:bg-transparent border-none h-12">
                  <TableHead className="w-[5%] text-center font-bold text-slate-400 text-[10px] uppercase tracking-widest">#</TableHead>
                  <TableHead className="w-[50%] font-bold text-slate-500 whitespace-nowrap text-[10px] uppercase tracking-widest">Subject Name</TableHead>
                  <TableHead className="w-[15%] font-bold text-slate-500 whitespace-nowrap text-[10px] uppercase tracking-widest">Grade</TableHead>
                  <TableHead className="w-[15%] font-bold text-slate-500 whitespace-nowrap text-[10px] uppercase tracking-widest">Date Created</TableHead>
                  <TableHead className="w-[15%] text-right pr-6 font-bold text-slate-500 text-[10px] uppercase tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSubjects.length === 0 ?
                <TableRow>
                    <TableCell
                    colSpan={6}
                    className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen className="w-8 h-8 text-slate-200" />
                        <p className="text-sm text-slate-400 font-medium">No subjects found.</p>
                      </div>
                    </TableCell>
                  </TableRow> :

                paginatedSubjects
                  .map((subject, index) =>
                <TableRow
                  key={subject.id}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group h-14">
                  
                      <TableCell className="text-center font-medium text-slate-400">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 truncate" title={subject.name}>
                        {subject.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">
                          {subject.gradeLevel}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-slate-500 text-sm">
                        {getDateString(subject.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                            onClick={() => { setViewingSubject(subject); setIsViewOpen(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                            onClick={() => { setEditingSubject(subject); setIsEditOpen(true); }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            onClick={() => handleDeleteSubject(subject.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                )
                }
              </TableBody>
            </Table>
          </div>
          {filteredSubjects.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSubjects.length)} of {filteredSubjects.length} subjects
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-2 text-slate-600"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-semibold text-slate-600 min-w-[3rem] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-2 text-slate-600"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>


      {/* Edit Subject Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          {editingSubject && (
            <form onSubmit={handleUpdate} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Subject Name</Label>
                  <Input
                    required
                    value={editingSubject.name}
                    onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grade Level</Label>
                  <Select
                    value={editingSubject.gradeLevel}
                    onValueChange={(v) => setEditingSubject({ ...editingSubject, gradeLevel: v })}>
                    <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                        <SelectItem key={level} value={`Grade ${level}`}>Grade {level}</SelectItem>
                      ))}
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
                    value={editingSubject.academicYear.split('-')[0] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        const end = editingSubject.academicYear.split('-')[1] || '';
                        setEditingSubject({ ...editingSubject, academicYear: `${val}-${end}` });
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
                    value={editingSubject.academicYear.split('-')[1] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*$/.test(val)) {
                        const start = editingSubject.academicYear.split('-')[0] || '';
                        setEditingSubject({ ...editingSubject, academicYear: `${start}-${val}` });
                      }
                    }}
                    className="h-9"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit">Update Subject</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Subject Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Subject Details</DialogTitle>
          </DialogHeader>
          {viewingSubject && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{viewingSubject.name}</h3>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Grade Level</p>
                  <p className="font-bold text-slate-700">{viewingSubject.gradeLevel}</p>
                </div>

                <div className="p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">A.Y.</p>
                  <p className="font-bold text-slate-700">{viewingSubject.academicYear}</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created At</p>
                  <p className="font-bold text-slate-700">
                    {getDateString(viewingSubject.createdAt)}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewOpen(false)} className="w-full">Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>);

}
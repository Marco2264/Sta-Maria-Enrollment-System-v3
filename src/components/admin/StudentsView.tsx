import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Search, GraduationCap, FileEdit, Users, Loader2 } from 'lucide-react';
import { AdminEditStudentModal } from './AdminEditStudentModal';
import { useAdminData } from '../../lib/adminData';

export function StudentsView() {
  const { sections } = useAdminData();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [gradeFilter, setGradeFilter] = useState<string>('All Grades');

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

  const handleEditClick = (student: any) => {
    setSelectedStudentId(student.id);
    setIsModalOpen(true);
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-6 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <GraduationCap className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Students Management</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              View and manage all student enrollments, edit information, and transfer sections.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search name or LRN..." 
                className="pl-9 bg-white border border-slate-300 ring-2 ring-slate-100 shadow-sm w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-full sm:w-[150px] bg-white border border-slate-300 shadow-sm">
                  <SelectValue placeholder="Grade Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Grades">All Grades</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map(g => (
                    <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px] bg-white border border-slate-300 shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Statuses">All Statuses</SelectItem>
                  <SelectItem value="Enrolled">Enrolled</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <Card className="bg-white border-border rounded-2xl overflow-hidden shadow-md">
          <div className="p-5 border-b border-border flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-800">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">
                {statusFilter === 'All Statuses' ? 'All Students' : `${statusFilter} Students`}
              </h3>
            </div>
            <Badge variant="secondary" className="bg-white">
              {statusFilter === 'All Statuses' ? 'Total Records: ' : `Total ${statusFilter}: `} {filteredStudents.length}
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-border">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-bold text-slate-700 pl-6 w-16">#</TableHead>
                  <TableHead className="font-bold text-slate-700">Name</TableHead>
                  <TableHead className="font-bold text-slate-700">LRN</TableHead>
                  <TableHead className="font-bold text-slate-700">Grade Level</TableHead>
                  <TableHead className="font-bold text-slate-700">Section</TableHead>
                  <TableHead className="font-bold text-slate-700">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No students found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const assignedSection = sections.find(sec => sec.id === s.sectionId);
                    
                    return (
                      <TableRow key={s.id} className="border-b border-border/40 hover:bg-slate-50/50">
                        <TableCell className="pl-6 text-slate-400 font-semibold">{idx + 1}</TableCell>
                        <TableCell className="font-medium text-slate-800">
                          {s.lastName}, {s.firstName} {s.middleName?.charAt(0)}.
                        </TableCell>
                        <TableCell className="font-mono text-slate-600 text-sm">{s.lrn || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-white text-slate-700">
                            Grade {s.gradeLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 font-medium text-sm">
                          {assignedSection ? assignedSection.name : <span className="text-slate-400 italic">Unassigned</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`border ${getStatusColor(s.status)}`}>
                            {s.status || 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleEditClick(s)}
                          >
                            <FileEdit className="w-4 h-4 mr-2" />
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

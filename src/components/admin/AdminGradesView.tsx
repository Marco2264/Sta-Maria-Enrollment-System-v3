import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
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
import { BookOpen, Search, Loader2, Printer, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminData } from '../../lib/adminData';

export function AdminGradesView() {
  const { sections, subjects } = useAdminData();
  
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 1');
  const [selectedSection, setSelectedSection] = useState<string>('');
  
  const [editingGrades, setEditingGrades] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  
  const [students, setStudents] = useState<any[]>([]);
  const [gradeConfigs, setGradeConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGrade, selectedSection, statusFilter]);

  // Get available sections for the selected grade
  const availableSections = useMemo(() => {
    return sections.filter(s => s.gradeLevel === selectedGrade);
  }, [sections, selectedGrade]);

  // Auto-select first section when grade changes
  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.find(s => s.id === selectedSection)) {
      setSelectedSection(availableSections[0].id);
    } else if (availableSections.length === 0) {
      setSelectedSection('');
    }
  }, [availableSections, selectedSection]);

  // Get available subjects (for all grades or specific if we want)
  const availableSubjects = useMemo(() => {
    const filtered = subjects.filter(s => s.status === 'Active' && (!s.gradeLevel || s.gradeLevel === selectedGrade));
    
    // Deduplicate subjects based on code or name
    const unique = [];
    const seen = new Set();
    for (const s of filtered) {
      const key = (s.code || s.name).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }
    
    // Optional: Sort alphabetically
    unique.sort((a, b) => (a.name || a.code || '').localeCompare(b.name || b.code || ''));
    return unique;
  }, [subjects, selectedGrade]);

  // Fetch Students for selected section
  useEffect(() => {
    if (!selectedSection) {
      setStudents([]);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'enrollments'), 
      where('sectionId', '==', selectedSection),
      where('status', '==', 'Enrolled')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [selectedSection]);

  // Fetch Grade Configurations globally
  useEffect(() => {
    const q = query(collection(db, 'gradeConfigurations'));
    const unsub = onSnapshot(q, (snapshot) => {
      setGradeConfigs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleGradeChange = (studentId: string, subjectCode: string, value: string) => {
    setEditingGrades(prev => ({
      ...prev,
      [`${studentId}_${subjectCode}`]: value
    }));
  };

  const handleSaveGrade = async (studentId: string, subjectCode: string) => {
    const value = editingGrades[`${studentId}_${subjectCode}`];
    if (value === undefined) return;
    
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    try {
      setSaving(true);
      const gradeKey = selectedGrade.replace(/Grade /i, 'Grade ');
      const currentGrades = student.grades || {};
      if (!currentGrades[gradeKey]) currentGrades[gradeKey] = {};
      if (!currentGrades[gradeKey][subjectCode]) currentGrades[gradeKey][subjectCode] = {};
      
      currentGrades[gradeKey][subjectCode].finalGradeOverride = value === '' ? null : parseFloat(value);
      
      await updateDoc(doc(db, 'enrollments', studentId), { grades: currentGrades });
      toast.success('Grade overridden successfully');
      
      // Clear from editing state so it shows the saved value
      setEditingGrades(prev => {
        const next = { ...prev };
        delete next[`${studentId}_${subjectCode}`];
        return next;
      });
    } catch (error) {
      console.error('Error overriding grade:', error);
      toast.error('Failed to override grade');
    } finally {
      setSaving(false);
    }
  };

  const processedStudents = useMemo(() => {
    if (!students.length) return [];
    const gradeKey = selectedGrade.replace(/Grade /i, 'Grade ');

    return students.map(s => {
      let totalGWA = 0;
      let validSubjects = 0;
      
      const subjGrades = availableSubjects.map(sub => {
        const code = sub.code || sub.name;
        const subjectData = s.grades?.[gradeKey]?.[code] || {};
        const finalOverride = subjectData.finalGradeOverride;

        let finalGrade: number | null = null;
        
        if (finalOverride !== undefined && finalOverride !== null) {
           finalGrade = Number(finalOverride);
        } else {
          const termsArray = ['Term 1', 'Term 2', 'Finals'];
          const termGrades = termsArray.map(term => {
            const cols = gradeConfigs.filter(c => c.subjectCode === code && c.term === term && c.type !== 'submission');
            if (cols.length === 0) return null;
            
            let termTotal = 0;
            let hasGrade = false;
            const termData = subjectData[term] || {};
            cols.forEach(col => {
              const val = termData[col.id];
              if (val !== undefined && val !== '') {
                termTotal += (parseFloat(val) * (col.weight / 100));
                hasGrade = true;
              }
            });
            return hasGrade ? termTotal : null;
          }).filter(v => v !== null) as number[];

          if (termGrades.length > 0) {
             finalGrade = termGrades.reduce((a, b) => a + b, 0) / termGrades.length;
          }
        }

        if (finalGrade !== null) {
           totalGWA += finalGrade;
           validSubjects++;
        }
        
        return { code, value: finalGrade, isOverride: finalOverride !== undefined && finalOverride !== null };
      });

      const gwa = validSubjects > 0 ? (totalGWA / validSubjects).toFixed(2) : '—';
      const isFailing = validSubjects > 0 && (totalGWA / validSubjects) < 75;

      return {
        ...s,
        computedSubjGrades: subjGrades,
        computedGWA: gwa,
        isFailing
      };
    });
  }, [students, selectedGrade, availableSubjects, gradeConfigs]);

  const filteredStudents = useMemo(() => {
    let result = processedStudents;
    
    if (statusFilter === 'passed') {
      result = result.filter(s => !s.isFailing && s.computedGWA !== '—');
    } else if (statusFilter === 'failed') {
      result = result.filter(s => s.isFailing);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => `${s.firstName} ${s.lastName} ${s.lrn}`.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const aName = `${a.lastName} ${a.firstName}`.toLowerCase();
      const bName = `${b.lastName} ${b.firstName}`.toLowerCase();
      return aName.localeCompare(bName);
    });
    return result;
  }, [processedStudents, searchQuery, statusFilter]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage]);



  const handlePrint = () => {
    window.print();
  };


  return (
    <div className="flex flex-col h-full bg-slate-50/50 print:bg-white print:h-auto">
      <header className="px-6 py-4 border-b border-border bg-gradient-to-r from-blue-50/50 via-blue-50/30 to-transparent shrink-0 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-700">
              <BookOpen className="w-5 h-5" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Academic Monitoring</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed hidden sm:block">
              Master gradebook view. Monitor student performance across all sections and subjects.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 bg-white" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Print Report
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full flex-1 overflow-y-auto print:p-0 print:overflow-visible">
        {/* Filters Panel */}
        <Card className="p-5 bg-white border border-slate-200 shadow-sm rounded-xl print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5 w-full">
              <label className="text-xs font-semibold text-slate-500 uppercase">Grade Level</label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select Grade" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(g => (
                    <SelectItem key={g} value={`Grade ${g}`}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full">
              <label className="text-xs font-semibold text-slate-500 uppercase">Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Select Section">
                    {selectedSection ? availableSections.find(s => s.id === selectedSection)?.name : 'Select Section'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableSections.length === 0 && <span className="p-2 text-sm text-slate-500 block">No sections available</span>}
                  {availableSections.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full">
              <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full">
              <label className="text-xs font-semibold text-slate-500 uppercase">Search Students</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search by name or LRN..." 
                  className="pl-9 bg-white border-slate-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-8 border-b-2 border-slate-900 pb-6">
          <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-widest">Master Gradebook Report</h1>
          <div className="mt-2 text-sm text-slate-600 font-medium space-x-4">
            <span><strong>Grade:</strong> {selectedGrade}</span>
            <span><strong>Section:</strong> {availableSections.find(s => s.id === selectedSection)?.name || 'Unknown'}</span>
            <span><strong>Term:</strong> Final Overall Grades</span>
          </div>
        </div>

        {/* Gradebook Table */}
        <Card className="bg-white border shadow-sm rounded-xl overflow-hidden flex flex-col print:shadow-none print:border-none print:rounded-none">
            <div className="px-4 py-4 border-b bg-indigo-50/50 border-indigo-100 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-indigo-900">Master Sheet (General Weighted Average)</span>
              </div>
              <div className="text-sm text-indigo-700 font-medium">
                {filteredStudents.length} Students
              </div>
            </div>
              <Table>
                <TableHeader className="bg-slate-50/50 print:bg-slate-100">
                  <TableRow className="print:border-slate-800">
                    <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-3 pl-6 min-w-[200px] sticky left-0 bg-slate-50 print:bg-white z-20 print:text-black shadow-[1px_0_0_0_#e2e8f0]">Student Name</TableHead>
                    {availableSubjects.map(s => (
                      <TableHead key={s.id} className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider py-3 text-center min-w-[120px] max-w-[180px] print:text-black" title={s.name}>
                        <div className="truncate px-2 whitespace-normal break-words leading-tight">{s.name}</div>
                      </TableHead>
                    ))}
                    <TableHead className="font-bold text-indigo-900 text-xs uppercase tracking-wider py-3 text-center pr-6 min-w-[80px] w-[100px] border-l border-slate-200 sticky right-0 bg-slate-50 print:bg-white z-20 print:border-slate-800 print:text-black shadow-[-1px_0_0_0_#e2e8f0]">GWA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={availableSubjects.length + 2} className="text-center py-12">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={availableSubjects.length + 2} className="text-center py-12 text-slate-500">
                        No students found for this section.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStudents.map(s => {
                      const subjGrades = s.computedSubjGrades;
                      const gwa = s.computedGWA;
                      const isFailing = s.isFailing;

                      return (
                        <TableRow key={s.id} className={`hover:bg-slate-50/80 transition-colors border-b border-slate-200 print:border-slate-300 ${isFailing ? 'bg-red-50/30' : 'bg-white'}`}>
                          <TableCell className={`pl-6 py-2.5 sticky left-0 z-20 print:bg-white print:border-transparent shadow-[1px_0_0_0_#e2e8f0] ${isFailing ? 'bg-red-50/90' : 'bg-white'}`}>
                            <span className={`font-semibold text-[13px] ${isFailing ? 'text-red-700' : 'text-slate-800'} print:text-black whitespace-nowrap`}>
                              {s.lastName}, {s.firstName} {s.middleName?.charAt(0) ? `${s.middleName.charAt(0)}.` : ''}
                            </span>
                          </TableCell>
                          {subjGrades.map(sg => (
                            <TableCell key={sg.code} className="text-center py-2.5 px-1 font-mono text-xs print:text-black">
                              <div className="flex justify-center items-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className={`w-16 text-center text-xs font-bold py-1.5 rounded border ${sg.isOverride ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-transparent border-transparent hover:border-slate-300'} transition-colors focus:bg-white focus:border-indigo-500 print:border-none print:bg-transparent ${sg.value !== null && Number(sg.value) < 75 ? 'text-red-600 bg-red-50/50' : 'text-slate-600'}`}
                                  value={editingGrades[`${s.id}_${sg.code}`] !== undefined ? editingGrades[`${s.id}_${sg.code}`] : (sg.value !== null ? Number(sg.value).toFixed(1) : '')}
                                  onChange={(e) => handleGradeChange(s.id, sg.code, e.target.value)}
                                  onBlur={() => {
                                    if (editingGrades[`${s.id}_${sg.code}`] !== undefined) {
                                      handleSaveGrade(s.id, sg.code);
                                    }
                                  }}
                                  placeholder="—"
                                />
                              </div>
                            </TableCell>
                          ))}
                          <TableCell className={`text-center pr-6 py-2.5 font-mono font-bold text-[13px] border-l border-slate-200 print:border-slate-300 print:text-black sticky right-0 z-20 shadow-[-1px_0_0_0_#e2e8f0] ${isFailing ? 'text-red-700 bg-red-50/90' : 'text-indigo-900 bg-indigo-50/90'}`}>
                            {gwa}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  </TableBody>
                </Table>
                {filteredStudents.length > itemsPerPage && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 print:hidden">
                    <div className="text-sm text-slate-500 font-medium">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="h-8 bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <div className="text-sm font-medium text-slate-600 px-2">
                        Page {currentPage} of {Math.ceil(filteredStudents.length / itemsPerPage)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredStudents.length / itemsPerPage), p + 1))}
                        disabled={currentPage >= Math.ceil(filteredStudents.length / itemsPerPage)}
                        className="h-8 bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
            </Card>
      </div>
    </div>
  );
}

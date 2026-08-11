import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import { CheckCircle2, XCircle, CircleDashed, ClipboardCheck, Clock, Check, X, Eye, User, Search, FileText, Download, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/Dialog';
import { useTeacherData } from '../../lib/teacherData';
import TeacherStudentDetailView from './TeacherStudentDetailView';
import { useState, useMemo } from 'react';
import { Input } from '../../components/ui/Input';

export function EnrollmentsView() {
  const { students, updateStudentStatus, loading, currentGradeLevel, currentSectionName } = useTeacherData();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentToEnroll, setStudentToEnroll] = useState<any | null>(null);
  const [psaViewUrl, setPsaViewUrl] = useState<string | null>(null);
  const [psaViewName, setPsaViewName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');

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

  const formatStudentName = (firstName: string | undefined, lastName: string | undefined) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (!last) return first || 'Unnamed Student';
    if (!first) return last || 'Unnamed Student';
    return `${last}, ${first}`;
  };

  const filteredStudents = useMemo(() => {
    let result = students;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        `${s.firstName} ${s.lastName} ${s.lrn}`.toLowerCase().includes(query)
      );
    }
    return [...result].sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
      const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [students, searchQuery]);

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
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const pendingAll = filteredStudents.filter((s) => s.status === 'Pending');
  const pendingMaleCount = pendingAll.filter((s) => s.gender === 'Male').length;
  const pendingFemaleCount = pendingAll.filter((s) => s.gender === 'Female').length;

  const pending = pendingAll.filter((s) => {
    if (genderFilter === 'Male') return s.gender === 'Male';
    if (genderFilter === 'Female') return s.gender === 'Female';
    return true;
  });
  const processed = filteredStudents.filter((s) => s.status === 'Enrolled' || s.status === 'Rejected');

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <header className="relative px-6 sm:px-8 py-8 border-b border-slate-200 bg-white/70 backdrop-blur-md shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-slate-800">
              <div className="p-2.5 bg-slate-100 rounded-2xl text-primary shadow-sm border border-slate-200">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center flex-wrap gap-2.5">
                Pending Enrollment
                <span className="text-xs font-bold px-3 py-1 bg-amber-100/80 text-amber-800 border border-amber-200/70 rounded-full shadow-2xs">
                  Action Required
                </span>
              </h1>
            </div>
            <p className="text-sm text-slate-500 pl-14">
              Review and approve pending student enrollments for your assigned section.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search student or LRN..."
                className="pl-10 h-11 bg-white border-slate-200 w-full rounded-xl shadow-sm hover:border-slate-300 transition-all text-sm text-slate-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto justify-center">
              {pending.length > 0 ? (
                <>
                  <Clock className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Review Load</p>
                    <p className="text-sm font-bold text-amber-600 leading-tight mt-0.5">{pending.length} Pending</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Review Load</p>
                    <p className="text-sm font-bold text-emerald-600 leading-tight mt-0.5">Caught Up</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 w-full relative">
        <div className="space-y-4">
          <Card className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/80 border-b border-slate-200/60">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-widest pl-6 py-4">STUDENT</TableHead>
                    <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-widest py-4">LRN</TableHead>
                    <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-widest py-4">GRADE</TableHead>
                    <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-widest py-4">GENDER</TableHead>
                    <TableHead className="font-black text-slate-500 text-[10px] uppercase tracking-widest pr-6 py-4 text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                          <p className="font-bold text-slate-700 text-sm">No Pending Enrollments Found</p>
                          <p className="text-xs text-slate-400">There are no pending student enrollments for this category.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pending.map((student) => {
                      const isMale = student.gender === 'Male';
                      const initials = `${student.firstName?.charAt(0) || ''}${student.lastName?.charAt(0) || ''}`;
                      const photo = (student as any).photoURL || (student as any).photoUrl;
                      return (
                        <TableRow key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6 py-4 font-bold text-slate-900">
                            <div className="flex items-center gap-3">
                              {photo ? (
                                <img
                                  src={photo}
                                  alt={student.firstName}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-50/80 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-blue-100/80 uppercase">
                                  {initials}
                                </div>
                              )}
                              <span className="font-extrabold text-slate-900 tracking-tight uppercase text-sm">
                                {student.lastName}, {student.firstName} {student.middleName ? `${student.middleName}` : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold text-slate-600 py-4">
                            {student.lrn}
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200/60 inline-block shadow-2xs">
                              Grade {student.gradeLevel}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className={`text-xs font-bold ${isMale ? 'text-blue-600' : 'text-pink-600'}`}>
                              {student.gender}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl h-9 px-3.5 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
                                onClick={() => setSelectedStudentId(student.id)}
                              >
                                <User className="w-3.5 h-3.5 text-slate-500" /> Profile
                              </Button>
                              <Button
                                size="sm"
                                className="rounded-xl h-9 px-4 text-xs font-bold bg-[#00875A] hover:bg-[#00734c] text-white shadow-sm flex items-center gap-1.5 cursor-pointer border-none active:scale-95 transition-all"
                                onClick={() => setStudentToEnroll(student)}
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
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

            {/* Table Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-500">
                Showing 1 to {pending.length} of {pending.length} pending
              </span>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="w-8 h-8 p-0 rounded-lg border-slate-200 text-slate-400 bg-white shadow-2xs" disabled>
                  &lt;
                </Button>
                <Button variant="outline" size="sm" className="w-8 h-8 p-0 rounded-lg border-slate-200 text-slate-400 bg-white shadow-2xs" disabled>
                  &gt;
                </Button>
              </div>
            </div>
          </Card>
        </div>      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!studentToEnroll} onOpenChange={(open) => !open && setStudentToEnroll(null)}>
        <DialogContent className="sm:max-w-[450px] p-6 rounded-3xl border-none shadow-2xl bg-white animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              Confirm Enrollment
            </DialogTitle>
            <p className="text-sm text-slate-500 leading-relaxed">
              Please verify the student details below before approving and enrolling them into your section.
            </p>
          </DialogHeader>

          {studentToEnroll && (
            <div className="space-y-4 my-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3.5 text-left">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Student Name</span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatStudentName(studentToEnroll.firstName, studentToEnroll.lastName)} {studentToEnroll.middleName || ''}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">LRN</span>
                    <span className="text-sm font-mono font-bold text-slate-700">{studentToEnroll.lrn}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Gender</span>
                    <span className="text-sm font-semibold text-slate-700">{studentToEnroll.gender}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Target Section & Grade</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 font-bold px-2 py-0.5 rounded-lg shadow-sm">
                      Grade {studentToEnroll.gradeLevel || currentGradeLevel}
                    </Badge>
                    <span className="text-slate-400 text-xs font-semibold">/</span>
                    <span className="text-sm font-bold text-slate-800">
                      Section {currentSectionName || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-1/2 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50 h-11"
              onClick={() => setStudentToEnroll(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-1/2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-11 border-none active:scale-98"
              onClick={() => {
                if (studentToEnroll) {
                  updateStudentStatus(studentToEnroll.id, 'Enrolled');
                  setStudentToEnroll(null);
                }
              }}
            >
              Confirm & Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* PSA Viewer Modal */}
      <Dialog open={!!psaViewUrl} onOpenChange={(open) => !open && setPsaViewUrl(null)}>
        <DialogContent className="sm:max-w-4xl w-[95vw] h-[85vh] p-0 rounded-3xl border-none shadow-2xl bg-white flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between gap-4 bg-slate-50/50 shrink-0">
            <div className="text-left">
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                PSA Birth Certificate
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Previewing: {psaViewName || 'Birth Certificate'}
              </p>
            </div>
            <div className="flex items-center gap-2 pr-8 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 text-xs font-semibold bg-white border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50"
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
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 text-xs font-semibold bg-white border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50"
                onClick={() => {
                  if (psaViewUrl) {
                    const printWindow = window.open(psaViewUrl, '_blank');
                    if (printWindow) {
                      printWindow.addEventListener('load', () => {
                        printWindow.print();
                      }, true);
                    }
                  }
                }}
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 bg-slate-800/90 relative flex items-center justify-center p-4 overflow-hidden">
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

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
            <Button onClick={() => setPsaViewUrl(null)} className="rounded-xl px-5 h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold">
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
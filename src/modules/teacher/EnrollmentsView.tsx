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
import { FullStudentProfileModal } from './FullStudentProfileModal';
import { useState, useMemo } from 'react';
import { Input } from '../../components/ui/Input';

export function EnrollmentsView() {
  const { students, updateStudentStatus, loading, currentGradeLevel, currentSectionName } = useTeacherData();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentToEnroll, setStudentToEnroll] = useState<any | null>(null);
  const [psaViewUrl, setPsaViewUrl] = useState<string | null>(null);
  const [psaViewName, setPsaViewName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const pending = filteredStudents.filter((s) => s.status === 'Pending');
  const processed = filteredStudents.filter((s) => s.status === 'Enrolled' || s.status === 'Rejected');

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <header className="relative px-8 py-10 border-b border-slate-200 bg-white/70 backdrop-blur-md shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-slate-800">
              <div className="p-2.5 bg-slate-100 rounded-2xl text-primary shadow-sm border border-slate-200">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Review Enrollments</h1>
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

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto w-full relative">
        {pending.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm animate-pulse"></div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Pending Enrollments</h2>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200/50 rounded-lg">Action Required</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pending.map((student) => {
                const isMale = student.gender === 'Male';
                return (
                  <Card key={student.id} className="relative overflow-hidden bg-white border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl flex flex-col justify-between group">
                    <div>
                      {/* Top Row: Info and Status Badge */}
                      <div className="flex items-start justify-between gap-4 mb-5">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-extrabold text-base shadow-sm shrink-0 transition-transform group-hover:scale-105 ${
                            isMale 
                              ? 'bg-blue-50 text-blue-700 border-blue-100' 
                              : 'bg-pink-50 text-pink-700 border-pink-100'
                          }`}>
                            {student.firstName?.charAt(0) || ''}{student.lastName?.charAt(0) || ''}
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-slate-900 leading-tight tracking-tight">
                              {formatStudentName(student.firstName, student.lastName)}
                            </h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <Badge variant="outline" className="text-[10px] font-bold text-slate-500 bg-slate-50 border-slate-200 px-2 py-0.5 rounded-lg">
                                Grade {student.gradeLevel}
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border-opacity-40 ${
                                isMale ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                              }`}>
                                {student.gender}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px] uppercase tracking-wider py-1 px-2.5 rounded-lg shrink-0 flex items-center gap-1 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Pending
                        </Badge>
                      </div>

                      {/* Metadata Section: LRN & Medical summary */}
                      <div className="grid grid-cols-2 gap-3 mb-5 p-4 rounded-2xl bg-slate-50 border border-slate-100/80">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">LRN</span>
                          <span className="text-xs font-mono font-bold text-slate-700 tracking-tight">{student.lrn}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Physical Stats</span>
                          <span className="text-xs font-bold text-slate-700">
                            {student.medical?.height ? `${student.medical.height} cm` : '--'} / {student.medical?.weight ? `${student.medical.weight} kg` : '--'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      {/* Documents & Profile Row */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center gap-1.5"
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          <User className="w-3.5 h-3.5" /> Full Profile
                        </Button>
                        
                        {student.requirementUploads?.psaBirthCertificate?.fileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 rounded-xl h-10 text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50/50 bg-blue-50/20 flex items-center justify-center gap-1.5"
                            onClick={() => {
                              setPsaViewUrl(student.requirementUploads!.psaBirthCertificate!.fileUrl || null);
                              setPsaViewName(`${student.lastName}_${student.firstName}_PSA_Birth_Certificate`);
                            }}
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-500" /> PSA File
                          </Button>
                        )}
                      </div>

                      {/* Action Row */}
                      <Button
                        className="w-full rounded-xl h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all border-none flex items-center justify-center gap-1.5 active:scale-98"
                        onClick={() => setStudentToEnroll(student)}
                      >
                        <Check className="w-4 h-4" /> Approve & Enroll Student
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {pending.length === 0 && (
          <Card className="bg-white border-dashed border-2 border-slate-200 p-12 shadow-sm rounded-3xl text-center flex flex-col items-center justify-center max-w-2xl mx-auto mt-8 hover:border-emerald-300/80 transition-colors duration-300">
            <div className="w-20 h-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="font-extrabold text-2xl text-slate-800 mb-2">All Caught Up!</h3>
            <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
              You have no pending enrollments to review at this time. When parents submit new enrollments for your section, they will appear here.
            </p>
          </Card>
        )}

        {processed.length > 0 && (
          <div className="space-y-4 pt-8 border-t border-slate-200/60">
            <div className="flex items-center gap-2.5 pb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Recently Processed</h2>
            </div>
            <Card className="bg-white border border-slate-200/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider pl-6 py-4">Name</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">LRN</TableHead>
                      <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processed.map((student) => (
                      <TableRow key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 py-4 font-bold text-slate-800 text-sm">
                          {formatStudentName(student.firstName, student.lastName)}
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-xs font-semibold py-4">
                          {student.lrn}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className={`font-bold text-[10px] uppercase tracking-wider py-1 px-2.5 rounded-lg border border-opacity-40 flex items-center w-fit gap-1 shadow-sm ${
                              student.status === 'Enrolled'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {student.status === 'Enrolled' ? (
                              <><CheckCircle2 className="w-3.5 h-3.5" /> Enrolled</>
                            ) : (
                              <><XCircle className="w-3.5 h-3.5" /> Rejected</>
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>

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

      <FullStudentProfileModal
        student={students.find(s => s.id === selectedStudentId) || null}
        isOpen={!!selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        allowEditHealth={false}
      />

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
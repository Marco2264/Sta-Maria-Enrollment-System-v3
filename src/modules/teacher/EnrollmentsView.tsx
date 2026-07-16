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
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const pending = filteredStudents.filter((s) => s.status === 'Pending');
  const processed = filteredStudents.filter((s) => s.status === 'Enrolled' || s.status === 'Rejected');

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <ClipboardCheck className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Review Enrollments</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Review and approve pending student enrollments for your assigned section.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search student or LRN..." 
                className="pl-9 bg-white border-slate-200 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="bg-card p-3 rounded-2xl shadow-sm border border-border w-full sm:w-auto">
              <div className="flex items-center justify-center px-4 space-x-2 text-sm font-semibold">
                {pending.length > 0 ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="text-amber-600 shrink-0">{pending.length} Pending</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-emerald-600 shrink-0">Caught Up</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {pending.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Pending Enrollments</h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {pending.map((student) => (
                <Card key={student.id} className="relative overflow-hidden bg-white border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all rounded-2xl flex flex-col justify-between">
                  {/* Accent Top Ribbon */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-400" />
                  
                  <div>
                    {/* Top Row: Info and Status Badge */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg border border-amber-100/50 shadow-sm shrink-0">
                          {student.firstName?.charAt(0) || ''}{student.lastName?.charAt(0) || ''}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-slate-800 leading-tight">
                            {student.lastName}, {student.firstName}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                              Grade {student.gradeLevel}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                              {student.gender}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-50/50 text-amber-700 border-amber-200/60 font-semibold text-xs py-0.5 shrink-0">
                        <CircleDashed className="w-3 h-3 mr-1 animate-spin-slow" /> Pending
                      </Badge>
                    </div>

                    {/* Metadata Section: LRN & Medical summary */}
                    <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-xl bg-slate-50/60 border border-slate-100/50">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">LRN</span>
                        <span className="text-xs font-mono font-bold text-slate-700">{student.lrn}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Physical Stats</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {student.medical?.height || '--'} cm / {student.medical?.weight || '--'} kg
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100/80">
                    {/* Documents & Profile Row */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 rounded-xl h-10 text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-600"
                        onClick={() => setSelectedStudentId(student.id)}
                      >
                        <User className="w-3.5 h-3.5 mr-1.5" /> Full Profile
                      </Button>
                      
                      {student.requirementUploads?.psaBirthCertificate?.fileUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl h-10 text-xs font-bold border-blue-100 text-blue-600 hover:bg-blue-50 bg-blue-50/20"
                          onClick={() => {
                            setPsaViewUrl(student.requirementUploads!.psaBirthCertificate!.fileUrl);
                            setPsaViewName(`${student.lastName}_${student.firstName}_PSA_Birth_Certificate`);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> PSA File
                        </Button>
                      )}
                    </div>

                    {/* Action Row */}
                    <Button
                      className="w-full rounded-xl h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow-md transition-all border-none"
                      onClick={() => setStudentToEnroll(student)}
                    >
                      <Check className="w-4 h-4 mr-1.5" /> Approve & Enroll Student
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {pending.length === 0 && (
          <Card className="bg-white border-dashed border-2 border-emerald-200 p-12 shadow-sm rounded-3xl text-center flex flex-col items-center justify-center max-w-2xl mx-auto mt-8">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="font-bold text-2xl text-slate-800 mb-2">All Caught Up!</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              You have no pending enrollments to review at this time. When parents submit new enrollments for your section, they will appear here.
            </p>
          </Card>
        )}

        {processed.length > 0 && (
          <div className="space-y-4 pt-8 border-t border-slate-200/60">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recently Processed</h2>
            <Card className="bg-white border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-border">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="font-bold text-slate-700 pl-6">Name</TableHead>
                      <TableHead className="font-bold text-slate-700">LRN</TableHead>
                      <TableHead className="font-bold text-slate-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processed.map((student) => (
                      <TableRow key={student.id} className="border-b border-border/40 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 font-semibold text-slate-800">
                          {student.lastName}, {student.firstName}
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-sm font-medium">
                          {student.lrn}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`font-medium border-0 ${
                              student.status === 'Enrolled'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {student.status === 'Enrolled' ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1.5" /> Enrolled</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1.5" /> Rejected</>
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
        <DialogContent className="sm:max-w-[450px] p-6 rounded-2xl border-none shadow-2xl bg-white animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
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
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100/80 space-y-3.5">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Student Name</span>
                  <span className="text-sm font-bold text-slate-800">
                    {studentToEnroll.lastName}, {studentToEnroll.firstName} {studentToEnroll.middleName || ''}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">LRN</span>
                    <span className="text-sm font-mono font-medium text-slate-700">{studentToEnroll.lrn}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Gender</span>
                    <span className="text-sm font-medium text-slate-700">{studentToEnroll.gender}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Target Section & Grade</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 font-semibold px-2 py-0.5 rounded-md">
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
              className="w-full sm:w-1/2 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50"
              onClick={() => setStudentToEnroll(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-1/2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
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
        <DialogContent className="sm:max-w-4xl w-[95vw] h-[85vh] p-0 rounded-2xl border-none shadow-2xl bg-white flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between gap-4 bg-slate-50/50 shrink-0">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                PSA Birth Certificate
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Previewing: {psaViewName || 'Birth Certificate'}
              </p>
            </div>
            <div className="flex items-center gap-2 pr-8">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl h-9 text-xs font-semibold bg-white border-slate-200 text-slate-600 shadow-sm"
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
                className="rounded-xl h-9 text-xs font-semibold bg-white border-slate-200 text-slate-600 shadow-sm"
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
            <Button onClick={() => setPsaViewUrl(null)} className="rounded-xl px-5 h-10">
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React from 'react';
import { Button } from '../../components/ui/Button';
import { X, Printer } from 'lucide-react';

interface StudentIdCardData {
  id: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gradeLevel: string;
  section?: string;
  gender?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  guardianName?: string;
  schoolYear: string;
}

interface StudentIdCardsProps {
  data: StudentIdCardData[];
  schoolName: string;
  onClose: () => void;
}

function IdCard({ student, schoolName }: { student: StudentIdCardData; schoolName: string }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden border-2 border-blue-700 shadow-xl"
      style={{ width: '3.375in', height: '2.125in', pageBreakInside: 'avoid' }}
    >
      {/* Header */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-center gap-1 px-2 py-1.5 text-white"
        style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', height: '38px' }}
      >
        {/* DepEd seal placeholder */}
        <div className="w-7 h-7 rounded-full bg-white/20 shrink-0 flex items-center justify-center text-[6px] font-bold text-white border border-white/40">
          DepEd
        </div>
        <div className="text-center leading-tight">
          <p className="text-[7px] font-semibold tracking-wide uppercase opacity-90">Department of Education</p>
          <p className="text-[8px] font-extrabold tracking-wide uppercase">{schoolName}</p>
        </div>
      </div>

      {/* Body */}
      <div className="absolute inset-0 flex" style={{ top: '38px', bottom: '28px' }}>
        {/* Left: photo placeholder */}
        <div className="flex flex-col items-center justify-center w-[0.85in] bg-slate-50 border-r border-slate-200 py-1 px-1.5 gap-1 shrink-0">
          <div
            className="rounded border border-slate-300 bg-slate-200 flex items-center justify-center text-slate-400"
            style={{ width: '0.72in', height: '0.72in', fontSize: '9px', textAlign: 'center', lineHeight: 1.1 }}
          >
            2x2<br/>Photo
          </div>
          <p className="text-[6px] text-slate-500 text-center font-medium leading-tight">SY: {student.schoolYear}</p>
        </div>

        {/* Right: info */}
        <div className="flex-1 flex flex-col justify-center px-2.5 gap-0.5 bg-white">
          <p className="text-[11px] font-extrabold text-slate-900 leading-tight truncate">
            {student.lastName}, {student.firstName} {student.middleName ? student.middleName[0] + '.' : ''}
          </p>
          <p className="text-[8px] text-slate-500 font-medium">Grade {student.gradeLevel}{student.section ? ` — ${student.section}` : ''}</p>

          <div className="border-t border-dashed border-slate-200 my-1" />

          <div className="space-y-0.5">
            <div className="flex gap-1">
              <span className="text-[7px] text-slate-400 w-8 shrink-0 font-semibold">LRN:</span>
              <span className="text-[7px] text-slate-700 font-mono font-semibold">{student.lrn || '—'}</span>
            </div>
            {student.guardianName && (
              <div className="flex gap-1">
                <span className="text-[7px] text-slate-400 w-8 shrink-0 font-semibold">Parent:</span>
                <span className="text-[7px] text-slate-700 truncate">{student.guardianName}</span>
              </div>
            )}
            {student.emergencyContact && (
              <div className="flex gap-1">
                <span className="text-[7px] text-slate-400 w-8 shrink-0 font-semibold">Contact:</span>
                <span className="text-[7px] text-slate-700">{student.emergencyContact}</span>
              </div>
            )}
            {student.emergencyPhone && (
              <div className="flex gap-1">
                <span className="text-[7px] text-slate-400 w-8 shrink-0 font-semibold">Phone:</span>
                <span className="text-[7px] text-slate-700">{student.emergencyPhone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-center text-[7px] text-white font-semibold tracking-widest uppercase px-2"
        style={{ background: '#1e3a5f', height: '28px' }}
      >
        ✦ School ID Card — Not Transferable ✦
      </div>
    </div>
  );
}

export function StudentIdCardDocument({ data, schoolName, onClose }: StudentIdCardsProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 bg-slate-800 text-white print:hidden">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-lg">Student ID Cards ({data.length} cards)</h2>
          <span className="text-slate-400 text-sm">Ready to print</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="text-white border-white/30 hover:bg-white/10"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print All
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Print area */}
      <div className="flex-1 overflow-y-auto bg-slate-100 p-8 print:p-0 print:bg-white print:overflow-visible">
        <div
          className="mx-auto grid gap-4 justify-center print:gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fill, 3.375in)' }}
        >
          {data.map((student) => (
            <IdCard key={student.id} student={student} schoolName={schoolName} />
          ))}
          {data.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-400">
              <p className="text-lg font-semibold">No students found</p>
              <p className="text-sm mt-1">Enroll students to generate ID cards.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body * { visibility: hidden; }
          .print\\:p-0 * { visibility: visible; }
          .print\\:p-0 { position: absolute; top: 0; left: 0; width: 100%; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

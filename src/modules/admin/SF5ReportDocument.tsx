import React, { useState, useEffect, useMemo } from 'react';
import { ReportLayout } from './reports/ReportLayout';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface SF5ReportDocumentProps {
  onClose: () => void;
  data: {
    schoolYear: string;
    gradeLevel: string;
    section: string;
    students: any[];
    adviserName?: string;
  };
}

export function SF5ReportDocument({ onClose, data }: SF5ReportDocumentProps) {
  const { schoolYear, gradeLevel, section, students, adviserName = 'Assigned Adviser' } = data;
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Normalize gradeLevel for subject matching (e.g. "Grade 6" -> "6")
  const normalizedGradeLevel = useMemo(() => {
    return (gradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
  }, [gradeLevel]);

  // Fetch subjects for this grade level from Firestore
  useEffect(() => {
    let active = true;
    const fetchSubjects = async () => {
      try {
        const snap = await getDocs(collection(db, 'subjects'));
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(sub => {
            const subGrade = (sub.gradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
            return subGrade === normalizedGradeLevel;
          });
        if (active) {
          setSubjects(list);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching subjects for SF5:', err);
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchSubjects();
    return () => {
      active = false;
    };
  }, [normalizedGradeLevel]);

  // Filter out MAPEH sub-components from main subjects list to prevent double weighting
  const mainSubjects = useMemo(() => {
    return subjects.filter(sub => {
      const name = (sub.name || '').toLowerCase();
      return !['music', 'arts', 'art', 'pe', 'health', 'physical education'].includes(name);
    });
  }, [subjects]);

  const getSubjectFinalRating = (student: any, sub: any) => {
    const name = (sub.name || '').toLowerCase();
    const gradeKey = gradeLevel.toLowerCase().startsWith('grade')
      ? (gradeLevel.charAt(0).toUpperCase() + gradeLevel.slice(1))
      : `Grade ${gradeLevel}`;

    // If MAPEH, average its components
    if (name.includes('mapeh')) {
      const components = subjects.filter(s => {
        const n = (s.name || '').toLowerCase();
        return ['music', 'arts', 'art', 'pe', 'health', 'physical education'].includes(n);
      });

      const termAverages = ['q1', 'q2', 'q3'].map(q => {
        const compGrades: number[] = [];
        components.forEach(comp => {
          const code = comp.code ?? comp.name;
          const gradeData = student.grades?.[gradeKey]?.[code] || {};
          const qGrade = parseFloat(gradeData[q]);
          if (!isNaN(qGrade)) {
            compGrades.push(qGrade);
          }
        });
        if (compGrades.length === 0) return null;
        return Math.round(compGrades.reduce((a, b) => a + b, 0) / compGrades.length);
      });

      const activeTerms = termAverages.filter(v => v !== null) as number[];
      if (activeTerms.length === 0) return null;
      return Math.round(activeTerms.reduce((a, b) => a + b, 0) / activeTerms.length);
    }

    // Standard subject rating
    const code = sub.code ?? sub.name;
    const gradeData = student.grades?.[gradeKey]?.[code] || {};
    const termGrades: number[] = [];
    ['q1', 'q2', 'q3'].forEach(q => {
      const qGrade = parseFloat(gradeData[q]);
      if (!isNaN(qGrade)) {
        termGrades.push(qGrade);
      }
    });

    if (termGrades.length === 0) return null;
    return Math.round(termGrades.reduce((a, b) => a + b, 0) / termGrades.length);
  };

  // Sort and filter students (Males first, then Females)
  const processedStudents = useMemo(() => {
    const processList = (list: any[]) => {
      return list.map(student => {
        const finalRatings: number[] = [];
        const failedSubjects: string[] = [];

        mainSubjects.forEach(sub => {
          const finalSubRating = getSubjectFinalRating(student, sub);
          if (finalSubRating !== null) {
            finalRatings.push(finalSubRating);
            if (finalSubRating < 75) {
              failedSubjects.push(sub.name || sub.code);
            }
          }
        });

        let generalAvg: number | null = null;
        let generalAvgStr = '';
        let isHonor = false;
        let letterCode = '';

        if (finalRatings.length > 0) {
          generalAvg = finalRatings.reduce((sum, r) => sum + r, 0) / finalRatings.length;
          isHonor = generalAvg >= 90;
          if (isHonor) {
            generalAvgStr = generalAvg.toFixed(3);
            letterCode = 'A';
          } else {
            generalAvgStr = Math.round(generalAvg).toString();
            const rounded = Math.round(generalAvg);
            if (rounded >= 85) letterCode = 'P';
            else if (rounded >= 80) letterCode = 'AP';
            else if (rounded >= 75) letterCode = 'D';
            else letterCode = 'B';
          }
        }

        // If learner has deficits, leave General Average empty
        const finalGaStr = failedSubjects.length > 0
          ? ''
          : (generalAvgStr ? `${generalAvgStr} (${letterCode})` : '--');

        let action = 'PROMOTED';
        if (finalRatings.length === 0) {
          action = '--';
        } else if (failedSubjects.length === 0) {
          action = 'PROMOTED';
        } else if (failedSubjects.length === 1 || failedSubjects.length === 2) {
          action = 'IRREGULAR';
        } else {
          action = 'RETAINED';
        }

        return {
          ...student,
          fullName: `${student.lastName}, ${student.firstName} ${student.middleName || ''}`.trim().toUpperCase(),
          generalAvg,
          generalAvgStr: finalGaStr,
          action,
          failedSubjects
        };
      });
    };

    const enrolledMales = students.filter(s => ['Enrolled', 'enrolled'].includes(s.status) && s.gender?.toLowerCase() === 'male');
    const enrolledFemales = students.filter(s => ['Enrolled', 'enrolled'].includes(s.status) && s.gender?.toLowerCase() === 'female');

    const sortedMales = processList(enrolledMales).sort((a, b) => a.fullName.localeCompare(b.fullName));
    const sortedFemales = processList(enrolledFemales).sort((a, b) => a.fullName.localeCompare(b.fullName));

    return { males: sortedMales, females: sortedFemales };
  }, [students, mainSubjects]);

  // Tallies for summaries
  const summaries = useMemo(() => {
    let promotedM = 0, promotedF = 0;
    let condM = 0, condF = 0;
    let retainedM = 0, retainedF = 0;

    let dnM = 0, dnF = 0;
    let fsM = 0, fsF = 0;
    let satM = 0, satF = 0;
    let vsM = 0, vsF = 0;
    let outM = 0, outF = 0;

    const tally = (s: any, isFemale: boolean) => {
      if (s.action === 'PROMOTED') {
        if (isFemale) promotedF++; else promotedM++;
      } else if (s.action === 'IRREGULAR') {
        if (isFemale) condF++; else condM++;
      } else if (s.action === 'RETAINED') {
        if (isFemale) retainedF++; else retainedM++;
      }

      if (s.generalAvg !== null) {
        const roundedAvg = Math.round(s.generalAvg);
        if (roundedAvg >= 90) {
          if (isFemale) outF++; else outM++;
        } else if (roundedAvg >= 85) {
          if (isFemale) vsF++; else vsM++;
        } else if (roundedAvg >= 80) {
          if (isFemale) satF++; else satM++;
        } else if (roundedAvg >= 75) {
          if (isFemale) fsF++; else fsM++;
        } else {
          if (isFemale) dnF++; else dnM++;
        }
      }
    };

    processedStudents.males.forEach(s => tally(s, false));
    processedStudents.females.forEach(s => tally(s, true));

    return {
      promotedM, promotedF,
      condM, condF,
      retainedM, retainedF,
      dnM, dnF,
      fsM, fsF,
      satM, satF,
      vsM, vsF,
      outM, outF
    };
  }, [processedStudents]);

  if (loading) {
    return (
      <ReportLayout title="School Form 5 (SF5)" onClose={onClose} landscape>
        <div className="p-8 text-center text-slate-500 font-medium">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          Loading report subjects...
        </div>
      </ReportLayout>
    );
  }

  const renderStudentRow = (s: any, index: number) => (
    <tr key={s.id || index} className="hover:bg-slate-50/50">
      <td className="border border-black p-1 text-[11px] font-bold text-center align-middle font-mono">{s.lrn}</td>
      <td className="border border-black p-1 text-left pl-3 text-[11px] font-medium">{s.fullName}</td>
      <td className="border border-black p-1 text-center font-semibold text-[11px] font-mono">{s.generalAvgStr || '--'}</td>
      <td className="border border-black p-1 text-center text-[10px] font-bold uppercase tracking-wider">
        <span className={s.action === 'PROMOTED' ? 'text-emerald-700' : s.action === 'RETAINED' ? 'text-red-600' : 'text-amber-700'}>
          {s.action}
        </span>
      </td>
      <td className="border border-black p-1 text-center text-[10px] text-slate-500 max-w-[200px] truncate leading-tight">
        {s.failedSubjects && s.failedSubjects.length > 0 ? s.failedSubjects.join(', ') : ''}
      </td>
    </tr>
  );

  return (
    <ReportLayout title="School Form 5 (SF5) - Promotion Report" onClose={onClose} landscape>
      {/* DepEd Header */}
      <div className="flex items-center justify-between mb-2">
        <img src="/kagawaran_ng_edukasyon.png" alt="Kagawaran ng Edukasyon Logo" className="w-20 h-20 object-contain" />
        <div className="text-center flex-1 text-blue-700">
          <h2 className="font-bold text-xl uppercase tracking-wider">School Form 5 (SF5) Report on Promotion</h2>
          <p className="text-xs italic text-slate-500">
            (This replaces Form 18-E1, Form 18-E2, Form 18A and List of Graduates)
          </p>
        </div>
        <div className="w-40 text-right">
          <div className="text-4xl font-black text-blue-800 tracking-tighter flex items-center justify-end">
            Dep<span className="text-red-600 ml-1">ED</span>
          </div>
          <div className="text-[9px] tracking-widest font-semibold text-slate-500 mt-1">
            DEPARTMENT OF EDUCATION
          </div>
        </div>
      </div>

      {/* Info Header */}
      <div className="border-t-2 border-b-2 border-blue-400 py-3 mb-4 text-xs">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <p><span className="font-bold text-slate-500">Region:</span> <span className="font-semibold text-slate-800">REGION IX</span></p>
            <p><span className="font-bold text-slate-500">School ID:</span> <span className="font-semibold text-slate-800">199006</span></p>
          </div>
          <div className="space-y-1">
            <p><span className="font-bold text-slate-500">Division:</span> <span className="font-semibold text-slate-800">ZAMBOANGA</span></p>
            <p><span className="font-bold text-slate-500">School Name:</span> <span className="font-semibold text-slate-800">STA. MARIA CS SPED CENTER</span></p>
          </div>
          <div className="space-y-1">
            <p><span className="font-bold text-slate-500">District:</span> <span className="font-semibold text-slate-800">STA. MARIA CENTRAL</span></p>
            <p><span className="font-bold text-slate-500">School Year:</span> <span className="font-semibold text-slate-800">{schoolYear}</span></p>
          </div>
          <div className="space-y-1">
            <p><span className="font-bold text-slate-500">Grade Level:</span> <span className="font-semibold text-slate-800">{gradeLevel}</span></p>
            <p><span className="font-bold text-slate-500">Section:</span> <span className="font-semibold text-slate-800">{section}</span></p>
          </div>
        </div>
      </div>

      {/* Main Promotion Table */}
      <div className="overflow-x-auto print:overflow-visible mb-6">
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-slate-100/80 text-center font-bold text-slate-700">
              <th className="border border-black p-1.5 align-middle w-[15%]">LRN</th>
              <th className="border border-black p-1.5 align-middle w-[35%]">LEARNER'S NAME (Last Name, First Name, Middle Name)</th>
              <th className="border border-black p-1.5 align-middle w-[10%]">GENERAL AVERAGE</th>
              <th className="border border-black p-1.5 align-middle w-[15%]">ACTION TAKEN<br /><span className="text-[8px] font-normal">(Promoted, Conditional, Retained)</span></th>
              <th className="border border-black p-1.5 align-middle w-[25%]">DID NOT MEET EXPECTATIONS OF THE FF. LEARNING AREA/S<br /><span className="text-[7.5px] font-normal">(as of the end of current School Year)</span></th>
            </tr>
          </thead>
          <tbody>
            {/* Male Header */}
            <tr className="bg-slate-50 font-black text-slate-800 uppercase tracking-wider text-[9px] border-t-2 border-black">
              <td className="border border-black p-1 text-center font-mono">—</td>
              <td className="border border-black p-1 pl-3" colSpan={4}>MALE</td>
            </tr>
            {processedStudents.males.length > 0 ? (
              processedStudents.males.map((s, i) => renderStudentRow(s, i))
            ) : (
              <tr>
                <td className="border border-black p-2 font-medium italic text-center text-slate-400" colSpan={5}>
                  No enrolled male learners in this section.
                </td>
              </tr>
            )}
            {/* Male count */}
            <tr className="bg-slate-50/50 font-bold border-t border-black">
              <td className="border border-black p-1 text-center font-mono">—</td>
              <td className="border border-black p-1 pl-3 uppercase">Total Male Count:</td>
              <td className="border border-black p-1 text-center font-mono">{processedStudents.males.length}</td>
              <td className="border border-black p-1" colSpan={2}></td>
            </tr>

            {/* Female Header */}
            <tr className="bg-slate-50 font-black text-slate-800 uppercase tracking-wider text-[9px] border-t-2 border-black">
              <td className="border border-black p-1 text-center font-mono">—</td>
              <td className="border border-black p-1 pl-3" colSpan={4}>FEMALE</td>
            </tr>
            {processedStudents.females.length > 0 ? (
              processedStudents.females.map((s, i) => renderStudentRow(s, i))
            ) : (
              <tr>
                <td className="border border-black p-2 font-medium italic text-center text-slate-400" colSpan={5}>
                  No enrolled female learners in this section.
                </td>
              </tr>
            )}
            {/* Female count */}
            <tr className="bg-slate-50/50 font-bold border-t border-black">
              <td className="border border-black p-1 text-center font-mono">—</td>
              <td className="border border-black p-1 pl-3 uppercase">Total Female Count:</td>
              <td className="border border-black p-1 text-center font-mono">{processedStudents.females.length}</td>
              <td className="border border-black p-1" colSpan={2}></td>
            </tr>

            {/* Combined Count Row */}
            <tr className="bg-slate-100 font-extrabold text-blue-900 border-t-2 border-black text-[11px]">
              <td className="border border-black p-1.5 text-center font-mono">—</td>
              <td className="border border-black p-1.5 pl-3 uppercase">Combined Total Learners Count:</td>
              <td className="border border-black p-1.5 text-center font-mono">{processedStudents.males.length + processedStudents.females.length}</td>
              <td className="border border-black p-1.5" colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary tables and signatures */}
      <div className="grid grid-cols-12 gap-6 text-[9px] border-t border-slate-350 pt-4 leading-normal print:break-inside-avoid">
        {/* Promotion Summary Table */}
        <div className="col-span-4 pr-2 flex flex-col justify-start">
          <h3 className="font-bold text-[10px] mb-2 uppercase text-slate-800 tracking-wider">
            SUMMARY TABLE
          </h3>
          <table className="w-full border-collapse border border-black text-center font-medium">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-700">
                <th className="border border-black p-1">STATUS</th>
                <th className="border border-black p-1">MALE</th>
                <th className="border border-black p-1">FEMALE</th>
                <th className="border border-black p-1">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black font-bold bg-slate-50 p-1 text-left px-2">PROMOTED</td>
                <td className="border border-black p-1 font-mono font-bold text-slate-800">{summaries.promotedM}</td>
                <td className="border border-black p-1 font-mono font-bold text-slate-800">{summaries.promotedF}</td>
                <td className="border border-black p-1 font-mono font-extrabold bg-slate-50/50 text-indigo-900">{summaries.promotedM + summaries.promotedF}</td>
              </tr>
              <tr>
                <td className="border border-black font-bold bg-slate-50 p-1 text-left px-2 text-[8px]">IRREGULAR</td>
                <td className="border border-black p-1 font-mono font-bold text-slate-850">{summaries.condM}</td>
                <td className="border border-black p-1 font-mono font-bold text-slate-850">{summaries.condF}</td>
                <td className="border border-black p-1 font-mono font-extrabold bg-slate-50/50 text-indigo-900">{summaries.condM + summaries.condF}</td>
              </tr>
              <tr>
                <td className="border border-black font-bold bg-slate-50 p-1 text-left px-2">RETAINED</td>
                <td className="border border-black p-1 font-mono font-bold text-slate-850">{summaries.retainedM}</td>
                <td className="border border-black p-1 font-mono font-bold text-slate-850">{summaries.retainedF}</td>
                <td className="border border-black p-1 font-mono font-extrabold bg-slate-50/50 text-indigo-900">{summaries.retainedM + summaries.retainedF}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Proficiency Scale Distribution */}
        <div className="col-span-5 pr-2 flex flex-col justify-start">
          <h3 className="font-bold text-[10px] mb-2 uppercase text-slate-800 tracking-wider">
            LEARNING PROGRESS &amp; ACHIEVEMENT (General Average)
          </h3>
          <table className="w-full border-collapse border border-black text-center font-medium">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-700">
                <th className="border border-black p-1">DESCRIPTOR (Scale)</th>
                <th className="border border-black p-1">MALE</th>
                <th className="border border-black p-1">FEMALE</th>
                <th className="border border-black p-1">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black font-bold bg-slate-50 p-1 text-left px-2">ADVANCED (A: 90% and above)</td>
                <td className="border border-black p-1 font-mono">{summaries.outM}</td>
                <td className="border border-black p-1 font-mono">{summaries.outF}</td>
                <td className="border border-black p-1 font-mono font-bold bg-slate-50/50">{summaries.outM + summaries.outF}</td>
              </tr>
              <tr>
                <td className="border border-black font-bold bg-slate-50 p-1 text-left px-2">PROFICIENT (P: 85% - 89%)</td>
                <td className="border border-black p-1 font-mono">{summaries.vsM}</td>
                <td className="border border-black p-1 font-mono">{summaries.vsF}</td>
                <td className="border border-black p-1 font-mono font-bold bg-slate-50/50">{summaries.vsM + summaries.vsF}</td>
              </tr>
              <tr>
                <td className="border border-black font-bold bg-slate-50 p-1 text-left px-2">APPROACHING PROFICIENCY (AP: 80% - 84%)</td>
                <td className="border border-black p-1 font-mono">{summaries.satM}</td>
                <td className="border border-black p-1 font-mono">{summaries.satF}</td>
                <td className="border border-black p-1 font-mono font-bold bg-slate-50/50">{summaries.satM + summaries.satF}</td>
              </tr>
              <tr>
                <td className="border border-black font-bold bg-slate-50 p-1 text-left px-2">DEVELOPING (D: 75% - 79%)</td>
                <td className="border border-black p-1 font-mono">{summaries.fsM}</td>
                <td className="border border-black p-1 font-mono">{summaries.fsF}</td>
                <td className="border border-black p-1 font-mono font-bold bg-slate-50/50">{summaries.fsM + summaries.fsF}</td>
              </tr>
              <tr>
                <td className="border border-black font-bold bg-slate-50 p-1 text-left px-2">BEGINNING (B: 74% and below)</td>
                <td className="border border-black p-1 font-mono">{summaries.dnM}</td>
                <td className="border border-black p-1 font-mono">{summaries.dnF}</td>
                <td className="border border-black p-1 font-mono font-bold bg-slate-50/50">{summaries.dnM + summaries.dnF}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures Section */}
        <div className="col-span-3 pl-2 flex flex-col justify-between space-y-6">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-500 text-[8px] mb-1.5 uppercase">Prepared by:</span>
            <div className="border-b border-black text-center pb-0.5 font-bold uppercase tracking-wide text-[10px] leading-none min-h-[14px]">
              {adviserName}
            </div>
            <div className="text-[7px] text-slate-400 text-center mt-1 uppercase font-semibold">
              Class Adviser
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-semibold text-slate-500 text-[8px] mb-1.5 uppercase">Certified Correct &amp; Submitted:</span>
            <div className="border-b border-black text-center pb-0.5 font-bold uppercase tracking-wide text-[10px] leading-none min-h-[14px]">
              MRS. LEPIDAPTERA VILLANUEVA
            </div>
            <div className="text-[7px] text-slate-400 text-center mt-1 uppercase font-semibold">
              Principal I
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-semibold text-slate-500 text-[8px] mb-1.5 uppercase">Reviewed By:</span>
            <div className="border-b border-black text-center pb-0.5 font-bold uppercase tracking-wide text-[10px] leading-none min-h-[14px]">
              &nbsp;
            </div>
            <div className="text-[7px] text-slate-400 text-center mt-1 uppercase font-semibold">
              Division Representative
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-[9px] text-slate-400 text-center print:block hidden">
        Generated on: {new Date().toLocaleString()}<br />
        Computer-generated School Form 5 Report
      </div>
    </ReportLayout>
  );
}

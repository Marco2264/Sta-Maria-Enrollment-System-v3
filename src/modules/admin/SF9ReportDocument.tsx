import React, { useState } from 'react';
import { ReportLayout } from './reports/ReportLayout';
import { useAuth } from '../../lib/AuthContext';

interface SF9ReportDocumentProps {
  onClose: () => void;
  data: {
    schoolYear: string;
    gradeLevel: string;
    section: string;
    students: any[];
    attendance: any[];
    subjects: any[];
  };
}

export function SF9ReportDocument({ onClose, data }: SF9ReportDocumentProps) {
  const { schoolYear, gradeLevel, section, students, attendance, subjects } = data;
  const { userData } = useAuth();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students[0]?.id || ''
  );

  const student = students.find((s) => s.id === selectedStudentId);

  if (!student) {
    return (
      <ReportLayout title="School Form 9 (SF9)" onClose={onClose} landscape={false}>
        <div className="p-8 text-center text-slate-500 font-medium">
          No enrolled students found in this section.
        </div>
      </ReportLayout>
    );
  }

  // --- ATTENDANCE SUMMARY DATA ---
  const getAttendanceSummary = (studentId: string) => {
    const studentAtt = attendance.filter((a) => a.studentId === studentId);
    const monthsDef = [
      { name: 'June', index: 5 },
      { name: 'July', index: 6 },
      { name: 'August', index: 7 },
      { name: 'September', index: 8 },
      { name: 'October', index: 9 },
      { name: 'November', index: 10 },
      { name: 'December', index: 11 },
      { name: 'January', index: 0 },
      { name: 'February', index: 1 },
      { name: 'March', index: 2 },
      { name: 'April', index: 3 }
    ];

    const presentDays: Record<number, number> = {};
    const absentDays: Record<number, number> = {};
    const sectionDatesPerMonth: Record<number, Set<string>> = {};

    attendance.forEach((a) => {
      const d = new Date(a.date);
      if (isNaN(d.getTime())) return;
      const m = d.getMonth();
      const dStr = a.date.split('T')[0];
      if (!sectionDatesPerMonth[m]) {
        sectionDatesPerMonth[m] = new Set();
      }
      sectionDatesPerMonth[m].add(dStr);
    });

    studentAtt.forEach((a) => {
      const d = new Date(a.date);
      if (isNaN(d.getTime())) return;
      const m = d.getMonth();

      const amPres = a.amStatus === 'Present' || a.amStatus === 'Late';
      const pmPres = a.pmStatus === 'Present' || a.pmStatus === 'Late';

      let presentWeight = 0;
      let absentWeight = 0;

      if (a.status) {
        const s = a.status.toLowerCase();
        if (s === 'present' || s === 'late') presentWeight = 1;
        else if (s === 'absent') absentWeight = 1;
      } else {
        if (amPres && pmPres) presentWeight = 1;
        else if (!amPres && !pmPres) absentWeight = 1;
        else {
          presentWeight = 0.5;
          absentWeight = 0.5;
        }
      }

      if (presentWeight > 0) {
        presentDays[m] = (presentDays[m] || 0) + presentWeight;
      }
      if (absentWeight > 0) {
        absentDays[m] = (absentDays[m] || 0) + absentWeight;
      }
    });

    let totalSchool = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    const columns = monthsDef.map((m) => {
      const school = sectionDatesPerMonth[m.index] ? sectionDatesPerMonth[m.index].size : 0;
      const present = presentDays[m.index] || 0;
      const absent = absentDays[m.index] || 0;

      totalSchool += school;
      totalPresent += present;
      totalAbsent += absent;

      return {
        name: m.name.substring(0, 3).toUpperCase(),
        school,
        present,
        absent
      };
    });

    return {
      columns,
      totalSchool,
      totalPresent,
      totalAbsent
    };
  };

  const attSummary = getAttendanceSummary(student.id);

  // --- SUBJECT GRADES DATA ---
  const getSubjectGradesList = (stud: any) => {
    const activeRows: Array<{
      name: string;
      code: string;
      q1: number | string;
      q2: number | string;
      q3: number | string;
      final: number | string;
      remarks: string;
      isComponent?: boolean;
    }> = [];

    const gradeKey = stud.gradeLevel ? `Grade ${stud.gradeLevel}` : 'Grade 6';
    const studentGrades = stud.grades?.[gradeKey] || {};

    const buildSubjectsOrdered = () => {
      const ordered: Array<{ name: string; code: string; label: string; isComponent?: boolean }> = [];
      const gradeLevelClean = (stud.gradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
      const dbSubjects = (subjects || []).filter((sub) => {
        const sGrade = (sub.gradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
        return sGrade === gradeLevelClean;
      });

      if (dbSubjects.length === 0) {
        return [
          { name: 'Filipino', code: 'FILIPINO', label: 'Filipino' },
          { name: 'English', code: 'ENGLISH', label: 'English' },
          { name: 'Mathematics', code: 'MATH', label: 'Mathematics' },
          { name: 'Science', code: 'SCIENCE', label: 'Science' },
          { name: 'Araling Panlipunan', code: 'AP', label: 'Araling Panlipunan (AP)' },
          { name: 'Edukasyon sa Pagpapakatao', code: 'ESP', label: 'Edukasyon sa Pagpapakatao (EsP)' },
          { name: 'TLE', code: 'TLE', label: 'Technology and Livelihood Education (TLE)' },
          { name: 'MAPEH', code: 'MAPEH', label: 'MAPEH' },
          { name: 'Music', code: 'MUSIC', label: 'Music', isComponent: true },
          { name: 'Arts', code: 'ARTS', label: 'Arts', isComponent: true },
          { name: 'Physical Education', code: 'PE', label: 'Physical Education (PE)', isComponent: true },
          { name: 'Health', code: 'HEALTH', label: 'Health', isComponent: true }
        ];
      }

      dbSubjects.forEach((sub) => {
        const name = sub.name || '';
        const lowerName = name.toLowerCase();

        if (lowerName.includes('music') || lowerName.includes('arts') || lowerName === 'pe' || lowerName.includes('physical education') || lowerName === 'health') {
          return;
        }

        if (lowerName.includes('mapeh')) {
          ordered.push({ name: 'MAPEH', code: 'MAPEH', label: 'MAPEH' });
          ordered.push({ name: 'Music', code: 'MUSIC', label: 'Music', isComponent: true });
          ordered.push({ name: 'Arts', code: 'ARTS', label: 'Arts', isComponent: true });
          ordered.push({ name: 'Physical Education', code: 'PE', label: 'Physical Education (PE)', isComponent: true });
          ordered.push({ name: 'Health', code: 'HEALTH', label: 'Health', isComponent: true });
        } else if (lowerName.includes('filipino')) {
          ordered.push({ name: 'Filipino', code: 'FILIPINO', label: 'Filipino' });
        } else if (lowerName.includes('english')) {
          ordered.push({ name: 'English', code: 'ENGLISH', label: 'English' });
        } else if (lowerName.includes('mathematics') || lowerName === 'math') {
          ordered.push({ name: 'Mathematics', code: 'MATH', label: 'Mathematics' });
        } else if (lowerName.includes('science')) {
          ordered.push({ name: 'Science', code: 'SCIENCE', label: 'Science' });
        } else if (lowerName.includes('araling panlipunan') || lowerName === 'ap') {
          ordered.push({ name: 'Araling Panlipunan', code: 'AP', label: 'Araling Panlipunan (AP)' });
        } else if (lowerName.includes('edukasyon sa pagpapakatao') || lowerName === 'esp' || lowerName.includes('values education') || lowerName.includes('good manners') || lowerName.includes('gmrc')) {
          ordered.push({ name: 'Edukasyon sa Pagpapakatao', code: 'ESP', label: name });
        } else if (lowerName.includes('tle') || lowerName.includes('epp')) {
          ordered.push({ name: 'TLE', code: 'TLE', label: name });
        } else {
          const cleanCode = (sub.code || name).toUpperCase().replace(/\s+/g, '_');
          ordered.push({ name, code: cleanCode, label: name });
        }
      });

      return ordered;
    };

    const subjectsOrdered = buildSubjectsOrdered();

    const subjectRowMap: Record<string, string> = {
      'filipino': 'FILIPINO',
      'english': 'ENGLISH',
      'mathematics': 'MATH',
      'math': 'MATH',
      'science': 'SCIENCE',
      'araling panlipunan': 'AP',
      'ap': 'AP',
      'edukasyon sa pagpapakatao': 'ESP',
      'esp': 'ESP',
      'values education': 'ESP',
      'good manners': 'ESP',
      'gmrc': 'ESP',
      'tle': 'TLE',
      'epp': 'TLE',
      'mapeh': 'MAPEH',
      'music': 'MUSIC',
      'arts': 'ARTS',
      'physical education': 'PE',
      'pe': 'PE',
      'health': 'HEALTH',
      'language': 'LANGUAGE',
      'reading and literacy': 'READING_AND_LITERACY',
      'makabansa': 'MAKABANSA'
    };

    const mappedDbGrades: Record<string, { q1: number | null; q2: number | null; q3: number | null }> = {};
    subjects.forEach((sub) => {
      const code = sub.code ?? sub.name;
      const subNameLower = (sub.name || '').toLowerCase().trim();
      const standardCode = subjectRowMap[subNameLower] || subjectRowMap[code.toLowerCase().trim()] || (code.toUpperCase().replace(/\s+/g, '_'));
      if (standardCode) {
        const gradeData = studentGrades[code] || {};
        mappedDbGrades[standardCode] = {
          q1: typeof gradeData.q1 !== 'undefined' && gradeData.q1 !== null ? parseFloat(gradeData.q1) : null,
          q2: typeof gradeData.q2 !== 'undefined' && gradeData.q2 !== null ? parseFloat(gradeData.q2) : null,
          q3: typeof gradeData.q3 !== 'undefined' && gradeData.q3 !== null ? parseFloat(gradeData.q3) : null
        };
      }
    });

    // Auto-average components for MAPEH
    if (!mappedDbGrades['MAPEH']) {
      const components = ['MUSIC', 'ARTS', 'PE', 'HEALTH'];
      const q1s: number[] = [];
      const q2s: number[] = [];
      const q3s: number[] = [];
      components.forEach((c) => {
        const gd = mappedDbGrades[c];
        if (gd) {
          if (gd.q1 !== null) q1s.push(gd.q1);
          if (gd.q2 !== null) q2s.push(gd.q2);
          if (gd.q3 !== null) q3s.push(gd.q3);
        }
      });
      if (q1s.length > 0 || q2s.length > 0 || q3s.length > 0) {
        mappedDbGrades['MAPEH'] = {
          q1: q1s.length > 0 ? Math.round(q1s.reduce((a, b) => a + b, 0) / q1s.length) : null,
          q2: q2s.length > 0 ? Math.round(q2s.reduce((a, b) => a + b, 0) / q2s.length) : null,
          q3: q3s.length > 0 ? Math.round(q3s.reduce((a, b) => a + b, 0) / q3s.length) : null
        };
      }
    }

    subjectsOrdered.forEach((item) => {
      const gd = mappedDbGrades[item.code];
      
      const q1 = gd && gd.q1 !== null && typeof gd.q1 !== 'undefined' ? gd.q1 : '';
      const q2 = gd && gd.q2 !== null && typeof gd.q2 !== 'undefined' ? gd.q2 : '';
      const q3 = gd && gd.q3 !== null && typeof gd.q3 !== 'undefined' ? gd.q3 : '';

      const active = [q1, q2, q3].filter((g) => g !== '') as number[];
      const final = active.length > 0 ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : '';
      const remarks = final !== '' ? (final >= 75 ? 'PASSED' : 'FAILED') : '';

      activeRows.push({
        name: item.label,
        code: item.code,
        q1,
        q2,
        q3,
        final,
        remarks,
        isComponent: item.isComponent
      });
    });

    return activeRows;
  };

  const gradesList = getSubjectGradesList(student);

  const getGeneralAverageVal = () => {
    const mainAreas = gradesList.filter((g) => !g.isComponent && typeof g.final === 'number');
    if (mainAreas.length === 0) return '';
    const sum = mainAreas.reduce((a, b) => a + (b.final as number), 0);
    return Math.round(sum / mainAreas.length);
  };

  const generalAverage = getGeneralAverageVal();

  // Compute student age
  let studentAge: number | string = '';
  if (student.birthDate) {
    const birth = new Date(student.birthDate);
    if (!isNaN(birth.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      studentAge = age;
    }
  }

  // Adviser / Teacher Name
  const uData = userData as Record<string, string> | null;
  const adviserName = uData ? `${uData.firstName} ${uData.lastName}` : 'Assigned Adviser';

  const fullName = `${student.lastName}, ${student.firstName} ${student.middleName || ''}`.trim();

  const getObsValue = (stmtText: string, quarter: 'q1' | 'q2' | 'q3') => {
    const keyMap: Record<string, string> = {
      "expresses one's spiritual beliefs while respecting the spiritual beliefs of others.": "makaDiyos1",
      "shows adherence to ethical principles by upholding truth.": "makaDiyos2",
      "is sensitive to individual, social, and cultural differences.": "makatao1",
      "demonstrates contributions towards solidarity.": "makatao2",
      "cares for the environment and utilizes resources wisely and economically.": "makakalikasan1",
      "demonstrates pride in being a filipino; exercises rights and duties.": "makabansa1",
      "demonstrates appropriate behavior in carrying out school/community duties.": "makabansa2"
    };
    const cleanStmt = stmtText.toLowerCase().replace(/['’]/g, "'").trim();
    const statementKey = keyMap[cleanStmt];
    if (!statementKey) return '--';

    const gradeKey = student.gradeLevel ? (student.gradeLevel.startsWith('Grade') ? student.gradeLevel : `Grade ${student.gradeLevel}`) : 'Grade 6';
    const val = (student as any).observedValues?.[gradeKey]?.[statementKey]?.[quarter];
    return val || '--';
  };

  // Behavior criteria values list
  const coreValues = [
    {
      core: '1. Maka-Diyos',
      statements: [
        'Expresses one’s spiritual beliefs while respecting the spiritual beliefs of others.',
        'Shows adherence to ethical principles by upholding truth.'
      ]
    },
    {
      core: '2. Makatao',
      statements: [
        'Is sensitive to individual, social, and cultural differences.',
        'Demonstrates contributions towards solidarity.'
      ]
    },
    {
      core: '3. Maka-Kalikasan',
      statements: [
        'Cares for the environment and utilizes resources wisely and economically.'
      ]
    },
    {
      core: '4. Makabansa',
      statements: [
        'Demonstrates pride in being a Filipino; exercises rights and duties.',
        'Demonstrates appropriate behavior in carrying out school/community duties.'
      ]
    }
  ];

  return (
    <ReportLayout title="School Form 9 (SF9) - Report Card" onClose={onClose} landscape={false}>
      {/* Student Selector overlay in print header */}
      <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-2xl border border-slate-200/60 mb-6 print:hidden">
        <label className="text-sm font-bold text-slate-700">Select Student:</label>
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="flex-1 max-w-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.lastName}, {s.firstName}
            </option>
          ))}
        </select>
      </div>

      <div className="w-[1000px] mx-auto space-y-12 print:space-y-0 text-slate-900 leading-normal">
        
        {/* ==================== PAGE 1: FRONT ==================== */}
        <div className="report-card-page bg-white p-8 border border-slate-200/80 rounded-3xl shadow-sm flex gap-8 w-[1000px] min-h-[640px] print:w-full print:min-h-0 print:border-none print:shadow-none print:p-0 page-break">
          {/* LEFT COLUMN: Attendance Grid */}
          <div className="w-1/2 flex flex-col justify-between border-r border-dashed border-slate-300 pr-8 print:pr-4">
            <div>
              <h3 className="font-bold text-sm text-center uppercase tracking-wide border-b pb-1 border-slate-200 mb-4">
                Attendance Record
              </h3>
              <table className="w-full text-[10px] text-center border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 font-bold">
                    <th className="border border-slate-300 p-1 text-left text-[9px] w-28">Month</th>
                    {attSummary.columns.map((c) => (
                      <th key={c.name} className="border border-slate-300 p-0.5 w-7 text-[9px]">{c.name}</th>
                    ))}
                    <th className="border border-slate-300 p-1 w-9 text-[9px]">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1 text-left font-medium">No. of School Days</td>
                    {attSummary.columns.map((c, idx) => (
                      <td key={idx} className="border border-slate-300 p-0.5">{c.school}</td>
                    ))}
                    <td className="border border-slate-300 p-1 font-bold bg-slate-50/50">{attSummary.totalSchool}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1 text-left font-medium">No. of Days Present</td>
                    {attSummary.columns.map((c, idx) => (
                      <td key={idx} className="border border-slate-300 p-0.5">{c.present}</td>
                    ))}
                    <td className="border border-slate-300 p-1 font-bold bg-slate-50/50">{attSummary.totalPresent}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1 text-left font-medium">No. of Days Absent</td>
                    {attSummary.columns.map((c, idx) => (
                      <td key={idx} className="border border-slate-300 p-0.5">{c.absent}</td>
                    ))}
                    <td className="border border-slate-300 p-1 font-bold bg-slate-50/50">{attSummary.totalAbsent}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-4 text-[10px] mt-8">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30">
                <h4 className="font-bold uppercase tracking-wider mb-2 text-center text-slate-800">
                  Certificate of Transfer
                </h4>
                <p className="indent-3 mb-2 leading-relaxed">
                  Admitted to Grade: <span className="underline font-bold px-1">{gradeLevel}</span> Section: <span className="underline font-bold px-1">{section}</span>
                </p>
                <p className="indent-3 mb-4 leading-relaxed">
                  Eligible for Admission to Grade: <span className="border-b border-slate-800 w-16 inline-block"></span>
                </p>
                <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-200/60">
                  <div className="text-center w-5/12">
                    <p className="font-bold border-b border-slate-800 pb-0.5">{adviserName}</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Teacher</p>
                  </div>
                  <div className="text-center w-5/12">
                    <p className="font-bold border-b border-slate-800 pb-0.5">Dr. Lepidaptera T. Villanueva</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Principal</p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30 text-[9px] leading-relaxed">
                <h4 className="font-bold uppercase tracking-wider mb-1 text-center text-slate-800">
                  Cancellation of Eligibility to Transfer
                </h4>
                <p className="text-center">Admitted in: <span className="border-b border-slate-400 w-24 inline-block"></span> Date: <span className="border-b border-slate-400 w-24 inline-block"></span></p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DepEd School Info & Student Profile */}
          <div className="w-1/2 flex flex-col justify-between pl-8 print:pl-4">
            <div className="text-center">
              <div className="flex justify-center items-center gap-3 mb-2">
                <img src="/kagawaran_ng_edukasyon.png" alt="DepEd Seal" className="w-12 h-12 object-contain" />
                <div className="text-left">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">Republic of the Philippines</p>
                  <p className="text-[12px] font-extrabold text-blue-800 uppercase leading-tight">Department of Education</p>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-600 mt-1">REGION IX</p>
              <p className="text-[10px] font-bold text-slate-600">DIVISION OF ZAMBOANGA</p>
              <p className="text-[10px] font-bold text-slate-600">DISTRICT OF STA. MARIA CENTRAL</p>
              
              <h2 className="text-xs font-black uppercase text-slate-800 mt-4 tracking-wider leading-none">
                STA. MARIA CS SPED CENTER
              </h2>
              <p className="text-[8px] font-bold text-slate-400">School ID: 199006</p>

              <div className="border-b border-slate-200 my-4"></div>

              <h1 className="text-sm font-black text-blue-900 uppercase tracking-widest leading-none my-3">
                LEARNER'S PROGRESS REPORT CARD
              </h1>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 my-4 text-[10px] space-y-2">
              <div className="grid grid-cols-12 gap-1.5 border-b border-slate-100 pb-2">
                <span className="col-span-3 text-slate-400 font-bold uppercase tracking-wider">Name:</span>
                <span className="col-span-9 font-black text-slate-800 text-[11px]">{fullName}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
                <div className="flex gap-1.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0">LRN:</span>
                  <span className="font-extrabold text-slate-800">{student.lrn || '---'}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0">Age:</span>
                  <span className="font-extrabold text-slate-800">{studentAge}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-2">
                <div className="flex gap-1.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0">Sex:</span>
                  <span className="font-extrabold text-slate-800 uppercase">{student.gender || '---'}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0">Grade:</span>
                  <span className="font-extrabold text-slate-800">{gradeLevel}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex gap-1.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0">Section:</span>
                  <span className="font-extrabold text-slate-800">{section}</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-slate-400 font-bold uppercase tracking-wider shrink-0">S.Y.:</span>
                  <span className="font-extrabold text-slate-800">{schoolYear}</span>
                </div>
              </div>
            </div>

            <div className="text-[9px] leading-relaxed text-slate-400 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <p className="font-bold text-slate-600 mb-0.5">Dear Parent:</p>
              <p className="indent-3 text-justify">
                This report card shows the ability and progress your child has made in the different learning areas as well as his/her core values. The school welcomes you should you desire to know more about your child's progress.
              </p>
            </div>
          </div>
        </div>

        {/* ==================== PAGE 2: BACK ==================== */}
        <div className="report-card-page bg-white p-8 border border-slate-200/80 rounded-3xl shadow-sm flex gap-8 w-[1000px] min-h-[640px] print:w-full print:min-h-0 print:border-none print:shadow-none print:p-0">
          {/* LEFT COLUMN: Report on Learning Progress and Achievement */}
          <div className="w-1/2 border-r border-dashed border-slate-300 pr-8 print:pr-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-center uppercase tracking-wide border-b pb-1 border-slate-200 mb-4">
                Report on Learning Progress &amp; Achievement
              </h3>
              <table className="w-full text-[10px] text-center border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 font-bold">
                    <th className="border border-slate-300 p-1 text-left w-5/12 text-[9px]">Learning Areas</th>
                    <th className="border border-slate-300 p-1 w-10 text-[9px]">1st Term</th>
                    <th className="border border-slate-300 p-1 w-10 text-[9px]">2nd Term</th>
                    <th className="border border-slate-300 p-1 w-10 text-[9px]">3rd Term</th>
                    <th className="border border-slate-300 p-1 w-12 text-[9px]">Final Rating</th>
                    <th className="border border-slate-300 p-1 w-16 text-[9px]">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {gradesList.map((g, idx) => (
                    <tr key={idx} className={g.isComponent ? 'bg-slate-50/20 italic' : 'font-semibold'}>
                      <td className={`border border-slate-300 p-1 text-left ${g.isComponent ? 'pl-5 text-slate-500' : 'text-slate-800'}`}>
                        {g.name}
                      </td>
                      <td className="border border-slate-300 p-1">{g.q1}</td>
                      <td className="border border-slate-300 p-1">{g.q2}</td>
                      <td className="border border-slate-300 p-1">{g.q3}</td>
                      <td className="border border-slate-300 p-1 bg-slate-50/20 font-bold text-slate-800">{g.final}</td>
                      <td className="border border-slate-300 p-1 text-[8px] font-black text-center">
                        <span className={g.remarks === 'PASSED' ? 'text-emerald-700' : g.remarks === 'FAILED' ? 'text-red-600' : ''}>
                          {g.remarks}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* General Average Row */}
                  <tr className="font-extrabold bg-slate-100 text-slate-900 border-t-2 border-slate-400">
                    <td className="border border-slate-300 p-1.5 text-left uppercase text-[9px]">
                      General Average
                    </td>
                    <td className="border border-slate-300 p-1" colSpan={3}></td>
                    <td className="border border-slate-300 p-1 text-[11px] bg-slate-200/50 text-indigo-900 font-mono">
                      {generalAverage}
                    </td>
                    <td className="border border-slate-300 p-1 text-[9px] uppercase tracking-wider">
                      {generalAverage !== '' ? (generalAverage >= 75 ? 'PASSED' : 'FAILED') : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Grading Scale Legend */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30 text-[9px] mt-4 space-y-1">
              <h4 className="font-bold uppercase text-slate-700 border-b border-slate-200/60 pb-0.5 text-center">
                Grading Scale Legend
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-500">
                <div>
                  <p><span className="font-bold text-slate-700">Outstanding:</span> 90-100</p>
                  <p><span className="font-bold text-slate-700">Very Satisfactory:</span> 85-89</p>
                  <p><span className="font-bold text-slate-700">Satisfactory:</span> 80-84</p>
                </div>
                <div>
                  <p><span className="font-bold text-slate-700">Fairly Satisfactory:</span> 75-79</p>
                  <p><span className="font-bold text-slate-700">Did Not Meet Expectation:</span> Below 75</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Report on Learner's Observed Values */}
          <div className="w-1/2 pl-8 print:pl-4 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-center uppercase tracking-wide border-b pb-1 border-slate-200 mb-4">
                Report on Learner's Observed Values
              </h3>
              <table className="w-full text-[9px] text-justify border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 font-bold text-center">
                    <th className="border border-slate-300 p-1 w-20 text-[9px]">Core Values</th>
                    <th className="border border-slate-300 p-1 text-[9px]">Behavior Statements</th>
                    <th className="border border-slate-300 p-0.5 w-6 text-[9px]">1st</th>
                    <th className="border border-slate-300 p-0.5 w-6 text-[9px]">2nd</th>
                    <th className="border border-slate-300 p-0.5 w-6 text-[9px]">3rd</th>
                  </tr>
                </thead>
                <tbody>
                  {coreValues.map((cv, cvIdx) => (
                    <React.Fragment key={cvIdx}>
                      {cv.statements.map((stmt, stmtIdx) => (
                        <tr key={stmtIdx}>
                          {stmtIdx === 0 && (
                            <td
                              className="border border-slate-300 p-1 font-bold text-slate-800 text-[8px] bg-slate-50/20"
                              rowSpan={cv.statements.length}
                            >
                              {cv.core}
                            </td>
                          )}
                          <td className="border border-slate-300 p-1 text-slate-600 leading-tight">
                            {stmt}
                          </td>
                          <td className="border border-slate-300 p-0.5 text-center font-bold text-slate-800">{getObsValue(stmt, 'q1')}</td>
                          <td className="border border-slate-300 p-0.5 text-center font-bold text-slate-800">{getObsValue(stmt, 'q2')}</td>
                          <td className="border border-slate-300 p-0.5 text-center font-bold text-slate-800">{getObsValue(stmt, 'q3')}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Observed Values Rating Legend */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30 text-[9px] mt-4 space-y-1">
              <h4 className="font-bold uppercase text-slate-700 border-b border-slate-200/60 pb-0.5 text-center">
                Observed Values Rating Legend
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-500 text-center">
                <p><span className="font-bold text-slate-700">AO:</span> Always Observed</p>
                <p><span className="font-bold text-slate-700">SO:</span> Sometimes Observed</p>
                <p><span className="font-bold text-slate-700">RO:</span> Rarely Observed</p>
                <p><span className="font-bold text-slate-700">NO:</span> Not Observed</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </ReportLayout>
  );
}

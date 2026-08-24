import React, { useState, useMemo, useEffect } from 'react';
import { ReportLayout } from './reports/ReportLayout';
import { useAuth } from '../../lib/AuthContext';
import { ChevronDown, Search } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getGlobalSettings } from '../../lib/services/settingsService';

interface SF9ReportDocumentProps {
  onClose: () => void;
  data: {
    schoolYear: string;
    gradeLevel: string;
    section: string;
    students: any[];
    attendance: any[];
    subjects: any[];
    adviserName?: string;
    gradeConfigurations?: any[];
  };
}

export function SF9ReportDocument({ onClose, data }: SF9ReportDocumentProps) {
  const { schoolYear, gradeLevel, section, students, attendance, subjects, adviserName: passedAdviserName, gradeConfigurations: passedGradeConfigs } = data;
  const { userData } = useAuth();

  const [loadedGradeConfigs, setLoadedGradeConfigs] = useState<any[]>([]);
  const [advisorId, setAdvisorId] = useState('');
  const [principalName, setPrincipalName] = useState<string>((data as any).schoolHead || (data as any).principalName || 'MRS. LEPIDAPTERA VILLANUEVA');
  const [schoolInfo, setSchoolInfo] = useState({
    schoolId: (data as any).schoolId || '199006',
    region: (data as any).region || 'IX',
    division: (data as any).division || 'ZAMBOANGA',
    district: (data as any).district || 'STA. MARIA CENTRAL',
    schoolName: (data as any).schoolName || 'STA. MARIA CS SPED CENTER'
  });

  useEffect(() => {
    getGlobalSettings().then(settings => {
      setSchoolInfo({
        schoolId: (data as any).schoolId || settings.schoolId || '199006',
        region: (data as any).region || settings.region || 'IX',
        division: ((data as any).division || settings.division || 'ZAMBOANGA').toUpperCase(),
        district: ((data as any).district || settings.district || 'STA. MARIA CENTRAL').toUpperCase(),
        schoolName: ((data as any).schoolName || settings.schoolName || 'STA. MARIA CS SPED CENTER').toUpperCase()
      });
      if (settings.principalName) setPrincipalName(settings.principalName);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const firstStudent = students[0];
    if (firstStudent && firstStudent.sectionId) {
      const qAssign = query(
        collection(db, 'assignments'),
        where('sectionId', '==', firstStudent.sectionId),
        where('isAdvisor', '==', true)
      );
      getDocs(qAssign).then((snap) => {
        if (!snap.empty) {
          setAdvisorId(snap.docs[0].data().teacherId || '');
        }
      }).catch((err) => {
        console.warn('Failed to load advisor assignment for SF9 preview:', err);
      });
    }
  }, [students]);

  useEffect(() => {
    if (passedGradeConfigs && passedGradeConfigs.length > 0) {
      setLoadedGradeConfigs(passedGradeConfigs);
    } else {
      const q = query(collection(db, 'gradeConfigurations'));
      getDocs(q).then((snap) => {
        setLoadedGradeConfigs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }).catch((err) => {
        console.error('Failed to load gradeConfigurations for SF9 preview:', err);
      });
    }
  }, [passedGradeConfigs]);

  const activeGradeConfigs = useMemo(() => {
    return (passedGradeConfigs && passedGradeConfigs.length > 0) ? passedGradeConfigs : loadedGradeConfigs;
  }, [passedGradeConfigs, loadedGradeConfigs]);

  // Sort students alphabetically by lastName then firstName
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const aName = `${a.lastName || ''}, ${a.firstName || ''}`.toLowerCase();
      const bName = `${b.lastName || ''}, ${b.firstName || ''}`.toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [students]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    sortedStudents[0]?.id || ''
  );

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Sync default selection when student list changes
  useEffect(() => {
    if (sortedStudents.length > 0) {
      setSelectedStudentId(sortedStudents[0].id);
    }
  }, [sortedStudents]);

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return sortedStudents;
    const q = searchTerm.toLowerCase();
    return sortedStudents.filter(s =>
      `${s.lastName || ''}, ${s.firstName || ''}`.toLowerCase().includes(q) ||
      (s.lrn || '').toLowerCase().includes(q)
    );
  }, [sortedStudents, searchTerm]);

  const student = students.find((s) => s.id === selectedStudentId);

  if (!student) {
    return (
      <ReportLayout title="School Form 9 (SF9)" onClose={onClose} landscape={true}>
        <div className="p-8 text-center text-slate-500 font-medium">
          No enrolled students found in this section.
        </div>
      </ReportLayout>
    );
  }

  // --- ATTENDANCE SUMMARY DATA ---
  const getAttendanceSummary = (studentId: string) => {
    const studentAtt = (attendance || []).filter((a) => a.studentId === studentId);
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

    (attendance || []).forEach((a) => {
      if (!a.date) return;
      const d = new Date(a.date);
      if (isNaN(d.getTime())) return;
      const m = d.getMonth();
      const dStr = a.date.split('T')[0];
      if (!sectionDatesPerMonth[m]) {
        sectionDatesPerMonth[m] = new Set();
      }
      sectionDatesPerMonth[m].add(dStr);
    });

    // Deduplicate student records per date (keep the most explicit/latest record)
    const studentAttByDate = new Map<string, any>();
    studentAtt.forEach((a) => {
      if (!a.date) return;
      const dStr = a.date.split('T')[0];
      studentAttByDate.set(dStr, a);
    });

    studentAttByDate.forEach((a) => {
      const d = new Date(a.date);
      if (isNaN(d.getTime())) return;
      const m = d.getMonth();

      const rawStatus = (a.status || '').toString().trim().toLowerCase();
      const amStatus = ((a as any).amStatus || '').toString().trim().toLowerCase();
      const pmStatus = ((a as any).pmStatus || '').toString().trim().toLowerCase();

      let presentWeight = 0;
      let absentWeight = 0;

      if (rawStatus === 'present' || rawStatus === 'late') {
        presentWeight = 1;
      } else if (rawStatus === 'absent') {
        absentWeight = 1;
      } else if (amStatus || pmStatus) {
        const amPres = amStatus === 'present' || amStatus === 'late';
        const pmPres = pmStatus === 'present' || pmStatus === 'late';
        if (amPres && pmPres) presentWeight = 1;
        else if (!amPres && !pmPres && (amStatus === 'absent' || pmStatus === 'absent')) absentWeight = 1;
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
  const getDecryptedTemplateGrades = (stud: any) => {
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

    const gradeKey = stud.gradeLevel
      ? (stud.gradeLevel.toLowerCase().startsWith('grade')
        ? stud.gradeLevel
        : `Grade ${stud.gradeLevel}`)
      : 'Grade 6';
    const studentGrades = stud.grades?.[gradeKey] || {};

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
      'good manners and right conduct (gmrc)': 'ESP',
      'tle': 'TLE',
      'epp': 'TLE',
      'mapeh': 'MAPEH',
      'music': 'MUSIC',
      'arts': 'ARTS',
      'art': 'ARTS',
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
        // Compute static grades if available
        let q1 = typeof gradeData.q1 !== 'undefined' && gradeData.q1 !== null ? parseFloat(gradeData.q1) : null;
        let q2 = typeof gradeData.q2 !== 'undefined' && gradeData.q2 !== null ? parseFloat(gradeData.q2) : null;
        let q3 = typeof gradeData.q3 !== 'undefined' && gradeData.q3 !== null ? parseFloat(gradeData.q3) : null;

        // If static grade is missing, calculate average from dynamic columns for the term
        const computeDynamicAvg = (termKey: string) => {
          // Gather all numeric values from dynamic term objects (e.g., 'Term 1', 'Term 2')
          const values: number[] = [];
          Object.entries(gradeData).forEach(([key, val]) => {
            if (['q1', 'q2', 'q3'].includes(key)) return;
            if (typeof val === 'object' && val !== null) {
              Object.values(val).forEach(v => {
                if (typeof v === 'number') values.push(v);
              });
            }
          });
          if (values.length === 0) return null;
          const sum = values.reduce((a, b) => a + b, 0);
          return Math.round(sum / values.length);
        };

        if (q1 === null) {
          const dyn = computeDynamicAvg('q1');
          if (dyn !== null) q1 = dyn;
        }
        if (q2 === null) {
          const dyn = computeDynamicAvg('q2');
          if (dyn !== null) q2 = dyn;
        }
        if (q3 === null) {
          const dyn = computeDynamicAvg('q3');
          if (dyn !== null) q3 = dyn;
        }

        mappedDbGrades[standardCode] = { q1, q2, q3 };
      }
    });

    const isGrade1 = gradeLevel.toLowerCase().includes('1');
    const isGrade2 = gradeLevel.toLowerCase().includes('2');
    const isGrade3 = gradeLevel.toLowerCase().includes('3');
    const isGrade4 = gradeLevel.toLowerCase().includes('4');
    const isGrade5 = gradeLevel.toLowerCase().includes('5');
    const isGrade6 = gradeLevel.toLowerCase().includes('6');

    const getGradeByStandardCode = (code: string) => {
      const gd = mappedDbGrades[code];
      if (!gd) return { q1: '', q2: '', q3: '', final: '', remarks: '' };

      const q1 = gd.q1 !== null && typeof gd.q1 !== 'undefined' ? gd.q1 : '';
      const q2 = gd.q2 !== null && typeof gd.q2 !== 'undefined' ? gd.q2 : '';
      const q3 = gd.q3 !== null && typeof gd.q3 !== 'undefined' ? gd.q3 : '';

      const active = [q1, q2, q3].filter(v => v !== '') as number[];
      const final = active.length > 0 ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : '';
      const remarks = final !== '' ? (final >= 75 ? 'PASSED' : 'FAILED') : '';

      return { q1, q2, q3, final, remarks };
    };

    const averageGrades = (g1: any, g2: any) => {
      const calculateQ = (qKey: 'q1' | 'q2' | 'q3') => {
        const vals = [g1[qKey], g2[qKey]].filter(v => v !== '') as number[];
        return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : '';
      };
      const q1 = calculateQ('q1');
      const q2 = calculateQ('q2');
      const q3 = calculateQ('q3');
      const active = [q1, q2, q3].filter(v => v !== '') as number[];
      const final = active.length > 0 ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : '';
      const remarks = final !== '' ? (final >= 75 ? 'PASSED' : 'FAILED') : '';
      return { q1, q2, q3, final, remarks };
    };

    // Row 1: English (or Language for Grade 1)
    if (isGrade1) {
      activeRows.push({ name: 'Language', code: 'LANGUAGE', ...getGradeByStandardCode('LANGUAGE') });
    } else {
      activeRows.push({ name: 'English', code: 'ENGLISH', ...getGradeByStandardCode('ENGLISH') });
    }

    // Row 2: Filipino (or Reading and Literacy for Grade 1)
    if (isGrade1) {
      activeRows.push({ name: 'Reading and Literacy', code: 'READING_AND_LITERACY', ...getGradeByStandardCode('READING_AND_LITERACY') });
    } else {
      activeRows.push({ name: 'Filipino', code: 'FILIPINO', ...getGradeByStandardCode('FILIPINO') });
    }

    // Row 3: Math
    activeRows.push({ name: 'Mathematics', code: 'MATH', ...getGradeByStandardCode('MATH') });

    // Row 4: Science (only Grade 3, 4, 5, 6)
    if (isGrade3 || isGrade4 || isGrade5 || isGrade6) {
      activeRows.push({ name: 'Science', code: 'SCIENCE', ...getGradeByStandardCode('SCIENCE') });
    }

    // Row 5: AP/Makabansa
    if (isGrade1 || isGrade2 || isGrade3) {
      activeRows.push({ name: 'AP/Makabansa', code: 'MAKABANSA', ...getGradeByStandardCode('MAKABANSA') });
    } else {
      activeRows.push({ name: 'AP/Makabansa', code: 'AP', ...getGradeByStandardCode('AP') });
    }

    // Row 6: EPP/TLE (only Grade 4, 5, 6)
    if (isGrade4 || isGrade5 || isGrade6) {
      activeRows.push({ name: 'EPP/TLE', code: 'TLE', ...getGradeByStandardCode('TLE') });
    }

    // Row 7: MAPEH (only Grade 4, 5, 6)
    if (isGrade4 || isGrade5 || isGrade6) {
      const musicGrad = getGradeByStandardCode('MUSIC');
      const artsGrad = getGradeByStandardCode('ARTS');
      const peGrad = getGradeByStandardCode('PE');
      const healthGrad = getGradeByStandardCode('HEALTH');

      const musicAndArts = averageGrades(musicGrad, artsGrad);
      const peAndHealth = averageGrades(peGrad, healthGrad);
      const mapeh = averageGrades(musicAndArts, peAndHealth);

      activeRows.push({ name: 'MAPEH', code: 'MAPEH', ...mapeh });
      activeRows.push({ name: 'Music & Arts', code: 'MUSIC_ARTS', ...musicAndArts, isComponent: true });
      activeRows.push({ name: 'PE & Health', code: 'PE_HEALTH', ...peAndHealth, isComponent: true });
    }

    // Row 8: GMRC (mapped to ESP in database)
    activeRows.push({ name: 'GMRC', code: 'ESP', ...getGradeByStandardCode('ESP') });

    return activeRows;
  };

  const gradesList = getDecryptedTemplateGrades(student);

  const getGeneralAverageVal = () => {
    const mainAreas = gradesList.filter((g) => !g.isComponent && typeof g.final === 'number');
    if (mainAreas.length === 0) return '';
    const sum = mainAreas.reduce((a, b) => a + (b.final as number), 0);
    return Math.round(sum / mainAreas.length);
  };

  const generalAverage = getGeneralAverageVal();

  const getNextGradeValue = () => {
    const mainAreas = gradesList.filter((g) => !g.isComponent && typeof g.final === 'number');
    if (mainAreas.length === 0) return '—';
    const failedCount = mainAreas.filter((g) => (g.final as number) < 75).length;
    if (failedCount === 0) {
      if (gradeLevel.toLowerCase().includes('kinder')) {
        return 'Grade 1';
      }
      const match = gradeLevel.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        return gradeLevel.replace(/\d+/, (num + 1).toString());
      }
      return '—';
    }
    return '—';
  };

  const eligibleGrade = getNextGradeValue();

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
  const adviserName = passedAdviserName && passedAdviserName !== 'Assigned Adviser'
    ? passedAdviserName
    : (userData && userData.firstName ? `${userData.firstName} ${userData.lastName}`.trim() : 'Assigned Adviser');

  const fullName = `${student.lastName}, ${student.firstName} ${student.middleName || ''}`.trim();

  const getObsValue = (stmtText: string, quarter: 'q1' | 'q2' | 'q3') => {
    const keyMap: Record<string, string> = {
      "expresses one's spiritual beliefs while respecting the spiritual beliefs of others.": "makaDiyos1",
      "shows adherence to ethical principles by upholding truth.": "makaDiyos2",
      "is sensitive to individual, social, and cultural differences.": "makatao1",
      "demonstrates contributions towards solidarity.": "makatao2",
      "cares for the environment and utilizes resources wisely and economically.": "makakalikasan1",
      "demonstrates pride in being a filipino; exercises rights and duties.": "makabansa1",
      "demonstrates appropriate behavior in carrying out school/community duties.": "makabansa2",
      "expresses one's spiritual beliefs while respecting the spiritual beliefs of others": "makaDiyos1",
      "show adherence to ethical principles by upholding truth": "makaDiyos2",
      "is sensitive to individual, social, cultural, differences": "makatao1",
      "demonstrate contributions toward solidarity.": "makatao2",
      "demonstrate contributions toward solidarity": "makatao2",
      "cares for the environment and utilizes resources wisely, judiciously, and economically": "makakalikasan1",
      "demonstrates pride in being a filipino; exercises the rights and responsibilities of a filipino citizen": "makabansa1",
      "demonstrates appropriate behavior in carrying out activities in the school, community, and country": "makabansa2"
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
        "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others",
        "Show adherence to ethical principles by upholding truth"
      ]
    },
    {
      core: '2. Makatao',
      statements: [
        "Is sensitive to individual, social, cultural, differences",
        "Demonstrate contributions toward solidarity."
      ]
    },
    {
      core: '3. Maka-Kalikasan',
      statements: [
        "Cares for the environment and utilizes resources wisely, judiciously, and economically"
      ]
    },
    {
      core: '4. Makabansa',
      statements: [
        "Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen",
        "Demonstrates appropriate behavior in carrying out activities in the school, community, and country"
      ]
    }
  ];

  return (
    <ReportLayout title="School Form 9 (SF9) - Report Card" onClose={onClose} landscape={true}>
      <style>{`
        @page {
          size: landscape;
          margin: 5mm;
        }
        @media print {
          .report-card-page {
            width: 100% !important;
            max-width: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 0.25in !important;
            box-sizing: border-box !important;
            min-height: 195mm !important;
            height: 195mm !important;
            display: flex !important;
            gap: 2rem !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            font-size: 12px !important;
          }
          .report-card-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .report-card-page h3 {
            font-size: 14px !important;
            margin-bottom: 0.75rem !important;
          }
          .report-card-page table {
            font-size: 11px !important;
          }
          .report-card-page th, .report-card-page td {
            padding: 4px 6px !important;
          }
        }
      `}</style>
      {/* Student Selector overlay in print header */}
      <div className="flex items-center gap-3 p-4 bg-slate-100 rounded-2xl border border-slate-200/60 mb-6 print:hidden relative z-50">
        <label className="text-sm font-bold text-slate-700 whitespace-nowrap">Select Student:</label>
        <div className="relative w-full max-w-md">
          {/* Clickable trigger input */}
          <div
            onClick={() => setIsOpen(prev => !prev)}
            className="flex items-center justify-between w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 cursor-pointer shadow-sm hover:border-slate-300"
          >
            <span>
              {student ? `${student.lastName}, ${student.firstName} ${student.middleName?.charAt(0) ? `${student.middleName.charAt(0)}.` : ''}` : 'Select a student'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
          </div>

          {/* Absolute dropdown panel */}
          {isOpen && (
            <>
              {/* Overlay transparent backdrop to close on click outside */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              />

              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 flex flex-col max-h-[300px] overflow-hidden">
                <div className="p-2 border-b border-slate-100 flex items-center bg-slate-50">
                  <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search student name or LRN..."
                    className="w-full bg-transparent text-sm font-semibold text-slate-700 focus:outline-none placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                <div className="flex-1 overflow-y-auto py-1 max-h-[240px]">
                  {filteredStudents.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 font-semibold">
                      No students found
                    </div>
                  ) : (
                    filteredStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setIsOpen(false);
                          setSearchTerm('');
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors flex flex-col gap-0.5 hover:bg-indigo-50/50 hover:text-indigo-900 ${s.id === selectedStudentId ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                      >
                        <span>{s.lastName}, {s.firstName} {s.middleName ? ` ${s.middleName}` : ''}</span>
                        {s.lrn && <span className="text-[10px] text-slate-400 font-mono">LRN: {s.lrn}</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="w-[1000px] print:w-full print:max-w-none mx-auto space-y-12 print:space-y-0 text-slate-900 leading-normal">

        {/* ==================== PAGE 1: FRONT ==================== */}
        <div className="report-card-page bg-white p-8 border border-slate-200/80 rounded-3xl shadow-sm flex gap-8 w-[1000px] min-h-[640px] print:w-full print:min-h-[195mm] print:border-none print:shadow-none print:p-0 page-break">
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
                  Eligible for Admission to Grade: <span className="underline font-bold px-2">{eligibleGrade}</span>
                </p>
                <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-200/60">
                  <div className="text-center w-5/12">
                    <p className="font-bold border-b border-slate-800 pb-0.5">{adviserName}</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Teacher</p>
                  </div>
                  <div className="text-center w-5/12">
                    <p className="font-bold border-b border-slate-800 pb-0.5">{principalName}</p>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Principal I</p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30 text-[9px] leading-relaxed space-y-2">
                <h4 className="font-bold uppercase tracking-wider mb-1 text-center text-slate-800">
                  Cancellation of Eligibility to Transfer
                </h4>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p>Admitted in: <span className="border-b border-slate-400 w-24 inline-block"></span></p>
                    <p>Date: <span className="border-b border-slate-400 w-24 inline-block"></span></p>
                  </div>
                  <div className="text-center w-5/12">
                    <p className="border-b border-slate-400 pb-0.5 font-bold">{principalName}</p>
                    <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Principal I</p>
                  </div>
                </div>
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
              <p className="text-[10px] font-bold text-slate-600 mt-1">REGION {schoolInfo.region.replace(/^region\s*/i, '')}</p>
              <p className="text-[10px] font-bold text-slate-600">DIVISION OF {schoolInfo.division.replace(/^division of\s*/i, '')}</p>
              <p className="text-[10px] font-bold text-slate-600">DISTRICT OF {schoolInfo.district.replace(/^district of\s*/i, '')}</p>

              <h2 className="text-xs font-black uppercase text-slate-800 mt-4 tracking-wider leading-none">
                {schoolInfo.schoolName}
              </h2>
              <p className="text-[8px] font-bold text-slate-400">School ID: {schoolInfo.schoolId}</p>

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

            <div className="text-[9px] leading-relaxed text-slate-400 p-2 bg-slate-50 rounded-xl border border-slate-100 mb-4">
              <p className="font-bold text-slate-600 mb-0.5">Dear Parent:</p>
              <p className="indent-3 text-justify">
                This report card shows the ability and progress your child has made in the different learning areas as well as his/her core values. The school welcomes you should you desire to know more about your child's progress.
              </p>
            </div>

            <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-200/60">
              <div className="text-center w-5/12">
                <p className="font-bold border-b border-slate-800 pb-0.5 text-slate-850">{adviserName}</p>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Adviser</p>
              </div>
              <div className="text-center w-5/12">
                <p className="font-bold border-b border-slate-800 pb-0.5 text-slate-850">{principalName}</p>
                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Principal I</p>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== PAGE 2: BACK ==================== */}
        <div className="report-card-page bg-white p-8 border border-slate-200/80 rounded-3xl shadow-sm flex gap-8 w-[1000px] min-h-[640px] print:w-full print:min-h-[195mm] print:border-none print:shadow-none print:p-0">
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
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/30 text-[9px] mt-4">
              <table className="w-full text-center border-collapse text-slate-500">
                <thead>
                  <tr className="font-bold text-slate-700 border-b border-slate-200">
                    <th className="text-left pb-1 text-[8px] uppercase">Descriptors</th>
                    <th className="pb-1 text-[8px] uppercase">Grading Scale</th>
                    <th className="text-right pb-1 text-[8px] uppercase">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-left pt-1 font-bold text-slate-700">Advancing</td>
                    <td className="pt-1">90-100</td>
                    <td className="text-right pt-1 font-bold text-emerald-700">Passed</td>
                  </tr>
                  <tr>
                    <td className="text-left font-bold text-slate-700">Benchmarking</td>
                    <td>80-89</td>
                    <td className="text-right font-bold text-emerald-700">Passed</td>
                  </tr>
                  <tr>
                    <td className="text-left font-bold text-slate-700">Connecting</td>
                    <td>75-79</td>
                    <td className="text-right font-bold text-emerald-700">Passed</td>
                  </tr>
                  <tr>
                    <td className="text-left font-bold text-slate-700">Developing</td>
                    <td>65-74</td>
                    <td className="text-right font-bold text-red-600">Failed</td>
                  </tr>
                  <tr>
                    <td className="text-left font-bold text-slate-700">Emerging</td>
                    <td>0-64</td>
                    <td className="text-right font-bold text-red-650">Failed</td>
                  </tr>
                </tbody>
              </table>
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

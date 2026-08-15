import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { ReportLayout } from './reports/ReportLayout';
import { useAuth } from '../../lib/AuthContext';
import { ChevronDown, Search, Printer, FileText } from 'lucide-react';
import { getGlobalSettings } from '../../lib/services/settingsService';

interface SF10ReportDocumentProps {
  onClose: () => void;
  data: {
    schoolYear: string;
    gradeLevel: string;
    section: string;
    students: any[];
    initialStudentId?: string;
    adviserName?: string;
  };
}

interface SubjectRow {
  name: string;
  isSubSubject: boolean;
  q1: number | string;
  q2: number | string;
  q3: number | string;
  q4: number | string;
  final: number | string;
}

const isThreeTermYear = (sy: string) => {
  if (!sy) return false;
  const match = sy.match(/\d{4}/);
  if (!match) return false;
  const startYear = parseInt(match[0], 10);
  return startYear >= 2026;
};

const isMatchingGrade = (g1: string, g2: string) => {
  if (!g1 || !g2) return false;
  const str1 = String(g1).toLowerCase().trim();
  const str2 = String(g2).toLowerCase().trim();
  if (str1 === str2) return true;

  if (str1.includes('kinder') && str2.includes('kinder')) return true;

  const match1 = str1.match(/(?:grade|gr|g)?\s*([1-9]|1[0-2])\b/i) || str1.match(/\b([1-9]|1[0-2])\b/);
  const match2 = str2.match(/(?:grade|gr|g)?\s*([1-9]|1[0-2])\b/i) || str2.match(/\b([1-9]|1[0-2])\b/);

  if (match1 && match2) {
    return match1[1] === match2[1];
  }

  return str1 === str2;
};

const subjectDisplayNames: Record<string, string> = {
  'FILIPINO': 'Filipino',
  'ENGLISH': 'English',
  'MATH': 'Mathematics',
  'SCIENCE': 'Science',
  'AP': 'Araling Panlipunan',
  'ESP': 'Good Manners and Right Conduct (GMRC)',
  'EPP_TLE': 'Technology and Livelihood Education (TLE)',
  'TLE': 'Technology and Livelihood Education (TLE)',
  'MUSIC': 'Music',
  'ARTS': 'Arts',
  'PE': 'Physical Education',
  'HEALTH': 'Health',
  'PE_HEALTH': 'PE & Health',
  'MAPEH': 'MAPEH',
  'LANGUAGE': 'Language',
  'READING': 'Reading',
  'LITERACY': 'Literacy',
  'READING_AND_LITERACY': 'Reading and Literacy',
  'MAKABANSA': 'Makabansa'
};

const getNormalizedSubjectCode = (nameOrCode: string): string => {
  const clean = nameOrCode.toLowerCase().trim();
  if (clean === 'filipino') return 'FILIPINO';
  if (clean === 'english') return 'ENGLISH';
  if (clean === 'mathematics' || clean === 'math') return 'MATH';
  if (clean === 'science') return 'SCIENCE';
  if (clean === 'araling panlipunan' || clean === 'ap' || clean === 'ap/makabansa' || clean === 'makabansa') return 'MAKABANSA';
  if (clean === 'good manners and right conduct (gmrc)' || clean === 'gmrc' || clean === 'edukasyon sa pagpapakatao' || clean === 'esp') return 'ESP';
  if (clean === 'epp' || clean === 'tle' || clean === 'epp/tle' || clean === 'technology and livelihood education (tle)') return 'TLE';
  if (clean === 'music') return 'MUSIC';
  if (clean === 'arts') return 'ARTS';
  if (clean === 'physical education' || clean === 'pe') return 'PE';
  if (clean === 'health') return 'HEALTH';
  if (clean === 'language') return 'LANGUAGE';
  if (clean === 'reading and literacy' || clean === 'reading') return 'READING_AND_LITERACY';
  return nameOrCode.toUpperCase().replace(/\s+/g, '_');
};

const isSameSubject = (key: string, targetCode: string) => {
  const normKey = getNormalizedSubjectCode(key);
  const normTarget = getNormalizedSubjectCode(targetCode);
  
  if (normKey === normTarget) return true;
  if ((normKey === 'AP' || normKey === 'MAKABANSA') && (normTarget === 'AP' || normTarget === 'MAKABANSA')) return true;
  if ((normKey === 'TLE' || normKey === 'EPP_TLE') && (normTarget === 'TLE' || normTarget === 'EPP_TLE')) return true;
  return false;
};

// ========================= STYLES =========================
const cellStyle: React.CSSProperties = {
  border: '1px solid #000',
  padding: '1px 3px',
  fontSize: '7.5pt',
  verticalAlign: 'middle',
  lineHeight: '1.2',
};

const headerCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontWeight: 'bold',
  textAlign: 'center',
  backgroundColor: '#f0f0f0',
  fontSize: '7pt',
};

const subjectCellStyle: React.CSSProperties = {
  ...cellStyle,
  textAlign: 'left',
  fontWeight: 'bold',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  lineHeight: '1.1',
};

const gradeCellStyle: React.CSSProperties = {
  ...cellStyle,
  textAlign: 'center',
  fontWeight: 'normal',
  minWidth: '24px',
};

// ========================= COMPONENT =========================
export function SF10ReportDocument({ onClose, data }: SF10ReportDocumentProps) {
  const { students, adviserName: passedAdviserName, initialStudentId } = data;
  const { userData } = useAuth();

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const aName = `${a.lastName || ''}, ${a.firstName || ''}`.toLowerCase();
      const bName = `${b.lastName || ''}, ${b.firstName || ''}`.toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [students]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialStudentId && sortedStudents.some(s => s.id === initialStudentId)) {
      return initialStudentId;
    }
    return sortedStudents[0]?.id || '';
  });
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [gradeConfigs, setGradeConfigs] = useState<any[]>([]);
  const [principalName, setPrincipalName] = useState<string>((data as any).schoolHead || (data as any).principalName || 'MRS. LEPIDAPTERA VILLANUEVA');
  const [schoolInfo, setSchoolInfo] = useState({
    schoolId: '199006',
    region: 'IX',
    division: 'Zamboanga City',
    district: 'Sta. Maria Central',
    schoolName: 'Sta. Maria CS SPED Center'
  });

  useEffect(() => {
    getGlobalSettings().then(settings => {
      setSchoolInfo({
        schoolId: settings.schoolId || '199006',
        region: settings.region || 'IX',
        division: settings.division || 'Zamboanga City',
        district: settings.district || 'Sta. Maria Central',
        schoolName: settings.schoolName || 'Sta. Maria CS SPED Center'
      });
      if (settings.principalName) setPrincipalName(settings.principalName);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'gradeConfigurations'), (snap) => {
      setGradeConfigs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (initialStudentId && sortedStudents.some(s => s.id === initialStudentId)) {
      setSelectedStudentId(initialStudentId);
    } else if (sortedStudents.length > 0) {
      setSelectedStudentId(sortedStudents[0].id);
    }
  }, [sortedStudents, initialStudentId]);

  const selectedStudent = useMemo(() => {
    return sortedStudents.find(s => s.id === selectedStudentId);
  }, [sortedStudents, selectedStudentId]);

  const studentLrn = selectedStudent?.lrn;

  useEffect(() => {
    if (studentLrn === undefined || studentLrn === null || String(studentLrn).trim() === '') {
      setHistory([]);
      return;
    }
    setLoadingHistory(true);

    const strLrn = String(studentLrn).trim();
    const numLrn = !isNaN(Number(strLrn)) ? Number(strLrn) : null;
    const lrnTargets = Array.from(new Set([strLrn, numLrn].filter(v => v !== null && v !== '')));

    const q = query(
      collection(db, 'enrollments'),
      where('lrn', 'in', lrnTargets)
    );
    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(records);
      setLoadingHistory(false);
    });
    return () => unsub();
  }, [studentLrn]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return sortedStudents;
    const q = searchTerm.toLowerCase();
    return sortedStudents.filter(s =>
      `${s.firstName} ${s.lastName} ${s.lrn}`.toLowerCase().includes(q)
    );
  }, [sortedStudents, searchTerm]);

  // ===== Grade extraction helpers =====
  const getSubjectsForGradeLevel = (gradeLevelName: string) => {
    const isGrade1 = gradeLevelName.includes('1');
    const isGrade2 = gradeLevelName.includes('2');
    const isGrade3 = gradeLevelName.includes('3');
    const isGrade4 = gradeLevelName.includes('4');
    const isGrade5 = gradeLevelName.includes('5');
    const isGrade6 = gradeLevelName.includes('6');

    if (isGrade1) {
      return [
        { code: 'LANGUAGE', name: 'Language' },
        { code: 'READING_AND_LITERACY', name: 'Reading and Literacy' },
        { code: 'MATH', name: 'Mathematics' },
        { code: 'MAKABANSA', name: 'AP/Makabansa' },
        { code: 'ESP', name: 'GMRC' }
      ];
    }
    if (isGrade2) {
      return [
        { code: 'ENGLISH', name: 'English' },
        { code: 'FILIPINO', name: 'Filipino' },
        { code: 'MATH', name: 'Mathematics' },
        { code: 'MAKABANSA', name: 'AP/Makabansa' },
        { code: 'ESP', name: 'GMRC' }
      ];
    }
    if (isGrade3) {
      return [
        { code: 'ENGLISH', name: 'English' },
        { code: 'FILIPINO', name: 'Filipino' },
        { code: 'MATH', name: 'Mathematics' },
        { code: 'SCIENCE', name: 'Science' },
        { code: 'MAKABANSA', name: 'AP/Makabansa' },
        { code: 'ESP', name: 'GMRC' }
      ];
    }
    // Grades 4, 5, 6
    return [
      { code: 'ENGLISH', name: 'English' },
      { code: 'FILIPINO', name: 'Filipino' },
      { code: 'MATH', name: 'Mathematics' },
      { code: 'SCIENCE', name: 'Science' },
      { code: 'AP', name: 'AP/Makabansa' },
      { code: 'TLE', name: 'EPP/TLE' },
      { code: 'MUSIC', name: 'Music' },
      { code: 'ARTS', name: 'Arts' },
      { code: 'PE', name: 'Physical Education' },
      { code: 'HEALTH', name: 'Health' },
      { code: 'ESP', name: 'GMRC' }
    ];
  };

  const resolveTermGrade = (subjectGrades: any, term: string, subjectCode: string, sectionId: string, gradeConfigs: any[]) => {
    if (!subjectGrades || typeof subjectGrades !== 'object') return '';
    
    // 1. Direct manual inputs
    const termKeyMap: Record<string, string[]> = {
      'Term 1': ['t1', 'q1'],
      'Term 2': ['t2', 'q2'],
      'Term 3': ['t3', 'q3'],
      'Quarter 1': ['q1', 't1'],
      'Quarter 2': ['q2', 't2'],
      'Quarter 3': ['q3', 't3'],
      'Quarter 4': ['q4']
    };
    
    const keysToCheck = termKeyMap[term] || [];
    for (const k of keysToCheck) {
      if (subjectGrades[k] !== undefined && subjectGrades[k] !== null && subjectGrades[k] !== '') {
        return parseFloat(subjectGrades[k]);
      }
    }
    
    return '';
  };

  // Build subject rows from enrollment data in the order they were saved
  const getSubjectRows = (enrollment: any, gradeLevelName: string): SubjectRow[] => {
    const rows: SubjectRow[] = [];

    if (!enrollment) {
      // Return exactly 8 empty rows by default
      return Array.from({ length: 8 }).map(() => ({
        name: '',
        isSubSubject: false,
        q1: '', q2: '', q3: '', q4: '', final: ''
      }));
    }
    
    // Support both manual flat structures and active enrollment nested structures
    let studentGrades = enrollment.grades || {};
    const gradeLevelKey = enrollment.gradeLevel;
    const matchedGradeKey = Object.keys(studentGrades).find(k => isMatchingGrade(k, gradeLevelKey || ''));
    if (matchedGradeKey) {
      studentGrades = studentGrades[matchedGradeKey];
    }
    if (!studentGrades || typeof studentGrades !== 'object') {
      studentGrades = {};
    }

    const academicYear = enrollment.academicYear || '';
    const threeTerm = isThreeTermYear(academicYear);
    const sectionId = enrollment.sectionId || (isMatchingGrade(gradeLevelName, selectedStudent?.gradeLevel) ? selectedStudent?.sectionId : '') || '';

    const entries = Object.entries(studentGrades);
    entries.sort((a: [string, any], b: [string, any]) => {
      const orderA = typeof a[1]?.order === 'number' ? a[1].order : 999;
      const orderB = typeof b[1]?.order === 'number' ? b[1].order : 999;
      return orderA - orderB;
    });

    entries.forEach(([subName, gd]: [string, any]) => {
      if (!subName.trim()) return;
      
      const subNameUpper = subName.toUpperCase();
      const displayName = subjectDisplayNames[subNameUpper] || subName;
      
      if (threeTerm) {
        const t1 = resolveTermGrade(gd, 'Term 1', subName, sectionId, gradeConfigs);
        const t2 = resolveTermGrade(gd, 'Term 2', subName, sectionId, gradeConfigs);
        const t3 = resolveTermGrade(gd, 'Term 3', subName, sectionId, gradeConfigs);
        const active = [t1, t2, t3].filter(v => v !== '' && !isNaN(Number(v))) as number[];
        const final = active.length === 3 ? Math.round(active.reduce((a, b) => a + b, 0) / 3) : '';
        rows.push({ name: displayName, isSubSubject: gd?.isSubSubject || false, q1: t1, q2: t2, q3: t3, q4: '', final });
      } else {
        const q1 = resolveTermGrade(gd, 'Quarter 1', subName, sectionId, gradeConfigs);
        const q2 = resolveTermGrade(gd, 'Quarter 2', subName, sectionId, gradeConfigs);
        const q3 = resolveTermGrade(gd, 'Quarter 3', subName, sectionId, gradeConfigs);
        const q4 = resolveTermGrade(gd, 'Quarter 4', subName, sectionId, gradeConfigs);
        const active = [q1, q2, q3, q4].filter(v => v !== '' && !isNaN(Number(v))) as number[];
        const final = active.length === 4 ? Math.round(active.reduce((a, b) => a + b, 0) / 4) : '';
        rows.push({ name: displayName, isSubSubject: gd?.isSubSubject || false, q1: q1, q2: q2, q3: q3, q4: q4, final });
      }
    });

    // Pad to at least 8 rows if empty or short (for manual encoder default blank height)
    while (rows.length < 8) {
      rows.push({
        name: '',
        isSubSubject: false,
        q1: '', q2: '', q3: '', q4: '', final: ''
      });
    }

    return rows;
  };

  const getGeneralAverage = (subjectRows: SubjectRow[]) => {
    // Only main subjects (non sub-subjects) count toward general average
    const mainSubjects = subjectRows.filter(r => !r.isSubSubject && typeof r.final === 'number' && !isNaN(r.final));
    if (mainSubjects.length === 0) return '';
    const totalMain = subjectRows.filter(r => !r.isSubSubject && r.name.trim() !== '');
    if (mainSubjects.length < totalMain.length) return '';
    
    const sum = mainSubjects.reduce((a, b) => a + (b.final as number), 0);
    return Math.round(sum / mainSubjects.length);
  };

  const getRemarks = (val: number | string) => {
    if (val === '' || val === undefined || val === null) return '';
    const n = Number(val);
    if (isNaN(n)) return '';
    return n >= 75 ? 'Passed' : 'Failed';
  };

  const hasGradesData = (rec: any, gradeLvl: string) => {
    if (!rec) return false;
    let studentGrades = rec.grades || {};
    if (!studentGrades || typeof studentGrades !== 'object' || Array.isArray(studentGrades)) {
      return false;
    }

    const matchedGradeKey = Object.keys(studentGrades).find(k => isMatchingGrade(k, gradeLvl));
    if (matchedGradeKey) {
      studentGrades = studentGrades[matchedGradeKey];
    }
    if (!studentGrades || typeof studentGrades !== 'object' || Array.isArray(studentGrades)) {
      return false;
    }

    const subjects = Object.keys(studentGrades).filter(sub => sub && isNaN(Number(sub)));
    if (subjects.length > 0) {
      return subjects.some(subCode => {
        const gd = studentGrades[subCode] || {};
        if (typeof gd !== 'object' || Array.isArray(gd) || gd === null) return false;
        return Object.values(gd).some(val => val !== undefined && val !== null && val !== '');
      });
    }
    return rec.isManualHistory === true;
  };

  const findEnrollmentForGrade = (grade: string) => {
    if (!Array.isArray(history) || history.length === 0) return null;
    const matches = history.filter(h => isMatchingGrade(h?.gradeLevel || '', grade));
    if (matches.length === 0) return null;

    const manualWithGrades = matches.find(h => h.isManualHistory === true && hasGradesData(h, grade));
    if (manualWithGrades) return manualWithGrades;

    const activeWithGrades = matches.find(h => h.isManualHistory !== true && hasGradesData(h, grade));
    if (activeWithGrades) return activeWithGrades;

    const manual = matches.find(h => h.isManualHistory === true);
    if (manual) return manual;

    return null;
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    let d: Date;
    if (typeof dateStr === 'object' && dateStr.seconds !== undefined) {
      d = new Date(dateStr.seconds * 1000);
    } else if (typeof dateStr === 'object' && typeof dateStr.toDate === 'function') {
      d = dateStr.toDate();
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return '';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  // ===== Render a single grade block (one column of the side-by-side pair) =====
  const renderGradeBlock = (gradeLabel: string, enrollment: any, isThreeTerm: boolean) => {
    const subjectRows = getSubjectRows(enrollment, gradeLabel);
    const genAvg = getGeneralAverage(subjectRows);
    const adviser = enrollment?.adviserName || '';

    // Check if a subject has sub-subjects after it (to determine if it's a parent)
    const hasChildren = (index: number) => {
      if (index + 1 >= subjectRows.length) return false;
      return subjectRows[index + 1]?.isSubSubject === true;
    };

    return (
      <td style={{ border: '1px solid #000', padding: 0, verticalAlign: 'top', width: '50%' }}>
        {/* Metadata info header block */}
        <div style={{ padding: '3px 5px', borderBottom: '1px solid #000', fontSize: '7pt', display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
            <span><b>School:</b> <span style={{ borderBottom: '1px solid #000', minWidth: '100px', display: 'inline-block' }}>{enrollment?.schoolName || (enrollment ? schoolInfo.schoolName : '')}</span></span>
            <span><b>School ID:</b> <span style={{ borderBottom: '1px solid #000', minWidth: '40px', display: 'inline-block' }}>{enrollment?.schoolId || (enrollment ? schoolInfo.schoolId : '')}</span></span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span><b>District:</b> <span style={{ borderBottom: '1px solid #000', minWidth: '60px', display: 'inline-block' }}>{enrollment ? schoolInfo.district : ''}</span></span>
            <span><b>Division:</b> <span style={{ borderBottom: '1px solid #000', minWidth: '70px', display: 'inline-block' }}>{enrollment?.division || (enrollment ? schoolInfo.division : '')}</span></span>
            <span><b>Region:</b> <span style={{ borderBottom: '1px solid #000', minWidth: '20px', display: 'inline-block' }}>{enrollment ? schoolInfo.region : ''}</span></span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span><b>Classified as Grade:</b> <span style={{ borderBottom: '1px solid #000', minWidth: '25px', display: 'inline-block' }}>{enrollment ? gradeLabel.replace('Grade ', '') : ''}</span></span>
            <span><b>Section:</b> <span style={{ borderBottom: '1px solid #000', minWidth: '50px', display: 'inline-block' }}>{enrollment?.sectionName || ''}</span></span>
            <span><b>School Year:</b> <span style={{ borderBottom: '1px solid #000', minWidth: '60px', display: 'inline-block' }}>{enrollment?.academicYear || ''}</span></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
            <span><b>Name of Adviser/Teacher:</b> <span style={{ borderBottom: '1px solid #000', minWidth: '120px', display: 'inline-block' }}>{adviser}</span></span>
            <span><b>Signature:</b> <span style={{ borderBottom: '1px solid #000', minWidth: '50px', display: 'inline-block' }}></span></span>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '45%' }} />
            {isThreeTerm ? (
              <>
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
              </>
            ) : (
              <>
                <col style={{ width: '8.25%' }} />
                <col style={{ width: '8.25%' }} />
                <col style={{ width: '8.25%' }} />
                <col style={{ width: '8.25%' }} />
              </>
            )}
            <col style={{ width: '11%' }} />
            <col style={{ width: '11%' }} />
          </colgroup>
          <tbody>
            {/* Table Header */}
            <tr>
              <td style={{ ...headerCellStyle, textAlign: 'left', width: '40%' }} rowSpan={2}>LEARNING AREAS</td>
              <td style={headerCellStyle} colSpan={isThreeTerm ? 3 : 4}>Quarterly Rating</td>
              <td style={headerCellStyle} rowSpan={2}>Final<br/>Rating</td>
              <td style={headerCellStyle} rowSpan={2}>Remarks</td>
            </tr>
            <tr>
              {isThreeTerm ? (
                <>
                  <td style={{ ...headerCellStyle, width: '8%' }}>1</td>
                  <td style={{ ...headerCellStyle, width: '8%' }}>2</td>
                  <td style={{ ...headerCellStyle, width: '8%' }}>3</td>
                </>
              ) : (
                <>
                  <td style={{ ...headerCellStyle, width: '7%' }}>1</td>
                  <td style={{ ...headerCellStyle, width: '7%' }}>2</td>
                  <td style={{ ...headerCellStyle, width: '7%' }}>3</td>
                  <td style={{ ...headerCellStyle, width: '7%' }}>4</td>
                </>
              )}
            </tr>

            {/* Subject Rows — dynamically from encoded data */}
            {subjectRows.map((subj, sIdx) => {
              const isParent = !subj.isSubSubject && hasChildren(sIdx);
              return (
                <tr key={`${subj.name}-${sIdx}`}>
                  <td style={{
                    ...subjectCellStyle,
                    paddingLeft: subj.isSubSubject ? '12px' : '3px',
                    fontWeight: subj.isSubSubject ? 'normal' : 'bold',
                    fontStyle: subj.isSubSubject ? 'italic' : 'normal',
                    fontSize: subj.isSubSubject 
                      ? '7pt' 
                      : (subj.name && subj.name.length > 28 ? '6pt' : (subj.name && subj.name.length > 20 ? '6.5pt' : '7.5pt')),
                  }}>
                    {subj.name || <>&nbsp;</>}
                  </td>
                  {isThreeTerm ? (
                    <>
                      <td style={gradeCellStyle}>{subj.q1 !== '' ? subj.q1 : ''}</td>
                      <td style={gradeCellStyle}>{subj.q2 !== '' ? subj.q2 : ''}</td>
                      <td style={gradeCellStyle}>{subj.q3 !== '' ? subj.q3 : ''}</td>
                    </>
                  ) : (
                    <>
                      <td style={gradeCellStyle}>{subj.q1 !== '' ? subj.q1 : ''}</td>
                      <td style={gradeCellStyle}>{subj.q2 !== '' ? subj.q2 : ''}</td>
                      <td style={gradeCellStyle}>{subj.q3 !== '' ? subj.q3 : ''}</td>
                      <td style={gradeCellStyle}>{subj.q4 !== '' ? subj.q4 : ''}</td>
                    </>
                  )}
                  <td style={{ ...gradeCellStyle, fontWeight: 'bold' }}>
                    {subj.final !== '' ? subj.final : ''}
                  </td>
                  <td style={{ ...gradeCellStyle, fontSize: '6.5pt' }}>
                    {isParent || subj.isSubSubject ? '' : getRemarks(subj.final)}
                  </td>
                </tr>
              );
            })}

            {/* General Average Row */}
            <tr>
              <td style={{ ...subjectCellStyle, fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>General Average</td>
              <td style={{ ...gradeCellStyle, backgroundColor: '#f0f0f0' }} colSpan={isThreeTerm ? 3 : 4}></td>
              <td style={{ ...gradeCellStyle, fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{genAvg !== '' ? genAvg : ''}</td>
              <td style={{ ...gradeCellStyle, backgroundColor: '#f0f0f0', fontSize: '6.5pt' }}>{getRemarks(genAvg)}</td>
            </tr>
          </tbody>
        </table>

        {/* Remedial Classes Section */}
        {(() => {
          const remedialData = enrollment?.remedial;
          const classes = remedialData?.classes || [];
          const rowsToRender = [...classes];
          while (rowsToRender.length < 3) {
            rowsToRender.push({
              subjectName: '',
              finalRating: '',
              remedialMark: '',
              recomputedGrade: '',
              remarks: ''
            });
          }
          const fromVal = remedialData?.from || '';
          const toVal = remedialData?.to || '';

          return (
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  <td style={{ ...cellStyle, fontWeight: 'bold', fontSize: '7pt', width: '30%' }}>Remedial Classes</td>
                  <td style={{ ...cellStyle, fontSize: '7pt' }} colSpan={4}>
                    Conducted from: <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '60px', textAlign: 'center' }}>{fromVal || '__________'}</span> to <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '60px', textAlign: 'center' }}>{toVal || '__________'}</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ ...headerCellStyle, fontSize: '6.5pt', textAlign: 'left' }}>Learning Areas</td>
                  <td style={{ ...headerCellStyle, fontSize: '6.5pt' }}>Final Rating</td>
                  <td style={{ ...headerCellStyle, fontSize: '6.5pt' }}>Remedial Class Mark</td>
                  <td style={{ ...headerCellStyle, fontSize: '6.5pt' }}>Recomputed Final Grade</td>
                  <td style={{ ...headerCellStyle, fontSize: '6.5pt' }}>Remarks</td>
                </tr>
                {rowsToRender.map((row, i) => (
                  <tr key={`rem-${i}`}>
                    <td style={{ ...cellStyle, height: '12px', fontWeight: 'bold' }}>{row.subjectName || <>&nbsp;</>}</td>
                    <td style={gradeCellStyle}>{row.finalRating || ''}</td>
                    <td style={gradeCellStyle}>{row.remedialMark || ''}</td>
                    <td style={gradeCellStyle}>{row.recomputedGrade || ''}</td>
                    <td style={gradeCellStyle}>{row.remarks || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()}
      </td>
    );
  };

  // ===== Render a side-by-side grade pair =====
  const renderGradePair = (leftGrade: string, rightGrade: string) => {
    const leftEnrollment = findEnrollmentForGrade(leftGrade);
    const rightEnrollment = findEnrollmentForGrade(rightGrade);
    const leftThreeTerm = leftEnrollment ? isThreeTermYear(leftEnrollment.academicYear) : false;
    const rightThreeTerm = rightEnrollment ? isThreeTermYear(rightEnrollment.academicYear) : false;

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            {renderGradeBlock(leftGrade, leftEnrollment, leftThreeTerm)}
            {renderGradeBlock(rightGrade, rightEnrollment, rightThreeTerm)}
          </tr>
        </tbody>
      </table>
    );
  };

  const studentFullName = selectedStudent
    ? `${selectedStudent.lastName || ''}, ${selectedStudent.firstName || ''} ${selectedStudent.middleName || ''}`.trim()
    : '';

  return (
    <ReportLayout title="School Form 10 (SF10-ES) - Learner's Permanent Record" onClose={onClose} landscape={false}>
      {/* Search and Selector Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded-2xl print:hidden shrink-0">
        {/* Student Custom Search Selector */}
        <div className="relative w-full sm:w-80">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 focus:outline-none transition-all shadow-sm"
          >
            <span>{selectedStudent ? `${selectedStudent.lastName}, ${selectedStudent.firstName}` : 'Select Student'}</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>

          {isOpen && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student or LRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs font-medium border-none outline-none focus:ring-0 bg-transparent text-slate-700"
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => {
                        setSelectedStudentId(student.id);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                        student.id === selectedStudentId ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{student.lastName}, {student.firstName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{student.lrn}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 font-medium">
                    No students found matching your search.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-indigo-700 transition-all shadow-md ml-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print SF10</span>
        </button>
      </div>

      {loadingHistory ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-slate-500">Loading student permanent history...</span>
        </div>
      ) : selectedStudent ? (
        <div style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>

          {/* ========================= PAGE 1 (FRONT) ========================= */}
          <div
            className="sf10-page"
            style={{
              width: '10in',
              minHeight: '7.5in',
              margin: '0 auto',
              padding: '0.3in 0.4in',
              backgroundColor: '#fff',
              boxSizing: 'border-box',
            }}
          >
            {/* ===== LEARNER'S PERSONAL INFORMATION ===== */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
              <tbody>
                <tr>
                  <td colSpan={8} style={{ border: '1px solid #000', backgroundColor: '#d9d9d9', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', padding: '2px' }}>
                    LEARNER'S PERSONAL INFORMATION
                  </td>
                </tr>
                <tr>
                  <td style={{ ...cellStyle, width: '12%' }}><b>LAST NAME:</b></td>
                  <td style={{ ...cellStyle, width: '18%', textTransform: 'uppercase' }}>{selectedStudent.lastName || ''}</td>
                  <td style={{ ...cellStyle, width: '12%' }}><b>FIRST NAME:</b></td>
                  <td style={{ ...cellStyle, width: '18%', textTransform: 'uppercase' }}>{selectedStudent.firstName || ''}</td>
                  <td style={{ ...cellStyle, width: '12%', fontSize: '6.5pt' }}><b>NAME EXTN. (Jr,I,II):</b></td>
                  <td style={{ ...cellStyle, width: '8%' }}>{selectedStudent.nameExtension || ''}</td>
                  <td style={{ ...cellStyle, width: '12%' }}><b>MIDDLE NAME:</b></td>
                  <td style={{ ...cellStyle, width: '8%', textTransform: 'uppercase' }}>{selectedStudent.middleName || ''}</td>
                </tr>
                <tr>
                  <td colSpan={2} style={cellStyle}><b>Learner Reference Number (LRN):</b></td>
                  <td colSpan={2} style={{ ...cellStyle, fontFamily: 'monospace', letterSpacing: '2px' }}>{selectedStudent.lrn || ''}</td>
                  <td style={cellStyle}><b>Birthdate (mm/dd/yyyy):</b></td>
                  <td style={cellStyle}>{formatDate(selectedStudent.birthDate)}</td>
                  <td style={cellStyle}><b>Sex:</b></td>
                  <td style={{ ...cellStyle, textTransform: 'uppercase' }}>{selectedStudent.gender || ''}</td>
                </tr>
              </tbody>
            </table>

            {/* ===== ELIGIBILITY ===== */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
              <tbody>
                <tr>
                  <td colSpan={6} style={{ border: '1px solid #000', backgroundColor: '#d9d9d9', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', padding: '2px' }}>
                    ELIGIBILITY FOR ELEMENTARY SCHOOL ENROLMENT
                  </td>
                </tr>
                <tr>
                  <td colSpan={6} style={{ ...cellStyle, fontSize: '7pt' }}>
                    <b>Credential Presented for Grade 1:</b>&nbsp;&nbsp;&nbsp;
                    ☐ Kinder Progress Report&nbsp;&nbsp;&nbsp;
                    ☐ ECCD Checklist&nbsp;&nbsp;&nbsp;
                    ☐ Kindergarten Certificate of Completion
                  </td>
                </tr>
                <tr>
                  <td style={{ ...cellStyle, width: '15%' }}><b>Name of School:</b></td>
                  <td style={{ ...cellStyle, width: '25%' }}></td>
                  <td style={{ ...cellStyle, width: '10%' }}><b>School ID:</b></td>
                  <td style={{ ...cellStyle, width: '10%' }}></td>
                  <td style={{ ...cellStyle, width: '15%' }}><b>Address of School:</b></td>
                  <td style={{ ...cellStyle, width: '25%' }}></td>
                </tr>
                <tr>
                  <td colSpan={6} style={{ ...cellStyle, fontSize: '7pt' }}>
                    <b>Other Credential Presented</b>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ ...cellStyle, fontSize: '7pt' }}>
                    PEPT Passer Rating: ___________
                  </td>
                  <td colSpan={2} style={{ ...cellStyle, fontSize: '7pt' }}>
                    Date of Examination/Assessment (mm/dd/yyyy): ___________
                  </td>
                  <td colSpan={2} style={{ ...cellStyle, fontSize: '7pt' }}>
                    Others (Pls. Specify): ___________
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ ...cellStyle, fontSize: '7pt' }}>
                    Name and Address of Testing Center: ___________________
                  </td>
                  <td colSpan={3} style={{ ...cellStyle, fontSize: '7pt' }}>
                    Remark: ___________________
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ===== SCHOLASTIC RECORD BANNER ===== */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', backgroundColor: '#d9d9d9', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', padding: '2px' }}>
                    SCHOLASTIC RECORD
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ===== GRADE 1 | GRADE 2 ===== */}
            {renderGradePair('Grade 1', 'Grade 2')}

            {/* ===== GRADE 3 | GRADE 4 ===== */}
            {renderGradePair('Grade 3', 'Grade 4')}
          </div>

          {/* ========================= PAGE 2 (BACK) ========================= */}
          <div
            className="sf10-page"
            style={{
              width: '10in',
              minHeight: '7.5in',
              margin: '0 auto',
              padding: '0.3in 0.4in',
              backgroundColor: '#fff',
              boxSizing: 'border-box',
              pageBreakBefore: 'always',
            }}
          >
            {/* Header */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2px' }}>
              <tbody>
                <tr>
                  <td style={{ fontSize: '8pt', fontWeight: 'bold', padding: '2px', width: '20%' }}>SF10-ES</td>
                  <td style={{ fontSize: '8pt', textAlign: 'right', padding: '2px' }}>Page 2 of ________</td>
                </tr>
              </tbody>
            </table>

            {/* Scholastic Record Banner */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '0' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', backgroundColor: '#d9d9d9', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', padding: '2px' }}>
                    SCHOLASTIC RECORD
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ===== GRADE 5 | GRADE 6 ===== */}
            {renderGradePair('Grade 5', 'Grade 6')}

            {/* ===== CERTIFICATION SECTION ===== */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', backgroundColor: '#d9d9d9', textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', padding: '3px' }}>
                    For Transfer Out / Elementary School Completer Only
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Certification Box */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
              <tbody>
                <tr>
                  <td colSpan={4} style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', padding: '3px', backgroundColor: '#f5f5f5' }}>
                    CERTIFICATION
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ ...cellStyle, fontSize: '7.5pt', padding: '4px 6px', lineHeight: '1.6' }}>
                    {'I CERTIFY that this is a true record of '}
                    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '120px' }}>{studentFullName}</span>
                    {' with LRN '}
                    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '100px' }}>{selectedStudent.lrn || ''}</span>
                    {' and that he/she is eligible for admission to Grade '}
                    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '30px' }}></span>.
                  </td>
                </tr>
                <tr>
                  <td style={{ ...cellStyle, fontSize: '7pt', width: '25%' }}><b>School Name:</b> <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '80px' }}></span></td>
                  <td style={{ ...cellStyle, fontSize: '7pt', width: '20%' }}><b>School ID:</b> <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '50px' }}></span></td>
                  <td style={{ ...cellStyle, fontSize: '7pt', width: '20%' }}><b>Division:</b> <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '60px' }}></span></td>
                  <td style={{ ...cellStyle, fontSize: '7pt', width: '35%' }}><b>Last School Year Attended:</b> <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '60px' }}></span></td>
                </tr>
                <tr>
                  <td style={{ ...cellStyle, height: '40px', verticalAlign: 'bottom', padding: '4px 6px' }}>
                    <div style={{ fontSize: '7pt' }}>
                      <div style={{ borderBottom: '1px solid #000', width: '80%', marginBottom: '2px' }}>&nbsp;</div>
                      <div>Date</div>
                    </div>
                  </td>
                  <td colSpan={2} style={{ ...cellStyle, height: '40px', verticalAlign: 'bottom', padding: '4px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '7pt' }}>
                      <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto 2px', fontWeight: 'bold' }}>{principalName}</div>
                      <div>Signature of Principal/School Head over Printed Name</div>
                    </div>
                  </td>
                  <td style={{ ...cellStyle, height: '40px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ fontSize: '7pt', fontStyle: 'italic', color: '#666' }}>(Affix School Seal here)</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Certification Box 2 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginTop: '4px' }}>
              <tbody>
                <tr>
                  <td colSpan={4} style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold', fontSize: '8pt', padding: '3px', backgroundColor: '#f5f5f5' }}>
                    CERTIFICATION
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} style={{ ...cellStyle, fontSize: '7.5pt', padding: '4px 6px', lineHeight: '1.6' }}>
                    {'I CERTIFY that this is a true record of '}
                    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '120px' }}>{studentFullName}</span>
                    {' with LRN '}
                    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '100px' }}>{selectedStudent.lrn || ''}</span>
                    {' and that he/she is eligible for admission to Grade '}
                    <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '30px' }}></span>.
                  </td>
                </tr>
                <tr>
                  <td style={{ ...cellStyle, fontSize: '7pt', width: '25%' }}><b>School Name:</b> <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '80px' }}></span></td>
                  <td style={{ ...cellStyle, fontSize: '7pt', width: '20%' }}><b>School ID:</b> <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '50px' }}></span></td>
                  <td style={{ ...cellStyle, fontSize: '7pt', width: '20%' }}><b>Division:</b> <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '60px' }}></span></td>
                  <td style={{ ...cellStyle, fontSize: '7pt', width: '35%' }}><b>Last School Year Attended:</b> <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '60px' }}></span></td>
                </tr>
                <tr>
                  <td style={{ ...cellStyle, height: '40px', verticalAlign: 'bottom', padding: '4px 6px' }}>
                    <div style={{ fontSize: '7pt' }}>
                      <div style={{ borderBottom: '1px solid #000', width: '80%', marginBottom: '2px' }}>&nbsp;</div>
                      <div>Date</div>
                    </div>
                  </td>
                  <td colSpan={2} style={{ ...cellStyle, height: '40px', verticalAlign: 'bottom', padding: '4px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '7pt' }}>
                      <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto 2px', fontWeight: 'bold' }}>{principalName}</div>
                      <div>Signature of Principal/School Head over Printed Name</div>
                    </div>
                  </td>
                  <td style={{ ...cellStyle, height: '40px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ fontSize: '7pt', fontStyle: 'italic', color: '#666' }}>(Affix School Seal here)</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ textAlign: 'right', fontSize: '7pt', marginTop: '4px', color: '#666' }}>
              SFRT Revised 2017
            </div>
          </div>

          {/* Print-only CSS */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-container, .print-container * {
                visibility: visible;
              }
              .print-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #fff !important;
              }
              .print\\:hidden {
                display: none !important;
              }
              .sf10-page {
                width: 100% !important;
                max-width: 100% !important;
                page-break-after: always;
                page-break-inside: avoid;
                margin: 0 auto !important;
                padding: 0.2in !important;
                box-sizing: border-box !important;
              }
              .sf10-page:last-child {
                page-break-after: auto;
              }
              @page {
                size: portrait;
                margin: 0.2in;
              }
            }
            @media screen {
              .sf10-page {
                border: 1px solid #cbd5e1;
                margin-bottom: 24px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
              }
            }
          `}</style>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-semibold bg-slate-50 border border-dashed border-slate-300 rounded-3xl shrink-0">
          <FileText className="w-12 h-12 text-slate-300 mb-2" />
          <span>Please select a student above to load and view their SF10 permanent academic record.</span>
        </div>
      )}
    </ReportLayout>
  );
}

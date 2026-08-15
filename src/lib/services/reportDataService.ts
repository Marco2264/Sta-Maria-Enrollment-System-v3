import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ─── Interfaces ───────────────────────────────────────────────────────────────

/**
 * Represents a single learner row in the SF1 School Register.
 * All fields are optional for resilience; the UI renders blanks for missing data.
 */
export interface SF1Learner {
  id: string;
  lrn: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  gender?: string;
  birthDate?: string;
  age?: number;
  birthCity?: string;
  birthProvince?: string;
  motherTongue?: string;
  indigenousGroup?: string;
  religion?: string;
  addressStreet?: string;
  addressBarangay?: string;
  addressCity?: string;
  addressProvince?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianRelationship?: string;
  contactNumber?: string;
  remarks?: string;
}

export interface SF1Data {
  schoolYear: string;
  gradeLevel: string;
  section: string;
  advisorName?: string;
  learners: SF1Learner[];
}

export async function fetchAdviserForSection(sectionId?: string): Promise<string> {
  if (!sectionId || sectionId === 'all') return '';
  try {
    const secRef = doc(db, 'sections', sectionId);
    const secSnap = await getDoc(secRef);
    if (secSnap.exists()) {
      const data = secSnap.data();
      if (data.adviserName) return data.adviserName;
      if (data.teacherName) return data.teacherName;
      if (data.advisorName) return data.advisorName;
    }

    const qAssign = query(collection(db, 'assignments'), where('sectionId', '==', sectionId));
    const assignSnap = await getDocs(qAssign);
    if (!assignSnap.empty) {
      const teacherId = assignSnap.docs[0].data().teacherId;
      if (teacherId) {
        const userSnap = await getDoc(doc(db, 'users', teacherId));
        if (userSnap.exists()) {
          const uData = userSnap.data();
          const fullName = `${uData.firstName || ''} ${uData.lastName || ''}`.trim() || uData.displayName;
          if (fullName) return fullName;
        }
      }
    }
  } catch (e) {
    console.warn('Could not fetch adviser for section:', e);
  }
  return '';
}

/**
 * Represents one section's row in the SF4 Monthly Movement and Attendance form.
 * Absent/present/late counts default to 0 if attendance data is missing.
 */
export interface SF4SectionRow {
  gradeLevel: string;
  section: string;
  advisorName: string;
  maleCount: number;
  femaleCount: number;
  totalCount: number;
  avgDailyAttendanceMale: number;
  avgDailyAttendanceFemale: number;
  avgDailyAttendanceTotal: number;
  attendancePctMale: number;
  attendancePctFemale: number;
  attendancePctTotal: number;

  // NLPA / Dropped Out
  nlpaPrevMale?: number;
  nlpaPrevFemale?: number;
  nlpaPrevTotal?: number;
  nlpaMonthMale?: number;
  nlpaMonthFemale?: number;
  nlpaMonthTotal?: number;
  nlpaEndMale?: number;
  nlpaEndFemale?: number;
  nlpaEndTotal?: number;

  // Transferred Out
  tOutPrevMale?: number;
  tOutPrevFemale?: number;
  tOutPrevTotal?: number;
  tOutMonthMale?: number;
  tOutMonthFemale?: number;
  tOutMonthTotal?: number;
  tOutEndMale?: number;
  tOutEndFemale?: number;
  tOutEndTotal?: number;

  // Transferred In
  tInPrevMale?: number;
  tInPrevFemale?: number;
  tInPrevTotal?: number;
  tInMonthMale?: number;
  tInMonthFemale?: number;
  tInMonthTotal?: number;
  tInEndMale?: number;
  tInEndFemale?: number;
  tInEndTotal?: number;
}

export interface SF4Data {
  schoolYear: string;
  reportMonth: string;
  sections: SF4SectionRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === 'object' && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  const d = new Date(val as string | number);
  return isNaN(d.getTime()) ? null : d;
}

function calcAge(birthDateStr: string | undefined): number | undefined {
  if (!birthDateStr) return undefined;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return undefined;
  const juneFirst = new Date(new Date().getFullYear(), 5, 1);
  let age = juneFirst.getFullYear() - birth.getFullYear();
  if (
    juneFirst.getMonth() < birth.getMonth() ||
    (juneFirst.getMonth() === birth.getMonth() && juneFirst.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

function formatBirthDate(str: string | undefined): string {
  if (!str) return '';
  const d = new Date(str.includes('T') ? str : `${str}T00:00:00`);
  if (isNaN(d.getTime())) return str;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
}

export function buildSF1Remarks(data: any): string {
  if (data.remarks && typeof data.remarks === 'string' && data.remarks.trim()) {
    return data.remarks.trim();
  }

  const status = (data.status || '').trim();

  // 1. Transferred Out -> T/O
  if (status === 'Transferred Out' || status === 'Transferred' || status === 'T/O') {
    const schName = data.transferredOutSchoolName || data.schoolName || '';
    const schType = data.transferredOutSchoolType || data.schoolType || '';
    const dateStr = formatBirthDate(data.transferredOutDate || data.effectivityDate);
    const typeLabel = schType === 'Private' || schType === 'PR' ? 'PR' : schType === 'Public' || schType === 'P' ? 'P' : '';

    let parts = ['T/O'];
    if (schName) {
      parts.push(`- ${schName}${typeLabel ? ` (${typeLabel})` : ''}`);
    }
    if (dateStr) {
      parts.push(dateStr);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  // 2. Transferred IN -> T/I
  if (status === 'Transferred In' || status === 'T/I') {
    const schName = data.transferredInSchoolName || data.schoolName || '';
    const schType = data.transferredInSchoolType || data.schoolType || '';
    const dateStr = formatBirthDate(data.transferredInDate || data.effectivityDate);
    const typeLabel = schType === 'Private' || schType === 'PR' ? 'PR' : schType === 'Public' || schType === 'P' ? 'P' : '';

    let parts = ['T/I'];
    if (schName) {
      parts.push(`- ${schName}${typeLabel ? ` (${typeLabel})` : ''}`);
    }
    if (dateStr) {
      parts.push(dateStr);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  // 3. Dropped -> DRP
  if (status === 'Dropped' || status === 'DRP') {
    const reason = data.droppedReason || data.reason || '';
    const dateStr = formatBirthDate(data.droppedDate || data.effectivityDate);

    let parts = ['DRP'];
    if (reason) {
      parts.push(`- ${reason}`);
    }
    if (dateStr) {
      parts.push(dateStr);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  // 4. Late Enrollment -> LE
  if (status === 'Late Enrollment' || status === 'LE' || data.isLateEnrollment === true) {
    const dateStr = formatBirthDate(data.lateEnrollmentDate || data.enrollmentDate || data.effectivityDate);
    let parts = ['LE'];
    if (dateStr) {
      parts.push(`- ${dateStr}`);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  return '';
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ReportDataService {
  /**
   * Composes SF1 data for a given school year and optional section/grade filter.
   * Pulls from `enrollments` collection (with linked user demographic fields).
   * Falls back gracefully if no matching enrollment records are found.
   */
  static async getSF1Data(
    schoolYear: string,
    gradeLevel?: string,
    sectionId?: string
  ): Promise<SF1Data> {
    try {
      const enrollRef = collection(db, 'enrollments');

      // Fetch enrolled, transferred, and dropped students
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraints: any[] = [where('status', 'in', ['Enrolled', 'enrolled', 'Transferred Out', 'Transferred In', 'Dropped', 'Transferred'])];

      const snap = await getDocs(query(enrollRef, ...constraints));

      // Filter in memory
      let docs = snap.docs;
      if (gradeLevel && gradeLevel !== 'All') {
        // Normalize both sides to handle "Grade 6" vs "6" storage differences
        const normalizedFilter = gradeLevel.replace(/Grade /i, '').trim();
        docs = docs.filter(d => {
          const gl = (d.data().gradeLevel ?? '').replace(/Grade /i, '').trim();
          return gl === normalizedFilter;
        });
      }
      if (sectionId && sectionId !== 'all') {
        docs = docs.filter(d => d.data().sectionId === sectionId);
      }

      const learners: SF1Learner[] = docs.map(d => {
        const data = d.data();
        const bdate: string | undefined =
          typeof data.birthDate === 'string'
            ? data.birthDate
            : toDate(data.birthDate)?.toISOString().split('T')[0];

        return {
          id: d.id,
          lrn: data.lrn ?? '',
          lastName: data.lastName ?? data.familyName ?? '',
          firstName: data.firstName ?? data.givenName ?? '',
          middleName: data.middleName ?? '',
          gender: data.gender ?? '',
          birthDate: formatBirthDate(bdate),
          age: calcAge(bdate),
          birthCity: data.address?.birthCity ?? data.birthCity ?? '',
          birthProvince: data.address?.birthProvince ?? data.birthProvince ?? '',
          motherTongue: data.additional?.motherTongue ?? data.motherTongue ?? '',
          indigenousGroup:
            data.additional?.isIndigenous
              ? (data.additional?.indigenousGroup ?? '')
              : '',
          religion: data.additional?.religion ?? data.religion ?? '',
          addressStreet: data.address?.street ?? '',
          addressBarangay: data.address?.barangay ?? '',
          addressCity: data.address?.city ?? '',
          addressProvince: data.address?.province ?? '',
          fatherName: data.fatherName ?? '',
          motherName: data.motherName ?? '',
          guardianName: data.medical?.emergencyContact ?? data.guardianName ?? '',
          guardianRelationship: data.guardianRelationship ?? 'Parent',
          contactNumber: data.medical?.emergencyPhone ?? data.contactNumber ?? '',
          remarks: buildSF1Remarks(data),
        };
      });

      // Sort learners by Gender (Males first, then Females) and then alphabetically by Last Name
      learners.sort((a, b) => {
        const isAMale = !a.gender?.toLowerCase().startsWith('f');
        const isBMale = !b.gender?.toLowerCase().startsWith('f');
        if (isAMale && !isBMale) return -1;
        if (!isAMale && isBMale) return 1;
        return a.lastName.localeCompare(b.lastName);
      });

      // Resolve section & grade display names from sectionId if provided
      let sectionName = sectionId && sectionId !== 'all' ? sectionId : 'All Sections';
      let advisorName = '';
      if (sectionId && sectionId !== 'all') {
        try {
          const secRef = doc(db, 'sections', sectionId);
          const secSnap = await getDoc(secRef);
          if (secSnap.exists()) {
            sectionName = secSnap.data().name || secSnap.data().sectionName || sectionName;
            advisorName = secSnap.data().adviserName || '';
          }

          // Fetch adviser name dynamically from assignments and users
          const qAssign = query(collection(db, 'assignments'), where('sectionId', '==', sectionId));
          const assignSnap = await getDocs(qAssign);
          if (!assignSnap.empty) {
            const teacherId = assignSnap.docs[0].data().teacherId;
            if (teacherId) {
              const userSnap = await getDoc(doc(db, 'users', teacherId));
              if (userSnap.exists()) {
                const uData = userSnap.data();
                const fullName = `${uData.firstName || ''} ${uData.lastName || ''}`.trim();
                if (fullName) {
                  advisorName = fullName;
                }
              }
            }
          }
        } catch (e) {
          console.warn('Could not fetch section name / adviser:', e);
        }
      }

      return {
        schoolYear,
        gradeLevel: gradeLevel ?? 'All',
        section: sectionName,
        advisorName,
        learners,
      };
    } catch (err) {
      console.error('[ReportDataService] getSF1Data error:', err);
      return { schoolYear, gradeLevel: gradeLevel ?? 'All', section: 'All Sections', learners: [] };
    }
  }

  /**
   * Generates SF2 Data (Daily Attendance Report of Learners)
   * Fetches enrolled learners in a section, and their daily attendance for a specific month.
   */
  static async getSF2Data(schoolYear: string, sectionId: string, monthName: string) {
    try {
      // Fetch enrolled and transferred/dropped students for the section
      const enrollRef = collection(db, 'enrollments');
      const constraints: any[] = [where('status', 'in', ['Enrolled', 'enrolled', 'Transferred Out', 'Transferred In', 'Dropped', 'Transferred'])];
      const q = query(enrollRef, ...constraints);
      const enrollSnap = await getDocs(q);
      
      let docs = enrollSnap.docs;
      if (sectionId && sectionId !== 'all') {
        docs = docs.filter(d => d.data().sectionId === sectionId);
      }
      
      const learners = docs.map(d => {
        const data = d.data();
        return {
          id: data.studentId || d.id,
          lastName: data.lastName || '',
          firstName: data.firstName || '',
          gender: data.gender || '',
          attendance: {} as Record<string, string> // e.g. '01': 'Present'
        };
      });

      // Sort learners
      learners.sort((a, b) => {
        const isAMale = !a.gender?.toLowerCase().startsWith('f');
        const isBMale = !b.gender?.toLowerCase().startsWith('f');
        if (isAMale && !isBMale) return -1;
        if (!isAMale && isBMale) return 1;
        return a.lastName.localeCompare(b.lastName);
      });

      // Determine month index
      const monthIndex = [
        'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
        'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
      ].indexOf(monthName.toUpperCase()) + 1;
      
      const monthStr = monthIndex.toString().padStart(2, '0');

      // Fetch attendance
      const attendRef = collection(db, 'attendance');
      const attendQ = query(attendRef, where('sectionId', '==', sectionId));
      const attendSnap = await getDocs(attendQ);

      attendSnap.docs.forEach(doc => {
        const data = doc.data();
        const dateStr = data.date; // YYYY-MM-DD
        if (!dateStr) return;
        const [y, m, d] = dateStr.split('-');
        if (m === monthStr) {
          const learner = learners.find(l => l.id === data.studentId);
          if (learner) {
            // For SF2, we simplify AM/PM to a single day status, favoring absent if any part is absent
            const am = (data.amStatus || data.status || 'present').toLowerCase();
            const pm = (data.pmStatus || data.status || 'present').toLowerCase();
            let dayStatus = 'present';
            if (am === 'absent' || pm === 'absent') dayStatus = 'absent';
            else if (am === 'late' || pm === 'late') dayStatus = 'late';
            
            learner.attendance[parseInt(d, 10)] = dayStatus;
          }
        }
      });

      // Get section info
      let sectionName = sectionId;
      let advisorName = '';
      let gradeLevel = '';
      if (sectionId !== 'all') {
        try {
          const secSnap = await getDoc(doc(db, 'sections', sectionId));
          if (secSnap.exists()) {
            sectionName = secSnap.data().name || secSnap.data().sectionName || sectionId;
            advisorName = secSnap.data().adviserName || '';
            gradeLevel = secSnap.data().gradeLevel || '';
          }
          
          // Fetch adviser name dynamically from assignments and users
          const qAssign = query(collection(db, 'assignments'), where('sectionId', '==', sectionId));
          const assignSnap = await getDocs(qAssign);
          if (!assignSnap.empty) {
            const teacherId = assignSnap.docs[0].data().teacherId;
            if (teacherId) {
              const userSnap = await getDoc(doc(db, 'users', teacherId));
              if (userSnap.exists()) {
                const uData = userSnap.data();
                const fullName = `${uData.firstName || ''} ${uData.lastName || ''}`.trim();
                if (fullName) {
                  advisorName = fullName;
                }
              }
            }
          }
        } catch (e) {
          console.error("Error fetching dynamically assigned advisor:", e);
        }
      }

      return {
        schoolYear,
        gradeLevel,
        section: sectionName,
        advisorName,
        month: monthName,
        learners
      };
    } catch (err) {
      console.error('getSF2Data error:', err);
      return { schoolYear, gradeLevel: '', section: sectionId, advisorName: '', month: monthName, learners: [] };
    }
  }

  /**
   * Composes SF4 data for a given school year and report month.
   * Aggregates enrollment counts per section and computes attendance averages
   * from the `attendance` collection. Defaults to 0 when records are absent.
   */
  static async getSF4Data(schoolYear: string, reportMonth: string, assignedGrade?: string, sectionId?: string): Promise<SF4Data> {
    try {
      const enrollRef = collection(db, 'enrollments');
      const enrollSnap = await getDocs(query(enrollRef));

      let docs = enrollSnap.docs;

      // Elementary School Grade Filter: Exclude Kinder, Kindergarten, and Grade 7 through Grade 12
      docs = docs.filter(d => {
        const rawG = (d.data().gradeLevel || '').toString().trim();
        const numG = rawG.replace(/Grade /i, '').trim();
        const num = parseInt(numG, 10);
        if (rawG.toLowerCase().includes('kinder')) return false;
        if (!isNaN(num) && (num < 1 || num > 6)) return false;
        return true;
      });

      if (assignedGrade) {
        const numGrade = assignedGrade.replace(/Grade /i, '').trim();
        const fullGrade = `Grade ${numGrade}`;
        docs = docs.filter(d => {
          const g = d.data().gradeLevel;
          return g === assignedGrade || g === numGrade || g === fullGrade;
        });
      }

      if (sectionId && sectionId !== 'all') {
        docs = docs.filter(d => d.data().sectionId === sectionId);
      }

      const monthIndex = [
        'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
        'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
      ].indexOf(reportMonth.toUpperCase());

      // Group enrollment counts by sectionId
      const sectionEnrollMap: Record<
        string,
        {
          gradeLevel: string;
          sectionName: string;
          advisorName: string;
          males: number;
          females: number;
          tOutPrevMale: number;
          tOutPrevFemale: number;
          tOutMonthMale: number;
          tOutMonthFemale: number;
          tInPrevMale: number;
          tInPrevFemale: number;
          tInMonthMale: number;
          tInMonthFemale: number;
          nlpaPrevMale: number;
          nlpaPrevFemale: number;
          nlpaMonthMale: number;
          nlpaMonthFemale: number;
        }
      > = {};

      const sectionsRef = collection(db, 'sections');
      const sectionsSnap = await getDocs(query(sectionsRef));

      const assignmentsSnap = await getDocs(collection(db, 'assignments'));
      const usersSnap = await getDocs(collection(db, 'users'));
      const teacherMap: Record<string, string> = {};
      usersSnap.docs.forEach(u => {
        const uData = u.data();
        const fName = (uData.firstName || uData.givenName || '').trim();
        const lName = (uData.lastName || uData.familyName || '').trim();
        const name = `${fName} ${lName}`.trim() || uData.displayName || uData.fullName || '';
        teacherMap[u.id] = name;
        if (uData.uid) teacherMap[uData.uid] = name;
      });

      const sectionTeacherMap: Record<string, string> = {};
      assignmentsSnap.docs.forEach(a => {
        const aData = a.data();
        if (aData.sectionId) {
          const tName = teacherMap[aData.teacherId] || teacherMap[aData.adviserId] || aData.teacherName || aData.adviserName || '';
          if (tName) {
            sectionTeacherMap[aData.sectionId] = tName;
          }
        }
      });

      const sectionInfo: Record<string, { name: string; adviser: string }> = {};
      sectionsSnap.docs.forEach(d => {
        const sData = d.data();
        let rawName = sData.name || sData.sectionName || sData.title || d.id;
        if (rawName.includes('sec_') || rawName.includes('section_')) {
          const parts = rawName.split('_');
          const last = parts[parts.length - 1];
          rawName = last.charAt(0).toUpperCase() + last.slice(1);
        }
        sectionInfo[d.id] = {
          name: rawName,
          adviser: sectionTeacherMap[d.id] || teacherMap[sData.adviserId] || teacherMap[sData.teacherId] || sData.adviserName || sData.advisorName || sData.teacherName || ''
        };
      });

      docs.forEach(d => {
        const data = d.data();
        const sid = data.sectionId || 'unknown';

        let resolvedSecName = data.sectionName || sectionInfo[sid]?.name || sid;
        if (resolvedSecName === sid || resolvedSecName.includes('sec_') || resolvedSecName.includes('section_') || resolvedSecName === 'unknown' || (resolvedSecName.length > 20 && !resolvedSecName.includes(' '))) {
          if (sectionInfo[sid]?.name && sectionInfo[sid].name !== sid && !sectionInfo[sid].name.includes('sec_')) {
            resolvedSecName = sectionInfo[sid].name;
          } else if (sid.includes('_')) {
            const parts = sid.split('_');
            const last = parts[parts.length - 1];
            resolvedSecName = last.charAt(0).toUpperCase() + last.slice(1);
          } else {
            resolvedSecName = 'Section';
          }
        }

        let resolvedAdvName = sectionInfo[sid]?.adviser || teacherMap[data.advisorName] || teacherMap[data.adviserName] || data.advisorName || data.adviserName || '';
        if (teacherMap[resolvedAdvName]) {
          resolvedAdvName = teacherMap[resolvedAdvName];
        }
        if (!resolvedAdvName || resolvedAdvName === sid || (resolvedAdvName.length > 20 && !resolvedAdvName.includes(' '))) {
          resolvedAdvName = 'TBA';
        }

        if (!sectionEnrollMap[sid]) {
          sectionEnrollMap[sid] = {
            gradeLevel: data.gradeLevel || '',
            sectionName: resolvedSecName,
            advisorName: resolvedAdvName,
            males: 0,
            females: 0,
            tOutPrevMale: 0,
            tOutPrevFemale: 0,
            tOutMonthMale: 0,
            tOutMonthFemale: 0,
            tInPrevMale: 0,
            tInPrevFemale: 0,
            tInMonthMale: 0,
            tInMonthFemale: 0,
            nlpaPrevMale: 0,
            nlpaPrevFemale: 0,
            nlpaMonthMale: 0,
            nlpaMonthFemale: 0,
          };
        }
        const gender = (data.gender || '').toLowerCase();
        const isMale = gender === 'male' || gender === 'm';
        const st = (data.status || '').toString().trim();

        // Determine date of event
        const statusDateVal = data.transferredOutDate || data.transferredInDate || data.droppedDate || data.statusDate || data.updatedAt || data.submittedAt || data.createdAt;
        const sDate = toDate(statusDateVal);
        let isForMonth = true;
        let isPrevMonth = false;
        if (sDate && monthIndex !== -1) {
          const sMonth = sDate.getMonth();
          if (sMonth === monthIndex) {
            isForMonth = true;
            isPrevMonth = false;
          } else if (sMonth < monthIndex) {
            isForMonth = false;
            isPrevMonth = true;
          }
        }

        if (st === 'Transferred Out' || st === 'Transferred') {
          if (isPrevMonth) {
            if (isMale) sectionEnrollMap[sid].tOutPrevMale++; else sectionEnrollMap[sid].tOutPrevFemale++;
          } else {
            if (isMale) sectionEnrollMap[sid].tOutMonthMale++; else sectionEnrollMap[sid].tOutMonthFemale++;
          }
        } else if (st === 'Transferred In') {
          if (isMale) {
            sectionEnrollMap[sid].males++;
            if (isPrevMonth) sectionEnrollMap[sid].tInPrevMale++; else sectionEnrollMap[sid].tInMonthMale++;
          } else {
            sectionEnrollMap[sid].females++;
            if (isPrevMonth) sectionEnrollMap[sid].tInPrevFemale++; else sectionEnrollMap[sid].tInMonthFemale++;
          }
        } else if (st === 'Dropped' || st === 'NLPA') {
          if (isPrevMonth) {
            if (isMale) sectionEnrollMap[sid].nlpaPrevMale++; else sectionEnrollMap[sid].nlpaPrevFemale++;
          } else {
            if (isMale) sectionEnrollMap[sid].nlpaMonthMale++; else sectionEnrollMap[sid].nlpaMonthFemale++;
          }
        } else {
          // Enrolled / Active / Promoted / Retained
          if (isMale) sectionEnrollMap[sid].males++; else sectionEnrollMap[sid].females++;
        }
      });

      // 2. Get attendance for the report month
      const attendRef = collection(db, 'attendance');
      const attendSnap = await getDocs(query(attendRef));

      const sectionAttendMap: Record<
        string,
        { malePresentDays: number; femalePresentDays: number; uniqueDates: Set<string> }
      > = {};

      attendSnap.docs.forEach(d => {
        const data = d.data();
        const attendDate = toDate(data.date ?? data.createdAt);
        if (!attendDate || attendDate.getMonth() !== monthIndex) return;

        const sid = data.sectionId ?? 'unknown';
        if (!sectionAttendMap[sid]) {
          sectionAttendMap[sid] = { malePresentDays: 0, femalePresentDays: 0, uniqueDates: new Set() };
        }
        if (data.date) {
          sectionAttendMap[sid].uniqueDates.add(data.date);
        }

        const am = (data.amStatus || data.status || '').toLowerCase();
        const pm = (data.pmStatus || data.status || '').toLowerCase();
        const isPresent = (am === 'present' || pm === 'present' || am === 'late' || pm === 'late') && am !== 'absent' && pm !== 'absent';

        if (isPresent) {
          const studentDoc = docs.find(doc =>
            doc.id === data.studentId ||
            doc.data().studentId === data.studentId ||
            doc.data().lrn === data.studentId ||
            doc.data().id === data.studentId
          );
          const gender = (data.studentGender || data.gender || studentDoc?.data()?.gender || '').toLowerCase();
          if (gender === 'male' || gender === 'm') {
            sectionAttendMap[sid].malePresentDays++;
          } else {
            sectionAttendMap[sid].femalePresentDays++;
          }
        }
      });

      // 3. Compose per-section rows
      const sections: SF4SectionRow[] = Object.entries(sectionEnrollMap).map(
        ([sid, info]) => {
          const total = info.males + info.females;
          const attend = sectionAttendMap[sid];
          const hasAttendanceLogs = Boolean(attend && attend.uniqueDates.size > 0);
          const schoolDays = hasAttendanceLogs ? attend!.uniqueDates.size : 0;

          const avgMale = (hasAttendanceLogs && schoolDays > 0) ? Math.round(attend!.malePresentDays / schoolDays) : 0;
          const avgFemale = (hasAttendanceLogs && schoolDays > 0) ? Math.round(attend!.femalePresentDays / schoolDays) : 0;
          const avgTotal = avgMale + avgFemale;

          const pctMale = (hasAttendanceLogs && info.males > 0) ? Math.min(100, Math.round((avgMale / info.males) * 100)) : 0;
          const pctFemale = (hasAttendanceLogs && info.females > 0) ? Math.min(100, Math.round((avgFemale / info.females) * 100)) : 0;
          const pctTotal = (hasAttendanceLogs && total > 0) ? Math.min(100, Math.round((avgTotal / total) * 100)) : 0;

          const nlpaPrevT = info.nlpaPrevMale + info.nlpaPrevFemale;
          const nlpaMonthT = info.nlpaMonthMale + info.nlpaMonthFemale;
          const nlpaEndM = info.nlpaPrevMale + info.nlpaMonthMale;
          const nlpaEndF = info.nlpaPrevFemale + info.nlpaMonthFemale;

          const tOutPrevT = info.tOutPrevMale + info.tOutPrevFemale;
          const tOutMonthT = info.tOutMonthMale + info.tOutMonthFemale;
          const tOutEndM = info.tOutPrevMale + info.tOutMonthMale;
          const tOutEndF = info.tOutPrevFemale + info.tOutMonthFemale;

          const tInPrevT = info.tInPrevMale + info.tInPrevFemale;
          const tInMonthT = info.tInMonthMale + info.tInMonthFemale;
          const tInEndM = info.tInPrevMale + info.tInMonthMale;
          const tInEndF = info.tInPrevFemale + info.tInMonthFemale;

          return {
            gradeLevel: info.gradeLevel,
            section: info.sectionName,
            advisorName: info.advisorName,
            maleCount: info.males,
            femaleCount: info.females,
            totalCount: total,
            avgDailyAttendanceMale: avgMale,
            avgDailyAttendanceFemale: avgFemale,
            avgDailyAttendanceTotal: avgTotal,
            attendancePctMale: pctMale,
            attendancePctFemale: pctFemale,
            attendancePctTotal: pctTotal,

            nlpaPrevMale: info.nlpaPrevMale,
            nlpaPrevFemale: info.nlpaPrevFemale,
            nlpaPrevTotal: nlpaPrevT,
            nlpaMonthMale: info.nlpaMonthMale,
            nlpaMonthFemale: info.nlpaMonthFemale,
            nlpaMonthTotal: nlpaMonthT,
            nlpaEndMale: nlpaEndM,
            nlpaEndFemale: nlpaEndF,
            nlpaEndTotal: nlpaEndM + nlpaEndF,

            tOutPrevMale: info.tOutPrevMale,
            tOutPrevFemale: info.tOutPrevFemale,
            tOutPrevTotal: tOutPrevT,
            tOutMonthMale: info.tOutMonthMale,
            tOutMonthFemale: info.tOutMonthFemale,
            tOutMonthTotal: tOutMonthT,
            tOutEndMale: tOutEndM,
            tOutEndFemale: tOutEndF,
            tOutEndTotal: tOutEndM + tOutEndF,

            tInPrevMale: info.tInPrevMale,
            tInPrevFemale: info.tInPrevFemale,
            tInPrevTotal: tInPrevT,
            tInMonthMale: info.tInMonthMale,
            tInMonthFemale: info.tInMonthFemale,
            tInMonthTotal: tInMonthT,
            tInEndMale: tInEndM,
            tInEndFemale: tInEndF,
            tInEndTotal: tInEndM + tInEndF,
          };
        }
      );

      const filteredSections = sections.filter(sec => {
        const rawG = (sec.gradeLevel || '').toString().trim();
        const numG = rawG.replace(/Grade /i, '').trim();
        const num = parseInt(numG, 10);
        if (rawG.toLowerCase().includes('kinder')) return false;
        if (!isNaN(num) && (num < 1 || num > 6)) return false;
        return true;
      });

      filteredSections.sort((a, b) =>
        a.gradeLevel.localeCompare(b.gradeLevel) || a.section.localeCompare(b.section)
      );

      return { schoolYear, reportMonth, sections: filteredSections };
    } catch (err) {
      console.error('[ReportDataService] getSF4Data error:', err);
      return { schoolYear, reportMonth, sections: [] };
    }
  }

  /**
   * Fetches student data for generating printable ID cards.
   * Pulls from enrollments collection.
   */
  static async getStudentIdCardData(schoolYear: string, sectionId?: string) {
    try {
      const enrollRef = collection(db, 'enrollments');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraints: any[] = [where('status', 'in', ['Enrolled', 'enrolled'])];

      const snap = await getDocs(query(enrollRef, ...constraints));

      let docs = snap.docs;
      if (sectionId && sectionId !== 'all') {
        docs = docs.filter(d => d.data().sectionId === sectionId);
      }

      const cards = docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          lrn: data.lrn ?? '',
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          middleName: data.middleName ?? '',
          gradeLevel: data.gradeLevel ?? '',
          section: data.sectionName ?? '',
          gender: data.gender ?? '',
          emergencyContact: data.medical?.emergencyContact ?? '',
          emergencyPhone: data.medical?.emergencyPhone ?? '',
          guardianName: data.medical?.emergencyContact ?? data.guardianName ?? '',
          schoolYear,
        };
      });
      
      cards.sort((a, b) => a.lastName.localeCompare(b.lastName));
      return cards;
    } catch (err) {
      console.error('[ReportDataService] getStudentIdCardData error:', err);
      return [];
    }
  }
}


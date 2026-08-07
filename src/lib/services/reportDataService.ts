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
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
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

      // Fetch all enrolled students to avoid Firestore composite index errors
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraints: any[] = [where('status', 'in', ['Enrolled', 'enrolled'])];

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
          remarks: data.remarks ?? '',
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
      // Fetch enrolled students for the section
      const enrollRef = collection(db, 'enrollments');
      const constraints: any[] = [where('status', 'in', ['Enrolled', 'enrolled'])];
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
      // Fetch all enrolled students to avoid index issues
      const enrollRef = collection(db, 'enrollments');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrollConstraints: any[] = [where('status', 'in', ['Enrolled', 'enrolled'])];
      const enrollSnap = await getDocs(query(enrollRef, ...enrollConstraints));

      // Filter in memory
      let docs = enrollSnap.docs;
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

      // Group enrollment counts by sectionId
      const sectionEnrollMap: Record<
        string,
        { gradeLevel: string; sectionName: string; males: number; females: number; advisorName: string; }
      > = {};

      // Fetch all sections to map section ID to section Name and Adviser Name
      const sectionsRef = collection(db, 'sections');
      const sectionsSnap = await getDocs(query(sectionsRef));

      // Fetch all assignments and users to find section teachers dynamically
      const assignmentsSnap = await getDocs(collection(db, 'assignments'));
      const usersSnap = await getDocs(collection(db, 'users'));
      const teacherMap: Record<string, string> = {};
      usersSnap.docs.forEach(u => {
        const uData = u.data();
        teacherMap[u.id] = `${uData.firstName || ''} ${uData.lastName || ''}`.trim();
      });
      const sectionTeacherMap: Record<string, string> = {};
      assignmentsSnap.docs.forEach(a => {
        const aData = a.data();
        if (aData.sectionId && aData.teacherId) {
          sectionTeacherMap[aData.sectionId] = teacherMap[aData.teacherId] || '';
        }
      });

      const sectionInfo: Record<string, { name: string; adviser: string }> = {};
      sectionsSnap.docs.forEach(d => {
        sectionInfo[d.id] = {
          name: d.data().name || d.data().sectionName || d.id,
          adviser: sectionTeacherMap[d.id] || d.data().adviserName || ''
        };
      });

      docs.forEach(d => {
        const data = d.data();
        const sid = data.sectionId || 'unknown';
        if (!sectionEnrollMap[sid]) {
          sectionEnrollMap[sid] = {
            gradeLevel: data.gradeLevel || '',
            sectionName: data.sectionName || sectionInfo[sid]?.name || sid,
            advisorName: sectionInfo[sid]?.adviser || '',
            males: 0,
            females: 0,
          };
        }
        const gender = (data.gender || '').toLowerCase();
        if (gender === 'male' || gender === 'm') {
          sectionEnrollMap[sid].males++;
        } else {
          sectionEnrollMap[sid].females++;
        }
      });

      // 2. Get attendance for the report month
      const monthIndex = [
        'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
        'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
      ].indexOf(reportMonth.toUpperCase());

      const attendRef = collection(db, 'attendance');
      const attendSnap = await getDocs(query(attendRef));

      // Group attendance by sectionId
      const sectionAttendMap: Record<
        string,
        { presentDays: number; totalDays: number }
      > = {};

      attendSnap.docs.forEach(d => {
        const data = d.data();
        const attendDate = toDate(data.date ?? data.createdAt);
        if (!attendDate || attendDate.getMonth() !== monthIndex) return;

        const sid = data.sectionId ?? 'unknown';
        if (!sectionAttendMap[sid]) {
          sectionAttendMap[sid] = { presentDays: 0, totalDays: 0 };
        }
        sectionAttendMap[sid].totalDays++;
        const status = (data.status ?? '').toLowerCase();
        if (status === 'present') sectionAttendMap[sid].presentDays++;
      });

      // 3. Compose per-section rows
      const sections: SF4SectionRow[] = Object.entries(sectionEnrollMap).map(
        ([sid, info]) => {
          const total = info.males + info.females;
          const attend = sectionAttendMap[sid];
          const pct =
            attend && attend.totalDays > 0
              ? Math.round((attend.presentDays / attend.totalDays) * 100)
              : 0;
          const avgDays =
            attend && attend.totalDays > 0
              ? Math.round(attend.presentDays / Math.max(1, attend.totalDays / Math.max(1, total)))
              : 0;

          return {
            gradeLevel: info.gradeLevel,
            section: info.sectionName,
            advisorName: info.advisorName,
            maleCount: info.males,
            femaleCount: info.females,
            totalCount: total,
            avgDailyAttendanceMale: Math.round(avgDays * (info.males / Math.max(1, total))),
            avgDailyAttendanceFemale: Math.round(avgDays * (info.females / Math.max(1, total))),
            avgDailyAttendanceTotal: avgDays,
            attendancePctMale: pct,
            attendancePctFemale: pct,
            attendancePctTotal: pct,
          };
        }
      );

      // Sort by grade level then section name
      sections.sort((a, b) =>
        a.gradeLevel.localeCompare(b.gradeLevel) || a.section.localeCompare(b.section)
      );

      return { schoolYear, reportMonth, sections };
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


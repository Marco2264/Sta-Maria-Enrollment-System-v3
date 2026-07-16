import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { analyticsCache } from './analyticsCache';

export interface EnrollmentTrendData {
  month: string;
  enrolled: number;
}

export interface AttendanceStatData {
  status: string;
  count: number;
}

export interface DemographicStats {
  ipGroups: { name: string; count: number }[];
  totalIp: number;
  total4ps: number;
  motherTongues: { name: string; count: number }[];
  religions: { name: string; count: number }[];
  totalStudents: number;
}

export interface GradeLevelStatData {
  gradeLevel: string;
  count: number;
}

export class AnalyticsService {
  /**
   * Helper to normalize messy demographic inputs (e.g. "TAGALOG" and "tagalog" -> "Tagalog")
   * Also handles common synonyms (e.g., "INC" -> "Iglesia ni Cristo")
   */
  private static normalizeString(input: string, type: 'religion' | 'language' | 'ip' = 'language'): string {
    if (!input || input.trim() === '') return 'Unspecified';
    
    // Work with lowercase for keyword detection
    const str = input.trim().toLowerCase();
    
    // Specific standardizations using robust keyword matching
    if (type === 'religion') {
      if (str.match(/catholic|rc|r\.c|chatolic|cstholic|catholi|catcholic|vatholic/)) return 'Roman Catholic';
      if (str.match(/inc|iglesia|inglesia/)) return 'Iglesia ni Cristo';
      if (str.match(/born again|christian/)) return 'Born Again Christian';
      if (str.match(/islam|muslim|isla/)) return 'Islam';
      if (str.match(/protestant/)) return 'Protestant';
      if (str.match(/mcgi|members church/)) return 'MCGI';
      
      // If it doesn't match the standard religions, group it into Others
      return 'Others';
    } else if (type === 'language') {
      // Check dual combinations first
      const hasTagalog = str.match(/tagalog|tagalol|taglog|filipino/);
      const hasEnglish = str.match(/english/);
      const hasBisaya = str.match(/bisaya|visayan|visaya|bisayan|bisyaa|vasayan/);
      const hasChavacano = str.match(/chavacano|chabacano|chavano|chavantano|chavancano/);
      const hasTausug = str.match(/tausug|tausog|tausig|taugsug/);

      // Singles (First match wins)
      if (hasBisaya) return 'Bisaya';
      if (hasChavacano) return 'Chavacano';
      if (hasTausug) return 'Tausug';
      if (hasTagalog) return 'Tagalog';
      if (hasEnglish) return 'English';
      
      return 'Others';
    }
    
    // If no keyword match, just Title Case whatever they wrote
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Fetches the enrollment trend (students enrolled per month for the current year)
   */
  static async getEnrollmentTrends(assignedGrade?: string): Promise<EnrollmentTrendData[]> {
    const cacheKey = assignedGrade ? `analytics_enrollment_trends_${assignedGrade.replace(/\s+/g, '_')}` : 'analytics_enrollment_trends';
    const cached = analyticsCache.get<EnrollmentTrendData[]>(cacheKey);
    if (cached) return cached;

    try {
      const enrollmentsRef = collection(db, 'enrollments');
      let q = query(enrollmentsRef);
      if (assignedGrade) {
        const numGrade = assignedGrade.replace(/Grade /i, '').trim();
        const fullGrade = `Grade ${numGrade}`;
        q = query(enrollmentsRef, where('gradeLevel', 'in', [numGrade, fullGrade]));
      }
      const snapshot = await getDocs(q);

      const monthCounts: Record<string, number> = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize with 0 for the last 6 months
      const currentMonth = new Date().getMonth();
      for (let i = 5; i >= 0; i--) {
        const m = (currentMonth - i + 12) % 12;
        monthCounts[months[m]] = 0;
      }

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'enrolled' || data.status === 'Enrolled') {
          const timestamp = data.submittedAt || data.createdAt;
          if (timestamp) {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const monthStr = months[date.getMonth()];
            if (monthCounts[monthStr] !== undefined) {
              monthCounts[monthStr]++;
            }
          }
        }
      });

      // Demo data logic completely removed; it will just return 0 for all months if empty

      const result = Object.keys(monthCounts).map(month => ({
        month,
        enrolled: monthCounts[month]
      }));

      analyticsCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Error fetching enrollment trends:", error);
      
      // Fallback to empty flat line if error
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const fallback = [];
      for (let i = 5; i >= 0; i--) {
        fallback.push({ month: months[(currentMonth - i + 12) % 12], enrolled: 0 });
      }
      return fallback;
    }
  }

  /**
   * Fetches overall attendance stats for the dashboard pie chart
   */
  static async getAttendanceStats(assignedGrade?: string): Promise<AttendanceStatData[]> {
    const cacheKey = assignedGrade ? `analytics_attendance_stats_${assignedGrade.replace(/\s+/g, '_')}` : 'analytics_attendance_stats';
    const cached = analyticsCache.get<AttendanceStatData[]>(cacheKey);
    if (cached) return cached;

    try {
      // Note: `attendance` doesn't inherently have `gradeLevel`. 
      // Filtering attendance by grade level would require querying enrollments first or adding `gradeLevel` to attendance docs.
      // We will fall back to fetching all if we can't easily filter, or implement basic filtering if present.
      // Since attendance is linked to `studentId`, it's complex without a denormalized `gradeLevel`.
      // For now, if we don't have gradeLevel in attendance, we just limit it or return full.
      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, limit(1000));
      const snapshot = await getDocs(q);

      let present = 0;
      let absent = 0;
      let late = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'Present' || data.status === 'present') present++;
        else if (data.status === 'Absent' || data.status === 'absent') absent++;
        else if (data.status === 'Late' || data.status === 'late') late++;
      });
      
      // Demo data logic completely removed

      const result = [
        { status: 'Present', count: present },
        { status: 'Late', count: late },
        { status: 'Absent', count: absent }
      ];

      analyticsCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
      return [
        { status: 'Present', count: 0 },
        { status: 'Late', count: 0 },
        { status: 'Absent', count: 0 }
      ];
    }
  }

  static async getDemographicStats(assignedGrade?: string): Promise<DemographicStats> {
    const cacheKey = assignedGrade ? `analytics_demographic_stats_${assignedGrade.replace(/\s+/g, '_')}` : 'analytics_demographic_stats';
    // Force cache busting to ensure old messy data is cleared immediately
    analyticsCache.clear(cacheKey);

    const cached = analyticsCache.get<DemographicStats>(cacheKey);
    if (cached) return cached;

    try {
      const enrollmentsRef = collection(db, 'enrollments');
      let q = query(enrollmentsRef);
      if (assignedGrade) {
        const numGrade = assignedGrade.replace(/Grade /i, '').trim();
        const fullGrade = `Grade ${numGrade}`;
        q = query(enrollmentsRef, where('gradeLevel', 'in', [numGrade, fullGrade]));
      }
      const snapshot = await getDocs(q);

      const ipGroups: Record<string, number> = {};
      let total4ps = 0;
      const motherTongues: Record<string, number> = {};
      const religions: Record<string, number> = {};
      let totalStudents = 0;
      let totalIp = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.additional) {
          totalStudents++;
          
          if (data.additional.isIndigenous) {
            totalIp++;
            const group = data.additional.indigenousGroup || 'Unspecified';
            const cleanGroup = this.normalizeString(group, 'ip');
            ipGroups[cleanGroup] = (ipGroups[cleanGroup] || 0) + 1;
          }

          if (data.additional.is4ps) {
            total4ps++;
          }

          const mt = data.additional.motherTongue || 'Unspecified';
          const cleanMt = this.normalizeString(mt, 'language');
          motherTongues[cleanMt] = (motherTongues[cleanMt] || 0) + 1;

          const rel = data.additional.religion || 'Unspecified';
          const cleanRel = this.normalizeString(rel, 'religion');
          religions[cleanRel] = (religions[cleanRel] || 0) + 1;
        }
      });

      // Demo data logic completely removed

      const result = {
        ipGroups: Object.entries(ipGroups).map(([name, count]) => ({ name, count })),
        totalIp,
        total4ps,
        motherTongues: Object.entries(motherTongues).map(([name, count]) => ({ name, count })),
        religions: Object.entries(religions).map(([name, count]) => ({ name, count })),
        totalStudents: Math.max(totalStudents, 0)
      };

      analyticsCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Error fetching demographic stats:", error);
      return {
        ipGroups: [],
        totalIp: 0,
        total4ps: 0,
        motherTongues: [],
        religions: [],
        totalStudents: 0
      };
    }
  }

  static async getGradeLevelStats(assignedGrade?: string): Promise<GradeLevelStatData[]> {
    const cacheKey = assignedGrade ? `analytics_grade_level_stats_${assignedGrade.replace(/\s+/g, '_')}` : 'analytics_grade_level_stats';
    const cached = analyticsCache.get<GradeLevelStatData[]>(cacheKey);
    if (cached) return cached;

    try {
      const enrollmentsRef = collection(db, 'enrollments');
      let q = query(enrollmentsRef);
      if (assignedGrade) {
        const numGrade = assignedGrade.replace(/Grade /i, '').trim();
        const fullGrade = `Grade ${numGrade}`;
        q = query(enrollmentsRef, where('gradeLevel', 'in', [numGrade, fullGrade]));
      }
      const snapshot = await getDocs(q);

      const gradeCounts: Record<string, number> = {
        'Grade 1': 0,
        'Grade 2': 0,
        'Grade 3': 0,
        'Grade 4': 0,
        'Grade 5': 0,
        'Grade 6': 0
      };

      snapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.gradeLevel) {
          let gradeStr = data.gradeLevel.toString().trim();
          // Normalize '1' to 'Grade 1'
          if (/^\d+$/.test(gradeStr)) {
            gradeStr = `Grade ${gradeStr}`;
          }
          if (gradeStr && gradeCounts[gradeStr] !== undefined) {
            gradeCounts[gradeStr]++;
          } else if (gradeStr) {
            gradeCounts[gradeStr] = (gradeCounts[gradeStr] || 0) + 1;
          }
        }
      });

      const result = Object.entries(gradeCounts)
        .filter(([gradeLevel]) => {
          return ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].includes(gradeLevel);
        })
        .map(([gradeLevel, count]) => ({
          gradeLevel,
          count
        }));

      // Sort grades naturally
      result.sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel, undefined, { numeric: true }));

      analyticsCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error("Error fetching grade level stats:", error);
      return [];
    }
  }
}

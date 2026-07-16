import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { analyticsCache } from './analyticsCache';

export interface HealthData {
  id: string;
  name: string;
  gender: string;
  age: number;
  height: number; // in meters
  weight: number; // in kg
  bmi: number;
  nutritionalStatus: 'Severely Wasted' | 'Wasted' | 'Normal' | 'Overweight' | 'Obese';
  gradeLevel: string;
  sectionId?: string;
  lrn: string;
  birthDate?: string;
  heightForAge?: string;
}

interface HfaRef {
  sd3_neg: number;
  sd2_neg: number;
  sd2_pos: number;
}

const HFA_REF_BOYS: Record<number, HfaRef> = {
  60: { sd3_neg: 95.9, sd2_neg: 100.7, sd2_pos: 119.2 },
  72: { sd3_neg: 101.2, sd2_neg: 106.1, sd2_pos: 125.8 },
  84: { sd3_neg: 106.4, sd2_neg: 111.4, sd2_pos: 131.8 },
  96: { sd3_neg: 111.5, sd2_neg: 116.4, sd2_pos: 137.8 },
  108: { sd3_neg: 116.3, sd2_neg: 121.3, sd2_pos: 143.8 },
  120: { sd3_neg: 121.0, sd2_neg: 126.2, sd2_pos: 149.7 },
  132: { sd3_neg: 125.7, sd2_neg: 131.2, sd2_pos: 155.6 },
  144: { sd3_neg: 130.6, sd2_neg: 136.6, sd2_pos: 161.7 },
  156: { sd3_neg: 136.1, sd2_neg: 142.6, sd2_pos: 168.3 }
};

const HFA_REF_GIRLS: Record<number, HfaRef> = {
  60: { sd3_neg: 94.6, sd2_neg: 99.4, sd2_pos: 119.2 },
  72: { sd3_neg: 100.9, sd2_neg: 105.4, sd2_pos: 124.5 },
  84: { sd3_neg: 105.4, sd2_neg: 110.3, sd2_pos: 131.1 },
  96: { sd3_neg: 110.4, sd2_neg: 115.4, sd2_pos: 137.7 },
  108: { sd3_neg: 115.3, sd2_neg: 120.6, sd2_pos: 144.2 },
  120: { sd3_neg: 120.3, sd2_neg: 125.8, sd2_pos: 150.8 },
  132: { sd3_neg: 125.4, sd2_neg: 131.3, sd2_pos: 157.4 },
  144: { sd3_neg: 130.8, sd2_neg: 137.0, sd2_pos: 163.5 },
  156: { sd3_neg: 136.1, sd2_neg: 142.5, sd2_pos: 168.8 }
};

export interface NutritionalStats {
  status: string;
  count: number;
  color: string;
}

export class HealthAnalyticsService {
  static calculateAge(birthDate: string): number {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  static calculateAgeInMonths(birthDateStr: string, measurementDate: Date = new Date()): number {
    if (!birthDateStr) return 72; // default fallback (6 years)
    const birthDate = new Date(birthDateStr);
    let years = measurementDate.getFullYear() - birthDate.getFullYear();
    let months = measurementDate.getMonth() - birthDate.getMonth();
    let days = measurementDate.getDate() - birthDate.getDate();

    let totalMonths = (years * 12) + months;
    if (days < 0) {
      totalMonths--;
    }
    return totalMonths;
  }

  static getHfaStatus(heightCm: number, gender: string, ageMonths: number): string {
    const isFemale = gender.toLowerCase().startsWith('f');
    const refMap = isFemale ? HFA_REF_GIRLS : HFA_REF_BOYS;
    
    const ages = Object.keys(refMap).map(Number).sort((a, b) => a - b);
    
    let clampedAge = ageMonths;
    if (clampedAge < ages[0]) clampedAge = ages[0];
    if (clampedAge > ages[ages.length - 1]) clampedAge = ages[ages.length - 1];

    let lowerAge = ages[0];
    let upperAge = ages[ages.length - 1];

    for (let i = 0; i < ages.length - 1; i++) {
      if (clampedAge >= ages[i] && clampedAge <= ages[i + 1]) {
        lowerAge = ages[i];
        upperAge = ages[i + 1];
        break;
      }
    }

    const lowerRef = refMap[lowerAge];
    const upperRef = refMap[upperAge];

    let sd3_neg, sd2_neg, sd2_pos;

    if (lowerAge === upperAge) {
      sd3_neg = lowerRef.sd3_neg;
      sd2_neg = lowerRef.sd2_neg;
      sd2_pos = lowerRef.sd2_pos;
    } else {
      const fraction = (clampedAge - lowerAge) / (upperAge - lowerAge);
      sd3_neg = lowerRef.sd3_neg + fraction * (upperRef.sd3_neg - lowerRef.sd3_neg);
      sd2_neg = lowerRef.sd2_neg + fraction * (upperRef.sd2_neg - lowerRef.sd2_neg);
      sd2_pos = lowerRef.sd2_pos + fraction * (upperRef.sd2_pos - lowerRef.sd2_pos);
    }

    if (heightCm < sd3_neg) {
      return "Severely Stunted";
    } else if (heightCm >= sd3_neg && heightCm < sd2_neg) {
      return "Stunted";
    } else if (heightCm >= sd2_neg && heightCm <= sd2_pos) {
      return "Normal";
    } else {
      return "Tall";
    }
  }

  static calculateBMI(heightCm: number, weightKg: number): number {
    if (!heightCm || !weightKg || heightCm === 0) return 0;
    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);
  }

  static getNutritionalStatus(bmi: number): HealthData['nutritionalStatus'] {
    if (bmi === 0) return 'Normal'; // Fallback for invalid data
    if (bmi < 16.0) return 'Severely Wasted';
    if (bmi < 18.5) return 'Wasted';
    if (bmi < 25.0) return 'Normal';
    if (bmi < 30.0) return 'Overweight';
    return 'Obese';
  }

  static async getHealthData(assignedGrade?: string): Promise<HealthData[]> {
    const cacheKey = assignedGrade ? `analytics_health_data_v2_${assignedGrade.replace(/\s+/g, '_')}` : 'analytics_health_data_v2';
    const cached = analyticsCache.get<HealthData[]>(cacheKey);
    if (cached) return cached;

    try {
      const enrollmentsRef = collection(db, 'enrollments');
      // Fetch enrolled students to check their health data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraints: any[] = [where('status', 'in', ['Enrolled', 'enrolled'])];
      if (assignedGrade) {
        const numGrade = assignedGrade.replace(/Grade /i, '').trim();
        const fullGrade = `Grade ${numGrade}`;
        constraints.push(where('gradeLevel', 'in', [numGrade, fullGrade]));
      }
      const q = query(enrollmentsRef, ...constraints);
      const snapshot = await getDocs(q);

      const data: HealthData[] = [];

      snapshot.forEach(doc => {
        const d = doc.data();
        let height = 0;
        let weight = 0;
        let bmi = 0;
        let status = '';

        let hfaStatus = d.medical?.heightForAge || 'Normal';

        if (d.medical && d.medical.height && d.medical.weight) {
          const h = parseFloat(d.medical.height);
          const w = parseFloat(d.medical.weight);
          if (!isNaN(h) && !isNaN(w)) {
            height = h;
            weight = w;
            bmi = parseFloat(this.calculateBMI(h, w).toFixed(2));
            status = this.getNutritionalStatus(bmi);

            if (d.birthDate) {
              const ageMonths = this.calculateAgeInMonths(d.birthDate);
              hfaStatus = this.getHfaStatus(h, d.gender ?? 'Male', ageMonths);
            }
          }
        }

        data.push({
          id: doc.id,
          name: `${d.lastName || ''}, ${d.firstName || ''} ${d.middleName?.[0] ? d.middleName[0] + '.' : ''}`.trim(),
          gender: d.gender ?? '',
          age: this.calculateAge(d.birthDate),
          height: height > 0 ? height / 100 : 0, 
          weight: weight,
          bmi: bmi,
          nutritionalStatus: status,
          gradeLevel: d.gradeLevel || '',
          sectionId: d.sectionId,
          lrn: d.lrn || '',
          birthDate: d.birthDate || '',
          heightForAge: hfaStatus
        });
      });

      // Demo data removed - Only real students from the database will be returned

      analyticsCache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error("Error fetching health data:", error);
      return [];
    }
  }

  static async getNutritionalStats(assignedGrade?: string): Promise<NutritionalStats[]> {
    const data = await this.getHealthData(assignedGrade);
    const stats: Record<string, number> = {
      'Severely Wasted': 0,
      'Wasted': 0,
      'Normal': 0,
      'Overweight': 0,
      'Obese': 0
    };

    data.forEach(d => {
      if (d.nutritionalStatus && stats[d.nutritionalStatus] !== undefined) {
        stats[d.nutritionalStatus]++;
      }
    });

    return [
      { status: 'Severely Wasted', count: stats['Severely Wasted'], color: 'text-red-500 bg-red-500' },
      { status: 'Wasted', count: stats['Wasted'], color: 'text-amber-500 bg-amber-500' },
      { status: 'Normal', count: stats['Normal'], color: 'text-emerald-500 bg-emerald-500' },
      { status: 'Overweight', count: stats['Overweight'], color: 'text-blue-500 bg-blue-500' },
      { status: 'Obese', count: stats['Obese'], color: 'text-purple-500 bg-purple-500' }
    ];
  }

  static async getFeedingProgramEligibility(assignedGrade?: string): Promise<HealthData[]> {
    const data = await this.getHealthData(assignedGrade);
    return data.filter(d => d.nutritionalStatus === 'Severely Wasted' || d.nutritionalStatus === 'Wasted');
  }
}

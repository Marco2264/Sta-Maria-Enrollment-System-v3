import React, { useState, useEffect } from 'react';
import { ReportLayout } from './reports/ReportLayout';
import type { HealthData } from '../../lib/services/healthAnalyticsService';
import { getGlobalSettings } from '../../lib/services/settingsService';

interface SF8ReportDocumentProps {
  onClose: () => void;
  data: {
    schoolYear: string;
    gradeLevel: string;
    section: string;
    learners: HealthData[];
    adviserName?: string;
  };
}

export function SF8ReportDocument({ onClose, data }: SF8ReportDocumentProps) {
  const { schoolYear, gradeLevel, section, learners, adviserName } = data;
  const [principalName, setPrincipalName] = useState<string>((data as any).schoolHead || (data as any).principalName || 'MRS. LEPIDAPTERA VILLANUEVA');
  const [schoolInfo, setSchoolInfo] = useState({
    schoolId: (data as any).schoolId || '199006',
    region: (data as any).region || 'IX',
    division: (data as any).division || 'ZAMBOANGA',
    district: (data as any).district || 'Sta. Maria Central',
    schoolName: (data as any).schoolName || 'STA. MARIA CS SPED CENTER'
  });

  useEffect(() => {
    getGlobalSettings().then(settings => {
      setSchoolInfo({
        schoolId: (data as any).schoolId || settings.schoolId || '199006',
        region: (data as any).region || settings.region || 'IX',
        division: ((data as any).division || settings.division || 'ZAMBOANGA').toUpperCase(),
        district: (data as any).district || settings.district || 'Sta. Maria Central',
        schoolName: ((data as any).schoolName || settings.schoolName || 'STA. MARIA CS SPED CENTER').toUpperCase()
      });
      if (settings.principalName) setPrincipalName(settings.principalName);
    }).catch(console.error);
  }, []);

  const countStats = (learnersList: typeof learners) => {
    const stats = {
      nutritional: { severelyWasted: 0, wasted: 0, normal: 0, overweight: 0, obese: 0 },
      hfa: { severelyStunted: 0, stunted: 0, normal: 0, tall: 0 }
    };
    
    learnersList.forEach(l => {
      const ns = l.nutritionalStatus?.toLowerCase() || '';
      if (ns.includes('severely wasted')) stats.nutritional.severelyWasted++;
      else if (ns.includes('wasted')) stats.nutritional.wasted++;
      else if (ns.includes('normal')) stats.nutritional.normal++;
      else if (ns.includes('overweight')) stats.nutritional.overweight++;
      else if (ns.includes('obese')) stats.nutritional.obese++;

      const hfa = l.heightForAge?.toLowerCase() || '';
      if (hfa.includes('severely stunted')) stats.hfa.severelyStunted++;
      else if (hfa.includes('stunted')) stats.hfa.stunted++;
      else if (hfa.includes('normal')) stats.hfa.normal++;
      else if (hfa.includes('tall')) stats.hfa.tall++;
    });
    return stats;
  };

  const males = learners.filter(s => !s.gender?.toLowerCase().startsWith('f'));
  const females = learners.filter(s => s.gender?.toLowerCase().startsWith('f'));

  const maleStats = countStats(males);
  const femaleStats = countStats(females);

  const totalStats = {
    nutritional: {
      severelyWasted: maleStats.nutritional.severelyWasted + femaleStats.nutritional.severelyWasted,
      wasted: maleStats.nutritional.wasted + femaleStats.nutritional.wasted,
      normal: maleStats.nutritional.normal + femaleStats.nutritional.normal,
      overweight: maleStats.nutritional.overweight + femaleStats.nutritional.overweight,
      obese: maleStats.nutritional.obese + femaleStats.nutritional.obese
    },
    hfa: {
      severelyStunted: maleStats.hfa.severelyStunted + femaleStats.hfa.severelyStunted,
      stunted: maleStats.hfa.stunted + femaleStats.hfa.stunted,
      normal: maleStats.hfa.normal + femaleStats.hfa.normal,
      tall: maleStats.hfa.tall + femaleStats.hfa.tall
    }
  };

  return (
    <ReportLayout title="School Form 8 (SF8)" onClose={onClose} landscape>
      {/* DepEd Header */}
      <div className="flex items-center justify-between mb-2">
        <img src="/kagawaran_ng_edukasyon.png" alt="Kagawaran ng Edukasyon Logo" className="w-20 h-20 object-contain" />
        <div className="text-center flex-1 text-blue-700">
          <h2 className="font-bold text-xl">School Form 8 (SF8) Learner's Basic Health and Nutrition Report</h2>
          <p className="text-xs italic text-slate-600">
            (For All Grade Levels)
          </p>
        </div>
        <div className="w-40 text-right">
          <div className="text-4xl font-black text-blue-800 tracking-tighter flex items-center justify-end">
            Dep<span className="text-red-600 ml-1">ED</span>
          </div>
          <div className="text-[9px] tracking-widest font-semibold text-slate-600 mt-1">
            DEPARTMENT OF EDUCATION
          </div>
        </div>
      </div>

      {/* Info Header */}
      <div className="border-t-2 border-b-2 border-blue-400 py-3 mb-4 text-xs">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="space-y-1">
            <p><span className="font-bold">School ID:</span> {schoolInfo.schoolId}</p>
            <p><span className="font-bold">School Name:</span> {schoolInfo.schoolName}</p>
          </div>
          <div className="space-y-1">
            <p><span className="font-bold">Region:</span> {schoolInfo.region}</p>
            <p><span className="font-bold">School Year:</span> {schoolYear}</p>
          </div>
          <div className="space-y-1">
            <p><span className="font-bold">Division:</span> {schoolInfo.division}</p>
            <p><span className="font-bold">Grade Level:</span> {gradeLevel}</p>
          </div>
          <div className="space-y-1 pr-12">
            <p><span className="font-bold">District:</span> {schoolInfo.district}</p>
            <p><span className="font-bold">Section:</span> {section}</p>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse border border-black text-[10px] text-center">
          <thead>
            <tr>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>LRN</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>NAME OF LEARNER</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>BIRTHDAY</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>AGE</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>SEX</th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={5}>NUTRITIONAL STATUS</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>HEIGHT FOR AGE (HFA)</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>REMARKS</th>
            </tr>
            <tr>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">WEIGHT (kg)</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">HEIGHT (m)</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">HEIGHT² (m²)</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">BMI</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">NUTRITIONAL STATUS</th>
            </tr>
          </thead>
          <tbody>
            {learners.length > 0 ? (
              learners.map((l, i) => (
                <tr key={l.id || i}>
                  <td className="border border-black p-1">{l.lrn}</td>
                  <td className="border border-black p-1 text-left font-medium">{l.name}</td>
                  <td className="border border-black p-1">{l.birthDate || ''}</td>
                  <td className="border border-black p-1">{l.age || ''}</td>
                  <td className="border border-black p-1">{l.gender ? (l.gender.toLowerCase().startsWith('f') ? 'F' : 'M') : ''}</td>
                  <td className="border border-black p-1">{l.weight > 0 ? l.weight : ''}</td>
                  <td className="border border-black p-1">{l.height > 0 ? l.height : ''}</td>
                  <td className="border border-black p-1">{l.height > 0 ? (l.height * l.height).toFixed(4) : ''}</td>
                  <td className="border border-black p-1">{l.bmi > 0 ? l.bmi.toFixed(1) : ''}</td>
                  <td className="border border-black p-1 font-semibold">{l.nutritionalStatus || ''}</td>
                  <td className="border border-black p-1 font-semibold">{l.heightForAge || ''}</td>
                  <td className="border border-black p-1"></td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black p-4 font-medium italic text-center text-slate-500" colSpan={12}>
                  No health and nutrition data found for this section.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Table */}
      <div className="mt-8 overflow-x-auto print:overflow-visible">
        <h3 className="font-bold text-center text-xs mb-2">SUMMARY TABLE</h3>
        <table className="w-full border-collapse border border-black text-[10px] text-center">
          <thead>
            <tr>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>SEX</th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={6}>Nutritional Status</th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={5}>Height for Age (HFA)</th>
            </tr>
            <tr>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Severely<br/>Wasted</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Wasted</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Normal</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Overweight</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Obese</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">TOTAL</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Severely<br/>Stunted</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Stunted</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Normal</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Tall</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1 text-left font-bold pl-2">MALE</td>
              <td className="border border-black p-1">{maleStats.nutritional.severelyWasted || ''}</td>
              <td className="border border-black p-1">{maleStats.nutritional.wasted || ''}</td>
              <td className="border border-black p-1">{maleStats.nutritional.normal || ''}</td>
              <td className="border border-black p-1">{maleStats.nutritional.overweight || ''}</td>
              <td className="border border-black p-1">{maleStats.nutritional.obese || ''}</td>
              <td className="border border-black p-1 font-bold">
                {(maleStats.nutritional.severelyWasted + maleStats.nutritional.wasted + maleStats.nutritional.normal + maleStats.nutritional.overweight + maleStats.nutritional.obese) || ''}
              </td>
              <td className="border border-black p-1">{maleStats.hfa.severelyStunted || ''}</td>
              <td className="border border-black p-1">{maleStats.hfa.stunted || ''}</td>
              <td className="border border-black p-1">{maleStats.hfa.normal || ''}</td>
              <td className="border border-black p-1">{maleStats.hfa.tall || ''}</td>
              <td className="border border-black p-1 font-bold">
                {(maleStats.hfa.severelyStunted + maleStats.hfa.stunted + maleStats.hfa.normal + maleStats.hfa.tall) || ''}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-left font-bold pl-2">FEMALE</td>
              <td className="border border-black p-1">{femaleStats.nutritional.severelyWasted || ''}</td>
              <td className="border border-black p-1">{femaleStats.nutritional.wasted || ''}</td>
              <td className="border border-black p-1">{femaleStats.nutritional.normal || ''}</td>
              <td className="border border-black p-1">{femaleStats.nutritional.overweight || ''}</td>
              <td className="border border-black p-1">{femaleStats.nutritional.obese || ''}</td>
              <td className="border border-black p-1 font-bold">
                {(femaleStats.nutritional.severelyWasted + femaleStats.nutritional.wasted + femaleStats.nutritional.normal + femaleStats.nutritional.overweight + femaleStats.nutritional.obese) || ''}
              </td>
              <td className="border border-black p-1">{femaleStats.hfa.severelyStunted || ''}</td>
              <td className="border border-black p-1">{femaleStats.hfa.stunted || ''}</td>
              <td className="border border-black p-1">{femaleStats.hfa.normal || ''}</td>
              <td className="border border-black p-1">{femaleStats.hfa.tall || ''}</td>
              <td className="border border-black p-1 font-bold">
                {(femaleStats.hfa.severelyStunted + femaleStats.hfa.stunted + femaleStats.hfa.normal + femaleStats.hfa.tall) || ''}
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1 text-left font-bold pl-2 bg-gray-50">TOTAL</td>
              <td className="border border-black p-1 bg-gray-50">{totalStats.nutritional.severelyWasted || ''}</td>
              <td className="border border-black p-1 bg-gray-50">{totalStats.nutritional.wasted || ''}</td>
              <td className="border border-black p-1 bg-gray-50">{totalStats.nutritional.normal || ''}</td>
              <td className="border border-black p-1 bg-gray-50">{totalStats.nutritional.overweight || ''}</td>
              <td className="border border-black p-1 bg-gray-50">{totalStats.nutritional.obese || ''}</td>
              <td className="border border-black p-1 bg-gray-50 font-bold">
                {(totalStats.nutritional.severelyWasted + totalStats.nutritional.wasted + totalStats.nutritional.normal + totalStats.nutritional.overweight + totalStats.nutritional.obese) || ''}
              </td>
              <td className="border border-black p-1 bg-gray-50">{totalStats.hfa.severelyStunted || ''}</td>
              <td className="border border-black p-1 bg-gray-50">{totalStats.hfa.stunted || ''}</td>
              <td className="border border-black p-1 bg-gray-50">{totalStats.hfa.normal || ''}</td>
              <td className="border border-black p-1 bg-gray-50">{totalStats.hfa.tall || ''}</td>
              <td className="border border-black p-1 bg-gray-50 font-bold">
                {(totalStats.hfa.severelyStunted + totalStats.hfa.stunted + totalStats.hfa.normal + totalStats.hfa.tall) || ''}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-12 flex justify-between px-12 print:flex hidden">
        <div className="text-center">
          <div className="border-b border-black w-48 mb-1 font-bold text-xs">{(adviserName || '').toUpperCase()}</div>
          <div className="text-xs font-bold">Class Adviser</div>
        </div>
        <div className="text-center">
          <div className="border-b border-black w-48 mb-1 font-bold text-xs">{principalName}</div>
          <div className="text-xs font-bold">School Head</div>
        </div>
      </div>

      <div className="mt-8 text-[10px] text-gray-500 text-center print:block hidden">
        Generated on: {new Date().toLocaleString()}<br />
        Computer-generated report
      </div>
    </ReportLayout>
  );
}

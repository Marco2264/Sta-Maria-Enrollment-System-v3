import React, { useState, useEffect } from 'react';
import { ReportLayout } from './reports/ReportLayout';
import { getGlobalSettings } from '../../lib/services/settingsService';

interface SF2ReportDocumentProps {
  onClose: () => void;
  data: any; // We receive SF2Data which is similar to SF1Data but with monthly daily attendance
}

export function SF2ReportDocument({ onClose, data }: SF2ReportDocumentProps) {
  const { schoolYear, gradeLevel, section, month, learners } = data;
  const anyData = data as any;
  const [principalName, setPrincipalName] = useState<string>(
    anyData.schoolHead || anyData.principalName || anyData.schoolHeadName || 'MRS. LEPIDAPTERA VILLANUEVA'
  );
  const formatDateStr = (str?: string) => {
    if (!str) return '';
    const d = new Date(str.includes('T') ? str : `${str}T00:00:00`);
    if (isNaN(d.getTime())) return str;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const [schoolInfo, setSchoolInfo] = useState({
    schoolId: anyData.schoolId || '199006',
    region: anyData.region || 'IX',
    division: anyData.division || 'Zamboanga',
    district: anyData.district || 'Sta. Maria Central',
    schoolName: anyData.schoolName || 'Sta. Maria CS SPED Center',
    bosyDate: anyData.bosyDate ? formatDateStr(anyData.bosyDate) : '',
    eosyDate: anyData.eosyDate ? formatDateStr(anyData.eosyDate) : ''
  });

  useEffect(() => {
    getGlobalSettings().then(settings => {
      setSchoolInfo({
        schoolId: anyData.schoolId || settings.schoolId || '199006',
        region: anyData.region || settings.region || 'IX',
        division: anyData.division || settings.division || 'Zamboanga',
        district: anyData.district || settings.district || 'Sta. Maria Central',
        schoolName: anyData.schoolName || settings.schoolName || 'Sta. Maria CS SPED Center',
        bosyDate: anyData.bosyDate ? formatDateStr(anyData.bosyDate) : formatDateStr(settings.schoolYearStart),
        eosyDate: anyData.eosyDate ? formatDateStr(anyData.eosyDate) : formatDateStr(settings.schoolYearEnd)
      });
      if (!anyData.schoolHead && !anyData.principalName && !anyData.schoolHeadName && settings.principalName) {
        setPrincipalName(settings.principalName);
      }
    }).catch(console.error);
  }, [anyData]);

  const males = learners.filter((l: any) => !l.gender?.toLowerCase().startsWith('f'));
  const females = learners.filter((l: any) => l.gender?.toLowerCase().startsWith('f'));

  // 1. Calculate calendar days and school days
  const parts = (schoolYear || '').split('-');
  const syStart = parseInt(parts[0], 10) || 2026;
  const syEnd = parseInt(parts[1], 10) || (syStart + 1);
  
  const monthNameUpper = (month || '').toUpperCase();
  const monthIndex = [
    'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
    'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'
  ].indexOf(monthNameUpper);
  
  const isSecondHalf = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE'].includes(monthNameUpper);
  const year = isSecondHalf ? syEnd : syStart;
  
  const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  
  const days = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const date = new Date(year, monthIndex, dayNum);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return { dayNum, isWeekend };
  });

  const totalSchoolDays = days.filter(d => !d.isWeekend).length;

  const countAbsent = (learner: any) => {
    return Object.keys(learner.attendance || {}).filter(
      day => learner.attendance[day] === 'absent'
    ).length;
  };

  // 2. Summary stats calculations
  const malesTotalPresent = males.reduce((sum: number, m: any) => sum + Math.max(0, totalSchoolDays - countAbsent(m)), 0);
  const femalesTotalPresent = females.reduce((sum: number, f: any) => sum + Math.max(0, totalSchoolDays - countAbsent(f)), 0);
  const totalPresent = malesTotalPresent + femalesTotalPresent;

  const avgMaleAttendance = totalSchoolDays > 0 ? (malesTotalPresent / totalSchoolDays) : 0;
  const avgFemaleAttendance = totalSchoolDays > 0 ? (femalesTotalPresent / totalSchoolDays) : 0;
  const avgTotalAttendance = totalSchoolDays > 0 ? (totalPresent / totalSchoolDays) : 0;

  const pctMaleAttendance = males.length > 0 ? (avgMaleAttendance / males.length) * 100 : 0;
  const pctFemaleAttendance = females.length > 0 ? (avgFemaleAttendance / females.length) * 100 : 0;
  const pctTotalAttendance = learners.length > 0 ? (avgTotalAttendance / learners.length) * 100 : 0;

  return (
    <ReportLayout title="School Form 2 (SF2)" onClose={onClose} landscape>
      {/* DepEd Header */}
      <div className="flex items-center justify-between mb-2">
        <img src="/kagawaran_ng_edukasyon.png" alt="Kagawaran ng Edukasyon Logo" className="w-20 h-20 object-contain" />
        <div className="text-center flex-1 text-blue-700">
          <h2 className="font-bold text-xl">School Form 2 (SF2) Daily Attendance Report of Learners</h2>
          <p className="text-xs italic text-slate-600">
            (This replaces Form 2 &amp; STS Form 4 - Daily Attendance Report of Learners)
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
          <div className="space-y-1">
            <p><span className="font-bold">District:</span> {schoolInfo.district}</p>
            <p><span className="font-bold">Section:</span> {section}</p>
          </div>
          <div className="space-y-1 pr-12">
            <p><span className="font-bold">Month Of:</span> <span className="uppercase">{month}</span></p>
            <p><span className="font-bold">Class Adviser:</span> <span className="uppercase">{anyData.advisorName || anyData.adviserName || 'N/A'}</span></p>
          </div>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-sm mb-4">
        <table className="w-full text-left border-collapse text-[9px] leading-tight">
          <thead>
            <tr className="bg-slate-100 font-bold border-b border-slate-300 text-center">
              <th className="border-r border-slate-300 p-1 w-8 text-center" rowSpan={2}>No.</th>
              <th className="border-r border-slate-300 p-1 text-left min-w-[140px]" rowSpan={2}>Learner's Name</th>
              <th className="border-r border-slate-300 p-0.5 text-center" colSpan={totalDaysInMonth}>
                Daily Attendance ({month.toUpperCase()})
              </th>
              <th className="border-r border-slate-300 p-1 w-10 text-center" colSpan={2}>Totals</th>
            </tr>
            <tr className="bg-slate-55 border-b border-slate-300 text-center text-[8px] font-bold">
              {days.map(d => (
                <th
                  key={d.dayNum}
                  className={`border-r border-slate-200 p-0.5 w-6 ${d.isWeekend ? 'bg-slate-200 text-slate-400 font-normal' : 'text-slate-700'}`}
                >
                  {d.dayNum}
                </th>
              ))}
              <th className="border-r border-slate-300 p-0.5 w-7 text-red-650 bg-red-50/20 font-bold">ABS</th>
              <th className="p-0.5 w-7 text-emerald-650 bg-emerald-50/20 font-bold">PRES</th>
            </tr>
          </thead>
          <tbody>
            {/* Males Header */}
            <tr className="bg-slate-100 font-bold text-slate-700 text-[8.5px] border-b border-slate-300">
              <td className="p-1 text-center" colSpan={2}>MALES</td>
              <td colSpan={totalDaysInMonth + 2}></td>
            </tr>
            {males.map((l: any, i: number) => {
              const absCount = countAbsent(l);
              const presCount = Math.max(0, totalSchoolDays - absCount);
              return (
                <tr key={l.id || i} className="border-b border-slate-200 hover:bg-slate-50/50">
                  <td className="border-r border-slate-300 p-1 text-center font-semibold text-slate-500">{i + 1}</td>
                  <td className="border-r border-slate-300 p-1 font-bold text-slate-800 uppercase">
                    {l.lastName}, {l.firstName}
                  </td>
                  {days.map(d => {
                    const status = l.attendance[d.dayNum];
                    let displayChar = '';
                    let colorClass = '';
                    if (status === 'absent') {
                      displayChar = 'x';
                      colorClass = 'text-red-600 font-bold text-center';
                    } else if (status === 'late') {
                      displayChar = 'L';
                      colorClass = 'text-amber-600 font-bold text-center';
                    }
                    return (
                      <td
                        key={d.dayNum}
                        className={`border-r border-slate-200 p-0.5 text-center ${colorClass} ${d.isWeekend ? 'bg-slate-100' : ''}`}
                      >
                        {d.isWeekend ? '' : displayChar}
                      </td>
                    );
                  })}
                  <td className="border-r border-slate-300 p-1 text-center font-bold text-red-650 bg-red-50/20">{absCount || '0'}</td>
                  <td className="p-1 text-center font-bold text-emerald-650 bg-emerald-50/20">{presCount}</td>
                </tr>
              );
            })}

            {/* Females Header */}
            <tr className="bg-slate-100 font-bold text-slate-700 text-[8.5px] border-b border-slate-300">
              <td className="p-1 text-center" colSpan={2}>FEMALES</td>
              <td colSpan={totalDaysInMonth + 2}></td>
            </tr>
            {females.map((l: any, i: number) => {
              const absCount = countAbsent(l);
              const presCount = Math.max(0, totalSchoolDays - absCount);
              return (
                <tr key={l.id || i} className="border-b border-slate-200 hover:bg-slate-50/50">
                  <td className="border-r border-slate-300 p-1 text-center font-semibold text-slate-500">{i + 1}</td>
                  <td className="border-r border-slate-300 p-1 font-bold text-slate-800 uppercase">
                    {l.lastName}, {l.firstName}
                  </td>
                  {days.map(d => {
                    const status = l.attendance[d.dayNum];
                    let displayChar = '';
                    let colorClass = '';
                    if (status === 'absent') {
                      displayChar = 'x';
                      colorClass = 'text-red-600 font-bold text-center';
                    } else if (status === 'late') {
                      displayChar = 'L';
                      colorClass = 'text-amber-600 font-bold text-center';
                    }
                    return (
                      <td
                        key={d.dayNum}
                        className={`border-r border-slate-200 p-0.5 text-center ${colorClass} ${d.isWeekend ? 'bg-slate-100' : ''}`}
                      >
                        {d.isWeekend ? '' : displayChar}
                      </td>
                    );
                  })}
                  <td className="border-r border-slate-300 p-1 text-center font-bold text-red-650 bg-red-50/20">{absCount || '0'}</td>
                  <td className="p-1 text-center font-bold text-emerald-650 bg-emerald-50/20">{presCount}</td>
                </tr>
              );
            })}

            {/* Bottom Summary Rows */}
            <tr className="bg-slate-50 font-bold border-t border-slate-300 text-[8.5px]">
              <td className="p-1 border-r border-slate-300" colSpan={2}>MALE DAILY PRESENT</td>
              {days.map(d => {
                const count = d.isWeekend ? 0 : males.filter((m: any) => m.attendance[d.dayNum] !== 'absent').length;
                return (
                  <td key={d.dayNum} className={`border-r border-slate-200 p-0.5 text-center ${d.isWeekend ? 'bg-slate-100' : 'text-slate-700'}`}>
                    {d.isWeekend ? '' : count}
                  </td>
                );
              })}
              <td className="border-r border-slate-300 bg-slate-100" colSpan={2}></td>
            </tr>
            <tr className="bg-slate-50 font-bold border-t border-slate-200 text-[8.5px]">
              <td className="p-1 border-r border-slate-300" colSpan={2}>FEMALE DAILY PRESENT</td>
              {days.map(d => {
                const count = d.isWeekend ? 0 : females.filter((f: any) => f.attendance[d.dayNum] !== 'absent').length;
                return (
                  <td key={d.dayNum} className={`border-r border-slate-200 p-0.5 text-center ${d.isWeekend ? 'bg-slate-100' : 'text-slate-700'}`}>
                    {d.isWeekend ? '' : count}
                  </td>
                );
              })}
              <td className="border-r border-slate-300 bg-slate-100" colSpan={2}></td>
            </tr>
            <tr className="bg-slate-100 font-extrabold border-t border-slate-300 text-[8.5px]">
              <td className="p-1 border-r border-slate-300" colSpan={2}>TOTAL DAILY PRESENT</td>
              {days.map(d => {
                const count = d.isWeekend ? 0 : learners.filter((l: any) => l.attendance[d.dayNum] !== 'absent').length;
                return (
                  <td key={d.dayNum} className={`border-r border-slate-200 p-0.5 text-center ${d.isWeekend ? 'bg-slate-200 text-slate-800' : 'text-slate-900 font-bold'}`}>
                    {d.isWeekend ? '' : count}
                  </td>
                );
              })}
              <td className="border-r border-slate-300 bg-slate-200" colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer statistics & Signatures */}
      <div className="grid grid-cols-12 gap-4 text-[9px] border-t border-slate-300 pt-4 leading-normal print:break-inside-avoid">
        {/* Statistics Table */}
        <div className="col-span-5 border-r border-slate-300 pr-4">
          <h4 className="font-bold text-slate-700 mb-2 uppercase text-[8px] tracking-wider">Attendance Summary Statistics</h4>
          <table className="w-full border-collapse border border-slate-300 text-center font-medium">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-slate-300">
                <th className="border-r border-slate-300 p-1 text-left">Statistic</th>
                <th className="border-r border-slate-300 p-1 w-14">Male</th>
                <th className="border-r border-slate-300 p-1 w-14">Female</th>
                <th className="p-1 w-14">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="border-r border-slate-300 p-1 text-left bg-slate-50 font-semibold">Registered Learners (End of Month)</td>
                <td className="border-r border-slate-300 p-1">{males.length}</td>
                <td className="border-r border-slate-300 p-1">{females.length}</td>
                <td className="p-1 font-bold">{learners.length}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="border-r border-slate-300 p-1 text-left bg-slate-50 font-semibold">Average Daily Attendance</td>
                <td className="border-r border-slate-300 p-1">{avgMaleAttendance.toFixed(2)}</td>
                <td className="border-r border-slate-300 p-1">{avgFemaleAttendance.toFixed(2)}</td>
                <td className="p-1 font-bold">{avgTotalAttendance.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="border-r border-slate-300 p-1 text-left bg-slate-50 font-semibold">Percentage of Attendance</td>
                <td className="border-r border-slate-300 p-1">{pctMaleAttendance.toFixed(2)}%</td>
                <td className="border-r border-slate-300 p-1">{pctFemaleAttendance.toFixed(2)}%</td>
                <td className="p-1 font-bold">{pctTotalAttendance.toFixed(2)}%</td>
              </tr>
              <tr>
                <td className="border-r border-slate-300 p-1 text-left bg-slate-50 font-semibold">No. of Days of Classes in Month</td>
                <td className="p-1 font-bold text-slate-800" colSpan={3}>{totalSchoolDays}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend Panel */}
        <div className="col-span-3 border-r border-slate-300 pr-4 text-[7px] text-slate-500 leading-snug flex flex-col justify-start">
          <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[8px] mb-1.5">Remarks Legend</h4>
          <p className="font-semibold text-slate-600 mb-1">REASONS FOR ABSENCE (SF2):</p>
          <ul className="list-disc pl-3 space-y-0.5">
            <li><strong>a. Domestic:</strong> Household chores, family illness, etc.</li>
            <li><strong>b. Individual:</strong> Personal health, lack of interest.</li>
            <li><strong>c. School-Related:</strong> Distance, conflict, climate.</li>
            <li><strong>d. Geography:</strong> Weather, natural disaster.</li>
            <li><strong>e. Financial:</strong> Lack of uniform, food, or supply allowance.</li>
            <li><strong>f. Other:</strong> Specified in remarks column.</li>
          </ul>
        </div>

        {/* Signatures Section (Cols 9-12) */}
        <div className="col-span-4 pl-2 flex flex-col justify-between space-y-6">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-600 text-[8px] mb-2">Prepared by:</span>
            <div className="border-b border-black text-center pb-1 font-bold uppercase tracking-wide text-[11px] leading-none min-h-[16px]">
              {anyData.advisorName || anyData.adviserName || '\u00A0'}
            </div>
            <div className="text-[7px] text-slate-500 text-center mt-1 uppercase">
              (Signature of Adviser over Printed Name)
            </div>
            <div className="flex justify-between text-[7.5px] text-slate-600 mt-4 font-semibold gap-4">
              <div className="flex-1 border-b border-slate-400 pb-0.5">
                BoSY Date: <span className="font-bold text-slate-900 ml-1">{schoolInfo.bosyDate}</span>
              </div>
              <div className="flex-1 border-b border-slate-400 pb-0.5">
                EoSY Date: <span className="font-bold text-slate-900 ml-1">{schoolInfo.eosyDate}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-semibold text-slate-600 text-[8px] mb-2">Certified Correct:</span>
            <div className="border-b border-black text-center pb-1 font-bold uppercase tracking-wide text-[11px] leading-none min-h-[16px]">
              {principalName}
            </div>
            <div className="text-[7px] text-slate-500 text-center mt-1 uppercase">
              (Signature of School Head over Printed Name)
            </div>
            <div className="flex justify-between text-[7.5px] text-slate-600 mt-4 font-semibold gap-4">
              <div className="flex-1 border-b border-slate-400 pb-0.5">
                BoSY Date: <span className="font-bold text-slate-900 ml-1">{schoolInfo.bosyDate}</span>
              </div>
              <div className="flex-1 border-b border-slate-400 pb-0.5">
                EoSY Date: <span className="font-bold text-slate-900 ml-1">{schoolInfo.eosyDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ReportLayout>
  );
}

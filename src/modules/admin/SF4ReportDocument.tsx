import React, { useState, useEffect } from 'react';
import { ReportLayout } from './reports/ReportLayout';
import type { SF4Data } from '../../lib/services/reportDataService';
import { getGlobalSettings } from '../../lib/services/settingsService';

interface SF4ReportDocumentProps {
  onClose: () => void;
  data: SF4Data;
}

export function SF4ReportDocument({ onClose, data }: SF4ReportDocumentProps) {
  const { schoolYear, reportMonth, sections } = data;
  const anyData = data as any;
  const [schoolInfo, setSchoolInfo] = useState({
    schoolId: anyData.schoolId || '199006',
    region: anyData.region || 'IX',
    division: anyData.division || 'ZAMBOANGA',
    schoolName: anyData.schoolName || 'Sta. Maria CS SPED Center'
  });

  useEffect(() => {
    getGlobalSettings().then(settings => {
      setSchoolInfo({
        schoolId: anyData.schoolId || settings.schoolId || '199006',
        region: anyData.region || settings.region || 'IX',
        division: (anyData.division || settings.division || 'ZAMBOANGA').toUpperCase(),
        schoolName: anyData.schoolName || settings.schoolName || 'Sta. Maria CS SPED Center'
      });
    }).catch(console.error);
  }, [anyData]);

  return (
    <ReportLayout title="School Form 4 (SF4)" onClose={onClose} landscape>
      {/* DepEd Header */}
      <div className="flex items-center justify-between mb-6">
        <img src="/kagawaran_ng_edukasyon.png" alt="Kagawaran ng Edukasyon Logo" className="w-24 h-24 object-contain" />
        <div className="text-center flex-1">
          <h1 className="font-bold text-xl mb-1">DEPARTMENT OF EDUCATION</h1>
          <h2 className="font-bold text-lg">School Form 4 (SF4) Monthly Learner's Movement and Attendance</h2>
        </div>
        <div className="w-48">
          <div className="text-4xl font-black text-blue-800 tracking-tighter flex items-center">
            Dep<span className="text-red-600 ml-1">ED</span>
          </div>
          <div className="text-[10px] tracking-widest font-semibold text-slate-600 mt-1">
            DEPARTMENT OF EDUCATION
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-bold text-lg border-b-2 border-black pb-1 mb-1">
          School Form 4 (SF4) Monthly Learner's Movement and Attendance
        </h3>
        <p className="text-xs italic">
          (this replaces Form 3 &amp; STS Form 4-Absenteeism and Dropout Profile)
        </p>
      </div>

      {/* Info Table */}
      <table className="w-full border-collapse border border-black mb-4 text-xs font-medium">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1 bg-gray-100 w-32 font-bold">School ID:</td>
            <td className="border border-black px-2 py-1 w-64">{schoolInfo.schoolId}</td>
            <td className="border border-black px-2 py-1 bg-gray-100 w-32 font-bold">Region:</td>
            <td className="border border-black px-2 py-1 w-64">{schoolInfo.region}</td>
            <td className="border border-black px-2 py-1 bg-gray-100 w-32 font-bold">Division:</td>
            <td className="border border-black px-2 py-1">{schoolInfo.division}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 bg-gray-100 font-bold">School Name:</td>
            <td className="border border-black px-2 py-1 font-bold">{schoolInfo.schoolName}</td>
            <td className="border border-black px-2 py-1 bg-gray-100 font-bold">School Year:</td>
            <td className="border border-black px-2 py-1">{schoolYear}</td>
            <td className="border border-black px-2 py-1 bg-gray-100 font-bold">Report Month:</td>
            <td className="border border-black px-2 py-1 font-bold">{reportMonth}</td>
          </tr>
        </tbody>
      </table>

      {/* Main Data Table */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse border-2 border-black text-[10px] text-center">
          <thead>
            <tr>
              <th className="border border-black p-1 align-middle" rowSpan={3}>GRADE<br />/ YEAR<br />LEVEL</th>
              <th className="border border-black p-1 align-middle" rowSpan={3}>SECTION</th>
              <th className="border border-black p-1 align-middle" rowSpan={3}>NAME<br />OF<br />ADVISER</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2} colSpan={3}>
                REGISTERED<br />LEARNERS<br />(As of End of<br />the Month)
              </th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={6}>ATTENDANCE</th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={9}>
                NO LONGER PARTICIPATING<br />IN LEARNING ACTIVITIES
              </th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={9}>TRANSFERRED OUT</th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={9}>TRANSFERRED IN</th>
            </tr>
            <tr>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={3}>Daily<br />Average</th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={3}>Percentage<br />for the<br />Month</th>
              {[...Array(3)].map((_, gi) => (
                <React.Fragment key={gi}>
                  <th className="border border-black p-1 align-middle bg-gray-50" colSpan={3}>
                    {gi === 0 ? '(A)\nCumulative\nas of\nPrevious\nMonth' : gi === 1 ? '(B)\nFor\nthe\nMonth' : '(A + B)\nCumulative\nas of End of\nMonth'}
                  </th>
                </React.Fragment>
              ))}
              {[...Array(3)].map((_, gi) => (
                <React.Fragment key={`to-${gi}`}>
                  <th className="border border-black p-1 align-middle bg-gray-50" colSpan={3}>
                    {gi === 0 ? '(A)' : gi === 1 ? '(B)' : '(A + B)'}
                  </th>
                </React.Fragment>
              ))}
              {[...Array(3)].map((_, gi) => (
                <React.Fragment key={`ti-${gi}`}>
                  <th className="border border-black p-1 align-middle bg-gray-50" colSpan={3}>
                    {gi === 0 ? '(A)' : gi === 1 ? '(B)' : '(A + B)'}
                  </th>
                </React.Fragment>
              ))}
            </tr>
            <tr>
              {Array.from({ length: 13 }).map((_, i) => (
                <React.Fragment key={i}>
                  <th className="border border-black p-1 w-6 font-bold bg-gray-100">M</th>
                  <th className="border border-black p-1 w-6 font-bold bg-gray-100">F</th>
                  <th className="border border-black p-1 w-6 font-bold bg-gray-100">T</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.length > 0 ? (
              <>
                {sections.map((row, i) => (
                  <tr key={i}>
                    <td className="border border-black p-1 font-bold">{row.gradeLevel}</td>
                    <td className="border border-black p-1">{row.section}</td>
                    <td className="border border-black p-1">{row.advisorName}</td>
                    {/* Registered */}
                    <td className="border border-black p-1">{row.maleCount}</td>
                    <td className="border border-black p-1">{row.femaleCount}</td>
                    <td className="border border-black p-1 font-bold">{row.totalCount}</td>
                    {/* Daily Average */}
                    <td className="border border-black p-1">{row.avgDailyAttendanceMale}</td>
                    <td className="border border-black p-1">{row.avgDailyAttendanceFemale}</td>
                    <td className="border border-black p-1 font-bold">{row.avgDailyAttendanceTotal}</td>
                    {/* Percentage */}
                    <td className="border border-black p-1">{row.attendancePctMale}%</td>
                    <td className="border border-black p-1">{row.attendancePctFemale}%</td>
                    <td className="border border-black p-1 font-bold">{row.attendancePctTotal}%</td>

                    {/* NLPA / Dropped */}
                    <td className="border border-black p-1">{row.nlpaPrevMale || 0}</td>
                    <td className="border border-black p-1">{row.nlpaPrevFemale || 0}</td>
                    <td className="border border-black p-1 font-bold">{(row.nlpaPrevMale || 0) + (row.nlpaPrevFemale || 0)}</td>
                    <td className="border border-black p-1">{row.nlpaMonthMale || 0}</td>
                    <td className="border border-black p-1">{row.nlpaMonthFemale || 0}</td>
                    <td className="border border-black p-1 font-bold">{(row.nlpaMonthMale || 0) + (row.nlpaMonthFemale || 0)}</td>
                    <td className="border border-black p-1">{(row.nlpaPrevMale || 0) + (row.nlpaMonthMale || 0)}</td>
                    <td className="border border-black p-1">{(row.nlpaPrevFemale || 0) + (row.nlpaMonthFemale || 0)}</td>
                    <td className="border border-black p-1 font-bold">{(row.nlpaPrevMale || 0) + (row.nlpaMonthMale || 0) + (row.nlpaPrevFemale || 0) + (row.nlpaMonthFemale || 0)}</td>

                    {/* Transferred Out */}
                    <td className="border border-black p-1">{row.tOutPrevMale || 0}</td>
                    <td className="border border-black p-1">{row.tOutPrevFemale || 0}</td>
                    <td className="border border-black p-1 font-bold">{(row.tOutPrevMale || 0) + (row.tOutPrevFemale || 0)}</td>
                    <td className="border border-black p-1">{row.tOutMonthMale || 0}</td>
                    <td className="border border-black p-1">{row.tOutMonthFemale || 0}</td>
                    <td className="border border-black p-1 font-bold">{(row.tOutMonthMale || 0) + (row.tOutMonthFemale || 0)}</td>
                    <td className="border border-black p-1">{(row.tOutPrevMale || 0) + (row.tOutMonthMale || 0)}</td>
                    <td className="border border-black p-1">{(row.tOutPrevFemale || 0) + (row.tOutMonthFemale || 0)}</td>
                    <td className="border border-black p-1 font-bold">{(row.tOutPrevMale || 0) + (row.tOutMonthMale || 0) + (row.tOutPrevFemale || 0) + (row.tOutMonthFemale || 0)}</td>

                    {/* Transferred In */}
                    <td className="border border-black p-1">{row.tInPrevMale || 0}</td>
                    <td className="border border-black p-1">{row.tInPrevFemale || 0}</td>
                    <td className="border border-black p-1 font-bold">{(row.tInPrevMale || 0) + (row.tInPrevFemale || 0)}</td>
                    <td className="border border-black p-1">{row.tInMonthMale || 0}</td>
                    <td className="border border-black p-1">{row.tInMonthFemale || 0}</td>
                    <td className="border border-black p-1 font-bold">{(row.tInMonthMale || 0) + (row.tInMonthFemale || 0)}</td>
                    <td className="border border-black p-1">{(row.tInPrevMale || 0) + (row.tInMonthMale || 0)}</td>
                    <td className="border border-black p-1">{(row.tInPrevFemale || 0) + (row.tInMonthFemale || 0)}</td>
                    <td className="border border-black p-1 font-bold">{(row.tInPrevMale || 0) + (row.tInMonthMale || 0) + (row.tInPrevFemale || 0) + (row.tInMonthFemale || 0)}</td>
                  </tr>
                ))}

                {/* Summary / Totals Row */}
                {(() => {
                  const totMaleReg = sections.reduce((sum, s) => sum + (s.maleCount || 0), 0);
                  const totFemaleReg = sections.reduce((sum, s) => sum + (s.femaleCount || 0), 0);
                  const totReg = totMaleReg + totFemaleReg;

                  const totAvgMale = sections.reduce((sum, s) => sum + (s.avgDailyAttendanceMale || 0), 0);
                  const totAvgFemale = sections.reduce((sum, s) => sum + (s.avgDailyAttendanceFemale || 0), 0);
                  const totAvg = totAvgMale + totAvgFemale;

                  const totPctMale = totMaleReg > 0 ? Math.min(100, Math.round((totAvgMale / totMaleReg) * 100)) : 0;
                  const totPctFemale = totFemaleReg > 0 ? Math.min(100, Math.round((totAvgFemale / totFemaleReg) * 100)) : 0;
                  const totPctTotal = totReg > 0 ? Math.min(100, Math.round((totAvg / totReg) * 100)) : 0;

                  const sumCol = (key: keyof typeof sections[0]) => sections.reduce((sum, s) => sum + ((s[key] as number) || 0), 0);

                  return (
                    <tr className="bg-gray-200 font-black border-t-2 border-black">
                      <td className="border border-black p-1 text-center" colSpan={3}>TOTAL</td>
                      <td className="border border-black p-1">{totMaleReg}</td>
                      <td className="border border-black p-1">{totFemaleReg}</td>
                      <td className="border border-black p-1">{totReg}</td>

                      <td className="border border-black p-1">{totAvgMale}</td>
                      <td className="border border-black p-1">{totAvgFemale}</td>
                      <td className="border border-black p-1">{totAvg}</td>

                      <td className="border border-black p-1">{totPctMale}%</td>
                      <td className="border border-black p-1">{totPctFemale}%</td>
                      <td className="border border-black p-1">{totPctTotal}%</td>

                      <td className="border border-black p-1">{sumCol('nlpaPrevMale')}</td>
                      <td className="border border-black p-1">{sumCol('nlpaPrevFemale')}</td>
                      <td className="border border-black p-1">{sumCol('nlpaPrevTotal')}</td>
                      <td className="border border-black p-1">{sumCol('nlpaMonthMale')}</td>
                      <td className="border border-black p-1">{sumCol('nlpaMonthFemale')}</td>
                      <td className="border border-black p-1">{sumCol('nlpaMonthTotal')}</td>
                      <td className="border border-black p-1">{sumCol('nlpaEndMale')}</td>
                      <td className="border border-black p-1">{sumCol('nlpaEndFemale')}</td>
                      <td className="border border-black p-1">{sumCol('nlpaEndTotal')}</td>

                      <td className="border border-black p-1">{sumCol('tOutPrevMale')}</td>
                      <td className="border border-black p-1">{sumCol('tOutPrevFemale')}</td>
                      <td className="border border-black p-1">{sumCol('tOutPrevTotal')}</td>
                      <td className="border border-black p-1">{sumCol('tOutMonthMale')}</td>
                      <td className="border border-black p-1">{sumCol('tOutMonthFemale')}</td>
                      <td className="border border-black p-1">{sumCol('tOutMonthTotal')}</td>
                      <td className="border border-black p-1">{sumCol('tOutEndMale')}</td>
                      <td className="border border-black p-1">{sumCol('tOutEndFemale')}</td>
                      <td className="border border-black p-1">{sumCol('tOutEndTotal')}</td>

                      <td className="border border-black p-1">{sumCol('tInPrevMale')}</td>
                      <td className="border border-black p-1">{sumCol('tInPrevFemale')}</td>
                      <td className="border border-black p-1">{sumCol('tInPrevTotal')}</td>
                      <td className="border border-black p-1">{sumCol('tInMonthMale')}</td>
                      <td className="border border-black p-1">{sumCol('tInMonthFemale')}</td>
                      <td className="border border-black p-1">{sumCol('tInMonthTotal')}</td>
                      <td className="border border-black p-1">{sumCol('tInEndMale')}</td>
                      <td className="border border-black p-1">{sumCol('tInEndFemale')}</td>
                      <td className="border border-black p-1">{sumCol('tInEndTotal')}</td>
                    </tr>
                  );
                })()}
              </>
            ) : (
              <tr>
                <td className="border border-black p-2 font-medium italic text-center" colSpan={42}>
                  No data found for this school year / month combination.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mortality section */}
      <div className="mt-8">
        <h4 className="font-bold text-xs mb-2">Mortality / Death</h4>
        <table className="border-collapse border border-black text-xs">
          <thead>
            <tr>
              <th className="border border-black p-1 px-4 bg-gray-100">Previous Month</th>
              <th className="border border-black p-1 px-4 bg-gray-100">For the month</th>
              <th className="border border-black p-1 px-4 bg-gray-100">Cumulative as of End of Month</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1 h-6"></td>
              <td className="border border-black p-1 h-6"></td>
              <td className="border border-black p-1 h-6"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </ReportLayout>
  );
}

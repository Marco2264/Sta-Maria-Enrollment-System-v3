import React from 'react';
import { ReportLayout } from './reports/ReportLayout';
import type { SF4Data } from '../../lib/services/reportDataService';

interface SF4ReportDocumentProps {
  onClose: () => void;
  data: SF4Data;
}

export function SF4ReportDocument({ onClose, data }: SF4ReportDocumentProps) {
  const { schoolYear, reportMonth, sections } = data;

  return (
    <ReportLayout title="School Form 4 (SF4)" onClose={onClose} landscape>
      {/* DepEd Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs text-center p-2">
          KAGAWARAN<br />NG<br />EDUKASYON
        </div>
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
            <td className="border border-black px-2 py-1 w-64">100011</td>
            <td className="border border-black px-2 py-1 bg-gray-100 w-32 font-bold">Region:</td>
            <td className="border border-black px-2 py-1 w-64">IX</td>
            <td className="border border-black px-2 py-1 bg-gray-100 w-32 font-bold">Division:</td>
            <td className="border border-black px-2 py-1">ZAMBOANGA</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 bg-gray-100 font-bold">School Name:</td>
            <td className="border border-black px-2 py-1 font-bold">Sta. Maria Elementary School</td>
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
              sections.map((row, i) => (
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
                  {/* Remaining columns (dropout/transfer) — 0 with resilient fallback */}
                  {Array.from({ length: 27 }).map((_, ci) => (
                    <td key={ci} className="border border-black p-1 h-6">0</td>
                  ))}
                </tr>
              ))
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

import React from 'react';
import { ReportLayout } from './reports/ReportLayout';
import type { SF1Data } from '../../lib/services/reportDataService';

interface SF1ReportDocumentProps {
  onClose: () => void;
  data: SF1Data;
}

export function SF1ReportDocument({ onClose, data }: SF1ReportDocumentProps) {
  const { schoolYear, gradeLevel, section, learners, advisorName } = data;
  const anyData = data as any;

  const femalesCount = learners.filter(s => s.gender?.toLowerCase().startsWith('f')).length;
  const malesCount = learners.filter(s => !s.gender?.toLowerCase().startsWith('f')).length;
  const totalCount = learners.length;

  return (
    <ReportLayout title="School Form 1 (SF1)" onClose={onClose} landscape>
      {/* DepEd Header */}
      <div className="flex items-center justify-between mb-2">
        <img src="/kagawaran_ng_edukasyon.png" alt="Kagawaran ng Edukasyon Logo" className="w-20 h-20 object-contain" />
        <div className="text-center flex-1 text-blue-700">
          <h2 className="font-bold text-xl">School Form 1 (SF1) School Register</h2>
          <p className="text-xs italic text-slate-600">
            (this replaces Form 1, Master List &amp; STS Form 2-Family Background and Profile)
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
            <p><span className="font-bold">School ID:</span> 199006</p>
            <p><span className="font-bold">School Name:</span> Sta. Maria CS SPED Center</p>
          </div>
          <div className="space-y-1">
            <p><span className="font-bold">Region:</span> IX</p>
            <p><span className="font-bold">School Year:</span> {schoolYear}</p>
          </div>
          <div className="space-y-1">
            <p><span className="font-bold">Division:</span> Zamboanga</p>
            <p><span className="font-bold">Grade Level:</span> {gradeLevel}</p>
          </div>
          <div className="space-y-1 pr-12">
            <p><span className="font-bold">District:</span> Sta. Maria Central</p>
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
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={4}>NAME</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>Sex<br />(M/F)</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>
                BIRTH<br />DATE<br />(mm/dd/yy)
              </th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>
                AGE as of 1st friday<br />of June<br />
                <span className="font-normal text-[8px]">(nos. of years as per last<br />birthday)</span>
              </th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>BIRTH PLACE</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>MOTHER<br />TONGUE</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>
                IP<br /><span className="font-normal text-[8px]">(Specify<br />ethnic group)</span>
              </th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>Religion</th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={4}>ADDRESS</th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={2}>NAME OF PARENTS</th>
              <th className="border border-black p-1 align-middle bg-gray-50" colSpan={2}>GUARDIAN</th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>
                CONTACT<br />NUMBER<br /><span className="font-normal text-[8px]">Parent/Guardian</span>
              </th>
              <th className="border border-black p-1 align-middle bg-gray-50" rowSpan={2}>
                REMARKS<br /><span className="font-normal text-[8px]">(Please refer to the<br />legend on last page)</span>
              </th>
            </tr>
            <tr>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Last<br />Name</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">First<br />Name</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Name Ext.<br />(Jr, I, II)</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Middle<br />Name</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">House # /<br />Street<br />Sitio/Purok</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Barangay</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Municipality/<br />City</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Province</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium text-[8px]">
                Father<br />(1st name only if family<br />name identical to<br />learner)
              </th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium text-[8px]">
                Mother<br />(Maiden: 1st Name,<br />Middle &amp; Last name)
              </th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Name</th>
              <th className="border border-black p-1 align-middle bg-gray-50 font-medium">Relationship</th>
            </tr>
          </thead>
          <tbody>
            {learners.length > 0 ? (
              learners.map((l, i) => (
                <tr key={l.id || i}>
                  <td className="border border-black p-1 text-[18px] font-bold text-center align-middle">{l.lrn}</td>
                  <td className="border border-black p-1">{l.lastName}</td>
                  <td className="border border-black p-1">{l.firstName}</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1">{l.middleName ? `${l.middleName.charAt(0)}.` : ''}</td>
                  <td className="border border-black p-1">{l.gender === 'Male' ? 'M' : 'F'}</td>
                  <td className="border border-black p-1">{l.birthDate}</td>
                  <td className="border border-black p-1">{l.age ?? ''}</td>
                  <td className="border border-black p-1 uppercase">{l.birthCity} {l.birthProvince}</td>
                  <td className="border border-black p-1">{l.motherTongue}</td>
                  <td className="border border-black p-1">{l.indigenousGroup}</td>
                  <td className="border border-black p-1">{l.religion}</td>
                  <td className="border border-black p-1">{l.addressStreet}</td>
                  <td className="border border-black p-1 uppercase">{l.addressBarangay}</td>
                  <td className="border border-black p-1 uppercase">{l.addressCity}</td>
                  <td className="border border-black p-1 uppercase">{l.addressProvince}</td>
                  <td className="border border-black p-1">{l.fatherName}</td>
                  <td className="border border-black p-1">{l.motherName}</td>
                  <td className="border border-black p-1">{l.guardianName}</td>
                  <td className="border border-black p-1">{l.guardianRelationship}</td>
                  <td className="border border-black p-1">{l.contactNumber}</td>
                  <td className="border border-black p-1">{l.remarks}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black p-2 font-medium italic text-center" colSpan={22}>
                  No enrolled learners found for this section.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Legend / Summary Table / Signatures */}
      <div className="mt-6 grid grid-cols-12 gap-4 text-[9px] border-t border-slate-300 pt-4 leading-normal print:break-inside-avoid">
        {/* Indicators Section (Cols 1-6) */}
        <div className="col-span-6 border-r border-slate-300 pr-4">
          <h3 className="font-bold text-[10px] mb-2 uppercase text-slate-700 tracking-wider">
            List and code of Indicators under REMARK column
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="space-y-1.5">
              <p>
                <span className="font-bold text-slate-800">Transferred Out (T/O)</span> - Name of Public (P) Private (PR) School &amp; Effectivity Date
              </p>
              <p>
                <span className="font-bold text-slate-800">Transferred IN (T/I)</span> - Name of Public (P) Private (PR) School &amp; Effectivity Date
              </p>
              <p>
                <span className="font-bold text-slate-800">Dropped (DRP)</span> - Reason and Effectivity Date
              </p>
              <p>
                <span className="font-bold text-slate-800">Late Enrollment (LE)</span> - Reason (Enrollment beyond 1st Friday of June)
              </p>
            </div>
            <div className="space-y-1.5">
              <p>
                <span className="font-bold text-slate-800">CCT Recipient (CCT)</span> - CCT Control/reference number &amp; Effectivity Date
              </p>
              <p>
                <span className="font-bold text-slate-800">Balik-Aral (B/A)</span> - Name of school last attended &amp; Year
              </p>
              <p>
                <span className="font-bold text-slate-800">Learner With Disability (LWD)</span> - Specify
              </p>
              <p>
                <span className="font-bold text-slate-800">Accelerated (ACL)</span> - Specify Level &amp; Effectivity Data
              </p>
            </div>
          </div>
        </div>

        {/* Summary Table Section (Cols 7-9) */}
        <div className="col-span-3 border-r border-slate-300 pr-4 flex flex-col justify-start">
          <table className="w-full border-collapse border border-slate-400 text-center font-medium">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-slate-400 p-1"></th>
                <th className="border border-slate-400 p-1">BoSY</th>
                <th className="border border-slate-400 p-1">EoSY</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-400 font-bold bg-slate-50 p-1 text-left px-2">MALE</td>
                <td className="border border-slate-400 p-1 text-center font-bold text-slate-800">{malesCount}</td>
                <td className="border border-slate-400 p-1 bg-slate-50"></td>
              </tr>
              <tr>
                <td className="border border-slate-400 font-bold bg-slate-50 p-1 text-left px-2">FEMALE</td>
                <td className="border border-slate-400 p-1 text-center font-bold text-slate-800">{femalesCount}</td>
                <td className="border border-slate-400 p-1 bg-slate-50"></td>
              </tr>
              <tr className="bg-slate-100 font-bold">
                <td className="border border-slate-400 p-1 text-left px-2">TOTAL</td>
                <td className="border border-slate-400 p-1 text-center text-slate-900">{totalCount}</td>
                <td className="border border-slate-400 p-1 bg-slate-100"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures Section (Cols 10-12) */}
        <div className="col-span-3 pl-2 flex flex-col justify-between space-y-6">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-600 text-[8px] mb-2">Prepared by:</span>
            <div className="border-b border-black text-center pb-1 font-bold uppercase tracking-wide text-[11px] leading-none min-h-[16px]">
              {advisorName || '\u00A0'}
            </div>
            <div className="text-[7px] text-slate-500 text-center mt-1 uppercase">
              (Signature of Adviser over Printed Name)
            </div>
            <div className="flex justify-between text-[7.5px] text-slate-600 mt-4 font-semibold gap-4">
              <div className="flex-1 border-b border-slate-400 pb-0.5">
                BoSY Date:
              </div>
              <div className="flex-1 border-b border-slate-400 pb-0.5">
                EoSY Date:
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-semibold text-slate-600 text-[8px] mb-2">Certified Correct:</span>
            <div className="border-b border-black text-center pb-1 font-bold uppercase tracking-wide text-[11px] leading-none min-h-[16px]">
              {anyData.schoolHead || anyData.principalName || anyData.schoolHeadName || '\u00A0'}
            </div>
            <div className="text-[7px] text-slate-500 text-center mt-1 uppercase">
              (Signature of School Head over Printed Name)
            </div>
            <div className="flex justify-between text-[7.5px] text-slate-600 mt-4 font-semibold gap-4">
              <div className="flex-1 border-b border-slate-400 pb-0.5">
                BoSY Date:
              </div>
              <div className="flex-1 border-b border-slate-400 pb-0.5">
                EoSY Date:
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-[10px] text-gray-500 text-center print:block hidden">
        Generated on: {new Date().toLocaleString()}<br />
        Computer-generated report
      </div>
    </ReportLayout>
  );
}

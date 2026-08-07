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
      {/* DepEd Header - Identical to Excel Header */}
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <div className="w-24 shrink-0">
          <img src="/kagawaran_ng_edukasyon.png" alt="Kagawaran ng Edukasyon Seal" className="w-20 h-20 object-contain" />
        </div>
        <div className="text-center flex-1">
          <h2 className="font-bold text-2xl uppercase tracking-tight text-slate-900 font-['Arial_Narrow',sans-serif]">School Form 1 (SF1) School Register</h2>
          <p className="text-xs italic text-slate-600 font-['Arial_Narrow',sans-serif] mt-0.5">
            (This replaced Form 1, Master List &amp; STS Form 2-Family Background and Profile)
          </p>
        </div>
        <div className="w-40 shrink-0 text-right">
          <img src="/deped_logo.png" alt="DepEd Logo" className="w-36 h-14 object-contain ml-auto" />
        </div>
      </div>

      {/* Info Boxes Header - Exact Replica of Excel Metadata Boxes */}
      <div className="mb-5 font-['Arial_Narrow',sans-serif] text-xs space-y-2">
        {/* Row 1 */}
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-3 flex items-center gap-2">
            <span className="font-bold text-slate-900 shrink-0">School ID</span>
            <div className="flex-1 border border-black bg-white px-2 py-1 text-center font-bold text-sm">
              199006
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <span className="font-bold text-slate-900 shrink-0">Region</span>
            <div className="flex-1 border border-black bg-white px-2 py-1 text-center font-bold text-sm">
              IX
            </div>
          </div>
          <div className="col-span-4 flex items-center gap-2">
            <span className="font-bold text-slate-900 shrink-0">Division</span>
            <div className="flex-1 border border-black bg-white px-2 py-1 text-center font-bold text-sm">
              Zamboanga
            </div>
          </div>
          <div className="col-span-3 flex items-center gap-2">
            <span className="font-bold text-slate-900 shrink-0">District</span>
            <div className="flex-1 border border-black bg-white px-2 py-1 text-center font-bold text-sm truncate">
              Sta. Maria Central
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-4 flex items-center gap-2">
            <span className="font-bold text-slate-900 shrink-0">Name of School</span>
            <div className="flex-1 border border-black bg-white px-2 py-1 text-center font-bold text-sm truncate">
              Sta. Maria CS SPED Center
            </div>
          </div>
          <div className="col-span-3 flex items-center gap-2">
            <span className="font-bold text-slate-900 shrink-0">School Year</span>
            <div className="flex-1 border border-black bg-white px-2 py-1 text-center font-bold text-sm">
              {schoolYear}
            </div>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <span className="font-bold text-slate-900 shrink-0">Grade Level</span>
            <div className="flex-1 border border-black bg-white px-2 py-1 text-center font-bold text-sm">
              {gradeLevel}
            </div>
          </div>
          <div className="col-span-3 flex items-center gap-2">
            <span className="font-bold text-slate-900 shrink-0">Section</span>
            <div className="flex-1 border border-black bg-white px-2 py-1 text-center font-bold text-sm uppercase">
              {section}
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table - Horizontally Aligned Size 14 Text */}
      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse border border-black text-[14px] font-['Arial_Narrow',sans-serif] text-center">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" rowSpan={2}>LRN</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" colSpan={4}>NAME</th>
              <th className="border border-black px-1 py-1 align-middle whitespace-nowrap" rowSpan={2}>Sex<br />(M/F)</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" rowSpan={2}>
                BIRTH DATE<br /><span className="text-[10px] font-normal">(mm/dd/yy)</span>
              </th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" rowSpan={2}>
                AGE as of 1st friday of June<br />
                <span className="font-normal text-[10px]">(nos. of years as per last birthday)</span>
              </th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" rowSpan={2}>BIRTH PLACE</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" rowSpan={2}>MOTHER TONGUE</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" rowSpan={2}>
                IP<br /><span className="font-normal text-[10px]">(Specify ethnic group)</span>
              </th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" rowSpan={2}>RELIGION</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" colSpan={4}>ADDRESS</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" colSpan={2}>NAME OF PARENTS</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" colSpan={2}>GUARDIAN</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" rowSpan={2}>
                CONTACT NUMBER<br /><span className="font-normal text-[10px]">Parent/Guardian</span>
              </th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap" rowSpan={2}>
                REMARKS<br /><span className="font-normal text-[10px]">(Please refer to legend on last page)</span>
              </th>
            </tr>
            <tr className="bg-gray-100 font-semibold text-[12px]">
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap">Last Name</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap">First Name</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap">Ext (Jr, I)</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap">Middle Name</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap">House # / Street / Sitio / Purok</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap">Barangay</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap">Municipality / City</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap">Province</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap text-[10px]">
                Father (1st name if same family name)
              </th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap text-[10px]">
                Mother (Maiden: 1st, Middle, Last)
              </th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap">Name</th>
              <th className="border border-black px-2 py-1 align-middle whitespace-nowrap">Relationship</th>
            </tr>
          </thead>
          <tbody>
            {learners.length > 0 ? (
              learners.map((l, i) => (
                <tr key={l.id || i} className="h-10 hover:bg-slate-50/80">
                  <td className="border border-black px-2 py-1 text-[14px] font-bold text-center align-middle whitespace-nowrap">{l.lrn}</td>
                  <td className="border border-black px-2 py-1 text-left uppercase font-bold text-[14px] whitespace-nowrap">{l.lastName}</td>
                  <td className="border border-black px-2 py-1 text-left uppercase text-[14px] whitespace-nowrap">{l.firstName}</td>
                  <td className="border border-black px-2 py-1 text-[14px] whitespace-nowrap"></td>
                  <td className="border border-black px-2 py-1 uppercase text-[14px] whitespace-nowrap">{l.middleName ? `${l.middleName.charAt(0)}.` : ''}</td>
                  <td className="border border-black px-2 py-1 text-center text-[14px] whitespace-nowrap">{l.gender === 'Male' ? 'M' : 'F'}</td>
                  <td className="border border-black px-2 py-1 text-center text-[14px] whitespace-nowrap">{l.birthDate}</td>
                  <td className="border border-black px-2 py-1 text-center text-[14px] whitespace-nowrap">{l.age ?? ''}</td>
                  <td className="border border-black px-2 py-1 uppercase text-left text-[14px] whitespace-nowrap">{l.birthCity} {l.birthProvince}</td>
                  <td className="border border-black px-2 py-1 uppercase text-center text-[14px] whitespace-nowrap">{l.motherTongue}</td>
                  <td className="border border-black px-2 py-1 uppercase text-center text-[14px] whitespace-nowrap">{l.indigenousGroup}</td>
                  <td className="border border-black px-2 py-1 uppercase text-left text-[14px] whitespace-nowrap">{l.religion}</td>
                  <td className="border border-black px-2 py-1 uppercase text-left text-[14px] whitespace-nowrap">{l.addressStreet}</td>
                  <td className="border border-black px-2 py-1 uppercase text-left text-[14px] whitespace-nowrap">{l.addressBarangay}</td>
                  <td className="border border-black px-2 py-1 uppercase text-left text-[14px] whitespace-nowrap">{l.addressCity}</td>
                  <td className="border border-black px-2 py-1 uppercase text-left text-[14px] whitespace-nowrap">{l.addressProvince}</td>
                  <td className="border border-black px-2 py-1 uppercase text-left text-[14px] whitespace-nowrap">{l.fatherName}</td>
                  <td className="border border-black px-2 py-1 uppercase text-left text-[14px] whitespace-nowrap">{l.motherName}</td>
                  <td className="border border-black px-2 py-1 uppercase text-left text-[14px] whitespace-nowrap">{l.guardianName}</td>
                  <td className="border border-black px-2 py-1 uppercase text-center text-[14px] whitespace-nowrap">{l.guardianRelationship}</td>
                  <td className="border border-black px-2 py-1 text-center text-[14px] whitespace-nowrap">{l.contactNumber}</td>
                  <td className="border border-black px-2 py-1 uppercase text-left text-[14px] whitespace-nowrap">{l.remarks}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="border border-black p-4 font-medium italic text-center text-slate-500" colSpan={22}>
                  No enrolled learners found for this section.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Legend / Summary Table / Signatures */}
      <div className="mt-6 grid grid-cols-12 gap-4 text-[11px] font-['Arial_Narrow',sans-serif] border-t border-slate-300 pt-4 leading-normal print:break-inside-avoid">
        {/* Indicators Section (Cols 1-6) */}
        <div className="col-span-6 border-r border-slate-300 pr-4">
          <h3 className="font-bold text-[11px] mb-2 uppercase text-slate-800 tracking-wider">
            List and code of Indicators under REMARK column
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
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
          <table className="w-full border-collapse border border-slate-400 text-center font-medium text-[11px]">
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
            <span className="font-semibold text-slate-600 text-[10px] mb-2">Prepared by:</span>
            <div className="border-b border-black text-center pb-1 font-bold uppercase tracking-wide text-[16px] font-['Arial_Narrow',sans-serif] leading-none min-h-[22px]">
              {advisorName || '\u00A0'}
            </div>
            <div className="text-[9px] text-slate-500 text-center mt-1 uppercase font-semibold">
              (Signature of Adviser over Printed Name)
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 mt-4 font-semibold gap-4">
              <div className="flex-1 border-b border-slate-400 pb-0.5">
                BoSY Date:
              </div>
              <div className="flex-1 border-b border-slate-400 pb-0.5">
                EoSY Date:
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="font-semibold text-slate-600 text-[10px] mb-2">Certified Correct:</span>
            <div className="border-b border-black text-center pb-1 font-bold uppercase tracking-wide text-[16px] font-['Arial_Narrow',sans-serif] leading-none min-h-[22px]">
              {anyData.schoolHead || anyData.principalName || anyData.schoolHeadName || 'MRS. LEPIDAPTERA VILLANUEVA'}
            </div>
            <div className="text-[9px] text-slate-500 text-center mt-1 uppercase font-semibold">
              (Signature of School Head over Printed Name)
            </div>
            <div className="flex justify-between text-[9px] text-slate-600 mt-4 font-semibold gap-4">
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

import React from 'react';
import { ReportLayout } from './reports/ReportLayout';
import type { SF1Data } from '../../lib/services/reportDataService';

interface SF1ReportDocumentProps {
  onClose: () => void;
  data: SF1Data;
}

export function SF1ReportDocument({ onClose, data }: SF1ReportDocumentProps) {
  const { schoolYear, gradeLevel, section, learners } = data;

  return (
    <ReportLayout title="School Form 1 (SF1)" onClose={onClose} landscape>
      {/* DepEd Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="w-20 h-20 rounded-full border border-black flex items-center justify-center font-bold text-[10px] text-center p-1 leading-tight">
          KAGAWARAN<br />NG<br />EDUKASYON
        </div>
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
            <p><span className="font-bold">School ID:</span> 100011</p>
            <p><span className="font-bold">School Name:</span> STA. MARIA ELEMENTARY SCHOOL</p>
          </div>
          <div className="space-y-1">
            <p><span className="font-bold">Region:</span> IX</p>
            <p><span className="font-bold">School Year:</span> {schoolYear}</p>
          </div>
          <div className="space-y-1">
            <p><span className="font-bold">Division:</span> ZAMBOANGA</p>
            <p><span className="font-bold">Grade Level:</span> {gradeLevel}</p>
          </div>
          <div className="space-y-1 pr-12">
            <p><span className="font-bold">District:</span></p>
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
                  <td className="border border-black p-1">{l.lrn}</td>
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

      <div className="mt-8 text-[10px] text-gray-500 text-center print:block hidden">
        Generated on: {new Date().toLocaleString()}<br />
        Computer-generated report
      </div>
    </ReportLayout>
  );
}

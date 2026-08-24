import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Student, AttendanceEntry, TeacherSubject } from './teacherData';
import { buildSF1Remarks, fetchAdviserForSection, type SF1Data, type SF4Data } from './services/reportDataService';
import type { HealthData } from './services/healthAnalyticsService';
import { HealthAnalyticsService } from './services/healthAnalyticsService';
import { getSchoolHeadName, getGlobalSettings } from './services/settingsService';
import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

// Helper function to fix the Excel stale value strikethrough bug (WPS Compatibility)
const removeStrikethrough = (worksheet: ExcelJS.Worksheet) => {
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (cell.font) {
        const newFont = { ...cell.font };
        delete newFont.strike; // Completely remove it for WPS Office
        cell.font = newFont;
      }
    });
  });
};

const formatDateStr = (str?: string) => {
  if (!str) return '';
  const d = new Date(str.includes('T') ? str : `${str}T00:00:00`);
  if (isNaN(d.getTime())) return str;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
};

const populateBoSYEoSYDates = (worksheet: ExcelJS.Worksheet, bosyDate: string, eosyDate: string) => {
  if (!bosyDate && !eosyDate) return;
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (cell.value && typeof cell.value === 'string') {
        let val = cell.value;
        if (bosyDate && (val.includes('BoSY Date:') || val.includes('BoSY Date'))) {
          if (!val.includes(bosyDate)) {
            val = val.replace(/BoSY Date:\s*/gi, `BoSY Date: ${bosyDate}`);
            val = val.replace(/BoSY Date\s*$/gi, `BoSY Date: ${bosyDate}`);
            cell.value = val;
          }
        }
        if (eosyDate && (val.includes('EoSY Date:') || val.includes('EoSY Date'))) {
          if (!val.includes(eosyDate)) {
            val = val.replace(/EoSY Date:\s*/gi, `EoSY Date: ${eosyDate}`);
            val = val.replace(/EoSY Date\s*$/gi, `EoSY Date: ${eosyDate}`);
            cell.value = val;
          }
        }
      }
    });
  });
};

const applyPrintPageSetup = (
  worksheet: ExcelJS.Worksheet,
  orientation: 'landscape' | 'portrait' = 'landscape',
  fitToWidth: boolean = true
) => {
  let maxCol = 1;
  let maxRow = 1;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    maxRow = Math.max(maxRow, rowNumber);
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        maxCol = Math.max(maxCol, colNumber);
      }
    });
  });

  const getColLetter = (col: number): string => {
    let letter = '';
    while (col > 0) {
      let temp = (col - 1) % 26;
      letter = String.fromCharCode(65 + temp) + letter;
      col = Math.floor((col - temp) / 26);
    }
    return letter;
  };

  const colLetter = getColLetter(maxCol);

  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: orientation,
    fitToPage: fitToWidth,
    ...(fitToWidth ? { fitToWidth: 1, fitToHeight: 0 } : {}),
    printArea: `A1:${colLetter}${maxRow}`,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.3,
      bottom: 0.3,
      header: 0.1,
      footer: 0.1
    }
  };
};

const ARIAL_NARROW = 'Arial Narrow';
const MAPEH_COMPONENTS = ['music', 'arts', 'art', 'pe', 'health', 'physical education'];

type Align = 'left' | 'center' | 'right';

const styleCell = (
  cell: ExcelJS.Cell,
  opts: { size?: number; bold?: boolean; italic?: boolean; align?: Align; wrap?: boolean } = {}
) => {
  const { size = 14, bold = false, italic = false, align = 'center', wrap = false } = opts;
  cell.font = { name: ARIAL_NARROW, size, bold, italic };
  cell.alignment = { horizontal: align, vertical: 'middle', wrapText: wrap };
};

const averageQuarters = (gradeData: Record<string, any> | undefined): number | null => {
  const values = ['q1', 'q2', 'q3']
    .map(q => parseFloat(gradeData?.[q]))
    .filter(v => !isNaN(v));
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
};

export async function generateSF5(
  students: Student[],
  sectionName: string,
  academicYear: string,
  advisorName?: string,
  principalName?: string
) {
  try {
    const firstStudent = students.find(s => s.status === 'Enrolled');
    const gradeLevel = firstStudent?.gradeLevel || 'Grade 6';
    const normalizedGradeLevel = gradeLevel.toLowerCase().replace(/grade\s*/g, '').trim();

    let finalAdvisorName = advisorName;
    let finalPrincipalName = principalName;
    if (!finalPrincipalName) {
      finalPrincipalName = await getSchoolHeadName().catch(() => 'MRS. LEPIDAPTERA VILLANUEVA');
    }
    if (!finalAdvisorName && students.length > 0) {
      const secId = (students[0] as any).sectionId;
      if (secId) {
        try {
          const assignSnap = await getDocs(query(collection(db, 'assignments'), where('sectionId', '==', secId)));
          const tId = (assignSnap.docs[0]?.data() as any)?.teacherId;
          if (tId) {
            const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', tId)));
            if (!userSnap.empty) {
              const uData = userSnap.docs[0].data() as any;
              finalAdvisorName = `${uData.firstName || ''} ${uData.lastName || ''}`.trim();
            }
          }
        } catch (e) {
          console.warn('Auto-fetch advisorName error:', e);
        }
      }
    }

    // Query subjects from Firestore
    const subSnap = await getDocs(collection(db, 'subjects'));
    const sectionSubjects = subSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter(sub => {
        const subGrade = (sub.gradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
        return subGrade === normalizedGradeLevel;
      });

    // 2. Fetch the template file
    const response = await fetch('/templates/SF5.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    // Column widths
    const sf5ColWidths: Record<string, number> = {
      A: 24, B: 36, C: 12, D: 12, E: 12, F: 20, G: 22,
      H: 25, I: 25, J: 25, K: 25, L: 24, M: 25, N: 14, O: 14, P: 14
    };
    Object.entries(sf5ColWidths).forEach(([colLetter, width]) => {
      const col = worksheet.getColumn(colLetter);
      if (col) col.width = width;
    });

    // 3. Header info
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    const setHeaderLabel = (cellRef: string, text: string) => {
      const c = worksheet.getCell(cellRef);
      c.value = text;
      styleCell(c, { size: 10, bold: true, align: 'right' });
    };

    const setHeaderBox = (startRef: string, range: string, text: string, align: Align = 'center', fontSize = 10) => {
      try { worksheet.unMergeCells(range); } catch (e) { }
      try { worksheet.mergeCells(range); } catch (e) { }
      const c = worksheet.getCell(startRef);
      c.value = text;
      styleCell(c, { size: fontSize, bold: true, align, wrap: true });

      const [start, end] = range.split(':');
      const startCol = worksheet.getColumn(start.replace(/\d+/g, '')).number;
      const endCol = worksheet.getColumn(end.replace(/\d+/g, '')).number;
      const rowNum = parseInt(start.replace(/\D+/g, ''), 10);

      for (let colIdx = startCol; colIdx <= endCol; colIdx++) {
        worksheet.getCell(rowNum, colIdx).border = thinBorder;
      }
    };

    const settings = await getGlobalSettings().catch(() => null);

    // Row 3
    setHeaderLabel('B3', 'Region');
    setHeaderBox('C3', 'C3:E3', settings ? `REGION ${settings.region}` : 'REGION IX');
    setHeaderLabel('F3', 'Division');
    setHeaderBox('G3', 'G3:H3', settings ? settings.division.toUpperCase() : 'ZAMBOANGA');
    setHeaderLabel('I3', 'District');
    setHeaderBox('J3', 'J3:L3', settings ? settings.district.toUpperCase() : 'STA. MARIA CENTRAL', 'center', 10);

    // Row 5
    setHeaderLabel('B5', 'School ID');
    setHeaderBox('C5', 'C5:E5', settings?.schoolId || '199006');
    setHeaderLabel('F5', 'School Year');
    setHeaderBox('G5', 'G5:H5', academicYear);
    setHeaderLabel('I5', 'Curriculum');
    setHeaderBox('J5', 'J5:L5', 'K to 12 Basic Education Program', 'center', 9);

    // Row 7
    setHeaderLabel('B7', 'School Name');
    setHeaderBox('C7', 'C7:E7', settings ? settings.schoolName.toUpperCase() : 'STA. MARIA CS SPED CENTER');
    setHeaderLabel('F7', 'Grade Level');
    setHeaderBox('G7', 'G7:H7', gradeLevel.replace(/grade\s*/i, '').trim());
    setHeaderLabel('I7', 'Section');

    const cleanSectionName = sectionName.includes(' - ') ? sectionName.split(' - ')[1] : sectionName;
    setHeaderBox('J7', 'J7:L7', cleanSectionName.toUpperCase(), 'center', 10);

    // Clear residual borders & values on Rows 3, 5, 7 for cells M, N, O, P
    [3, 5, 7].forEach(r => {
      ['M', 'N', 'O', 'P'].forEach(col => {
        const c = worksheet.getCell(`${col}${r}`);
        c.value = '';
        c.border = {};
      });
    });

    worksheet.getRow(8).height = 20;
    worksheet.getRow(9).height = 20;
    worksheet.getRow(10).height = 20;
    worksheet.getRow(11).height = 28;

    ['H11', 'I11', 'J11'].forEach(ref => {
      styleCell(worksheet.getCell(ref), { size: 7.5, italic: true, wrap: true });
    });

    // 4. Sort and filter students (Males first, then Females)
    const enrolledMales = students
      .filter(s => s.status === 'Enrolled' && s.gender?.toLowerCase() === 'male')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
    const enrolledFemales = students
      .filter(s => s.status === 'Enrolled' && s.gender?.toLowerCase() === 'female')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));

    const MALE_SLOTS = 21;
    const FEMALE_SLOTS = 26;
    if (enrolledMales.length > MALE_SLOTS) {
      console.warn(`SF5: ${enrolledMales.length - MALE_SLOTS} male student(s) exceed the ${MALE_SLOTS}-row template limit and will not appear on the form.`);
    }
    if (enrolledFemales.length > FEMALE_SLOTS) {
      console.warn(`SF5: ${enrolledFemales.length - FEMALE_SLOTS} female student(s) exceed the ${FEMALE_SLOTS}-row template limit and will not appear on the form.`);
    }

    type Gender = 'M' | 'F';
    const tally = {
      promoted: { M: 0, F: 0 },
      conditional: { M: 0, F: 0 },
      retained: { M: 0, F: 0 },
      didNotMeet: { M: 0, F: 0 },
      fairlySatisfactory: { M: 0, F: 0 },
      satisfactory: { M: 0, F: 0 },
      veryGood: { M: 0, F: 0 },
      outstanding: { M: 0, F: 0 },
    };
    const bump = (bucket: Record<Gender, number>, g: Gender) => { bucket[g]++; };

    const gradeKey = gradeLevel.toLowerCase().startsWith('grade')
      ? (gradeLevel.charAt(0).toUpperCase() + gradeLevel.slice(1))
      : `Grade ${gradeLevel}`;

    // Filter out MAPEH sub-components from main subjects list to prevent double weighting
    const mainSubjects = sectionSubjects.filter(sub => {
      const name = (sub.name || '').toLowerCase();
      return !MAPEH_COMPONENTS.includes(name);
    });

    const getSubjectFinalRating = (student: Student, sub: TeacherSubject): number | null => {
      const name = (sub.name || '').toLowerCase();

      if (name.includes('mapeh')) {
        const components = sectionSubjects.filter(s => MAPEH_COMPONENTS.includes((s.name || '').toLowerCase()));

        const termAverages = ['q1', 'q2', 'q3'].map(q => {
          const compGrades = components
            .map(comp => {
              const code = comp.code ?? comp.name;
              const gradeData = (student.grades as any)?.[gradeKey]?.[code] || {};
              return parseFloat(gradeData[q]);
            })
            .filter(v => !isNaN(v));
          if (compGrades.length === 0) return null;
          return Math.round(compGrades.reduce((a, b) => a + b, 0) / compGrades.length);
        });

        const activeTerms = termAverages.filter(v => v !== null) as number[];
        if (activeTerms.length === 0) return null;
        return Math.round(activeTerms.reduce((a, b) => a + b, 0) / activeTerms.length);
      }

      const code = sub.code ?? sub.name;
      const gradeData = (student.grades as any)?.[gradeKey]?.[code] || {};
      return averageQuarters(gradeData);
    };

    const writeStudentRow = (student: Student, rowNumber: number, gender: Gender) => {
      const row = worksheet.getRow(rowNumber);
      row.height = 32;

      // Merge B:E for Learner's Name so C, D, E are combined into 1 wide cell
      try { worksheet.mergeCells(`B${rowNumber}:E${rowNumber}`); } catch (e) { }

      const fullName = `${student.lastName}, ${student.firstName} ${(student as any).middleName || ''}`.trim().toUpperCase();

      const lrnCell = worksheet.getCell(`A${rowNumber}`);
      lrnCell.value = student.lrn || '';
      styleCell(lrnCell, { bold: true });

      const nameCell = worksheet.getCell(`B${rowNumber}`);
      nameCell.value = fullName;
      styleCell(nameCell, { bold: true, align: 'left', wrap: true });

      const finalRatings: number[] = [];
      const failedSubjects: string[] = [];

      mainSubjects.forEach(sub => {
        const rating = getSubjectFinalRating(student, sub);
        if (rating !== null) {
          finalRatings.push(rating);
          if (rating < 75) failedSubjects.push(sub.name || sub.code);
        }
      });

      // General average + letter code
      let generalAvg = 0;
      let generalAvgStr = '';
      let letterCode = '';

      if (finalRatings.length > 0) {
        generalAvg = finalRatings.reduce((sum, r) => sum + r, 0) / finalRatings.length;
        const isHonor = generalAvg >= 90;

        if (isHonor) {
          generalAvgStr = generalAvg.toFixed(3);
          letterCode = 'A';
        } else {
          const rounded = Math.round(generalAvg);
          generalAvgStr = rounded.toString();
          if (rounded >= 85) letterCode = 'P';
          else if (rounded >= 80) letterCode = 'AP';
          else if (rounded >= 75) letterCode = 'D';
          else letterCode = 'B';
        }
      }

      const avgCell = worksheet.getCell(`F${rowNumber}`);
      styleCell(avgCell, { bold: false });
      avgCell.value = failedSubjects.length > 0
        ? ''
        : (generalAvgStr ? `${generalAvgStr} (${letterCode})` : '--');

      // Promotion decision (Action Taken merged across G:H)
      let action = 'PROMOTED';
      if (finalRatings.length === 0) {
        action = '--';
      } else if (failedSubjects.length === 0) {
        action = 'PROMOTED';
        bump(tally.promoted, gender);
      } else if (failedSubjects.length <= 2) {
        action = 'IRREGULAR';
        bump(tally.conditional, gender);
      } else {
        action = 'RETAINED';
        bump(tally.retained, gender);
      }

      try { worksheet.mergeCells(`G${rowNumber}:H${rowNumber}`); } catch (e) { }
      const actionCell = worksheet.getCell(`G${rowNumber}`);
      actionCell.value = action;
      styleCell(actionCell, { bold: true });

      // Clear any template placeholder text in columns I, J, K
      ['I', 'J', 'K'].forEach(col => {
        worksheet.getCell(`${col}${rowNumber}`).value = '';
      });

      // Merge I:J into 1 wide combined cell under "Did Not Meet..." header
      try { worksheet.mergeCells(`I${rowNumber}:J${rowNumber}`); } catch (e) { }

      if (failedSubjects.length > 0) {
        const subjCell = worksheet.getCell(`I${rowNumber}`);
        subjCell.value = failedSubjects.join(', ').toUpperCase();
        styleCell(subjCell, { align: 'left', wrap: true });
      }

      // Apply crisp thin black borders across active columns A through J
      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].forEach(col => {
        worksheet.getCell(`${col}${rowNumber}`).border = thinBorder;
      });
      const cellK = worksheet.getCell(`K${rowNumber}`);
      cellK.value = '';
      cellK.border = {};

      // Proficiency distribution
      if (finalRatings.length > 0) {
        const roundedAvg = Math.round(generalAvg);
        if (roundedAvg >= 90) bump(tally.outstanding, gender);
        else if (roundedAvg >= 85) bump(tally.veryGood, gender);
        else if (roundedAvg >= 80) bump(tally.satisfactory, gender);
        else if (roundedAvg >= 75) bump(tally.fairlySatisfactory, gender);
        else bump(tally.didNotMeet, gender);
      }
    };

    // Write Males (Rows 12 to 32)
    let currentMaleRow = 12;
    enrolledMales.forEach(student => {
      if (currentMaleRow <= 32) {
        writeStudentRow(student, currentMaleRow, 'M');
        currentMaleRow++;
      }
    });

    const f33 = worksheet.getCell('F33');
    f33.value = enrolledMales.length;
    styleCell(f33, { bold: true });

    // Write Females (Rows 34 to 59)
    let currentFemaleRow = 34;
    enrolledFemales.forEach(student => {
      if (currentFemaleRow <= 59) {
        writeStudentRow(student, currentFemaleRow, 'F');
        currentFemaleRow++;
      }
    });

    const f60 = worksheet.getCell('F60');
    f60.value = enrolledFemales.length;
    styleCell(f60, { bold: true });

    const f61 = worksheet.getCell('F61');
    f61.value = enrolledMales.length + enrolledFemales.length;
    styleCell(f61, { bold: true });

    const setTallyCell = (cellRef: string, val: number) => {
      const c = worksheet.getCell(cellRef);
      c.value = val;
      styleCell(c, { bold: true });
    };

    // Promotion status summary
    setTallyCell('M15', tally.promoted.M);
    setTallyCell('N15', tally.promoted.F);
    setTallyCell('O15', tally.promoted.M + tally.promoted.F);

    setTallyCell('M17', tally.conditional.M);
    setTallyCell('N17', tally.conditional.F);
    setTallyCell('O17', tally.conditional.M + tally.conditional.F);

    setTallyCell('M19', tally.retained.M);
    setTallyCell('N19', tally.retained.F);
    setTallyCell('O19', tally.retained.M + tally.retained.F);

    // Learning progress / proficiency scale
    setTallyCell('M24', tally.didNotMeet.M);
    setTallyCell('N24', tally.didNotMeet.F);
    setTallyCell('O24', tally.didNotMeet.M + tally.didNotMeet.F);

    setTallyCell('M26', tally.fairlySatisfactory.M);
    setTallyCell('N26', tally.fairlySatisfactory.F);
    setTallyCell('O26', tally.fairlySatisfactory.M + tally.fairlySatisfactory.F);

    setTallyCell('M28', tally.satisfactory.M);
    setTallyCell('N28', tally.satisfactory.F);
    setTallyCell('O28', tally.satisfactory.M + tally.satisfactory.F);

    setTallyCell('M30', tally.veryGood.M);
    setTallyCell('N30', tally.veryGood.F);
    setTallyCell('O30', tally.veryGood.M + tally.veryGood.F);

    setTallyCell('M32', tally.outstanding.M);
    setTallyCell('N32', tally.outstanding.F);
    setTallyCell('O32', tally.outstanding.M + tally.outstanding.F);

    // Helper to format and center-align a signature block over columns L to P
    const alignSignatureBlock = (labelRowIndex: number, nameText: string) => {
      const nameRowIndex = labelRowIndex - 1;
      const subtitleRowIndex = labelRowIndex + 1;

      // 1. Name Row (L:P)
      try { worksheet.unMergeCells(`L${nameRowIndex}:P${nameRowIndex}`); } catch (e) { }
      try { worksheet.mergeCells(`L${nameRowIndex}:P${nameRowIndex}`); } catch (e) { }
      const nameCell = worksheet.getCell(`L${nameRowIndex}`);
      nameCell.value = nameText.toUpperCase();
      nameCell.font = { name: ARIAL_NARROW, size: 12, bold: true };
      nameCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 2. Label Row (L:P) e.g. "Class Adviser" or "School Head"
      try { worksheet.unMergeCells(`L${labelRowIndex}:P${labelRowIndex}`); } catch (e) { }
      try { worksheet.mergeCells(`L${labelRowIndex}:P${labelRowIndex}`); } catch (e) { }
      const labelCell = worksheet.getCell(`L${labelRowIndex}`);
      labelCell.font = { name: ARIAL_NARROW, size: 10, bold: false };
      labelCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // 3. Subtitle Row (L:P) e.g. "(Name and Signature)"
      try { worksheet.unMergeCells(`L${subtitleRowIndex}:P${subtitleRowIndex}`); } catch (e) { }
      try { worksheet.mergeCells(`L${subtitleRowIndex}:P${subtitleRowIndex}`); } catch (e) { }
      const subCell = worksheet.getCell(`L${subtitleRowIndex}`);
      subCell.font = { name: ARIAL_NARROW, size: 9, bold: false, italic: false };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      subCell.border = {};
    };

    // Adviser signature
    if (finalAdvisorName) {
      let found = false;
      for (let r = 35; r <= Math.min(worksheet.rowCount, 65); r++) {
        const row = worksheet.getRow(r);
        row.eachCell({ includeEmpty: false }, (cell) => {
          const val = cell.value;
          if (!found && val && typeof val === 'string' && val.toLowerCase().includes('adviser')) {
            alignSignatureBlock(r, finalAdvisorName);
            found = true;
          }
        });
        if (found) break;
      }
      if (!found) {
        alignSignatureBlock(37, finalAdvisorName);
      }
    }

    // School Head / Principal signature
    const headName = (finalPrincipalName || await getSchoolHeadName().catch(() => 'MRS. LEPIDAPTERA VILLANUEVA')).toUpperCase();
    if (headName) {
      let headFound = false;
      for (let r = 40; r <= Math.min(worksheet.rowCount, 65); r++) {
        const row = worksheet.getRow(r);
        row.eachCell({ includeEmpty: false }, (cell) => {
          const val = cell.value;
          if (!headFound && val && typeof val === 'string') {
            const lower = val.toLowerCase().trim();
            if (lower.includes('school head') || lower.includes('principal') || lower === 'school head / representative') {
              alignSignatureBlock(r, headName);
              headFound = true;
            }
          }
        });
        if (headFound) break;
      }
      if (!headFound) {
        alignSignatureBlock(58, headName);
      }
    }

    // Ensure all "(Name and Signature)" or "(Signature)" subtitle labels are unbolded, small font, and have no border box
    for (let r = 30; r <= Math.min(worksheet.rowCount, 65); r++) {
      const row = worksheet.getRow(r);
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.value && typeof cell.value === 'string') {
          const valStr = cell.value.toString().toLowerCase();
          if (valStr.includes('signature') || valStr.includes('name and signature')) {
            cell.font = { name: ARIAL_NARROW, size: 9, bold: false, italic: false };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {};
          }
        }
      });
    }

    removeStrikethrough(worksheet);
    workbook.worksheets.forEach((ws) => {
      applyPrintPageSetup(ws, 'landscape');
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF5_${sectionName.replace(/\s+/g, '_')}_${academicYear}.xlsx`);

    return true;
  } catch (error) {
    console.error('Error generating SF5:', error);
    throw error;
  }
}

export async function generateSF8(
  students: Student[],
  sectionName: string,
  academicYear: string,
  adviserName?: string,
  gradeLevel?: string
) {
  try {
    const response = await fetch('/templates/SF8.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // If there are 2 sheets, remove the first empty/unused worksheet "1"
    if (workbook.worksheets.length > 1) {
      const ws0 = workbook.worksheets[0];
      workbook.removeWorksheet(ws0.id);
    }

    const worksheet = workbook.worksheets[0];

    // Set header info
    const cleanSec = sectionName.includes(' - ') ? sectionName.split(' - ')[1] : sectionName;
    const fullGradeAndSection = gradeLevel
      ? (gradeLevel.toLowerCase().startsWith('grade') ? `${gradeLevel} - ${cleanSec}` : `Grade ${gradeLevel} - ${cleanSec}`)
      : sectionName;

    if (academicYear) {
      worksheet.getCell('A5').value = `BASELINE  ${academicYear}`;
    }

    // Merge Row 7 columns M & N so Grade Level and Section are clearly visible
    try { worksheet.unMergeCells('M7:N7'); } catch (e) { }
    try { worksheet.mergeCells('M7:N7'); } catch (e) { }
    const cellM7 = worksheet.getCell('M7');
    cellM7.value = fullGradeAndSection.toUpperCase();
    cellM7.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const today = new Date();
    worksheet.getCell('D7').value = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const advUpper = (adviserName || '').toUpperCase();
    ['L85', 'M85', 'N85'].forEach(ref => {
      worksheet.getCell(ref).value = advUpper;
    });

    // Enforce optimal column widths and text wrapping for headers
    const colWidths: Record<string, number> = {
      A: 4, B: 1.5, C: 32, D: 14, E: 11, F: 11, G: 5, H: 11,
      I: 3, J: 2, K: 3, L: 13, M: 18, N: 16
    };
    Object.entries(colWidths).forEach(([col, w]) => {
      worksheet.getColumn(col).width = w;
    });

    worksheet.getRow(8).height = 25;
    worksheet.getRow(9).height = 25;

    for (let r = 7; r <= 9; r++) {
      for (let c = 1; c <= 14; c++) {
        const cell = worksheet.getCell(r, c);
        cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'middle', horizontal: cell.alignment?.horizontal || 'center' };
      }
    }

    // Clear all pre-filled sample data rows in template (Rows 10 to 74)
    for (let r = 10; r <= 74; r++) {
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach(col => {
        const cell = worksheet.getCell(`${col}${r}`);
        cell.value = null;
        cell.fill = { type: 'pattern', pattern: 'none' };
      });
      try { worksheet.unMergeCells(`I${r}:K${r}`); } catch (e) { }
      worksheet.mergeCells(`I${r}:K${r}`);
      const c = worksheet.getCell(`I${r}`);
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Only include enrolled students
    const enrolledStudents = students.filter(s => s.status === 'Enrolled');
    const males = enrolledStudents.filter(s => s.gender === 'Male').sort((a, b) => a.lastName.localeCompare(b.lastName));
    const females = enrolledStudents.filter(s => s.gender === 'Female').sort((a, b) => a.lastName.localeCompare(b.lastName));

    // Helper to write student row
    const writeStudentRow = (student: Student, rowNum: number, indexNum: number, genderSymbol: 'M' | 'F') => {
      const middleName = (student as any).middleName || '';
      const middleInitial = middleName ? `${middleName.charAt(0)}.` : '';
      const fullName = `${student.lastName}, ${student.firstName} ${middleInitial}`.trim().toUpperCase();

      worksheet.getCell(`A${rowNum}`).value = indexNum;
      worksheet.getCell(`B${rowNum}`).value = '.';

      const nameCell = worksheet.getCell(`C${rowNum}`);
      nameCell.value = fullName;

      let studentAge: number | null = null;
      if (student.birthDate) {
        const [yr, mo, dy] = student.birthDate.split('-').map(Number);
        const dateCell = worksheet.getCell(`D${rowNum}`);
        dateCell.value = new Date(yr, mo - 1, dy);

        const birthDateObj = new Date(yr, mo - 1, dy);
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const m = today.getMonth() - birthDateObj.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
          age--;
        }
        studentAge = age;
      } else if ((student as any).age) {
        studentAge = parseInt((student as any).age);
      }

      if (studentAge !== null && !isNaN(studentAge)) {
        const ageCell = worksheet.getCell(`I${rowNum}`);
        ageCell.value = studentAge;
        ageCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ageCell.font = { name: 'Arial', size: 9 };
      }

      const rawH = student.medical?.height ?? (student as any).height ?? (student as any).medicalRecord?.height ?? (student as any).healthRecord?.height ?? 0;
      const rawW = student.medical?.weight ?? (student as any).weight ?? (student as any).medicalRecord?.weight ?? (student as any).healthRecord?.weight ?? 0;

      let parsedH = parseFloat(String(rawH).replace(/[^0-9.]/g, ''));
      let parsedW = parseFloat(String(rawW).replace(/[^0-9.]/g, ''));
      if (isNaN(parsedH) || parsedH <= 0) parsedH = 0;
      if (isNaN(parsedW) || parsedW <= 0) parsedW = 0;

      let bmi: number | null = null;
      let nutStatus: string | null = null;
      let hfaStatus: string | null = null;

      if (parsedH > 0 && parsedW > 0) {
        let heightCm = 0;
        let heightM = 0;
        if (parsedH < 3.0) {
          heightM = parsedH;
          heightCm = parsedH * 100;
        } else {
          heightCm = parsedH;
          heightM = parsedH / 100;
        }

        worksheet.getCell(`E${rowNum}`).value = parsedW;
        worksheet.getCell(`F${rowNum}`).value = parseFloat(heightM.toFixed(2));
        worksheet.getCell(`H${rowNum}`).value = parseFloat((heightM * heightM).toFixed(4));

        bmi = parseFloat(HealthAnalyticsService.calculateBMI(heightCm, parsedW).toFixed(1));
        nutStatus = HealthAnalyticsService.getNutritionalStatus(bmi);

        if (student.birthDate) {
          const ageMonths = HealthAnalyticsService.calculateAgeInMonths(student.birthDate);
          hfaStatus = HealthAnalyticsService.getHfaStatus(heightCm, student.gender, ageMonths);
        } else if (student.medical?.heightForAge || (student as any).heightForAge) {
          hfaStatus = student.medical?.heightForAge || (student as any).heightForAge;
        }
      }

      if (bmi !== null && bmi > 0) worksheet.getCell(`L${rowNum}`).value = bmi;
      if (nutStatus !== null && nutStatus !== '') worksheet.getCell(`M${rowNum}`).value = nutStatus;
      if (hfaStatus !== null && hfaStatus !== '') worksheet.getCell(`N${rowNum}`).value = hfaStatus;

      worksheet.getCell(`G${rowNum}`).value = genderSymbol;
    };

    // Write males starting from Row 10 (template boundary is up to Row 43)
    let maleRow = 10;
    males.forEach((student, idx) => {
      if (maleRow <= 43) {
        writeStudentRow(student, maleRow, idx + 1, 'M');
        maleRow++;
      }
    });

    // Write separator row for the template's female index formula (which looks for "female" in cell C44)
    worksheet.getCell('C44').value = 'female';

    // Write females starting from Row 45 (template boundary is up to Row 74)
    let femaleRow = 45;
    females.forEach((student, idx) => {
      if (femaleRow <= 74) {
        writeStudentRow(student, femaleRow, idx + 1, 'F');
        femaleRow++;
      }
    });

    // Apply Arial Narrow font across all cells in the worksheet preserving font size & styles
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.font) {
          cell.font = { ...cell.font, name: ARIAL_NARROW };
        }
      });
    });

    removeStrikethrough(worksheet);
    workbook.worksheets.forEach((ws) => {
      applyPrintPageSetup(ws, 'landscape');
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF8_${sectionName.replace(/\s+/g, '_')}_${academicYear}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error generating SF8:', error);
    throw error;
  }
}

export async function generateSF9(
  students: Student[],
  sectionName: string,
  academicYear: string,
  attendance: AttendanceEntry[] = [],
  subjects: TeacherSubject[] = [],
  gradeConfigurations: any[] = [],
  passedAdviserName?: string
) {
  const safeAttendance = attendance || [];
  const safeSubjects = subjects || [];
  const safeGradeConfigs = gradeConfigurations || [];

  try {
    // 1. Fetch Global Settings & Advisor Name
    const settings = await getGlobalSettings().catch(() => null);
    const principalName = (settings && settings.principalName)
      ? settings.principalName
      : await getSchoolHeadName().catch(() => 'MRS. LEPIDAPTERA VILLANUEVA');

    let adviserName = passedAdviserName && passedAdviserName !== 'Assigned Adviser' ? passedAdviserName.trim() : '';
    let advisorId = '';
    const firstStudent = students[0];
    const sId = firstStudent?.sectionId;

    if (!adviserName && sId) {
      try {
        adviserName = await fetchAdviserForSection(sId);
      } catch (e) {}
    }

    if (!adviserName && sId) {
      try {
        const assignSnap = await getDocs(
          query(
            collection(db, 'assignments'),
            where('sectionId', '==', sId)
          )
        );
        if (!assignSnap.empty) {
          const advDoc = assignSnap.docs.find(d => d.data().isAdvisor === true) || assignSnap.docs[0];
          const tId = advDoc.data().teacherId;
          advisorId = tId || '';
          if (tId) {
            const uSnap = await getDoc(doc(db, 'users', tId));
            if (uSnap.exists()) {
              const uData = uSnap.data();
              adviserName = `${uData.firstName || ''} ${uData.lastName || ''}`.trim() || uData.displayName || uData.fullName || '';
            }
          }
        }
      } catch (err) {
        console.warn('Failed to resolve advisor for SF9:', err);
      }
    }

    if (!adviserName && students.length > 0) {
      const sWithAdv = students.find(s => (s as any).adviser || (s as any).adviserName || (s as any).teacherName);
      if (sWithAdv) {
        adviserName = ((sWithAdv as any).adviser || (sWithAdv as any).adviserName || (sWithAdv as any).teacherName || '').trim();
      }
    }

    if (!adviserName) {
      adviserName = 'Assigned Adviser';
    }

    let activeGradeConfigs = safeGradeConfigs;
    if (!activeGradeConfigs || activeGradeConfigs.length === 0) {
      try {
        const gcSnap = await getDocs(collection(db, 'gradeConfigurations'));
        activeGradeConfigs = gcSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('Failed to load gradeConfigurations for SF9:', err);
        activeGradeConfigs = [];
      }
    }

    const schoolInfo = {
      schoolId: settings?.schoolId || '199006',
      region: settings ? settings.region : 'IX',
      division: settings ? settings.division.toUpperCase() : 'ZAMBOANGA',
      district: settings ? settings.district.toUpperCase() : 'STA. MARIA CENTRAL',
      schoolName: settings ? settings.schoolName.toUpperCase() : 'STA. MARIA CS SPED CENTER'
    };

    // Sort students alphabetically
    const sortedStudents = [...students].sort((a, b) => {
      const aName = `${a.lastName || ''}, ${a.firstName || ''}`.toLowerCase();
      const bName = `${b.lastName || ''}, ${b.firstName || ''}`.toLowerCase();
      return aName.localeCompare(bName);
    });

    // Helper functions for student grades & attendance
    const subjectRowMap: Record<string, string> = {
      'filipino': 'FILIPINO',
      'english': 'ENGLISH',
      'mathematics': 'MATH',
      'math': 'MATH',
      'science': 'SCIENCE',
      'araling panlipunan': 'AP',
      'ap': 'AP',
      'edukasyon sa pagpapakatao': 'ESP',
      'esp': 'ESP',
      'values education': 'ESP',
      'good manners': 'ESP',
      'gmrc': 'ESP',
      'good manners and right conduct (gmrc)': 'ESP',
      'tle': 'TLE',
      'epp': 'TLE',
      'mapeh': 'MAPEH',
      'music': 'MUSIC',
      'arts': 'ARTS',
      'art': 'ARTS',
      'physical education': 'PE',
      'pe': 'PE',
      'health': 'HEALTH',
      'language': 'LANGUAGE',
      'reading and literacy': 'READING_AND_LITERACY',
      'makabansa': 'MAKABANSA'
    };

    const getDecryptedStudentGrades = (stud: Student) => {
      const activeRows: Array<{
        name: string;
        code: string;
        q1: number | string;
        q2: number | string;
        q3: number | string;
        final: number | string;
        remarks: string;
        isComponent?: boolean;
      }> = [];

      const gradeLevel = stud.gradeLevel || 'Grade 6';
      const gradeKey = gradeLevel.toLowerCase().startsWith('grade') ? gradeLevel : `Grade ${gradeLevel}`;
      const studentGrades = (stud.grades?.[gradeKey] as any) || {};

      const mappedDbGrades: Record<string, { q1: number | null; q2: number | null; q3: number | null }> = {};
      safeSubjects.forEach((sub) => {
        const code = sub.code ?? sub.name;
        const subNameLower = (sub.name || '').toLowerCase().trim();
        const standardCode = subjectRowMap[subNameLower] || subjectRowMap[code.toLowerCase().trim()] || (code.toUpperCase().replace(/\s+/g, '_'));
        if (standardCode) {
          const gradeData = studentGrades[code] || studentGrades[sub.name] || studentGrades[standardCode] || {};
          let q1 = typeof gradeData.q1 !== 'undefined' && gradeData.q1 !== null ? parseFloat(gradeData.q1) : (typeof gradeData.t1 !== 'undefined' && gradeData.t1 !== null ? parseFloat(gradeData.t1) : null);
          let q2 = typeof gradeData.q2 !== 'undefined' && gradeData.q2 !== null ? parseFloat(gradeData.q2) : (typeof gradeData.t2 !== 'undefined' && gradeData.t2 !== null ? parseFloat(gradeData.t2) : null);
          let q3 = typeof gradeData.q3 !== 'undefined' && gradeData.q3 !== null ? parseFloat(gradeData.q3) : (typeof gradeData.t3 !== 'undefined' && gradeData.t3 !== null ? parseFloat(gradeData.t3) : null);

          if (isNaN(q1 as any)) q1 = null;
          if (isNaN(q2 as any)) q2 = null;
          if (isNaN(q3 as any)) q3 = null;

          mappedDbGrades[standardCode] = { q1, q2, q3 };
        }
      });

      const isGrade1 = gradeLevel.toLowerCase().includes('1');
      const isGrade2 = gradeLevel.toLowerCase().includes('2');
      const isGrade3 = gradeLevel.toLowerCase().includes('3');
      const isGrade4 = gradeLevel.toLowerCase().includes('4');
      const isGrade5 = gradeLevel.toLowerCase().includes('5');
      const isGrade6 = gradeLevel.toLowerCase().includes('6');

      const getGradeByCode = (code: string) => {
        const gd = mappedDbGrades[code];
        if (!gd) return { q1: '', q2: '', q3: '', final: '', remarks: '' };

        const q1 = gd.q1 !== null && typeof gd.q1 !== 'undefined' ? gd.q1 : '';
        const q2 = gd.q2 !== null && typeof gd.q2 !== 'undefined' ? gd.q2 : '';
        const q3 = gd.q3 !== null && typeof gd.q3 !== 'undefined' ? gd.q3 : '';

        const active = [q1, q2, q3].filter(v => v !== '') as number[];
        const final = active.length > 0 ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : '';
        const remarks = final !== '' ? (final >= 75 ? 'PASSED' : 'FAILED') : '';

        return { q1, q2, q3, final, remarks };
      };

      const averageGrades = (g1: any, g2: any) => {
        const calculateQ = (qKey: 'q1' | 'q2' | 'q3') => {
          const vals = [g1[qKey], g2[qKey]].filter(v => v !== '') as number[];
          return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : '';
        };
        const q1 = calculateQ('q1');
        const q2 = calculateQ('q2');
        const q3 = calculateQ('q3');
        const active = [q1, q2, q3].filter(v => v !== '') as number[];
        const final = active.length > 0 ? Math.round(active.reduce((a, b) => a + b, 0) / active.length) : '';
        const remarks = final !== '' ? (final >= 75 ? 'PASSED' : 'FAILED') : '';
        return { q1, q2, q3, final, remarks };
      };

      // Row 1: English / Language
      if (isGrade1) {
        activeRows.push({ name: 'Language', code: 'LANGUAGE', ...getGradeByCode('LANGUAGE') });
      } else {
        activeRows.push({ name: 'English', code: 'ENGLISH', ...getGradeByCode('ENGLISH') });
      }

      // Row 2: Filipino / Reading and Literacy
      if (isGrade1) {
        activeRows.push({ name: 'Reading and Literacy', code: 'READING_AND_LITERACY', ...getGradeByCode('READING_AND_LITERACY') });
      } else {
        activeRows.push({ name: 'Filipino', code: 'FILIPINO', ...getGradeByCode('FILIPINO') });
      }

      // Row 3: Math
      activeRows.push({ name: 'Mathematics', code: 'MATH', ...getGradeByCode('MATH') });

      // Row 4: Science (Grade 3-6)
      if (isGrade3 || isGrade4 || isGrade5 || isGrade6) {
        activeRows.push({ name: 'Science', code: 'SCIENCE', ...getGradeByCode('SCIENCE') });
      }

      // Row 5: AP / Makabansa
      if (isGrade1 || isGrade2 || isGrade3) {
        activeRows.push({ name: 'AP/Makabansa', code: 'MAKABANSA', ...getGradeByCode('MAKABANSA') });
      } else {
        activeRows.push({ name: 'AP/Makabansa', code: 'AP', ...getGradeByCode('AP') });
      }

      // Row 6: EPP/TLE (Grade 4-6)
      if (isGrade4 || isGrade5 || isGrade6) {
        activeRows.push({ name: 'EPP/TLE', code: 'TLE', ...getGradeByCode('TLE') });
      }

      // Row 7: MAPEH (Grade 4-6)
      if (isGrade4 || isGrade5 || isGrade6) {
        const musicGrad = getGradeByCode('MUSIC');
        const artsGrad = getGradeByCode('ARTS');
        const peGrad = getGradeByCode('PE');
        const healthGrad = getGradeByCode('HEALTH');

        const musicAndArts = averageGrades(musicGrad, artsGrad);
        const peAndHealth = averageGrades(peGrad, healthGrad);
        const mapeh = averageGrades(musicAndArts, peAndHealth);

        activeRows.push({ name: 'MAPEH', code: 'MAPEH', ...mapeh });
        activeRows.push({ name: '  • Music & Arts', code: 'MUSIC_ARTS', ...musicAndArts, isComponent: true });
        activeRows.push({ name: '  • PE & Health', code: 'PE_HEALTH', ...peAndHealth, isComponent: true });
      }

      // Row 8: GMRC / EsP
      activeRows.push({ name: 'GMRC', code: 'ESP', ...getGradeByCode('ESP') });

      return activeRows;
    };

    const getObservedValueRating = (stud: Student, statementKey: string, quarter: 'q1' | 'q2' | 'q3') => {
      const gLvl = stud.gradeLevel || 'Grade 6';
      const gradeKey = gLvl.startsWith('Grade') ? gLvl : `Grade ${gLvl}`;
      const statementObj = (stud as any).observedValues?.[gradeKey]?.[statementKey];
      const altKey = quarter === 'q1' ? 't1' : quarter === 'q2' ? 't2' : 't3';
      const val = statementObj?.[quarter] || statementObj?.[altKey];
      return val || '--';
    };

    const getAttendanceData = (studentId: string) => {
      const studentAtt = safeAttendance.filter((a) => a.studentId === studentId);
      const monthsDef = [
        { name: 'Jun', index: 5 }, { name: 'Jul', index: 6 }, { name: 'Aug', index: 7 },
        { name: 'Sep', index: 8 }, { name: 'Oct', index: 9 }, { name: 'Nov', index: 10 },
        { name: 'Dec', index: 11 }, { name: 'Jan', index: 0 }, { name: 'Feb', index: 1 },
        { name: 'Mar', index: 2 }, { name: 'Apr', index: 3 }
      ];

      const presentDays: Record<number, number> = {};
      const absentDays: Record<number, number> = {};
      const sectionDatesPerMonth: Record<number, Set<string>> = {};

      safeAttendance.forEach((a) => {
        if (!a.date) return;
        const d = new Date(a.date);
        if (isNaN(d.getTime())) return;
        const m = d.getMonth();
        const dStr = a.date.split('T')[0];
        if (!sectionDatesPerMonth[m]) sectionDatesPerMonth[m] = new Set();
        sectionDatesPerMonth[m].add(dStr);
      });

      // Deduplicate student records per date (keep the most explicit/latest record)
      const studentAttByDate = new Map<string, any>();
      studentAtt.forEach((a) => {
        if (!a.date) return;
        const dStr = a.date.split('T')[0];
        studentAttByDate.set(dStr, a);
      });

      studentAttByDate.forEach((a) => {
        const d = new Date(a.date);
        if (isNaN(d.getTime())) return;
        const m = d.getMonth();

        const rawStatus = (a.status || '').toString().trim().toLowerCase();
        const amStatus = ((a as any).amStatus || '').toString().trim().toLowerCase();
        const pmStatus = ((a as any).pmStatus || '').toString().trim().toLowerCase();

        let presentWeight = 0;
        let absentWeight = 0;

        if (rawStatus === 'present' || rawStatus === 'late') {
          presentWeight = 1;
        } else if (rawStatus === 'absent') {
          absentWeight = 1;
        } else if (amStatus || pmStatus) {
          const amPres = amStatus === 'present' || amStatus === 'late';
          const pmPres = pmStatus === 'present' || pmStatus === 'late';
          if (amPres && pmPres) presentWeight = 1;
          else if (!amPres && !pmPres && (amStatus === 'absent' || pmStatus === 'absent')) absentWeight = 1;
          else {
            presentWeight = 0.5;
            absentWeight = 0.5;
          }
        }

        if (presentWeight > 0) presentDays[m] = (presentDays[m] || 0) + presentWeight;
        if (absentWeight > 0) absentDays[m] = (absentDays[m] || 0) + absentWeight;
      });

      let totalSchool = 0;
      let totalPresent = 0;
      let totalAbsent = 0;

      const columns = monthsDef.map((m) => {
        const school = sectionDatesPerMonth[m.index] ? sectionDatesPerMonth[m.index].size : 0;
        const present = presentDays[m.index] || 0;
        const absent = absentDays[m.index] || 0;

        totalSchool += school;
        totalPresent += present;
        totalAbsent += absent;

        return { name: m.name, school, present, absent };
      });

      return { columns, totalSchool, totalPresent, totalAbsent };
    };

    const workbook = new ExcelJS.Workbook();

    // Load SF9 Upper Left Logo and Upper Right Logo once for workbook
    let leftImgId: number | null = null;
    let rightImgId: number | null = null;
    try {
      let r1 = await fetch('/sf_9_upper_left_logo.jpg');
      if (!r1.ok) r1 = await fetch('/deped_seal.png');
      if (r1.ok) {
        const leftBuffer = await r1.arrayBuffer();
        leftImgId = workbook.addImage({ buffer: leftBuffer, extension: 'jpeg' });
      }
    } catch (e) {
      console.warn('Could not load SF9 upper left logo', e);
    }
    try {
      let r2 = await fetch('/sf_9_upper_right_logo.png');
      if (!r2.ok) r2 = await fetch('/kagawaran_ng_edukasyon.png');
      if (r2.ok) {
        const rightBuffer = await r2.arrayBuffer();
        rightImgId = workbook.addImage({ buffer: rightBuffer, extension: 'png' });
      }
    } catch (e) {
      console.warn('Could not load SF9 upper right logo', e);
    }

    // Helper function to generate notched plaque badges matching DepEd shape
    const createPlaqueBadgeBuffer = async (text: string, width: number = 800, height: number = 50, fontSize: number = 19): Promise<ArrayBuffer | null> => {
      try {
        if (typeof document === 'undefined') return null;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const notchR = 7;
        const borderW = 2;
        const x0 = borderW;
        const y0 = borderW;
        const x1 = width - borderW;
        const y1 = height - borderW;

        ctx.clearRect(0, 0, width, height);

        ctx.beginPath();
        // Top edge after top-left notch
        ctx.moveTo(x0 + notchR, y0);
        // Top line to top-right notch start
        ctx.lineTo(x1 - notchR, y0);
        // Top-Right concave corner arc (inward)
        ctx.arc(x1, y0, notchR, Math.PI, Math.PI / 2, true);
        // Right vertical line to bottom-right notch start
        ctx.lineTo(x1, y1 - notchR);
        // Bottom-Right concave corner arc (inward)
        ctx.arc(x1, y1, notchR, (3 * Math.PI) / 2, Math.PI, true);
        // Bottom line to bottom-left notch start
        ctx.lineTo(x0 + notchR, y1);
        // Bottom-Left concave corner arc (inward)
        ctx.arc(x0, y1, notchR, 0, (3 * Math.PI) / 2, true);
        // Left vertical line to top-left notch start
        ctx.lineTo(x0, y0 + notchR);
        // Top-Left concave corner arc (inward)
        ctx.arc(x0, y0, notchR, Math.PI / 2, 0, true);
        ctx.closePath();

        // Fill Navy Blue
        ctx.fillStyle = '#001D56';
        ctx.fill();

        // Stroke Black Outline
        ctx.lineWidth = borderW;
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // Draw White Centered Text in Cambria
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${fontSize}px Cambria, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);

        const dataUrl = canvas.toDataURL('image/png');
        const res = await fetch(dataUrl);
        return await res.arrayBuffer();
      } catch (e) {
        console.warn('Failed to create plaque badge buffer', e);
        return null;
      }
    };

    const badgeDefMap: Record<string, { w: number; h: number; f: number; range: { tl: { col: number; row: number }; br: { col: number; row: number } } }> = {
      'Attendance Record': {
        w: 700, h: 48, f: 23,
        range: { tl: { col: 3, row: 1.0 }, br: { col: 11, row: 2.0 } }
      },
      "PARENT/GUARDIAN'S SIGNATURE": {
        w: 780, h: 48, f: 22,
        range: { tl: { col: 2, row: 10.0 }, br: { col: 11, row: 11.0 } }
      },
      'Certificate of Transfer': {
        w: 624, h: 48, f: 23,
        range: { tl: { col: 17, row: 24.0 }, br: { col: 24, row: 25.0 } }
      },
      'Cancellation of Eligibility to Transfer': {
        w: 800, h: 48, f: 21,
        range: { tl: { col: 16, row: 34.0 }, br: { col: 25, row: 35.0 } }
      },
      'REPORT ON LEARNING PROGRESS AND ACHIEVEMENT': {
        w: 1340, h: 48, f: 22,
        range: { tl: { col: 0, row: 40.0 }, br: { col: 13, row: 41.0 } }
      },
      "REPORT ON LEARNER'S OBSERVED VALUES": {
        w: 1340, h: 48, f: 22,
        range: { tl: { col: 14, row: 40.0 }, br: { col: 27, row: 41.0 } }
      }
    };

    const badgeImgIds: Record<string, number | null> = {};
    for (const [badgeTitle, bDef] of Object.entries(badgeDefMap)) {
      try {
        const buf = await createPlaqueBadgeBuffer(badgeTitle, bDef.w, bDef.h, bDef.f);
        if (buf) {
          badgeImgIds[badgeTitle] = workbook.addImage({ buffer: buf, extension: 'png' });
        }
      } catch (e) {}
    }

    // Populate each student sheet
    const studentsToProcess = sortedStudents.length > 0 ? sortedStudents : [
      { id: 'sample', lastName: 'SAMPLE', firstName: 'STUDENT', gradeLevel: 'Grade 6', lrn: '123456789' } as Student
    ];

    studentsToProcess.forEach((student, idx) => {
      const rawName = `${idx + 1}. ${student.lastName || ''}, ${student.firstName || ''}`;
      const sheetName = rawName.replace(/[:\\/?*\[\]]/g, '').trim().substring(0, 31) || `Student ${idx + 1}`;
      
      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.views = [{ showGridLines: true }];
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.2, right: 0.2, top: 0.25, bottom: 0.25, header: 0.1, footer: 0.1 },
        horizontalCentered: true,
        verticalCentered: false
      };

      // 1. Column Widths Calibration (Ensures 1:1 proportional layout)
      const colWidths = [
        { col: 1, width: 22 }, { col: 2, width: 5.8 }, { col: 3, width: 5.8 }, { col: 4, width: 5.8 },
        { col: 5, width: 5.8 }, { col: 6, width: 5.8 }, { col: 7, width: 5.8 }, { col: 8, width: 5.8 },
        { col: 9, width: 5.8 }, { col: 10, width: 5.8 }, { col: 11, width: 5.8 }, { col: 12, width: 5.8 },
        { col: 13, width: 8.5 }, { col: 14, width: 4 }, { col: 15, width: 16 }, { col: 16, width: 5.8 },
        { col: 17, width: 5.8 }, { col: 18, width: 6 }, { col: 19, width: 6 }, { col: 20, width: 6 },
        { col: 21, width: 6 }, { col: 22, width: 6 }, { col: 23, width: 6 }, { col: 24, width: 5.8 },
        { col: 25, width: 5.8 }, { col: 26, width: 5.8 }, { col: 27, width: 8.5 }
      ];
      colWidths.forEach(cw => worksheet.getColumn(cw.col).width = cw.width);

      // Default row heights
      for (let r = 1; r <= 70; r++) {
        worksheet.getRow(r).height = 21;
      }

      const fontName = 'Cambria';
      const navyBadgeFill = { type: 'pattern' as any, pattern: 'solid' as any, fgColor: { argb: 'FF0F2B5C' } };
      const badgeFont = { name: fontName, size: 12.5, bold: true, color: { argb: 'FFFFFFFF' } };
      const subHeaderFill = { type: 'pattern' as any, pattern: 'solid' as any, fgColor: { argb: 'FFD9E1F2' } };
      const subHeaderFont = { name: fontName, size: 11.5, bold: true, color: { argb: 'FF000000' } };
      const thinBorder = {
        top: { style: 'thin' as any, color: { argb: 'FF595959' } },
        left: { style: 'thin' as any, color: { argb: 'FF595959' } },
        bottom: { style: 'thin' as any, color: { argb: 'FF595959' } },
        right: { style: 'thin' as any, color: { argb: 'FF595959' } }
      };

      const styleBox = (rangeStr: string, value: any, opts: any = {}) => {
        const { font = { name: fontName, size: 11.5 }, fill = null, align = { horizontal: 'center', vertical: 'middle' }, border = thinBorder } = opts;
        try { worksheet.mergeCells(rangeStr); } catch (e) {}
        const [startRef, endRef] = rangeStr.includes(':') ? rangeStr.split(':') : [rangeStr, rangeStr];
        const cell = worksheet.getCell(startRef);
        cell.value = value;
        cell.font = font;
        cell.alignment = align;
        if (fill) cell.fill = fill;

        const startCol = worksheet.getColumn(startRef.replace(/\d+/g, '')).number;
        const endCol = worksheet.getColumn(endRef.replace(/\d+/g, '')).number;
        const startRow = parseInt(startRef.replace(/\D+/g, ''), 10);
        const endRow = parseInt(endRef.replace(/\D+/g, ''), 10);

        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const cl = worksheet.getCell(r, c);
            if (border) cl.border = border;
          }
        }
      };

      const styleBadge = (rangeStr: string, text: string) => {
        styleBox(rangeStr, '', { font: badgeFont, border: null });
        const bId = badgeImgIds[text];
        const bDef = badgeDefMap[text];
        if (bId !== undefined && bId !== null && bDef) {
          try {
            worksheet.addImage(bId, {
              tl: bDef.range.tl as any,
              br: bDef.range.br as any,
              editAs: 'oneCell'
            });
          } catch (e) {
            styleBox(rangeStr, text, { font: badgeFont, fill: navyBadgeFill, border: null });
          }
        } else {
          styleBox(rangeStr, text, { font: badgeFont, fill: navyBadgeFill, border: null });
        }
      };

      // Calculate student data
      const gLvl = student.gradeLevel || 'Grade 6';
      const fullName = `${student.lastName || ''}, ${student.firstName || ''} ${student.middleName || ''}`.trim();
      let studentAge: number | string = '';
      if (student.birthDate) {
        const birth = new Date(student.birthDate);
        if (!isNaN(birth.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
          studentAge = age;
        }
      }

      const gradesList = getDecryptedStudentGrades(student);
      const mainAreas = gradesList.filter(g => !g.isComponent && typeof g.final === 'number');
      const genAvg = mainAreas.length > 0 ? Math.round(mainAreas.reduce((a, b) => a + (b.final as number), 0) / mainAreas.length) : '';
      const genAvgRemarks = genAvg !== '' ? (genAvg >= 75 ? 'PASSED' : 'FAILED') : '';

      const failedCount = mainAreas.filter(g => (g.final as number) < 75).length;
      let eligibleGrade = '—';
      if (mainAreas.length > 0 && failedCount === 0) {
        if (gLvl.toLowerCase().includes('kinder')) eligibleGrade = 'Grade 1';
        else {
          const match = gLvl.match(/\d+/);
          if (match) eligibleGrade = gLvl.replace(/\d+/, (parseInt(match[0], 10) + 1).toString());
        }
      }

      const attData = getAttendanceData(student.id);

      // ==========================================
      // PAGE 1: LEFT HALF (Attendance & Signatures)
      // ==========================================
      styleBadge('D2:K2', 'Attendance Record');
      worksheet.getRow(2).height = 24;

      styleBox('A4', '', { fill: subHeaderFill });
      const months = ['Jun', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
      months.forEach((m, i) => {
        const colL = String.fromCharCode(66 + i);
        styleBox(`${colL}4`, m, { font: subHeaderFont, fill: subHeaderFill });
      });
      styleBox('M4', 'Total', { font: subHeaderFont, fill: subHeaderFill });
      worksheet.getRow(4).height = 20;

      const attRowsDef = [
        { label: 'No. of School Days', key: 'school', total: attData.totalSchool },
        { label: 'No. of Days Present', key: 'present', total: attData.totalPresent },
        { label: 'No. of Times Absent', key: 'absent', total: attData.totalAbsent }
      ];

      attRowsDef.forEach((rDef, rIdx) => {
        const rowNum = 5 + rIdx;
        styleBox(`A${rowNum}`, rDef.label, { font: { name: fontName, size: 11 }, align: { horizontal: 'left', vertical: 'middle' } });
        attData.columns.forEach((colInfo, cIdx) => {
          const colLetter = String.fromCharCode(66 + cIdx);
          styleBox(`${colLetter}${rowNum}`, (colInfo as any)[rDef.key] || 0, { font: { name: fontName, size: 11 } });
        });
        styleBox(`M${rowNum}`, rDef.total || 0, { font: { name: fontName, size: 11, bold: true } });
        worksheet.getRow(rowNum).height = 20;
      });

      styleBadge('C11:K11', "PARENT/GUARDIAN'S SIGNATURE");
      worksheet.getRow(11).height = 24;

      ['1st Term', '2nd Term', '3rd Term'].forEach((t, i) => {
        const r = 14 + (i * 2);
        styleBox(`A${r}:C${r}`, t, { font: { name: fontName, size: 11.5, bold: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
        styleBox(`D${r}:L${r}`, '________________________________________________', { font: { name: fontName, size: 11.5 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
        worksheet.getRow(r).height = 22;
      });

      // ==========================================
      // PAGE 1: RIGHT HALF (DepEd Info, Profile & Transfers)
      // ==========================================
      // Embed Logos in top-right header with calibrated dimensions
      if (leftImgId !== null) {
        try {
          worksheet.addImage(leftImgId, {
            tl: { col: 14.2, row: 0.95 },
            ext: { width: 78, height: 78 }
          });
        } catch (e) {}
      }
      if (rightImgId !== null) {
        try {
          worksheet.addImage(rightImgId, {
            tl: { col: 23.1, row: 1.05 },
            ext: { width: 152, height: 56 }
          });
        } catch (e) {}
      }

      styleBox('O2:AA2', 'Republic of the Philippines', { font: { name: fontName, size: 11.5 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      styleBox('O3:AA3', 'Department of Education', { font: { name: 'Old English Text MT', size: 15, color: { argb: 'FF000000' } }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      styleBox('O4:AA4', `Region ${schoolInfo.region}`, { font: { name: fontName, size: 11.5 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      styleBox('O5:AA5', `DIVISION OF ${schoolInfo.division}`, { font: { name: fontName, size: 11.5 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      styleBox('O6:AA6', `${schoolInfo.district} District`, { font: { name: fontName, size: 11.5 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      styleBox('O7:AA7', schoolInfo.schoolName, { font: { name: fontName, size: 14, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: null });

      styleBox('O9:AA9', 'PROGRESS REPORT CARD', { font: { name: fontName, size: 14, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      styleBox('O10:AA10', `School Year ${academicYear}`, { font: { name: fontName, size: 12.5, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: null });

      worksheet.getRow(2).height = 18;
      worksheet.getRow(3).height = 22;
      worksheet.getRow(4).height = 17;
      worksheet.getRow(5).height = 17;
      worksheet.getRow(6).height = 17;
      worksheet.getRow(7).height = 22;
      worksheet.getRow(9).height = 24;
      worksheet.getRow(10).height = 20;

      // Learner Profile Details with Clean Underlines
      styleBox('O12', 'NAME : ', { font: { name: fontName, size: 12, bold: true }, align: { horizontal: 'right', vertical: 'middle' }, border: null });
      styleBox('P12:AA12', fullName.toUpperCase(), { font: { name: fontName, size: 12.5, bold: true, underline: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      worksheet.getRow(12).height = 24;

      styleBox('O13', 'Age : ', { font: { name: fontName, size: 11.5 }, align: { horizontal: 'right', vertical: 'middle' }, border: null });
      styleBox('P13:Q13', studentAge, { font: { name: fontName, size: 11.5, underline: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      styleBox('S13:T13', 'Sex : ', { font: { name: fontName, size: 11.5 }, align: { horizontal: 'right', vertical: 'middle' }, border: null });
      styleBox('U13:V13', student.gender || '', { font: { name: fontName, size: 11.5, underline: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      styleBox('W13', 'LRN: ', { font: { name: fontName, size: 11.5, bold: true }, align: { horizontal: 'right', vertical: 'middle' }, border: null });
      styleBox('X13:AA13', student.lrn || '', { font: { name: fontName, size: 11.5, underline: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      worksheet.getRow(13).height = 20;

      styleBox('O14', 'Grade: ', { font: { name: fontName, size: 11.5 }, align: { horizontal: 'right', vertical: 'middle' }, border: null });
      styleBox('P14:R14', gLvl, { font: { name: fontName, size: 11.5, underline: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      styleBox('S14:T14', 'Section: ', { font: { name: fontName, size: 11.5 }, align: { horizontal: 'right', vertical: 'middle' }, border: null });
      styleBox('U14:AA14', sectionName, { font: { name: fontName, size: 11.5, underline: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      worksheet.getRow(14).height = 20;

      // Dear Parent Note
      styleBox('O16:AA18', "Dear Parent,\nThis report card shows the ability and the progress your child has made in the different learning areas as well as his/her progress in core values.\nThe school welcomes you should you desire to know more about your child's progress.", { font: { name: fontName, size: 11, italic: true }, align: { horizontal: 'left', vertical: 'middle', wrapText: true }, border: null });
      worksheet.getRow(16).height = 18;
      worksheet.getRow(17).height = 18;
      worksheet.getRow(18).height = 18;

      // Adviser & Principal Initial Signatures
      const getSigFontSize = (nameStr: string) => {
        if (!nameStr) return 11.5;
        if (nameStr.length > 28) return 9.5;
        if (nameStr.length > 22) return 10.5;
        return 11.5;
      };

      const princFontSize = getSigFontSize(principalName);
      const advFontSize = getSigFontSize(adviserName);

      styleBox('O21:T21', principalName, { font: { name: fontName, size: princFontSize, bold: true }, align: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: null });
      styleBox('O22:T22', 'Principal I', { font: { name: fontName, size: 11 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      styleBox('V21:AA21', adviserName, { font: { name: fontName, size: advFontSize, bold: true }, align: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: null });
      styleBox('V22:AA22', 'Adviser', { font: { name: fontName, size: 11 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      worksheet.getRow(21).height = 24;
      worksheet.getRow(22).height = 18;

      // Certificate of Transfer Badge
      styleBadge('R25:X25', 'Certificate of Transfer');
      worksheet.getRow(25).height = 24;

      styleBox('O27:AA27', `Admitted to Grade: ${gLvl}     Section: ${sectionName}`, { font: { name: fontName, size: 11.5 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      styleBox('O28:AA28', `Eligible for Admission to Grade: ${eligibleGrade}`, { font: { name: fontName, size: 11.5 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      styleBox('O29:AA29', 'Approved:', { font: { name: fontName, size: 11.5, bold: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      worksheet.getRow(27).height = 20;
      worksheet.getRow(28).height = 20;
      worksheet.getRow(29).height = 20;

      styleBox('O31:T31', principalName, { font: { name: fontName, size: princFontSize, bold: true }, align: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: null });
      styleBox('O32:T32', 'Principal I', { font: { name: fontName, size: 11 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      styleBox('V31:AA31', adviserName, { font: { name: fontName, size: advFontSize, bold: true }, align: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: null });
      styleBox('V32:AA32', 'Adviser', { font: { name: fontName, size: 11 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      worksheet.getRow(31).height = 24;
      worksheet.getRow(32).height = 18;

      // Cancellation of Transfer Badge
      styleBadge('Q35:Y35', 'Cancellation of Eligibility to Transfer');
      worksheet.getRow(35).height = 24;

      styleBox('O37:T37', 'Admitted in: ____________________', { font: { name: fontName, size: 11.5 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      styleBox('O38:T38', 'Date: ________________________', { font: { name: fontName, size: 11.5 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      styleBox('U38:AA38', principalName, { font: { name: fontName, size: princFontSize, bold: true }, align: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: null });
      styleBox('U39:AA39', 'Principal I', { font: { name: fontName, size: 11 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
      worksheet.getRow(37).height = 20;
      worksheet.getRow(38).height = 24;
      worksheet.getRow(39).height = 18;

      // Explicit Page Break before Page 2 (Guarantees exact 2-page A4 print)
      worksheet.getRow(40).addPageBreak();

      // ==========================================
      // PAGE 2: LEFT HALF (Learning Areas & Grades)
      // ==========================================
      styleBadge('A41:M41', 'REPORT ON LEARNING PROGRESS AND ACHIEVEMENT');
      worksheet.getRow(41).height = 24;

      styleBox('A43:E44', 'Learning Areas', { font: subHeaderFont, fill: subHeaderFill, align: { horizontal: 'left', vertical: 'middle' } });
      styleBox('F43:H43', 'Term', { font: subHeaderFont, fill: subHeaderFill });
      styleBox('F44', '1', { font: subHeaderFont, fill: subHeaderFill });
      styleBox('G44', '2', { font: subHeaderFont, fill: subHeaderFill });
      styleBox('H44', '3', { font: subHeaderFont, fill: subHeaderFill });
      styleBox('I43:K44', 'Final Rating', { font: subHeaderFont, fill: subHeaderFill });
      styleBox('L43:M44', 'Remarks', { font: subHeaderFont, fill: subHeaderFill });
      worksheet.getRow(43).height = 20;
      worksheet.getRow(44).height = 20;

      let subjRow = 45;
      gradesList.forEach(sub => {
        if (subjRow <= 55) {
          styleBox(`A${subjRow}:E${subjRow}`, sub.name, { font: { name: fontName, size: 11.5, bold: !sub.isComponent, italic: sub.isComponent }, align: { horizontal: 'left', vertical: 'middle' } });
          styleBox(`F${subjRow}`, sub.q1, { font: { name: fontName, size: 11.5 } });
          styleBox(`G${subjRow}`, sub.q2, { font: { name: fontName, size: 11.5 } });
          styleBox(`H${subjRow}`, sub.q3, { font: { name: fontName, size: 11.5 } });
          styleBox(`I${subjRow}:K${subjRow}`, sub.final, { font: { name: fontName, size: 11.5, bold: !sub.isComponent } });
          styleBox(`L${subjRow}:M${subjRow}`, sub.remarks, { font: { name: fontName, size: 11, bold: true } });
          worksheet.getRow(subjRow).height = 22;
          subjRow++;
        }
      });

      // Fill remaining subject slots up to row 55 if any
      while (subjRow <= 55) {
        styleBox(`A${subjRow}:E${subjRow}`, '', { align: { horizontal: 'left', vertical: 'middle' } });
        styleBox(`F${subjRow}`, '');
        styleBox(`G${subjRow}`, '');
        styleBox(`H${subjRow}`, '');
        styleBox(`I${subjRow}:K${subjRow}`, '');
        styleBox(`L${subjRow}:M${subjRow}`, '');
        worksheet.getRow(subjRow).height = 22;
        subjRow++;
      }

      // General Average (Row 56)
      styleBox('A56:H56', 'General Average', { font: { name: fontName, size: 12, bold: true }, align: { horizontal: 'center', vertical: 'middle' } });
      styleBox('I56:K56', genAvg, { font: { name: fontName, size: 14, bold: true } });
      styleBox('L56:M56', genAvgRemarks, { font: { name: fontName, size: 11.5, bold: true } });
      worksheet.getRow(56).height = 24;

      // Descriptors Table (Bottom Left)
      styleBox('A59:E59', 'Descriptors', { font: { name: fontName, size: 11.5, bold: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      styleBox('F59:I59', 'Grading Scale', { font: { name: fontName, size: 11.5, bold: true }, border: null });
      styleBox('J59:M59', 'Remarks', { font: { name: fontName, size: 11.5, bold: true }, border: null });
      worksheet.getRow(59).height = 20;

      const descRows = [
        { d: 'Advancing', s: '90-100', r: 'Passed' },
        { d: 'Benchmarking', s: '80-89', r: 'Passed' },
        { d: 'Connecting', s: '75-79', r: 'Passed' },
        { d: 'Developing', s: '65-74', r: 'Failed' },
        { d: 'Emerging', s: '0-64', r: 'Failed' }
      ];

      descRows.forEach((dr, i) => {
        const r = 60 + i;
        styleBox(`A${r}:E${r}`, dr.d, { font: { name: fontName, size: 11 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
        styleBox(`F${r}:I${r}`, dr.s, { font: { name: fontName, size: 11 }, border: null });
        styleBox(`J${r}:M${r}`, dr.r, { font: { name: fontName, size: 11 }, border: null });
        worksheet.getRow(r).height = 19;
      });

      // ==========================================
      // PAGE 2: RIGHT HALF (Observed Values)
      // ==========================================
      styleBadge('O41:AA41', "REPORT ON LEARNER'S OBSERVED VALUES");
      worksheet.getRow(41).height = 24;

      styleBox('O43:Q44', 'Core Values', { font: subHeaderFont, fill: subHeaderFill });
      styleBox('R43:X44', 'Behavior Statements', { font: subHeaderFont, fill: subHeaderFill, align: { horizontal: 'left', vertical: 'middle' } });
      styleBox('Y43:AA43', 'Term', { font: subHeaderFont, fill: subHeaderFill });
      styleBox('Y44', '1', { font: subHeaderFont, fill: subHeaderFill });
      styleBox('Z44', '2', { font: subHeaderFont, fill: subHeaderFill });
      styleBox('AA44', '3', { font: subHeaderFont, fill: subHeaderFill });
      worksheet.getRow(43).height = 20;
      worksheet.getRow(44).height = 20;

      const coreValuesData = [
        {
          core: '1. Maka-Diyos',
          statements: [
            { key: 'makaDiyos1', text: "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others" },
            { key: 'makaDiyos2', text: "Show adherence to ethical principles by upholding truth" }
          ]
        },
        {
          core: '2. Makatao',
          statements: [
            { key: 'makatao1', text: "Is sensitive to individual, social, cultural, differences" },
            { key: 'makatao2', text: "Demonstrate contributions toward solidarity." }
          ]
        },
        {
          core: '3. Maka-Kalikasan',
          statements: [
            { key: 'makakalikasan1', text: "Cares for the environment and utilizes resources wisely, judiciously, and economically" }
          ]
        },
        {
          core: '4. Makabansa',
          statements: [
            { key: 'makabansa1', text: "Demonstrates pride in being a Filipino: exercises the rights and responsibilities of a Filipino citizen" },
            { key: 'makabansa2', text: "Demonstrates appropriate behavior in carrying out activities in the school, community, and country" }
          ]
        }
      ];

      let ovR = 45;
      coreValuesData.forEach(cv => {
        const startRowCV = ovR;
        cv.statements.forEach(stmtObj => {
          styleBox(`R${ovR}:X${ovR}`, stmtObj.text, { font: { name: fontName, size: 10.8 }, align: { horizontal: 'left', vertical: 'middle', wrapText: true } });
          styleBox(`Y${ovR}`, getObservedValueRating(student, stmtObj.key, 'q1'), { font: { name: fontName, size: 11 } });
          styleBox(`Z${ovR}`, getObservedValueRating(student, stmtObj.key, 'q2'), { font: { name: fontName, size: 11 } });
          styleBox(`AA${ovR}`, getObservedValueRating(student, stmtObj.key, 'q3'), { font: { name: fontName, size: 11 } });
          worksheet.getRow(ovR).height = 32;
          ovR++;
        });
        const endRowCV = ovR - 1;
        styleBox(`O${startRowCV}:Q${endRowCV}`, cv.core, { font: { name: fontName, size: 11.5, bold: true }, align: { horizontal: 'center', vertical: 'middle' } });
      });

      // Observed Values Marking Legend (Bottom Right)
      styleBox('O54:R54', 'Marking', { font: { name: fontName, size: 11.5, bold: true }, border: null });
      styleBox('S54:AA54', 'Non-numerical Rating', { font: { name: fontName, size: 11.5, bold: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
      worksheet.getRow(54).height = 20;

      const legendRows = [
        { m: 'AO', r: 'Always Observed' },
        { m: 'SO', r: 'Sometimes Observed' },
        { m: 'RO', r: 'Rarely Observed' },
        { m: 'NO', r: 'Not Observed' }
      ];

      legendRows.forEach((lr, i) => {
        const r = 55 + i;
        styleBox(`O${r}:R${r}`, lr.m, { font: { name: fontName, size: 11 }, border: null });
        styleBox(`S${r}:AA${r}`, lr.r, { font: { name: fontName, size: 11 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
        worksheet.getRow(r).height = 19;
      });

      removeStrikethrough(worksheet);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF9_${sectionName.replace(/\s+/g, '_')}_${academicYear}.xlsx`);
    return true;
  } catch (error) {
    console.error('Failed to generate SF9', error);
    throw error;
  }
}

export async function generateSF2(data: any) {
  try {
    // 1. Fetch the template file
    const response = await fetch('/templates/SF2.xlsx');
    const arrayBuffer = await response.arrayBuffer();

    // 2. Load the template into exceljs
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // 3. Get the first worksheet
    const worksheet = workbook.worksheets[0];

    // Add DepEd Seal and Logo to header
    try {
      const sealResponse = await fetch('/deped_seal.png');
      const sealBuffer = await sealResponse.arrayBuffer();
      const sealImageId = workbook.addImage({
        buffer: sealBuffer,
        extension: 'png',
      });
      worksheet.addImage(sealImageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 75, height: 75 }
      });
    } catch (e) {
      console.warn('Failed to add seal to SF2:', e);
    }

    try {
      const logoResponse = await fetch('/deped_logo.png');
      const logoBuffer = await logoResponse.arrayBuffer();
      const logoImageId = workbook.addImage({
        buffer: logoBuffer,
        extension: 'png',
      });
      worksheet.addImage(logoImageId, {
        tl: { col: 54, row: 0 },
        ext: { width: 170, height: 70 }
      });
    } catch (e) {
      console.warn('Failed to add logo to SF2:', e);
    }

    const settings = await getGlobalSettings().catch(() => null);

    // Fill headers (School ID, School Name, Grade, Section, Month, SY)
    // School ID: Cell H4
    worksheet.getCell('H4').value = data.schoolId || settings?.schoolId || '199006';
    // Name of School: Cell H5
    worksheet.getCell('H5').value = (data.schoolName || settings?.schoolName || 'Sta. Maria CS SPED Center').toUpperCase();
    // School Year: Cell O4
    worksheet.getCell('O4').value = data.schoolYear;
    // Month of: Cell AF4
    const monthStrUpper = (data.month || '').toUpperCase();
    worksheet.getCell('AF4').value = monthStrUpper;
    // Grade Level: Cell AF5
    worksheet.getCell('AF5').value = data.gradeLevel;
    // Section Name: Cell BA5
    worksheet.getCell('BA5').value = data.section.toUpperCase();

    // Update Summary Table Month header (Row 59 to 63)
    for (let r = 59; r <= 63; r++) {
      const row = worksheet.getRow(r);
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.value && typeof cell.value === 'string') {
          const valStr = cell.value.toString();
          if (valStr.toLowerCase().includes('month') || valStr.toLowerCase().includes('april')) {
            cell.value = `Month: ${monthStrUpper}`;
          }
        }
      });
    }

    // Adviser Name: Cell BB91 (write to BB91-BB94 to ensure it renders correctly on merged cells)
    const adviserName = (data.advisorName || data.adviserName || '').toUpperCase();
    if (adviserName) {
      worksheet.getCell('BB91').value = adviserName;
      worksheet.getCell('BB92').value = adviserName;
      worksheet.getCell('BB93').value = adviserName;
      worksheet.getCell('BB94').value = adviserName;
    }

    const adviserCell = worksheet.getCell('BB91');
    adviserCell.font = {
      name: 'Arial',
      size: 10,
      bold: true
    };
    adviserCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Principal / School Head Name: Cell BB98 (write to BB98-BB100 to ensure it renders correctly on merged cells)
    let principalName = (data as any).schoolHead || (data as any).principalName || (data as any).schoolHeadName;
    if (!principalName) {
      principalName = await getSchoolHeadName();
    }
    principalName = (principalName || 'MRS. LEPIDAPTERA VILLANUEVA').toUpperCase();

    // Clear template defaults in BB98-BB100 first, and set the actual name (or empty to let them sign)
    worksheet.getCell('BB98').value = principalName || null;
    worksheet.getCell('BB99').value = principalName || null;
    worksheet.getCell('BB100').value = principalName || null;

    const principalCell = worksheet.getCell('BB98');
    principalCell.font = {
      name: 'Arial',
      size: 10,
      bold: true
    };
    principalCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // 5. Build dynamic mapping of day number (1-31) to column letters based on Row 7 values
    const dayToColMap: Record<number, string> = {};
    const r7 = worksheet.getRow(7);
    for (let c = 8; c <= 45; c++) {
      const val = r7.getCell(c).value;
      if (typeof val === 'number' && !dayToColMap[val]) {
        dayToColMap[val] = worksheet.getColumn(c).letter;
      }
    }

    // Count unique school days in the template to compute correct present totals
    const uniqueDays = new Set<number>();
    for (let c = 8; c <= 45; c++) {
      const val = r7.getCell(c).value;
      if (typeof val === 'number') {
        uniqueDays.add(val);
      }
    }

    const totalSchoolDays = uniqueDays.size;

    // Helper to clear existing default template values in student rows
    const clearRow = (rowNum: number) => {
      worksheet.getCell(`A${rowNum}`).value = null;
      worksheet.getCell(`C${rowNum}`).value = null;
      // Clear attendance columns H (8) to AY (52)
      for (let c = 8; c <= 52; c++) {
        worksheet.getCell(rowNum, c).value = null;
      }
      // Clear total columns BA (53) and BC (55)
      worksheet.getCell(`BA${rowNum}`).value = null;
      worksheet.getCell(`BC${rowNum}`).value = null;
      // Clear remarks BE (57) to BK (63)
      for (let c = 57; c <= 63; c++) {
        worksheet.getCell(rowNum, c).value = null;
      }
    };

    // Clear male rows (Row 9 to 29)
    for (let r = 9; r <= 29; r++) {
      clearRow(r);
    }
    // Clear female rows (Row 31 to 56)
    for (let r = 31; r <= 56; r++) {
      clearRow(r);
    }

    const writeStudent = (student: any, num: number, rowNum: number) => {
      worksheet.getCell(`A${rowNum}`).value = num;
      // C, D, E, F, G are merged for Name, write to C
      worksheet.getCell(`C${rowNum}`).value = `${student.lastName}, ${student.firstName}`;

      // Insert calculation formulas
      // Since absences are marked with "x", we use COUNTIF to calculate total absences.
      worksheet.getCell(`BA${rowNum}`).value = { formula: `COUNTIF(H${rowNum}:AY${rowNum},"x")` };
      worksheet.getCell(`BC${rowNum}`).value = { formula: `SUM(${totalSchoolDays}-BA${rowNum})` };

      // Write attendance records
      for (let d = 1; d <= 31; d++) {
        const colLetter = dayToColMap[d];
        if (colLetter) {
          const cell = worksheet.getCell(`${colLetter}${rowNum}`);
          const status = student.attendance[d];
          if (status === 'absent') {
            cell.value = 'x'; // Mark absent as 'x'
          } else if (status === 'late') {
            cell.value = 'L'; // 'L' indicates late
          } else {
            cell.value = null; // Blank indicates present
          }
        }
      }
    };

    const applyArialFont = (rowNum: number) => {
      const row = worksheet.getRow(rowNum);
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.font) {
          cell.font = { ...cell.font, name: 'Arial' };
        } else {
          cell.font = { name: 'Arial' };
        }
      });
    };

    const males = data.learners.filter((l: any) => !l.gender?.toLowerCase().startsWith('f'));
    const females = data.learners.filter((l: any) => l.gender?.toLowerCase().startsWith('f'));

    // Populate Males starting from Row 9 (max 21 rows)
    males.slice(0, 21).forEach((student: any, idx: number) => {
      const r = 9 + idx;
      writeStudent(student, idx + 1, r);
      applyArialFont(r);
    });

    // Populate Females starting from Row 31 (max 26 rows)
    females.slice(0, 26).forEach((student: any, idx: number) => {
      const r = 31 + idx;
      writeStudent(student, idx + 1, r);
      applyArialFont(r);
    });

    // Write daily presents formulas for Row 30, Row 57, and Row 58 per school day
    for (let c = 8; c <= 52; c++) {
      const colLetter = worksheet.getColumn(c).letter;

      // Male daily presents (Row 30)
      if (males.length > 0) {
        worksheet.getCell(`${colLetter}30`).value = {
          formula: `${males.length}-COUNTIF(${colLetter}9:${colLetter}${8 + males.length},"x")`
        };
      } else {
        worksheet.getCell(`${colLetter}30`).value = 0;
      }

      // Female daily presents (Row 57)
      if (females.length > 0) {
        worksheet.getCell(`${colLetter}57`).value = {
          formula: `${females.length}-COUNTIF(${colLetter}31:${colLetter}${30 + females.length},"x")`
        };
      } else {
        worksheet.getCell(`${colLetter}57`).value = 0;
      }

      // Combined daily presents (Row 58)
      worksheet.getCell(`${colLetter}58`).value = {
        formula: `${colLetter}30+${colLetter}57`
      };
    }

    // Write totals formulas for Row 30, Row 57, Row 58
    if (males.length > 0) {
      worksheet.getCell(`BA30`).value = { formula: `SUM(BA9:BA${8 + males.length})` };
      worksheet.getCell(`BC30`).value = { formula: `SUM(BC9:BC${8 + males.length})` };
    } else {
      worksheet.getCell(`BA30`).value = 0;
      worksheet.getCell(`BC30`).value = 0;
    }

    if (females.length > 0) {
      worksheet.getCell(`BA57`).value = { formula: `SUM(BA31:BA${30 + females.length})` };
      worksheet.getCell(`BC57`).value = { formula: `SUM(BC31:BC${30 + females.length})` };
    } else {
      worksheet.getCell(`BA57`).value = 0;
      worksheet.getCell(`BC57`).value = 0;
    }

    worksheet.getCell(`BA58`).value = { formula: `BA30+BA57` };
    worksheet.getCell(`BC58`).value = { formula: `BC30+BC57` };

    // Fill No. of Days of Classes in BD60/BD61
    worksheet.getCell('BD60').value = totalSchoolDays;
    worksheet.getCell('BD61').value = totalSchoolDays;

    // Fill attendance summary stats at the bottom
    // Enrolment as of 1st Friday (Row 63)
    worksheet.getCell('BF63').value = males.length;
    worksheet.getCell('BH63').value = females.length;
    worksheet.getCell('BJ63').value = { formula: 'BF63+BH63' };

    // Late enrolment (Row 67)
    worksheet.getCell('BF67').value = 0;
    worksheet.getCell('BH67').value = 0;
    worksheet.getCell('BJ67').value = { formula: 'BF67+BH67' };

    // NLPA (Row 83)
    worksheet.getCell('BF83').value = 0;
    worksheet.getCell('BH83').value = 0;
    worksheet.getCell('BJ83').value = { formula: 'BF83+BH83' };

    // Transferred out (Row 85)
    worksheet.getCell('BF85').value = 0;
    worksheet.getCell('BH85').value = 0;
    worksheet.getCell('BJ85').value = { formula: 'BF85+BH85' };

    // Transferred in (Row 86)
    worksheet.getCell('BF86').value = 0;
    worksheet.getCell('BH86').value = 0;
    worksheet.getCell('BJ86').value = { formula: 'BF86+BH86' };

    // Registered Learners (Row 71)
    worksheet.getCell('BF71').value = { formula: 'BF63+BF67+BF86-BF85-BF83' };
    worksheet.getCell('BH71').value = { formula: 'BH63+BH67+BH86-BH85-BH83' };
    worksheet.getCell('BJ71').value = { formula: 'BJ63+BJ67+BJ86-BJ85-BJ83' };

    // Percentage of Enrolment (Row 75)
    worksheet.getCell('BF75').value = { formula: 'IF(BF63>0, (BF71/BF63)*100, 0)' };
    worksheet.getCell('BH75').value = { formula: 'IF(BH63>0, (BH71/BH63)*100, 0)' };
    worksheet.getCell('BJ75').value = { formula: 'IF(BJ63>0, (BJ71/BJ63)*100, 0)' };

    // Average Daily Attendance (Row 79)
    worksheet.getCell('BF79').value = { formula: 'IF(BD60>0, BC30/BD60, 0)' };
    worksheet.getCell('BH79').value = { formula: 'IF(BD60>0, BC57/BD60, 0)' };
    worksheet.getCell('BJ79').value = { formula: 'IF(BD60>0, BC58/BD60, 0)' };

    // Percentage of Attendance for the month (Row 80)
    worksheet.getCell('BF80').value = { formula: 'IF(BF71>0, (BF79/BF71)*100, 0)' };
    worksheet.getCell('BH80').value = { formula: 'IF(BH71>0, (BH79/BH71)*100, 0)' };
    worksheet.getCell('BJ80').value = { formula: 'IF(BJ71>0, (BJ79/BJ71)*100, 0)' };

    // Clear consecutive absences (Row 81 / 82)
    worksheet.getCell('BF81').value = 0;
    worksheet.getCell('BH81').value = 0;
    worksheet.getCell('BJ81').value = 0;

    // Populate BoSY and EoSY dates dynamically if present
    const bosyDate = (data as any).bosyDate ? formatDateStr((data as any).bosyDate) : formatDateStr(settings?.schoolYearStart);
    const eosyDate = (data as any).eosyDate ? formatDateStr((data as any).eosyDate) : formatDateStr(settings?.schoolYearEnd);
    populateBoSYEoSYDates(worksheet, bosyDate, eosyDate);

    // Fix stale value bug for WPS Office/Excel compatibility
    removeStrikethrough(worksheet);
    workbook.worksheets.forEach((ws) => {
      applyPrintPageSetup(ws, 'landscape');
    });

    // Save & Trigger Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const filename = `SF2_${data.gradeLevel}_${data.section}_${data.month}.xlsx`.replace(/[^a-zA-Z0-9_-]/g, '_');
    saveAs(blob, filename);

  } catch (error) {
    console.error('Failed to generate SF2 from template', error);
    throw error;
  }
}

// ==============================================================
// ADMIN GENERATORS
// ==============================================================

export async function generateAdminSF1(data: SF1Data) {
  try {
    const response = await fetch('/templates/SF1.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    const females = data.learners.filter(s => s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.lastName.localeCompare(b.lastName));
    const males = data.learners.filter(s => !s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.lastName.localeCompare(b.lastName));

    // Set optimal extra-wide column widths so size 14 text displays fully horizontally without vertical cut-offs
    const sf1ColWidths: Record<string, number> = {
      A: 4,   // Left spacing
      B: 24,  // LRN
      C: 36,  // Name (Merged C:F)
      D: 14,
      E: 14,
      F: 14,
      G: 9,   // Sex
      H: 16,  // Birth Date
      I: 9,   // Age
      J: 28,  // Birth Place
      K: 28,  // Mother Tongue
      L: 22,  // IP Group
      M: 32,  // Religion
      N: 45,  // House # / Street
      O: 28,  // Barangay
      P: 28,  // City / Municipality
      Q: 30,  // Province
      R: 25,  // Father Name (Merged R:S)
      S: 15,
      T: 25,  // Mother Name (Merged T:U)
      U: 15,
      V: 32,  // Guardian Name
      W: 18,  // Relationship
      X: 22,  // Contact Number
      Y: 32   // Remarks
    };

    Object.entries(sf1ColWidths).forEach(([colLetter, width]) => {
      const col = worksheet.getColumn(colLetter);
      if (col) {
        col.width = width;
      }
    });

    // Write Header Information
    const setHeaderValue = (cellRef: string, val: string) => {
      const c = worksheet.getCell(cellRef);
      c.value = val;
      c.font = { name: 'Arial Narrow', size: 14, bold: true };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    };

    const settings = await getGlobalSettings().catch(() => null);

    setHeaderValue('F4', (data as any).schoolId || settings?.schoolId || '199006'); // School ID
    setHeaderValue('J4', (data as any).region || (settings ? `REGION ${settings.region}` : 'REGION IX')); // Region
    setHeaderValue('M4', ((data as any).division || settings?.division || 'ZAMBOANGA').toUpperCase()); // Division value
    setHeaderValue('S4', ((data as any).district || settings?.district || 'STA. MARIA CENTRAL').toUpperCase()); // District value

    setHeaderValue('F6', ((data as any).schoolName || settings?.schoolName || 'STA. MARIA CS SPED CENTER').toUpperCase()); // School Name value
    setHeaderValue('O6', data.schoolYear || ''); // School Year value
    setHeaderValue('S6', (data.gradeLevel || '').toString().toUpperCase()); // Grade Level value
    setHeaderValue('V6', (data.section || '').toString().toUpperCase()); // Section value

    // The default template has 15 blank slots for learners (Rows 11 to 25).
    const requiredRows = males.length + 2 + females.length; // +2 for space between males and females
    const availableSlots = 15;
    const rowsToAdd = requiredRows > availableSlots ? (requiredRows - availableSlots) : 0;

    const footerMerges: { top: number; left: number; bottom: number; right: number }[] = [];
    const merges = (worksheet as any)._merges || {};

    for (const key of Object.keys(merges)) {
      const m = merges[key];
      if (m && m.model && m.model.top >= 26) {
        footerMerges.push({
          top: m.model.top,
          left: m.model.left,
          bottom: m.model.bottom,
          right: m.model.right
        });
        delete merges[key];
      }
    }

    if (rowsToAdd > 0) {
      worksheet.duplicateRow(11, rowsToAdd, true);
    }

    for (const fm of footerMerges) {
      worksheet.mergeCells(fm.top + rowsToAdd, fm.left, fm.bottom + rowsToAdd, fm.right);
    }

    let currentRow = 11;

    const writeLearners = (learners: typeof data.learners) => {
      learners.forEach((learner) => {
        const row = worksheet.getRow(currentRow);
        row.height = 36; // Generous 36pt vertical row height so text is never covered at bottom

        const lrnCell = worksheet.getCell(`B${currentRow}`);
        lrnCell.value = learner.lrn;
        lrnCell.font = { name: 'Arial Narrow', size: 14, bold: true };
        lrnCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const fullName = `${learner.lastName}, ${learner.firstName} ${learner.middleName || ''}`.trim().toUpperCase();
        const nameCell = worksheet.getCell(`C${currentRow}`);
        nameCell.value = fullName;
        nameCell.font = { name: 'Arial Narrow', size: 14, bold: true };
        nameCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const sexCell = worksheet.getCell(`G${currentRow}`);
        sexCell.value = learner.gender === 'Male' ? 'M' : 'F';
        sexCell.font = { name: 'Arial Narrow', size: 14 };
        sexCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const bdateCell = worksheet.getCell(`H${currentRow}`);
        bdateCell.value = learner.birthDate || '';
        bdateCell.font = { name: 'Arial Narrow', size: 14 };
        bdateCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const ageCell = worksheet.getCell(`I${currentRow}`);
        ageCell.value = learner.age || '';
        ageCell.font = { name: 'Arial Narrow', size: 14 };
        ageCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const bplaceCell = worksheet.getCell(`J${currentRow}`);
        bplaceCell.value = (learner.birthCity || '').toUpperCase();
        bplaceCell.font = { name: 'Arial Narrow', size: 14 };
        bplaceCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const mtCell = worksheet.getCell(`K${currentRow}`);
        mtCell.value = (learner.motherTongue || '').toUpperCase();
        mtCell.font = { name: 'Arial Narrow', size: 14 };
        mtCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const ipCell = worksheet.getCell(`L${currentRow}`);
        ipCell.value = (learner.indigenousGroup || '').toUpperCase();
        ipCell.font = { name: 'Arial Narrow', size: 14 };
        ipCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const relCell = worksheet.getCell(`M${currentRow}`);
        relCell.value = (learner.religion || '').toUpperCase();
        relCell.font = { name: 'Arial Narrow', size: 14 };
        relCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const stCell = worksheet.getCell(`N${currentRow}`);
        stCell.value = (learner.addressStreet || '').toUpperCase();
        stCell.font = { name: 'Arial Narrow', size: 14 };
        stCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const brgyCell = worksheet.getCell(`O${currentRow}`);
        brgyCell.value = (learner.addressBarangay || '').toUpperCase();
        brgyCell.font = { name: 'Arial Narrow', size: 14 };
        brgyCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const cityCell = worksheet.getCell(`P${currentRow}`);
        cityCell.value = (learner.addressCity || '').toUpperCase();
        cityCell.font = { name: 'Arial Narrow', size: 14 };
        cityCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const provCell = worksheet.getCell(`Q${currentRow}`);
        provCell.value = (learner.addressProvince || '').toUpperCase();
        provCell.font = { name: 'Arial Narrow', size: 14 };
        provCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const fCell = worksheet.getCell(`R${currentRow}`);
        fCell.value = (learner.fatherName || '').toUpperCase();
        fCell.font = { name: 'Arial Narrow', size: 14 };
        fCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const mCell = worksheet.getCell(`T${currentRow}`);
        mCell.value = (learner.motherName || '').toUpperCase();
        mCell.font = { name: 'Arial Narrow', size: 14 };
        mCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const gCell = worksheet.getCell(`V${currentRow}`);
        gCell.value = (learner.guardianName || '').toUpperCase();
        gCell.font = { name: 'Arial Narrow', size: 14 };
        gCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        const relGCell = worksheet.getCell(`W${currentRow}`);
        relGCell.value = (learner.guardianRelationship || '').toUpperCase();
        relGCell.font = { name: 'Arial Narrow', size: 14 };
        relGCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

        const contactCell = worksheet.getCell(`X${currentRow}`);
        contactCell.value = learner.contactNumber || '';
        contactCell.font = { name: 'Arial Narrow', size: 14 };
        contactCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const remCell = worksheet.getCell(`Y${currentRow}`);
        remCell.value = learner.remarks || buildSF1Remarks(learner) || '';
        remCell.font = { name: 'Arial Narrow', size: 14 };
        remCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        currentRow++;
      });
    };

    writeLearners(males);
    currentRow += 2; // space between males and females
    writeLearners(females);

    // Populate BoSY Summary Table (Male, Female, Total)
    let maleSummaryRow = -1;
    let femaleSummaryRow = -1;
    let totalSummaryRow = -1;

    for (let r = 15; r <= worksheet.rowCount; r++) {
      const qVal = worksheet.getCell(`Q${r}`).value;
      if (qVal && typeof qVal === 'string') {
        const normalized = qVal.trim().toUpperCase();
        if (normalized === 'MALE') {
          maleSummaryRow = r;
        } else if (normalized === 'FEMALE') {
          femaleSummaryRow = r;
        } else if (normalized === 'TOTAL') {
          totalSummaryRow = r;
        }
      }
    }

    const rowsAdded = requiredRows > availableSlots ? (requiredRows - availableSlots) : 0;
    if (maleSummaryRow === -1) maleSummaryRow = 30 + rowsAdded;
    if (femaleSummaryRow === -1) femaleSummaryRow = 31 + rowsAdded;
    if (totalSummaryRow === -1) totalSummaryRow = 32 + rowsAdded;

    worksheet.getCell(`R${maleSummaryRow}`).value = males.length;
    worksheet.getCell(`R${femaleSummaryRow}`).value = females.length;
    worksheet.getCell(`R${totalSummaryRow}`).value = {
      formula: `SUM(R${maleSummaryRow}:R${femaleSummaryRow})`,
      result: males.length + females.length
    };

    // Dynamic signature placement: Find the row containing "(Signature of Adviser over Printed Name)" and write the name on the cell above it
    let signatureRow = 30;
    for (let r = 15; r <= worksheet.rowCount; r++) {
      const val = worksheet.getCell(`U${r}`).value;
      if (val && typeof val === 'string' && val.includes('Signature of Adviser')) {
        signatureRow = r - 1;
        break;
      }
    }

    // Merge cells for Adviser and School Head names to center them to the line
    try {
      worksheet.mergeCells(`U${signatureRow}:V${signatureRow}`);
    } catch (e) {
      console.warn('Could not merge adviser signature row cells:', e);
    }
    try {
      worksheet.mergeCells(`X${signatureRow}:Y${signatureRow}`);
    } catch (e) {
      console.warn('Could not merge principal signature row cells:', e);
    }

    const adviserName = (data.advisorName || '').toUpperCase();
    if (adviserName) {
      const cell = worksheet.getCell(`U${signatureRow}`);
      cell.value = adviserName;
      cell.font = {
        name: 'Arial Narrow',
        size: 16,
        bold: true
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
    }

    let principalName = (data as any).schoolHead || (data as any).principalName || (data as any).schoolHeadName;
    if (!principalName) {
      principalName = await getSchoolHeadName();
    }
    principalName = (principalName || 'MRS. LEPIDAPTERA VILLANUEVA').toUpperCase();
    if (principalName) {
      const cell = worksheet.getCell(`X${signatureRow}`);
      cell.value = principalName;
    }

    const principalCell = worksheet.getCell(`X${signatureRow}`);
    principalCell.font = {
      name: 'Arial Narrow',
      size: 16,
      bold: true
    };
    principalCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    // Populate BoSY and EoSY dates dynamically if present
    const bosyDate = (data as any).bosyDate ? formatDateStr((data as any).bosyDate) : formatDateStr(settings?.schoolYearStart);
    const eosyDate = (data as any).eosyDate ? formatDateStr((data as any).eosyDate) : formatDateStr(settings?.schoolYearEnd);
    populateBoSYEoSYDates(worksheet, bosyDate, eosyDate);

    // Apply font size 18 to all cells in the sheet
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.font) {
          cell.font = { ...cell.font, size: 18 };
        } else {
          cell.font = { size: 18 };
        }
      });
    });

    // Auto-adjust column widths based on student data (Rows 11 to currentRow - 1)
    for (let colIdx = 1; colIdx <= 25; colIdx++) {
      const column = worksheet.getColumn(colIdx);
      let maxLen = 0;
      for (let r = 11; r < currentRow; r++) {
        const cell = worksheet.getCell(r, colIdx);
        if (cell.value !== null && cell.value !== undefined) {
          const valStr = String(cell.value);
          let length = valStr.length;
          if (colIdx >= 3 && colIdx <= 6) { // Name merged C:F
            length = Math.ceil(valStr.length / 4);
          } else if (colIdx === 18 || colIdx === 19) { // Father Name merged R:S
            length = Math.ceil(valStr.length / 2);
          } else if (colIdx === 20 || colIdx === 21) { // Mother Name merged T:U
            length = Math.ceil(valStr.length / 2);
          }
          if (length > maxLen) {
            maxLen = length;
          }
        }
      }
      if (maxLen > 0) {
        const targetWidth = Math.ceil(maxLen * 1.5 + 5);
        column.width = Math.max(column.width || 12, targetWidth);
      }
    }

    workbook.worksheets.forEach((ws) => {
      applyPrintPageSetup(ws, 'landscape');
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF1_${data.gradeLevel}_${data.section}_${data.schoolYear}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error generating Admin SF1:', error);
    throw error;
  }
}

export async function generateAdminSF4(data: SF4Data, principalName?: string) {
  try {
    const response = await fetch('/templates/SF4.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    // Add DepEd Seal and Logo to header
    try {
      const sealResponse = await fetch('/deped_seal.png');
      const sealBuffer = await sealResponse.arrayBuffer();
      const sealImageId = workbook.addImage({
        buffer: sealBuffer,
        extension: 'png',
      });
      worksheet.addImage(sealImageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 75, height: 75 }
      });
    } catch (e) {
      console.warn('Failed to add seal to SF4:', e);
    }

    try {
      const logoResponse = await fetch('/deped_logo.png');
      const logoBuffer = await logoResponse.arrayBuffer();
      const logoImageId = workbook.addImage({
        buffer: logoBuffer,
        extension: 'png',
      });
      worksheet.addImage(logoImageId, {
        tl: { col: 30, row: 0 },
        ext: { width: 170, height: 70 }
      });
    } catch (e) {
      console.warn('Failed to add logo to SF4:', e);
    }

    const settings = await getGlobalSettings().catch(() => null);

    // Fill up the upper form fields in SF4
    worksheet.getCell('D5').value = (data as any).schoolId || settings?.schoolId || '199006'; // School ID
    worksheet.getCell('I5').value = (data as any).region || (settings ? `REGION ${settings.region}` : 'REGION IX'); // Region
    worksheet.getCell('N5').value = ((data as any).division || settings?.division || 'ZAMBOANGA').toUpperCase(); // Division
    worksheet.getCell('Y5').value = ((data as any).district || settings?.district || 'STA. MARIA CENTRAL').toUpperCase(); // District
    worksheet.getCell('C7').value = ((data as any).schoolName || settings?.schoolName || 'STA. MARIA CS SPED CENTER').toUpperCase(); // School Name
    worksheet.getCell('Y7').value = data.schoolYear; // School Year
    worksheet.getCell('AJ7').value = data.reportMonth.toUpperCase(); // Report for the Month of

    let currentRow = 12; // Start after headers

    // EXCELJS BUG FIX: duplicateRow does not shift merged cells properly, 
    // causing text to repeat across columns. We must unmerge everything below the table.
    // The text will visually overflow into adjacent empty cells perfectly.
    const merges = Object.keys((worksheet as any)._merges);
    for (const merge of merges) {
      const match = merge.match(/\d+/);
      if (match) {
        const startRow = parseInt(match[0], 10);
        if (startRow > 29) {
          worksheet.unMergeCells(merge);
        }
      }
    }

    data.sections.forEach((sec, index) => {
      if (currentRow > 29) {
        worksheet.duplicateRow(currentRow - 1, 1, true);
        worksheet.mergeCells(`C${currentRow}:D${currentRow}`);
      }

      const cellA = worksheet.getCell(`A${currentRow}`);
      cellA.value = sec.gradeLevel;
      cellA.font = { name: 'Arial Narrow', size: 10, bold: true };
      cellA.alignment = { horizontal: 'center', vertical: 'middle' };

      const cellB = worksheet.getCell(`B${currentRow}`);
      cellB.value = sec.section;
      cellB.font = { name: 'Arial Narrow', size: 10, bold: true };
      cellB.alignment = { horizontal: 'center', vertical: 'middle' };

      const cellC = worksheet.getCell(`C${currentRow}`);
      cellC.value = sec.advisorName;
      cellC.font = { name: 'Arial Narrow', size: 10, bold: false };
      cellC.alignment = { horizontal: 'center', vertical: 'middle' };

      // Registered Learners
      worksheet.getCell(`E${currentRow}`).value = sec.maleCount;
      worksheet.getCell(`F${currentRow}`).value = sec.femaleCount;
      worksheet.getCell(`G${currentRow}`).value = { formula: `E${currentRow}+F${currentRow}` };

      // Daily Average Attendance
      worksheet.getCell(`H${currentRow}`).value = sec.avgDailyAttendanceMale;
      worksheet.getCell(`I${currentRow}`).value = sec.avgDailyAttendanceFemale;
      worksheet.getCell(`J${currentRow}`).value = { formula: `H${currentRow}+I${currentRow}` };

      // Percentage for the Month
      worksheet.getCell(`K${currentRow}`).value = { formula: `IF(E${currentRow}>0, (H${currentRow}/E${currentRow})*100, 0)` };
      worksheet.getCell(`L${currentRow}`).value = { formula: `IF(F${currentRow}>0, (I${currentRow}/F${currentRow})*100, 0)` };
      worksheet.getCell(`M${currentRow}`).value = { formula: `IF(G${currentRow}>0, (J${currentRow}/G${currentRow})*100, 0)` };

      // NLPA / Dropped Out
      worksheet.getCell(`N${currentRow}`).value = sec.nlpaPrevMale || 0;
      worksheet.getCell(`O${currentRow}`).value = sec.nlpaPrevFemale || 0;
      worksheet.getCell(`P${currentRow}`).value = { formula: `N${currentRow}+O${currentRow}` };

      worksheet.getCell(`Q${currentRow}`).value = sec.nlpaMonthMale || 0;
      worksheet.getCell(`R${currentRow}`).value = sec.nlpaMonthFemale || 0;
      worksheet.getCell(`S${currentRow}`).value = { formula: `Q${currentRow}+R${currentRow}` };

      worksheet.getCell(`T${currentRow}`).value = { formula: `N${currentRow}+Q${currentRow}` };
      worksheet.getCell(`U${currentRow}`).value = { formula: `O${currentRow}+R${currentRow}` };
      worksheet.getCell(`V${currentRow}`).value = { formula: `T${currentRow}+U${currentRow}` };

      // Transferred Out
      worksheet.getCell(`W${currentRow}`).value = sec.tOutPrevMale || 0;
      worksheet.getCell(`X${currentRow}`).value = sec.tOutPrevFemale || 0;
      worksheet.getCell(`Y${currentRow}`).value = { formula: `W${currentRow}+X${currentRow}` };

      worksheet.getCell(`Z${currentRow}`).value = sec.tOutMonthMale || 0;
      worksheet.getCell(`AA${currentRow}`).value = sec.tOutMonthFemale || 0;
      worksheet.getCell(`AB${currentRow}`).value = { formula: `Z${currentRow}+AA${currentRow}` };

      worksheet.getCell(`AC${currentRow}`).value = { formula: `W${currentRow}+Z${currentRow}` };
      worksheet.getCell(`AD${currentRow}`).value = { formula: `X${currentRow}+AA${currentRow}` };
      worksheet.getCell(`AE${currentRow}`).value = { formula: `AC${currentRow}+AD${currentRow}` };

      // Transferred In
      worksheet.getCell(`AF${currentRow}`).value = sec.tInPrevMale || 0;
      worksheet.getCell(`AG${currentRow}`).value = sec.tInPrevFemale || 0;
      worksheet.getCell(`AH${currentRow}`).value = { formula: `AF${currentRow}+AG${currentRow}` };

      worksheet.getCell(`AI${currentRow}`).value = sec.tInMonthMale || 0;
      worksheet.getCell(`AJ${currentRow}`).value = sec.tInMonthFemale || 0;
      worksheet.getCell(`AK${currentRow}`).value = { formula: `AI${currentRow}+AJ${currentRow}` };

      worksheet.getCell(`AL${currentRow}`).value = { formula: `AF${currentRow}+AI${currentRow}` };
      worksheet.getCell(`AM${currentRow}`).value = { formula: `AG${currentRow}+AJ${currentRow}` };
      worksheet.getCell(`AN${currentRow}`).value = { formula: `AL${currentRow}+AM${currentRow}` };

      currentRow++;
    });

    // Populate TOTALS / SUMMARY Row at bottom of table
    const totalRow = currentRow;
    const startRow = 12;
    const endRow = currentRow - 1;

    if (endRow >= startRow) {
      if (currentRow > 29) {
        worksheet.duplicateRow(currentRow - 1, 1, true);
      }

      // Clear leftover section/adviser data in B, C, D copied from duplicateRow
      worksheet.getCell(`B${totalRow}`).value = null;
      worksheet.getCell(`C${totalRow}`).value = null;
      worksheet.getCell(`D${totalRow}`).value = null;

      try { worksheet.unMergeCells(`A${totalRow}:D${totalRow}`); } catch (e) { }
      try { worksheet.mergeCells(`A${totalRow}:D${totalRow}`); } catch (e) { }

      const totalCell = worksheet.getCell(`A${totalRow}`);
      totalCell.value = 'TOTAL';
      totalCell.font = { name: 'Arial Narrow', size: 10, bold: true };
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      const colsToSum = ['E', 'F', 'G', 'H', 'I', 'J', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN'];
      colsToSum.forEach(col => {
        worksheet.getCell(`${col}${totalRow}`).value = { formula: `SUM(${col}${startRow}:${col}${endRow})` };
      });

      // Overall Percentage Formulas
      worksheet.getCell(`K${totalRow}`).value = { formula: `IF(E${totalRow}>0, (H${totalRow}/E${totalRow})*100, 0)` };
      worksheet.getCell(`L${totalRow}`).value = { formula: `IF(F${totalRow}>0, (I${totalRow}/F${totalRow})*100, 0)` };
      worksheet.getCell(`M${totalRow}`).value = { formula: `IF(G${totalRow}>0, (J${totalRow}/G${totalRow})*100, 0)` };

      // Summary Table begins right after the main section table totalRow
      const headerR = totalRow + 1;
      const kinderR = totalRow + 2;
      const g1R = totalRow + 3;
      const g2R = totalRow + 4;
      const g3R = totalRow + 5;
      const g4R = totalRow + 6;
      const g5R = totalRow + 7;
      const g6R = totalRow + 8;
      const nonGradedR = totalRow + 9;
      const summaryTotalR = totalRow + 10;

      worksheet.getCell(`A${headerR}`).value = 'ELEMENTARY:';
      worksheet.getCell(`A${kinderR}`).value = 'KINDER';
      worksheet.getCell(`A${g1R}`).value = 'GRADE 1';
      worksheet.getCell(`A${g2R}`).value = 'GRADE 2';
      worksheet.getCell(`A${g3R}`).value = 'GRADE 3';
      worksheet.getCell(`A${g4R}`).value = 'GRADE 4';
      worksheet.getCell(`A${g5R}`).value = 'GRADE 5';
      worksheet.getCell(`A${g6R}`).value = 'GRADE 6';
      worksheet.getCell(`A${nonGradedR}`).value = 'TOTAL FOR NON-GRADED';
      worksheet.getCell(`A${summaryTotalR}`).value = 'TOTAL';

      [headerR, kinderR, g1R, g2R, g3R, g4R, g5R, g6R, nonGradedR, summaryTotalR].forEach(r => {
        try { worksheet.unMergeCells(`A${r}:D${r}`); } catch(e){}
        try { worksheet.mergeCells(`A${r}:D${r}`); } catch(e){}
        worksheet.getRow(r).hidden = false;
        const cellA = worksheet.getCell(`A${r}`);
        cellA.font = { name: 'Arial Narrow', size: 10, bold: true };
        cellA.alignment = { horizontal: r === headerR ? 'left' : 'center', vertical: 'middle' };
      });

      const rawSumCols = ['E', 'F', 'H', 'I', 'N', 'O', 'Q', 'R', 'W', 'X', 'Z', 'AA', 'AF', 'AG', 'AI', 'AJ'];

      const populateGradeRow = (r: number, searchGradeStr: string, altSearchGradeStr?: string) => {
        rawSumCols.forEach(col => {
          let formulaStr = `SUMIF($A$${startRow}:$A$${endRow}, "${searchGradeStr}", ${col}$${startRow}:${col}$${endRow})`;
          if (altSearchGradeStr) {
            formulaStr += ` + SUMIF($A$${startRow}:$A$${endRow}, "${altSearchGradeStr}", ${col}$${startRow}:${col}$${endRow})`;
          }
          worksheet.getCell(`${col}${r}`).value = { formula: formulaStr };
        });

        worksheet.getCell(`G${r}`).value = { formula: `E${r}+F${r}` };
        worksheet.getCell(`J${r}`).value = { formula: `H${r}+I${r}` };
        worksheet.getCell(`K${r}`).value = { formula: `IF(E${r}>0, (H${r}/E${r})*100, 0)` };
        worksheet.getCell(`L${r}`).value = { formula: `IF(F${r}>0, (I${r}/F${r})*100, 0)` };
        worksheet.getCell(`M${r}`).value = { formula: `IF(G${r}>0, (J${r}/G${r})*100, 0)` };

        worksheet.getCell(`P${r}`).value = { formula: `N${r}+O${r}` };
        worksheet.getCell(`S${r}`).value = { formula: `Q${r}+R${r}` };
        worksheet.getCell(`T${r}`).value = { formula: `N${r}+Q${r}` };
        worksheet.getCell(`U${r}`).value = { formula: `O${r}+R${r}` };
        worksheet.getCell(`V${r}`).value = { formula: `T${r}+U${r}` };

        worksheet.getCell(`Y${r}`).value = { formula: `W${r}+X${r}` };
        worksheet.getCell(`AB${r}`).value = { formula: `Z${r}+AA${r}` };
        worksheet.getCell(`AC${r}`).value = { formula: `W${r}+Z${r}` };
        worksheet.getCell(`AD${r}`).value = { formula: `X${r}+AA${r}` };
        worksheet.getCell(`AE${r}`).value = { formula: `AC${r}+AD${r}` };

        worksheet.getCell(`AH${r}`).value = { formula: `AF${r}+AG${r}` };
        worksheet.getCell(`AK${r}`).value = { formula: `AI${r}+AJ${r}` };
        worksheet.getCell(`AL${r}`).value = { formula: `AF${r}+AI${r}` };
        worksheet.getCell(`AM${r}`).value = { formula: `AG${r}+AJ${r}` };
        worksheet.getCell(`AN${r}`).value = { formula: `AL${r}+AM${r}` };
      };

      populateGradeRow(kinderR, 'Kinder*');
      populateGradeRow(g1R, 'Grade 1', '1');
      populateGradeRow(g2R, 'Grade 2', '2');
      populateGradeRow(g3R, 'Grade 3', '3');
      populateGradeRow(g4R, 'Grade 4', '4');
      populateGradeRow(g5R, 'Grade 5', '5');
      populateGradeRow(g6R, 'Grade 6', '6');
      populateGradeRow(nonGradedR, 'Non-Graded*');

      colsToSum.forEach(col => {
        worksheet.getCell(`${col}${summaryTotalR}`).value = { formula: `SUM(${col}${kinderR}:${col}${nonGradedR})` };
      });

      worksheet.getCell(`K${summaryTotalR}`).value = { formula: `IF(E${summaryTotalR}>0, (H${summaryTotalR}/E${summaryTotalR})*100, 0)` };
      worksheet.getCell(`L${summaryTotalR}`).value = { formula: `IF(F${summaryTotalR}>0, (I${summaryTotalR}/F${summaryTotalR})*100, 0)` };
      worksheet.getCell(`M${summaryTotalR}`).value = { formula: `IF(G${summaryTotalR}>0, (J${summaryTotalR}/G${summaryTotalR})*100, 0)` };
    }

    // Format Guidelines and Signature block below the summary table
    let guidelinesHeaderRow: number | null = null;
    let rule1Row: number | null = null;
    let rule2Row: number | null = null;
    let prepByRow: number | null = null;
    let signatureLabelRow: number | null = null;
    let pageRow: number | null = null;

    worksheet.eachRow((row, rowNum) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.value && typeof cell.value === 'string') {
          const val = cell.value.trim();
          if (val.includes('GUIDELINES:')) guidelinesHeaderRow = rowNum;
          if (val.startsWith('1.')) rule1Row = rowNum;
          if (val.startsWith('2.')) rule2Row = rowNum;
          if (val.includes('Prepared and Submitted by')) prepByRow = rowNum;
          if (val.includes('Signature of School Head')) signatureLabelRow = rowNum;
          if (val.includes('Page _____')) pageRow = rowNum;
        }
      });
    });

    if (guidelinesHeaderRow) {
      const gHeadCell = worksheet.getCell(`A${guidelinesHeaderRow}`);
      gHeadCell.value = 'GUIDELINES:';
      gHeadCell.font = { name: 'Arial Narrow', size: 10, bold: true };
    }

    if (rule1Row) {
      try { worksheet.unMergeCells(`A${rule1Row}:V${rule1Row}`); } catch (e) { }
      try { worksheet.mergeCells(`A${rule1Row}:V${rule1Row}`); } catch (e) { }
      const c = worksheet.getCell(`A${rule1Row}`);
      c.value = '1. This form shall be accomplished every end of the month using the summary box of SF2 submitted by the teachers/advisers to update figures for the month.';
      c.font = { name: 'Arial Narrow', size: 9 };
      c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      worksheet.getRow(rule1Row).height = 22;
    }

    if (rule2Row) {
      try { worksheet.unMergeCells(`A${rule2Row}:V${rule2Row}`); } catch (e) { }
      try { worksheet.mergeCells(`A${rule2Row}:V${rule2Row}`); } catch (e) { }
      const c = worksheet.getCell(`A${rule2Row}`);
      c.value = '2. Furnish the Division Office with a copy a week after June 30, October 30 & March 31';
      c.font = { name: 'Arial Narrow', size: 9 };
      c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      worksheet.getRow(rule2Row).height = 18;
    }

    if (pageRow) {
      try { worksheet.unMergeCells(`A${pageRow}:V${pageRow}`); } catch (e) { }
      try { worksheet.mergeCells(`A${pageRow}:V${pageRow}`); } catch (e) { }
      const c = worksheet.getCell(`A${pageRow}`);
      c.value = 'Page _____ of  _____ pages';
      c.font = { name: 'Arial Narrow', size: 9, italic: true };
      c.alignment = { horizontal: 'left', vertical: 'middle' };
    }

    let effectivePrincipalName = principalName;
    if (!effectivePrincipalName) {
      effectivePrincipalName = await getSchoolHeadName();
    }
    const finalPrincipalName = (effectivePrincipalName || 'MRS. LEPIDAPTERA VILLANUEVA').toUpperCase();

    if (prepByRow) {
      try { worksheet.unMergeCells(`Y${prepByRow}:AN${prepByRow}`); } catch (e) { }
      try { worksheet.mergeCells(`Y${prepByRow}:AN${prepByRow}`); } catch (e) { }
      const c = worksheet.getCell(`Y${prepByRow}`);
      c.value = 'Prepared and Submitted by:';
      c.font = { name: 'Arial Narrow', size: 10, bold: true };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    if (signatureLabelRow) {
      const nameRow = signatureLabelRow - 1;
      try { worksheet.unMergeCells(`Y${nameRow}:AN${nameRow}`); } catch (e) { }
      try { worksheet.mergeCells(`Y${nameRow}:AN${nameRow}`); } catch (e) { }
      const nameCell = worksheet.getCell(`Y${nameRow}`);
      nameCell.value = finalPrincipalName;
      nameCell.font = { name: 'Arial Narrow', size: 11, bold: true };
      nameCell.alignment = { horizontal: 'center', vertical: 'middle' };

      try { worksheet.unMergeCells(`Y${signatureLabelRow}:AN${signatureLabelRow}`); } catch (e) { }
      try { worksheet.mergeCells(`Y${signatureLabelRow}:AN${signatureLabelRow}`); } catch (e) { }
      const labelCell = worksheet.getCell(`Y${signatureLabelRow}`);
      labelCell.value = '(Signature of School Head over Printed Name)';
      labelCell.font = { name: 'Arial Narrow', size: 9, bold: false };
      labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    workbook.worksheets.forEach((ws) => {
      applyPrintPageSetup(ws, 'landscape');
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF4_${data.reportMonth}_${data.schoolYear}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error generating Admin SF4:', error);
    throw error;
  }
}

export async function generateAdminSF8(data: {
  schoolYear: string,
  gradeLevel: string,
  section: string,
  learners: HealthData[],
  adviserName?: string
}) {
  try {
    const response = await fetch('/templates/SF8.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // If there are 2 sheets, remove the first empty/unused worksheet "1"
    if (workbook.worksheets.length > 1) {
      const ws0 = workbook.worksheets[0];
      workbook.removeWorksheet(ws0.id);
    }

    const worksheet = workbook.worksheets[0];

    // Set header info
    const cleanSec = data.section.includes(' - ') ? data.section.split(' - ')[1] : data.section;
    const fullGradeAndSection = data.gradeLevel
      ? (data.gradeLevel.toLowerCase().startsWith('grade') ? `${data.gradeLevel} - ${cleanSec}` : `Grade ${data.gradeLevel} - ${cleanSec}`)
      : data.section;

    if (data.schoolYear) {
      worksheet.getCell('A5').value = `BASELINE  ${data.schoolYear}`;
    }

    // Merge Row 7 columns M & N so Grade Level and Section are clearly visible
    try { worksheet.unMergeCells('M7:N7'); } catch (e) { }
    try { worksheet.mergeCells('M7:N7'); } catch (e) { }
    const cellM7 = worksheet.getCell('M7');
    cellM7.value = fullGradeAndSection.toUpperCase();
    cellM7.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    const today = new Date();
    worksheet.getCell('D7').value = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const advUpper = (data.adviserName || '').toUpperCase();
    ['L85', 'M85', 'N85'].forEach(ref => {
      worksheet.getCell(ref).value = advUpper;
    });

    // Enforce optimal column widths and text wrapping for headers
    const colWidths: Record<string, number> = {
      A: 4, B: 1.5, C: 32, D: 14, E: 11, F: 11, G: 5, H: 11,
      I: 3, J: 2, K: 3, L: 13, M: 18, N: 16
    };
    Object.entries(colWidths).forEach(([col, w]) => {
      worksheet.getColumn(col).width = w;
    });

    worksheet.getRow(8).height = 25;
    worksheet.getRow(9).height = 25;

    for (let r = 7; r <= 9; r++) {
      for (let c = 1; c <= 14; c++) {
        const cell = worksheet.getCell(r, c);
        cell.alignment = { ...cell.alignment, wrapText: true, vertical: 'middle', horizontal: cell.alignment?.horizontal || 'center' };
      }
    }

    // Clear all pre-filled/leftover template rows (Rows 10 to 74)
    for (let r = 10; r <= 74; r++) {
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach(col => {
        const cell = worksheet.getCell(`${col}${r}`);
        cell.value = null;
        cell.fill = { type: 'pattern', pattern: 'none' };
      });
      try { worksheet.unMergeCells(`I${r}:K${r}`); } catch (e) { }
      worksheet.mergeCells(`I${r}:K${r}`);
      const c = worksheet.getCell(`I${r}`);
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    const males = data.learners.filter(s => !s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.name.localeCompare(b.name));
    const females = data.learners.filter(s => s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.name.localeCompare(b.name));

    // Helper to calculate and inject formulas and results safely
    const writeLearnerRow = (learner: HealthData, rowNum: number, genderSymbol: 'M' | 'F') => {
      worksheet.getCell(`C${rowNum}`).value = learner.name.toUpperCase();

      let learnerAge: number | null = null;
      if (learner.birthDate) {
        const [yr, mo, dy] = learner.birthDate.split('-').map(Number);
        worksheet.getCell(`D${rowNum}`).value = new Date(yr, mo - 1, dy);

        const birthDateObj = new Date(yr, mo - 1, dy);
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const m = today.getMonth() - birthDateObj.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
          age--;
        }
        learnerAge = age;
      } else if (learner.age > 0) {
        learnerAge = learner.age;
      }

      if (learnerAge !== null && !isNaN(learnerAge)) {
        const ageCell = worksheet.getCell(`I${rowNum}`);
        ageCell.value = learnerAge;
        ageCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ageCell.font = { name: 'Arial', size: 9 };
      }

      if (learner.weight > 0) {
        worksheet.getCell(`E${rowNum}`).value = learner.weight;
      }
      if (learner.height > 0) {
        worksheet.getCell(`F${rowNum}`).value = parseFloat(learner.height.toFixed(2));
        worksheet.getCell(`H${rowNum}`).value = parseFloat((learner.height * learner.height).toFixed(4));
      }
      worksheet.getCell(`G${rowNum}`).value = genderSymbol;

      // Write results into cells only if student is actually measured
      const cellL = worksheet.getCell(`L${rowNum}`);
      if (learner.height > 0 && learner.weight > 0 && learner.bmi > 0) {
        cellL.value = parseFloat(learner.bmi.toFixed(1));
      } else {
        cellL.value = null;
      }

      const cellM = worksheet.getCell(`M${rowNum}`);
      if (learner.height > 0 && learner.weight > 0 && learner.nutritionalStatus) {
        cellM.value = learner.nutritionalStatus;
      } else {
        cellM.value = null;
      }

      const cellN = worksheet.getCell(`N${rowNum}`);
      if (learner.height > 0 && learner.heightForAge) {
        cellN.value = learner.heightForAge;
      } else {
        cellN.value = null;
      }
    };

    // Write males starting from Row 10 (template boundary is up to Row 43)
    let maleRow = 10;
    males.forEach((learner) => {
      if (maleRow <= 43) {
        writeLearnerRow(learner, maleRow, 'M');
        maleRow++;
      }
    });

    // Write separator row for the template's female index formula (which looks for "female" in cell C44)
    worksheet.getCell('C44').value = 'female';

    // Write females starting from Row 45 (template boundary is up to Row 74)
    let femaleRow = 45;
    females.forEach((learner) => {
      if (femaleRow <= 74) {
        writeLearnerRow(learner, femaleRow, 'F');
        femaleRow++;
      }
    });

    // Apply Arial font to student rows (10 to 74) while maintaining size and style hierarchies
    for (let r = 10; r <= 74; r++) {
      const row = worksheet.getRow(r);
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.font) {
          cell.font = { ...cell.font, name: 'Arial' };
        } else {
          cell.font = { name: 'Arial' };
        }
      });
    }

    removeStrikethrough(worksheet);
    workbook.worksheets.forEach((ws) => {
      applyPrintPageSetup(ws, 'landscape');
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF8_${data.gradeLevel.replace(/\s+/g, '_')}_${data.section.replace(/\s+/g, '_')}_${data.schoolYear}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error generating Admin SF8:', error);
    throw error;
  }
}


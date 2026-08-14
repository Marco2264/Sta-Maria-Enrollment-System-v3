import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Student, AttendanceEntry, TeacherSubject } from './teacherData';
import type { SF1Data, SF4Data } from './services/reportDataService';
import type { HealthData } from './services/healthAnalyticsService';
import { HealthAnalyticsService } from './services/healthAnalyticsService';

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

import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

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

    // Row 3
    setHeaderLabel('B3', 'Region');
    setHeaderBox('C3', 'C3:E3', 'REGION IX');
    setHeaderLabel('F3', 'Division');
    setHeaderBox('G3', 'G3:H3', 'ZAMBOANGA');
    setHeaderLabel('I3', 'District');
    setHeaderBox('J3', 'J3:L3', 'STA. MARIA CENTRAL', 'center', 10);

    // Row 5
    setHeaderLabel('B5', 'School ID');
    setHeaderBox('C5', 'C5:E5', '199006');
    setHeaderLabel('F5', 'School Year');
    setHeaderBox('G5', 'G5:H5', academicYear);
    setHeaderLabel('I5', 'Curriculum');
    setHeaderBox('J5', 'J5:L5', 'K to 12 Basic Education Program', 'center', 9);

    // Row 7
    setHeaderLabel('B7', 'School Name');
    setHeaderBox('C7', 'C7:E7', 'STA. MARIA CS SPED CENTER');
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

    // Adviser signature
    if (finalAdvisorName) {
      let found = false;
      for (let r = 35; r <= Math.min(worksheet.rowCount, 65); r++) {
        const row = worksheet.getRow(r);
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const val = cell.value;
          if (!found && val && typeof val === 'string' && val.toLowerCase().includes('adviser')) {
            const rowNum = r - 1;
            try { worksheet.unMergeCells(`L${rowNum}:P${rowNum}`); } catch (e) { }
            try { worksheet.mergeCells(`L${rowNum}:P${rowNum}`); } catch (e) { }
            const sigCell = worksheet.getCell(`L${rowNum}`);
            sigCell.value = finalAdvisorName.toUpperCase();
            styleCell(sigCell, { size: 16, bold: true, align: 'center' });
            found = true;
          }
        });
        if (found) break;
      }
      if (!found) {
        try { worksheet.unMergeCells('L36:P36'); } catch (e) { }
        try { worksheet.mergeCells('L36:P36'); } catch (e) { }
        const sigCell = worksheet.getCell('L36');
        sigCell.value = finalAdvisorName.toUpperCase();
        styleCell(sigCell, { size: 16, bold: true, align: 'center' });
      }
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
  gradeConfigurations: any[] = []
) {
  const safeAttendance = attendance || [];
  const safeSubjects = subjects || [];
  const safeGradeConfigs = gradeConfigurations || [];

  try {
    let advisorId = '';
    try {
      const firstStudent = students[0];
      if (firstStudent && firstStudent.sectionId) {
        const assignSnap = await getDocs(
          query(
            collection(db, 'assignments'),
            where('sectionId', '==', firstStudent.sectionId),
            where('isAdvisor', '==', true)
          )
        );
        if (!assignSnap.empty) {
          advisorId = assignSnap.docs[0].data().teacherId || '';
        }
      }
    } catch (err) {
      console.warn('Failed to resolve advisorId for SF9 attendance:', err);
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

    const response = await fetch('/templates/SF9.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.getWorksheet('DATA SF9');
    if (!worksheet) {
      throw new Error('Worksheet DATA SF9 not found in template SF9.xlsx');
    }

    const firstStudent = students[0];
    const dataGradeLevel = firstStudent?.gradeLevel || 'Grade 6';

    // Unhide all subject columns between BG (59) and DS (123)
    for (let c = 59; c <= 123; c++) {
      worksheet.getColumn(c).hidden = false;
    }

    // Unhide all observed values columns between EC (133) and FD (160)
    for (let c = 133; c <= 160; c++) {
      worksheet.getColumn(c).hidden = false;
    }

    // Clear existing top merges (rows <= 3) before inserting/shifting rows
    // Only clear columns BG onwards (>= 59) and row 1 to prevent clashing with our subject merges
    const mergesToShift: any[] = [];
    const allOriginalMerges: any[] = [];
    const merges = (worksheet as any)._merges || {};
    for (const key of Object.keys(merges)) {
      const m = merges[key];
      if (m && m.model) {
        allOriginalMerges.push(m.model);
        // Only keep merges for biography and attendance columns (1 to 58, i.e., columns < BG)
        if (m.model.left < 59 && m.model.top > 1) {
          mergesToShift.push({
            top: m.model.top + 6,
            left: m.model.left,
            bottom: m.model.bottom + 6,
            right: m.model.right
          });
        }
      }
    }

    allOriginalMerges.forEach(m => {
      try {
        worksheet.unMergeCells(m.top, m.left, m.bottom, m.right);
      } catch (err) {
        // Ignore unmerge errors
      }
    });

    // 1. Splice 6 blank rows at the top to make room for the School/DepEd heading
    worksheet.spliceRows(1, 0, [], [], [], [], [], []);

    // 2. Set Heading Information (Rows 1 to 7) and fetch logos
    worksheet.getRow(1).height = 12;
    worksheet.getRow(2).height = 24;
    worksheet.getRow(3).height = 18;
    worksheet.getRow(4).height = 12;
    worksheet.getRow(5).height = 25;
    worksheet.getRow(6).height = 10;
    worksheet.getRow(7).height = 25;

    // Set Title in row 2, subtitle in row 3
    worksheet.mergeCells('C2:Z2');
    const titleCell = worksheet.getCell('C2');
    titleCell.value = "School Form 9 (SF9) Learner's Progress Report Card";
    titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('C3:Z3');
    const subtitleCell = worksheet.getCell('C3');
    subtitleCell.value = "(Official Learner's Progress Report Card)";
    subtitleCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF555555' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Fetch and add DepEd Seal and Logo to header
    try {
      const sealResponse = await fetch('/deped_seal.png');
      const sealBuffer = await sealResponse.arrayBuffer();
      const sealImageId = workbook.addImage({
        buffer: sealBuffer,
        extension: 'png',
      });
      worksheet.addImage(sealImageId, {
        tl: { col: 0, row: 1 }, // Row 2 (0-indexed 1), Column A (0)
        ext: { width: 75, height: 75 }
      });
    } catch (e) {
      console.warn('Failed to add seal to SF9:', e);
    }

    try {
      const logoResponse = await fetch('/deped_logo.png');
      const logoBuffer = await logoResponse.arrayBuffer();
      const logoImageId = workbook.addImage({
        buffer: logoBuffer,
        extension: 'png',
      });
      worksheet.addImage(logoImageId, {
        tl: { col: 26, row: 1 }, // Row 2 (0-indexed 1), Column AA (26)
        ext: { width: 170, height: 70 }
      });
    } catch (e) {
      console.warn('Failed to add logo to SF9:', e);
    }

    const drawLabel = (colIdx: number, rowIdx: number, val: string) => {
      const cell = worksheet.getCell(rowIdx, colIdx);
      cell.value = val;
      cell.font = { name: 'Segoe UI', size: 10, bold: false, color: { argb: 'FF000000' } };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    };

    const drawBox = (startCol: number, endCol: number, rowIdx: number, val: string) => {
      worksheet.mergeCells(rowIdx, startCol, rowIdx, endCol);
      const mainCell = worksheet.getCell(rowIdx, startCol);
      mainCell.value = val;
      mainCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF000000' } };
      mainCell.alignment = { horizontal: 'center', vertical: 'middle' };

      for (let col = startCol; col <= endCol; col++) {
        const cell = worksheet.getCell(rowIdx, col);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }
    };

    // Draw row 5 inputs
    drawLabel(4, 5, "School ID");      // Column D
    drawBox(5, 7, 5, "199006");        // Columns E to G
    drawLabel(9, 5, "Region");         // Column I
    drawBox(10, 10, 5, "REGION IX");   // Column J
    drawLabel(12, 5, "Division");      // Column L
    drawBox(13, 15, 5, "ZAMBOANGA");   // Columns M to O
    drawLabel(17, 5, "District");      // Column Q
    drawBox(18, 21, 5, "STA. MARIA CENTRAL"); // Columns R to U

    // Draw row 7 inputs
    drawLabel(2, 7, "School Name");    // Column B
    drawBox(3, 9, 7, "STA. MARIA CS SPED CENTER"); // Columns C to I
    drawLabel(11, 7, "School Year");   // Column K
    drawBox(12, 14, 7, academicYear);  // Columns L to N
    drawLabel(16, 7, "Grade & Section"); // Column P
    drawBox(17, 21, 7, `${dataGradeLevel} - ${sectionName}`); // Columns Q to U

    // Clear legacy template title that shifted to row 7
    worksheet.getCell('A7').value = '';
    worksheet.getCell('B7').value = '';
    worksheet.getCell('C7').value = '';
    worksheet.getCell('D7').value = '';

    // Restore shifted merges for biography & attendance columns
    mergesToShift.forEach(m => {
      try {
        worksheet.mergeCells(m.top, m.left, m.bottom, m.right);
      } catch (err) {
        // Ignore merge errors
      }
    });

    // 3. Define the Elementary subjects in columns BG onwards
    const buildSubjectsList = () => {
      const list: string[] = [];
      const gradeLevelClean = (dataGradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
      const dbSubjects = safeSubjects.filter((sub) => {
        const sGrade = (sub.gradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
        return sGrade === gradeLevelClean;
      });

      if (dbSubjects.length === 0) {
        return [
          'Filipino',
          'English',
          'Mathematics',
          'Science',
          'Araling Panlipunan (AP)',
          'Edukasyon sa Pagpapakatao (EsP)',
          'EPP/TLE',
          'MAPEH',
          'Music',
          'Arts',
          'PE',
          'Health',
          'General Average'
        ];
      }

      dbSubjects.forEach((sub) => {
        const name = sub.name || '';
        const lowerName = name.toLowerCase();

        if (lowerName.includes('music') || lowerName.includes('arts') || lowerName.includes('art') || lowerName === 'pe' || lowerName.includes('physical education') || lowerName === 'health') {
          return;
        }

        if (lowerName.includes('mapeh')) {
          list.push('MAPEH');
          list.push('Music');
          list.push('Arts');
          list.push('PE');
          list.push('Health');
        } else {
          list.push(name);
        }
      });
      list.push('General Average');
      return list;
    };

    const subjectsList = buildSubjectsList();

    let colIdx = 59; // Column BG (1-indexed)
    subjectsList.forEach(subjectName => {
      // Merge the 5 cells in Row 8 for this subject
      worksheet.mergeCells(8, colIdx, 8, colIdx + 4);

      const mainCell = worksheet.getCell(8, colIdx);
      mainCell.value = subjectName;
      colIdx += 5;
    });

    const finalColIdx = 59 + (subjectsList.length * 5);

    // Apply header row colors, borders, and typography
    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };
    const bioHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    const attHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    const subjHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };

    worksheet.getRow(8).height = 28;
    worksheet.getRow(9).height = 22;

    for (let col = 1; col < finalColIdx; col++) {
      const cell8 = worksheet.getCell(8, col);
      const cell9 = worksheet.getCell(9, col);

      let fill = bioHeaderFill;
      if (col >= 15 && col <= 58) {
        fill = attHeaderFill as any;
      } else if (col >= 59) {
        fill = subjHeaderFill as any;
      }

      cell8.fill = fill as any;
      cell9.fill = fill as any;

      cell8.border = thinBorder as any;
      cell9.border = thinBorder as any;

      cell8.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF334155' } };
      cell9.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };

      cell8.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell9.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Write subheaders to row 9 for subject columns
    let subColIdx = 59;
    subjectsList.forEach(() => {
      const subHeaders = ['T1', 'T2', 'T3', 'FG', 'Remarks'];
      subHeaders.forEach((sh, offset) => {
        const subCell = worksheet.getCell(9, subColIdx + offset);
        subCell.value = sh;
        subCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF475569' } };
        subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      subColIdx += 5;
    });

    // Apply header styling for observed values (columns 133 to 160)
    const obsHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF2F8' } };
    for (let col = 133; col <= 160; col++) {
      const cell8 = worksheet.getCell(8, col);
      const cell9 = worksheet.getCell(9, col);

      cell8.fill = obsHeaderFill as any;
      cell9.fill = obsHeaderFill as any;

      cell8.border = thinBorder as any;
      cell9.border = thinBorder as any;

      cell8.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF86198F' } };
      cell9.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF86198F' } };

      cell8.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell9.alignment = { horizontal: 'center', vertical: 'middle' };
    }

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
      'epp/tle': 'TLE',
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

    // Helper functions for student grades/attendance retrieval
    const computeCalculatedGrade = (
      subjectData: any,
      subjectCode: string,
      standardCode: string,
      quarterKey: 'q1' | 'q2' | 'q3' | 'q4'
    ): number | null => {
      if (!subjectData || typeof subjectData !== 'object') return null;

      // 1. Direct master sheet grade check
      const directVal = subjectData[quarterKey];
      if (directVal !== undefined && directVal !== null && directVal !== '') {
        const parsed = parseFloat(directVal);
        if (!isNaN(parsed)) return parsed;
      }

      // 2. Teacher dynamic grade columns check
      const termAliases: Record<string, string[]> = {
        q1: ['Term 1', '1st Quarter', 'Q1', 'q1', '1st Term'],
        q2: ['Term 2', '2nd Quarter', 'Q2', 'q2', '2nd Term'],
        q3: ['Term 3', 'Finals', '3rd Quarter', 'Q3', 'q3', '3rd Term'],
        q4: ['Term 4', '4th Quarter', 'Q4', 'q4', '4th Term']
      };
      const possibleTerms = termAliases[quarterKey] || [quarterKey];
      const configs = activeGradeConfigs || [];

      for (const termName of possibleTerms) {
        const cols = configs.filter(
          c => (
            c.subjectCode === subjectCode ||
            c.subjectCode === standardCode ||
            (c.subjectCode && subjectCode && c.subjectCode.toLowerCase() === subjectCode.toLowerCase()) ||
            (c.subjectCode && standardCode && c.subjectCode.toLowerCase() === standardCode.toLowerCase())
          ) &&
            c.term === termName &&
            c.type !== 'submission'
        );

        if (cols.length > 0) {
          let termTotal = 0;
          let hasGrade = false;
          const termData = subjectData[termName] || {};
          cols.forEach(col => {
            const val = termData[col.id];
            if (val !== undefined && val !== null && val !== '') {
              const num = parseFloat(val);
              if (!isNaN(num)) {
                termTotal += (num * (col.weight / 100));
                hasGrade = true;
              }
            }
          });
          if (hasGrade) {
            return Math.round(termTotal * 10) / 10;
          }
        }
      }

      // Fallback check if termData exists even if gradeConfigs subjectCode didn't match exactly
      for (const termName of possibleTerms) {
        const termData = subjectData[termName];
        if (termData && typeof termData === 'object' && Object.keys(termData).length > 0) {
          const cols = configs.filter(c => c.term === termName && c.type !== 'submission');
          if (cols.length > 0) {
            let termTotal = 0;
            let hasGrade = false;
            cols.forEach(col => {
              const val = termData[col.id];
              if (val !== undefined && val !== null && val !== '') {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                  termTotal += (num * (col.weight / 100));
                  hasGrade = true;
                }
              }
            });
            if (hasGrade) {
              return Math.round(termTotal * 10) / 10;
            }
          }
        }
      }

      return null;
    };

    const getGradeVal = (student: Student, colSubjectName: string, term: string, subjs: TeacherSubject[]) => {
      const gLvl = student.gradeLevel || 'Grade 6';
      const gradeKey = gLvl.toLowerCase().startsWith('grade') ? gLvl : `Grade ${gLvl}`;
      const studentGrades = (student.grades?.[gradeKey] as any) || {};

      const cleanColName = colSubjectName.toLowerCase().replace(/\(ap\)|\(esp\)/g, '').trim();
      const standardCode = subjectRowMap[cleanColName] || subjectRowMap[colSubjectName.toLowerCase().trim()] || (colSubjectName.toUpperCase().replace(/\s+/g, '_'));
      if (!standardCode) return null;

      const matchingSub = subjs.find(s => {
        const code = s.code ?? s.name;
        const subNameLower = (s.name || '').toLowerCase().trim();
        const sc = subjectRowMap[subNameLower] || subjectRowMap[code.toLowerCase().trim()] || (code.toUpperCase().replace(/\s+/g, '_'));
        return sc === standardCode;
      });

      const dbKey = matchingSub ? (matchingSub.code ?? matchingSub.name) : colSubjectName;
      let gradeData = studentGrades[dbKey] ||
        (matchingSub?.name ? studentGrades[matchingSub.name] : null) ||
        (matchingSub?.code ? studentGrades[matchingSub.code] : null) ||
        studentGrades[standardCode] ||
        studentGrades[colSubjectName];

      if (!gradeData) {
        const keys = Object.keys(studentGrades);
        for (const k of keys) {
          const kClean = k.toLowerCase().trim();
          const kStandard = subjectRowMap[kClean] || (k.toUpperCase().replace(/\s+/g, '_'));
          if (kStandard === standardCode || kClean === dbKey.toLowerCase().trim()) {
            gradeData = studentGrades[k];
            break;
          }
        }
      }

      if (!gradeData) return null;

      const quarterKey = term === '1st Term' ? 'q1' : term === '2nd Term' ? 'q2' : term === '3rd Term' ? 'q3' : 'q4';
      return computeCalculatedGrade(gradeData, dbKey, standardCode, quarterKey);
    };

    const getMAPEHGrade = (student: Student, term: string, subjs: TeacherSubject[]) => {
      const directMAPEH = getGradeVal(student, 'MAPEH', term, subjs);
      if (directMAPEH !== null && directMAPEH !== undefined) return directMAPEH;

      const music = getGradeVal(student, 'Music', term, subjs);
      const arts = getGradeVal(student, 'Arts', term, subjs);
      const pe = getGradeVal(student, 'PE', term, subjs);
      const health = getGradeVal(student, 'Health', term, subjs);

      const components = [music, arts, pe, health].filter(v => v !== null && v !== undefined) as number[];
      if (components.length === 0) return null;
      return Math.round(components.reduce((a, b) => a + b, 0) / components.length);
    };

    const getStudentMonthlyAttendanceStats = (studentId: string, monthName: string, atts: AttendanceEntry[]) => {
      const monthMap: Record<string, number> = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      const targetMonthIdx = monthMap[monthName];

      const studentRecs = atts.filter(a => {
        const d = new Date(a.date);
        if (isNaN(d.getTime())) return false;
        
        const isAdviserLog = !advisorId || !a.teacherId || a.teacherId === advisorId;
        if (!isAdviserLog) return false;

        return d.getMonth() === targetMonthIdx && a.studentId === studentId;
      });

      const sectionDates = new Set(
        atts
          .filter(a => {
            const d = new Date(a.date);
            if (isNaN(d.getTime())) return false;

            const isAdviserLog = !advisorId || !a.teacherId || a.teacherId === advisorId;
            return d.getMonth() === targetMonthIdx && isAdviserLog;
          })
          .map(a => a.date.split('T')[0])
      );
      const schoolDays = sectionDates.size;

      const presentDays = studentRecs.filter(r => r.status === 'Present' || r.status === 'Late' || (r as any).amStatus === 'Present' || (r as any).amStatus === 'Late').length;
      const absentDays = studentRecs.filter(r => r.status === 'Absent' || (r as any).amStatus === 'Absent').length;
      const tardyDays = studentRecs.filter(r => r.status === 'Late' || (r as any).amStatus === 'Late').length;

      return {
        schoolDays,
        presentDays,
        absentDays,
        tardyDays
      };
    };

    const getObservedValueRating = (student: Student, statementKey: string, quarter: string) => {
      const gLvl = student.gradeLevel || 'Grade 6';
      const gradeKey = gLvl.toLowerCase().startsWith('grade') ? gLvl : `Grade ${gLvl}`;
      const studAny = student as any;
      return studAny.observedValues?.[gradeKey]?.[statementKey]?.[quarter] || '';
    };

    // Pre-calculate column letters of main subjects for General Average formula
    const mainSubjectCols: string[] = [];
    let tempColIdx = 59;
    subjectsList.forEach((subj) => {
      if (subj === 'General Average') return;
      const isComponent = ['music', 'arts', 'art', 'pe', 'health', 'physical education'].includes(subj.toLowerCase());
      if (!isComponent) {
        mainSubjectCols.push(worksheet.getColumn(tempColIdx).letter);
      }
      tempColIdx += 5;
    });

    const zebraFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

    // Adjust key biography column widths to prevent text clipping
    worksheet.getColumn(1).width = 16;  // LRN
    worksheet.getColumn(2).width = 16;  // Last Name
    worksheet.getColumn(3).width = 16;  // First Name
    worksheet.getColumn(4).width = 16;  // Middle Name
    worksheet.getColumn(9).width = 20;  // Grade & Section

    // Optimize attendance columns spacing (Cols O to BF)
    for (let c = 15; c <= 58; c++) {
      const isTotalCol = [25, 36, 47, 58].includes(c);
      worksheet.getColumn(c).width = isTotalCol ? 6 : 4;
    }

    // Optimize subject grades columns spacing (Cols BG onwards)
    let wCol = 59;
    subjectsList.forEach(() => {
      worksheet.getColumn(wCol).width = 5;     // T1
      worksheet.getColumn(wCol + 1).width = 5; // T2
      worksheet.getColumn(wCol + 2).width = 5; // T3
      worksheet.getColumn(wCol + 3).width = 5; // FG
      worksheet.getColumn(wCol + 4).width = 9; // Remarks
      wCol += 5;
    });

    // 4. Fill Student Rows starting from Row 10
    students.forEach((student, idx) => {
      const r = 10 + idx;
      const row = worksheet.getRow(r);
      const stdAny = student as any;
      row.height = 22;

      let age: number | string = '';
      if (stdAny.birthDate) {
        const birth = new Date(stdAny.birthDate);
        if (!isNaN(birth.getTime())) {
          const today = new Date();
          let a = today.getFullYear() - birth.getFullYear();
          const m = today.getMonth() - birth.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            a--;
          }
          age = a;
        }
      }

      // Biographical
      row.getCell(1).value = stdAny.lrn || '';
      row.getCell(2).value = stdAny.lastName || '';
      row.getCell(3).value = stdAny.firstName || '';
      row.getCell(4).value = stdAny.middleName || '';
      row.getCell(5).value = stdAny.extensionName || '';
      row.getCell(6).value = 'K to 12';
      row.getCell(7).value = age;
      row.getCell(8).value = stdAny.gender === 'Female' ? 'F' : 'M';
      row.getCell(9).value = `${dataGradeLevel} - ${sectionName}`;

      // Monthly Attendance (Cols O to BF)
      const monthsList = ['July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April'];
      monthsList.forEach((month, mIdx) => {
        const stats = getStudentMonthlyAttendanceStats(student.id, month, safeAttendance);
        row.getCell(15 + mIdx).value = stats.schoolDays;
        row.getCell(26 + mIdx).value = stats.presentDays;
        row.getCell(37 + mIdx).value = stats.absentDays;
        row.getCell(48 + mIdx).value = stats.tardyDays;
      });

      // Attendance Totals (Y, AJ, AU, BF)
      row.getCell(25).value = { formula: `=SUM(O${r}:X${r})` };
      row.getCell(36).value = { formula: `=SUM(Z${r}:AI${r})` };
      row.getCell(47).value = { formula: `=SUM(AK${r}:AT${r})` };
      row.getCell(58).value = { formula: `=SUM(AV${r}:BE${r})` };

      // Subject Grades (Col BG onwards)
      let sColIdx = 59;
      subjectsList.forEach(subjectName => {
        if (subjectName === 'General Average') {
          // General Average formulas constructed dynamically
          const t1FormulaTerms = mainSubjectCols.map(col => `${col}${r}`).join(',');
          const t2FormulaTerms = mainSubjectCols.map(col => {
            const nextCol = worksheet.getColumn(worksheet.getColumn(col).number + 1).letter;
            return `${nextCol}${r}`;
          }).join(',');
          const t3FormulaTerms = mainSubjectCols.map(col => {
            const nextCol = worksheet.getColumn(worksheet.getColumn(col).number + 2).letter;
            return `${nextCol}${r}`;
          }).join(',');

          const t1AvgCol = worksheet.getColumn(sColIdx).letter;
          const t2AvgCol = worksheet.getColumn(sColIdx + 1).letter;
          const t3AvgCol = worksheet.getColumn(sColIdx + 2).letter;
          const fgAvgCol = worksheet.getColumn(sColIdx + 3).letter;

          row.getCell(sColIdx).value = { formula: `=IF(COUNT(${t1FormulaTerms})>0, ROUND(AVERAGE(${t1FormulaTerms}), 0), "")` }; // T1 Avg
          row.getCell(sColIdx + 1).value = { formula: `=IF(COUNT(${t2FormulaTerms})>0, ROUND(AVERAGE(${t2FormulaTerms}), 0), "")` }; // T2 Avg
          row.getCell(sColIdx + 2).value = { formula: `=IF(COUNT(${t3FormulaTerms})>0, ROUND(AVERAGE(${t3FormulaTerms}), 0), "")` }; // T3 Avg
          row.getCell(sColIdx + 3).value = { formula: `=IF(COUNT(${t1AvgCol}${r}:${t3AvgCol}${r})>0, ROUND(AVERAGE(${t1AvgCol}${r}:${t3AvgCol}${r}), 0), "")` }; // FG
          row.getCell(sColIdx + 4).value = { formula: `=IF(${fgAvgCol}${r}="", "", IF(${fgAvgCol}${r}>=75, "Passed", "Failed"))` }; // Remarks
        } else {
          const t1 = subjectName === 'MAPEH' ? getMAPEHGrade(student, '1st Term', safeSubjects) : getGradeVal(student, subjectName, '1st Term', safeSubjects);
          const t2 = subjectName === 'MAPEH' ? getMAPEHGrade(student, '2nd Term', safeSubjects) : getGradeVal(student, subjectName, '2nd Term', safeSubjects);
          const t3 = subjectName === 'MAPEH' ? getMAPEHGrade(student, '3rd Term', safeSubjects) : getGradeVal(student, subjectName, '3rd Term', safeSubjects);

          row.getCell(sColIdx).value = t1;
          row.getCell(sColIdx + 1).value = t2;
          row.getCell(sColIdx + 2).value = t3;

          const cT1 = worksheet.getColumn(sColIdx).letter;
          const cT2 = worksheet.getColumn(sColIdx + 1).letter;
          const cT3 = worksheet.getColumn(sColIdx + 2).letter;
          const cFG = worksheet.getColumn(sColIdx + 3).letter;

          row.getCell(sColIdx + 3).value = { formula: `=IF(COUNT(${cT1}${r}:${cT3}${r})>0, ROUND(AVERAGE(${cT1}${r}:${cT3}${r}), 0), "")` };
          row.getCell(sColIdx + 4).value = { formula: `=IF(${cFG}${r}="", "", IF(${cFG}${r}>=75, "Passed", "Failed"))` };
        }
        sColIdx += 5;
      });

      // Populate Observed Values (columns 133 to 160)
      // MD1: 133, 134, 135
      row.getCell(133).value = getObservedValueRating(student, 'makaDiyos1', 'q1');
      row.getCell(134).value = getObservedValueRating(student, 'makaDiyos1', 'q2');
      row.getCell(135).value = getObservedValueRating(student, 'makaDiyos1', 'q3');

      // MD2: 137, 138, 139
      row.getCell(137).value = getObservedValueRating(student, 'makaDiyos2', 'q1');
      row.getCell(138).value = getObservedValueRating(student, 'makaDiyos2', 'q2');
      row.getCell(139).value = getObservedValueRating(student, 'makaDiyos2', 'q3');

      // MT1: 141, 142, 143
      row.getCell(141).value = getObservedValueRating(student, 'makatao1', 'q1');
      row.getCell(142).value = getObservedValueRating(student, 'makatao1', 'q2');
      row.getCell(143).value = getObservedValueRating(student, 'makatao1', 'q3');

      // MT2: 145, 146, 147
      row.getCell(145).value = getObservedValueRating(student, 'makatao2', 'q1');
      row.getCell(146).value = getObservedValueRating(student, 'makatao2', 'q2');
      row.getCell(147).value = getObservedValueRating(student, 'makatao2', 'q3');

      // MK: 149, 150, 151
      row.getCell(149).value = getObservedValueRating(student, 'makakalikasan1', 'q1');
      row.getCell(150).value = getObservedValueRating(student, 'makakalikasan1', 'q2');
      row.getCell(151).value = getObservedValueRating(student, 'makakalikasan1', 'q3');

      // MB1: 153, 154, 155
      row.getCell(153).value = getObservedValueRating(student, 'makabansa1', 'q1');
      row.getCell(154).value = getObservedValueRating(student, 'makabansa1', 'q2');
      row.getCell(155).value = getObservedValueRating(student, 'makabansa1', 'q3');

      // MB2: 157, 158, 159
      row.getCell(157).value = getObservedValueRating(student, 'makabansa2', 'q1');
      row.getCell(158).value = getObservedValueRating(student, 'makabansa2', 'q2');
      row.getCell(159).value = getObservedValueRating(student, 'makabansa2', 'q3');

      // Apply borders, typography, alignments and zebra striping to each cell
      const isEvenRow = idx % 2 === 1;
      for (let col = 1; col < finalColIdx; col++) {
        const cell = row.getCell(col);
        cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF1E293B' } };
        cell.border = thinBorder as any;

        if (isEvenRow) {
          cell.fill = zebraFill as any;
        }

        if (col <= 5) {
          cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        } else if (col >= 6 && col <= 14) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (col >= 15 && col <= 58) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (col >= 59) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
        }
      }

      // Apply style to Observed Values columns specifically
      for (let col = 133; col <= 160; col++) {
        const cell = row.getCell(col);
        cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF86198F' } };
        cell.border = thinBorder as any;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (isEvenRow) {
          cell.fill = zebraFill as any;
        }
      }

      row.commit();
    });

    // 4.5 Hide columns starting from the end of written subjects up to 170
    for (let c = finalColIdx; c <= 170; c++) {
      if (c >= 133 && c <= 160) continue;
      worksheet.getColumn(c).hidden = true;
    }

    // 5. Remove all other worksheets so only 'DATA SF9' is in the workbook
    const wsNames = workbook.worksheets.map(ws => ws.name);
    wsNames.forEach(name => {
      if (name !== 'DATA SF9') {
        const sheet = workbook.getWorksheet(name);
        if (sheet) {
          workbook.removeWorksheet(sheet.id);
        }
      }
    });

    workbook.worksheets.forEach((ws) => {
      applyPrintPageSetup(ws, 'landscape', false);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF9_Data_${sectionName.replace(/\s+/g, '_')}_${academicYear}.xlsx`);
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

    // Fill headers (School ID, School Name, Grade, Section, Month, SY)
    // School ID: Cell H4
    worksheet.getCell('H4').value = data.schoolId || '199006';
    // Name of School: Cell H5
    worksheet.getCell('H5').value = (data.schoolName || 'Sta. Maria CS SPED Center').toUpperCase();
    // School Year: Cell O4
    worksheet.getCell('O4').value = data.schoolYear;
    // Month of: Cell AF4
    worksheet.getCell('AF4').value = data.month.toUpperCase();
    // Grade Level: Cell AF5
    worksheet.getCell('AF5').value = data.gradeLevel;
    // Section Name: Cell BA5
    worksheet.getCell('BA5').value = data.section.toUpperCase();

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
    const principalName = ((data as any).schoolHead || (data as any).principalName || (data as any).schoolHeadName || 'MRS. LEPIDAPTERA VILLANUEVA').toUpperCase();

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

    setHeaderValue('F4', '199006'); // School ID
    setHeaderValue('J4', 'REGION IX'); // Region
    setHeaderValue('M4', 'ZAMBOANGA'); // Division value
    setHeaderValue('S4', 'STA. MARIA CENTRAL'); // District value

    setHeaderValue('F6', 'STA. MARIA CS SPED CENTER'); // School Name value
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
        remCell.value = learner.remarks || '';
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

    const principalName = ((data as any).schoolHead || (data as any).principalName || (data as any).schoolHeadName || 'MRS. LEPIDAPTERA VILLANUEVA').toUpperCase();
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

    // Fill up the upper form fields in SF4
    worksheet.getCell('D5').value = '199006'; // School ID
    worksheet.getCell('I5').value = 'REGION IX'; // Region
    worksheet.getCell('N5').value = 'ZAMBOANGA'; // Division
    worksheet.getCell('Y5').value = 'STA. MARIA CENTRAL'; // District
    worksheet.getCell('C7').value = 'STA. MARIA CS SPED CENTER'; // School Name
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

      worksheet.getCell(`A${currentRow}`).value = sec.gradeLevel;
      worksheet.getCell(`B${currentRow}`).value = sec.section;
      worksheet.getCell(`C${currentRow}`).value = sec.advisorName;
      worksheet.getCell(`E${currentRow}`).value = sec.maleCount;
      worksheet.getCell(`F${currentRow}`).value = sec.femaleCount;
      worksheet.getCell(`G${currentRow}`).value = sec.totalCount;
      currentRow++;
    });

    // Dynamic signature placement: Find the row containing "(Signature of School Head over Printed Name)" and write the name on the cell above it
    let signatureRow = 43; // fallback default
    worksheet.eachRow((row, rowNum) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value;
        if (val && typeof val === 'string' && val.includes('Signature of School Head')) {
          signatureRow = rowNum;
        }
      });
    });

    const targetNameRow = signatureRow - 1;
    const targetCell = worksheet.getCell(`AG${targetNameRow}`);
    targetCell.value = (principalName || 'MRS. LEPIDAPTERA VILLANUEVA').toUpperCase();
    targetCell.font = {
      name: 'Arial',
      size: 10,
      bold: true
    };
    targetCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

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


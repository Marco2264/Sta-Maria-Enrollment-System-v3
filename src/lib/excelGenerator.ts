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

import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function generateSF5(students: Student[], sectionName: string, academicYear: string) {
  try {
    // 1. Fetch subjects assigned to this grade level from Firestore
    // Find the grade level of the section by looking at the first student
    const firstStudent = students.find(s => s.status === 'Enrolled');
    const gradeLevel = firstStudent?.gradeLevel || 'Grade 6'; // Fallback
    const normalizedGradeLevel = gradeLevel.toLowerCase().replace(/grade\s*/g, '').trim();

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

    // 3. Populate Header Info
    worksheet.getCell('C3').value = 'REGION IX';
    worksheet.getCell('E3').value = 'ZAMBOANGA';
    worksheet.getCell('J3').value = 'STA. MARIA CENTRAL';
    worksheet.getCell('C5').value = '199006';
    worksheet.getCell('G5').value = academicYear;
    worksheet.getCell('J5').value = 'K to 12 Basic Education Program';
    worksheet.getCell('C7').value = 'STA. MARIA CS SPED CENTER';
    worksheet.getCell('J7').value = gradeLevel;

    // Extract section name if it is combined (e.g. "Grade 6 - Gold" -> "Gold")
    const cleanSectionName = sectionName.includes(' - ') ? sectionName.split(' - ')[1] : sectionName;
    worksheet.getCell('L7').value = cleanSectionName;

    // 4. Sort and filter students (Males first, then Females)
    const enrolledMales = students
      .filter(s => s.status === 'Enrolled' && s.gender?.toLowerCase() === 'male')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
    const enrolledFemales = students
      .filter(s => s.status === 'Enrolled' && s.gender?.toLowerCase() === 'female')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));

    // Summary tallies
    let promotedM = 0, promotedF = 0;
    let condM = 0, condF = 0;
    let retainedM = 0, retainedF = 0;

    let dnM = 0, dnF = 0;
    let fsM = 0, fsF = 0;
    let satM = 0, satF = 0;
    let vsM = 0, vsF = 0;
    let outM = 0, outF = 0;

    const gradeKey = gradeLevel.toLowerCase().startsWith('grade') ? (gradeLevel.charAt(0).toUpperCase() + gradeLevel.slice(1)) : `Grade ${gradeLevel}`;

    // Filter out MAPEH sub-components from main subjects list to prevent double weighting
    const mainSubjects = sectionSubjects.filter(sub => {
      const name = (sub.name || '').toLowerCase();
      return !['music', 'arts', 'pe', 'health', 'physical education'].includes(name);
    });

    const getSubjectFinalRating = (student: Student, sub: TeacherSubject) => {
      const name = (sub.name || '').toLowerCase();
      
      // If MAPEH, average its components
      if (name.includes('mapeh')) {
        const components = sectionSubjects.filter(s => {
          const n = (s.name || '').toLowerCase();
          return ['music', 'arts', 'pe', 'health', 'physical education'].includes(n);
        });

        const termAverages = ['q1', 'q2', 'q3'].map(q => {
          const compGrades: number[] = [];
          components.forEach(comp => {
            const code = comp.code ?? comp.name;
            const gradeData = (student.grades as any)?.[gradeKey]?.[code] || {};
            const qGrade = parseFloat(gradeData[q]);
            if (!isNaN(qGrade)) {
              compGrades.push(qGrade);
            }
          });
          if (compGrades.length === 0) return null;
          return Math.round(compGrades.reduce((a, b) => a + b, 0) / compGrades.length);
        });

        const activeTerms = termAverages.filter(v => v !== null) as number[];
        if (activeTerms.length === 0) return null;
        return Math.round(activeTerms.reduce((a, b) => a + b, 0) / activeTerms.length);
      }

      // Standard subject rating
      const code = sub.code ?? sub.name;
      const gradeData = (student.grades as any)?.[gradeKey]?.[code] || {};
      const termGrades: number[] = [];
      ['q1', 'q2', 'q3'].forEach(q => {
        const qGrade = parseFloat(gradeData[q]);
        if (!isNaN(qGrade)) {
          termGrades.push(qGrade);
        }
      });

      if (termGrades.length === 0) return null;
      return Math.round(termGrades.reduce((a, b) => a + b, 0) / termGrades.length);
    };

    const writeStudentRow = (student: Student, rowNumber: number, gender: 'Male' | 'Female') => {
      const fullName = `${student.lastName}, ${student.firstName} ${(student as any).middleName || ''}`.trim();
      worksheet.getCell(`A${rowNumber}`).value = student.lrn || '';
      worksheet.getCell(`B${rowNumber}`).value = fullName;

      const finalRatings: number[] = [];
      const failedSubjects: string[] = [];

      mainSubjects.forEach(sub => {
        const finalSubRating = getSubjectFinalRating(student, sub);
        if (finalSubRating !== null) {
          finalRatings.push(finalSubRating);
          if (finalSubRating < 75) {
            failedSubjects.push(sub.name || sub.code);
          }
        }
      });

      // Calculate general average
      let generalAvg = 0;
      let generalAvgStr = '';
      let isHonor = false;

      if (finalRatings.length > 0) {
        generalAvg = finalRatings.reduce((sum, r) => sum + r, 0) / finalRatings.length;
        isHonor = generalAvg >= 90;

        if (isHonor) {
          generalAvgStr = generalAvg.toFixed(3); // 3 decimal places for honors
        } else {
          generalAvgStr = Math.round(generalAvg).toString(); // whole number for non-honors
        }
      }

      worksheet.getCell(`F${rowNumber}`).value = generalAvgStr || '--';

      // Promotion rules
      let action = 'PROMOTED';
      if (finalRatings.length === 0) {
        action = '--';
      } else if (failedSubjects.length === 0) {
        action = 'PROMOTED';
        if (gender === 'Male') promotedM++; else promotedF++;
      } else if (failedSubjects.length === 1 || failedSubjects.length === 2) {
        action = 'CONDITIONALLY PROMOTED';
        if (gender === 'Male') condM++; else condF++;
      } else {
        action = 'RETAINED';
        if (gender === 'Male') retainedM++; else retainedF++;
      }

      worksheet.getCell(`G${rowNumber}`).value = action;

      // Incomplete current school year subject names
      if (action === 'CONDITIONALLY PROMOTED') {
        worksheet.getCell(`J${rowNumber}`).value = failedSubjects.join(', ');
      }

      // Tally proficiency distribution based on general average
      if (finalRatings.length > 0) {
        const roundedAvg = Math.round(generalAvg);
        if (roundedAvg >= 90) {
          if (gender === 'Male') outM++; else outF++;
        } else if (roundedAvg >= 85) {
          if (gender === 'Male') vsM++; else vsF++;
        } else if (roundedAvg >= 80) {
          if (gender === 'Male') satM++; else satF++;
        } else if (roundedAvg >= 75) {
          if (gender === 'Male') fsM++; else fsF++;
        } else {
          if (gender === 'Male') dnM++; else dnF++;
        }
      }
    };

    // Write Males (Rows 12 to 32)
    let currentMaleRow = 12;
    enrolledMales.forEach(student => {
      if (currentMaleRow <= 32) {
        writeStudentRow(student, currentMaleRow, 'Male');
        currentMaleRow++;
      }
    });

    // Write total male count to F33
    worksheet.getCell('F33').value = enrolledMales.length;

    // Write Females (Rows 34 to 59)
    let currentFemaleRow = 34;
    enrolledFemales.forEach(student => {
      if (currentFemaleRow <= 59) {
        writeStudentRow(student, currentFemaleRow, 'Female');
        currentFemaleRow++;
      }
    });

    // Write total female count to F60
    worksheet.getCell('F60').value = enrolledFemales.length;

    // Write combined count to F61
    worksheet.getCell('F61').value = enrolledMales.length + enrolledFemales.length;

    // Write Summary Table for Promotion Status
    // Promoted (Rows 15-16)
    worksheet.getCell('N15').value = promotedM;
    worksheet.getCell('O15').value = promotedF;
    worksheet.getCell('P15').value = promotedM + promotedF;

    // Conditionally Promoted (Rows 17-18)
    worksheet.getCell('N17').value = condM;
    worksheet.getCell('O17').value = condF;
    worksheet.getCell('P17').value = condM + condF;

    // Retained (Rows 19-20)
    worksheet.getCell('N19').value = retainedM;
    worksheet.getCell('O19').value = retainedF;
    worksheet.getCell('P19').value = retainedM + retainedF;

    // Promotion totals (Row 21)
    const promotionMaleTotal = promotedM + condM + retainedM;
    const promotionFemaleTotal = promotedF + condF + retainedF;
    worksheet.getCell('N21').value = promotionMaleTotal;
    worksheet.getCell('O21').value = promotionFemaleTotal;
    worksheet.getCell('P21').value = promotionMaleTotal + promotionFemaleTotal;

    // Write Learning Progress & Achievement (Proficiency scale)
    // Did Not Meet Expectations (Rows 24-25)
    worksheet.getCell('N24').value = dnM;
    worksheet.getCell('O24').value = dnF;
    worksheet.getCell('P24').value = dnM + dnF;

    // Fairly Satisfactory (Rows 26-27)
    worksheet.getCell('N26').value = fsM;
    worksheet.getCell('O26').value = fsF;
    worksheet.getCell('P26').value = fsM + fsF;

    // Satisfactory (Rows 28-29)
    worksheet.getCell('N28').value = satM;
    worksheet.getCell('O28').value = satF;
    worksheet.getCell('P28').value = satM + satF;

    // Very Satisfactory (Rows 30-31)
    worksheet.getCell('N30').value = vsM;
    worksheet.getCell('O30').value = vsF;
    worksheet.getCell('P30').value = vsM + vsF;

    // Outstanding (Rows 32-33)
    worksheet.getCell('N32').value = outM;
    worksheet.getCell('O32').value = outF;
    worksheet.getCell('P32').value = outM + outF;

    // Proficiency totals (Row 34)
    const profMaleTotal = dnM + fsM + satM + vsM + outM;
    const profFemaleTotal = dnF + fsF + satF + vsF + outF;
    worksheet.getCell('N34').value = profMaleTotal;
    worksheet.getCell('O34').value = profFemaleTotal;
    worksheet.getCell('P34').value = profMaleTotal + profFemaleTotal;

    // 5.5 Remove Strikethrough bug
    removeStrikethrough(worksheet);

    // 6. Generate the new file
    const buffer = await workbook.xlsx.writeBuffer();

    // 7. Download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF5_${sectionName.replace(/\s+/g, '_')}_${academicYear}.xlsx`);

    return true;
  } catch (error) {
    console.error('Error generating SF5:', error);
    throw error;
  }
}

export async function generateSF8(students: Student[], sectionName: string, academicYear: string) {
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
    worksheet.getCell('N6').value = sectionName.toUpperCase();
    worksheet.getCell('D6').value = new Date(); // Weighing date

    // Clear all pre-filled/leftover template rows (Rows 10 to 74, columns C to G)
    for (let r = 10; r <= 74; r++) {
      worksheet.getCell(`C${r}`).value = null;
      worksheet.getCell(`D${r}`).value = null;
      worksheet.getCell(`E${r}`).value = null;
      worksheet.getCell(`F${r}`).value = null;
      worksheet.getCell(`G${r}`).value = null;
    }

    // Only include enrolled students
    const enrolledStudents = students.filter(s => s.status === 'Enrolled');
    const males = enrolledStudents.filter(s => s.gender === 'Male').sort((a, b) => a.lastName.localeCompare(b.lastName));
    const females = enrolledStudents.filter(s => s.gender === 'Female').sort((a, b) => a.lastName.localeCompare(b.lastName));

    // Helper to calculate and inject formulas and results safely
    const writeStudentRow = (student: Student, rowNum: number, genderSymbol: 'M' | 'F') => {
      const middleName = (student as any).middleName || '';
      const middleInitial = middleName ? `${middleName.charAt(0)}.` : '';
      const fullName = `${student.lastName}, ${student.firstName} ${middleInitial}`.trim().toUpperCase();

      worksheet.getCell(`C${rowNum}`).value = fullName;
      if (student.birthDate) {
        const [yr, mo, dy] = student.birthDate.split('-').map(Number);
        worksheet.getCell(`D${rowNum}`).value = new Date(yr, mo - 1, dy);
      }

      let bmi: number | null = null;
      let nutStatus: string | null = null;
      let hfaStatus: string | null = null;

      if (student.medical?.height && student.medical?.weight) {
        const h = parseFloat(student.medical.height);
        const w = parseFloat(student.medical.weight);
        if (!isNaN(h) && !isNaN(w) && h > 0) {
          worksheet.getCell(`E${rowNum}`).value = w;
          worksheet.getCell(`F${rowNum}`).value = h / 100;

          // Calculate values using the exact same algorithms as the students module
          bmi = parseFloat(HealthAnalyticsService.calculateBMI(h, w).toFixed(1));
          nutStatus = HealthAnalyticsService.getNutritionalStatus(bmi);

          if (student.birthDate) {
            const ageMonths = HealthAnalyticsService.calculateAgeInMonths(student.birthDate);
            hfaStatus = HealthAnalyticsService.getHfaStatus(h, student.gender, ageMonths);
          }
        }
      }

      // Write results into the existing formula cell definitions
      const cellL = worksheet.getCell(`L${rowNum}`);
      if (bmi !== null) {
        const formula = cellL.value && (cellL.value as any).formula ? (cellL.value as any).formula : null;
        cellL.value = formula ? { formula, result: bmi } : bmi;
      }

      const cellM = worksheet.getCell(`M${rowNum}`);
      if (nutStatus !== null) {
        const formula = cellM.value && (cellM.value as any).formula ? (cellM.value as any).formula : null;
        cellM.value = formula ? { formula, result: nutStatus } : nutStatus;
      }

      const cellN = worksheet.getCell(`N${rowNum}`);
      if (hfaStatus !== null) {
        const formula = cellN.value && (cellN.value as any).formula ? (cellN.value as any).formula : null;
        cellN.value = formula ? { formula, result: hfaStatus } : hfaStatus;
      }

      worksheet.getCell(`G${rowNum}`).value = genderSymbol;
    };

    // Write males starting from Row 10 (template boundary is up to Row 43)
    let maleRow = 10;
    males.forEach((student) => {
      if (maleRow <= 43) {
        writeStudentRow(student, maleRow, 'M');
        maleRow++;
      }
    });

    // Write separator row for the template's female index formula (which looks for "female" in cell C44)
    worksheet.getCell('C44').value = 'female';

    // Write females starting from Row 45 (template boundary is up to Row 74)
    let femaleRow = 45;
    females.forEach((student) => {
      if (femaleRow <= 74) {
        writeStudentRow(student, femaleRow, 'F');
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
  subjects: TeacherSubject[] = []
) {
  try {
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
    drawBox(10, 10, 5, "IX");          // Column J
    drawLabel(12, 5, "Division");      // Column L
    drawBox(13, 15, 5, "Zamboanga");   // Columns M to O
    drawLabel(17, 5, "District");      // Column Q
    drawBox(18, 21, 5, "Sta. Maria Central"); // Columns R to U

    // Draw row 7 inputs
    drawLabel(2, 7, "School Name");    // Column B
    drawBox(3, 9, 7, "Sta. Maria CS SPED Center"); // Columns C to I
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
      const dbSubjects = (subjects || []).filter((sub) => {
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

        if (lowerName.includes('music') || lowerName.includes('arts') || lowerName === 'pe' || lowerName.includes('physical education') || lowerName === 'health') {
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
      'tle': 'TLE',
      'epp': 'TLE',
      'epp/tle': 'TLE',
      'mapeh': 'MAPEH',
      'music': 'MUSIC',
      'arts': 'ARTS',
      'physical education': 'PE',
      'pe': 'PE',
      'health': 'HEALTH',
      'language': 'LANGUAGE',
      'reading and literacy': 'READING_AND_LITERACY',
      'makabansa': 'MAKABANSA'
    };

    // Helper functions for student grades/attendance retrieval
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

      if (!matchingSub) return null;

      const dbKey = matchingSub.code ?? matchingSub.name;
      const gradeData = studentGrades[dbKey];
      if (!gradeData) return null;

      if (term === '1st Term') return typeof gradeData.q1 !== 'undefined' && gradeData.q1 !== null ? parseFloat(gradeData.q1) : null;
      if (term === '2nd Term') return typeof gradeData.q2 !== 'undefined' && gradeData.q2 !== null ? parseFloat(gradeData.q2) : null;
      if (term === '3rd Term') return typeof gradeData.q3 !== 'undefined' && gradeData.q3 !== null ? parseFloat(gradeData.q3) : null;
      return null;
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
        return d.getMonth() === targetMonthIdx && a.studentId === studentId;
      });

      const sectionDates = new Set(
        atts
          .filter(a => {
            const d = new Date(a.date);
            if (isNaN(d.getTime())) return false;
            return d.getMonth() === targetMonthIdx;
          })
          .map(a => a.date.split('T')[0])
      );
      const schoolDays = sectionDates.size;

      const presentDays = studentRecs.filter(r => r.status === 'Present' || r.status === 'Late').length;
      const absentDays = studentRecs.filter(r => r.status === 'Absent').length;
      const tardyDays = studentRecs.filter(r => r.status === 'Late').length;

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
      const isComponent = ['music', 'arts', 'pe', 'health', 'physical education'].includes(subj.toLowerCase());
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
        const stats = getStudentMonthlyAttendanceStats(student.id, month, attendance);
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
          const t1 = subjectName === 'MAPEH' ? getMAPEHGrade(student, '1st Term', subjects) : getGradeVal(student, subjectName, '1st Term', subjects);
          const t2 = subjectName === 'MAPEH' ? getMAPEHGrade(student, '2nd Term', subjects) : getGradeVal(student, subjectName, '2nd Term', subjects);
          const t3 = subjectName === 'MAPEH' ? getMAPEHGrade(student, '3rd Term', subjects) : getGradeVal(student, subjectName, '3rd Term', subjects);

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
    worksheet.getCell('H5').value = data.schoolName || 'Sta. Maria CS SPED Center';
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
    const principalName = ((data as any).schoolHead || (data as any).principalName || (data as any).schoolHeadName || '').toUpperCase();

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
      console.warn('Failed to add seal to SF1:', e);
    }

    try {
      const logoResponse = await fetch('/deped_logo.png');
      const logoBuffer = await logoResponse.arrayBuffer();
      const logoImageId = workbook.addImage({
        buffer: logoBuffer,
        extension: 'png',
      });
      worksheet.addImage(logoImageId, {
        tl: { col: 22, row: 0 },
        ext: { width: 170, height: 70 }
      });
    } catch (e) {
      console.warn('Failed to add logo to SF1:', e);
    }

    const females = data.learners.filter(s => s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.lastName.localeCompare(b.lastName));
    const males = data.learners.filter(s => !s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.lastName.localeCompare(b.lastName));

    // Write Header Information
    worksheet.getCell('F4').value = '199006'; // School ID
    worksheet.getCell('J4').value = 'IX'; // Region
    worksheet.getCell('K4').value = 'Division'; // Division label
    worksheet.getCell('M4').value = 'Zamboanga'; // Division value
    worksheet.getCell('Q4').value = 'District'; // District label
    worksheet.getCell('S4').value = 'Sta. Maria Central'; // District value

    worksheet.getCell('C6').value = 'Name of School'; // Label Name of School
    worksheet.getCell('F6').value = 'Sta. Maria CS SPED Center'; // School Name value
    worksheet.getCell('O6').value = data.schoolYear; // School Year value
    worksheet.getCell('S6').value = data.gradeLevel; // Grade Level value
    worksheet.getCell('V6').value = data.section; // Section value

    // The default template has 15 blank slots for learners (Rows 11 to 25).
    // If we have more learners, we need to duplicate row 11 to push the footer down
    // and create enough styled slots for everyone.
    const requiredRows = males.length + 2 + females.length; // +2 for the space between males and females
    const availableSlots = 15;
    const rowsToAdd = requiredRows > availableSlots ? (requiredRows - availableSlots) : 0;

    // EXCELJS BUG FIX: duplicateRow does not shift merged cells below the insertion point properly,
    // causing footer layout to corrupt. We must extract, delete, and re-insert footer merges (rows >= 26) shifted.
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
      // duplicateRow(rowNum, count, insert)
      worksheet.duplicateRow(11, rowsToAdd, true);
    }

    // Re-apply footer merges shifted
    for (const fm of footerMerges) {
      worksheet.mergeCells(fm.top + rowsToAdd, fm.left, fm.bottom + rowsToAdd, fm.right);
    }

    let currentRow = 11;

    const writeLearners = (learners: typeof data.learners) => {
      learners.forEach((learner) => {
        // Standard DepEd SF1 mapping
        const lrnCell = worksheet.getCell(`B${currentRow}`);
        lrnCell.value = learner.lrn;
        lrnCell.font = {
          name: 'Arial Narrow',
          size: 18,
          bold: true
        };
        lrnCell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        };

        // Name uses merged cell C:F, so we only write to C
        const fullName = `${learner.lastName}, ${learner.firstName} ${learner.middleName || ''}`.trim();
        worksheet.getCell(`C${currentRow}`).value = fullName;

        worksheet.getCell(`G${currentRow}`).value = learner.gender === 'Male' ? 'M' : 'F';
        worksheet.getCell(`H${currentRow}`).value = learner.birthDate;
        worksheet.getCell(`I${currentRow}`).value = learner.age;
        worksheet.getCell(`J${currentRow}`).value = learner.birthCity;
        worksheet.getCell(`K${currentRow}`).value = learner.motherTongue;
        worksheet.getCell(`L${currentRow}`).value = learner.indigenousGroup;
        worksheet.getCell(`M${currentRow}`).value = learner.religion;
        worksheet.getCell(`N${currentRow}`).value = learner.addressStreet;
        worksheet.getCell(`O${currentRow}`).value = learner.addressBarangay;
        worksheet.getCell(`P${currentRow}`).value = learner.addressCity;
        worksheet.getCell(`Q${currentRow}`).value = learner.addressProvince;
        worksheet.getCell(`R${currentRow}`).value = learner.fatherName;
        worksheet.getCell(`T${currentRow}`).value = learner.motherName;
        worksheet.getCell(`V${currentRow}`).value = learner.guardianName;
        worksheet.getCell(`W${currentRow}`).value = learner.guardianRelationship;
        worksheet.getCell(`X${currentRow}`).value = learner.contactNumber;
        worksheet.getCell(`Y${currentRow}`).value = learner.remarks;
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
        name: 'Arial',
        size: 10,
        bold: true
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
    }

    const principalName = ((data as any).schoolHead || (data as any).principalName || (data as any).schoolHeadName || '').toUpperCase();
    if (principalName) {
      const cell = worksheet.getCell(`X${signatureRow}`);
      cell.value = principalName;
    }

    const principalCell = worksheet.getCell(`X${signatureRow}`);
    principalCell.font = {
      name: 'Arial',
      size: 10,
      bold: true
    };
    principalCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

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
    worksheet.getCell('I5').value = 'IX'; // Region
    worksheet.getCell('N5').value = 'Zamboanga'; // Division
    worksheet.getCell('Y5').value = 'Sta. Maria Central'; // District
    worksheet.getCell('C7').value = 'Sta. Maria CS SPED Center'; // School Name
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
    targetCell.value = (principalName || '').toUpperCase();
    targetCell.font = {
      name: 'Arial',
      size: 10,
      bold: true
    };
    targetCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF4_${data.reportMonth}_${data.schoolYear}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error generating Admin SF4:', error);
    throw error;
  }
}

export async function generateAdminSF8(data: { schoolYear: string, gradeLevel: string, section: string, learners: HealthData[] }) {
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
    const fullSectionName = data.gradeLevel && data.section && !data.section.includes(data.gradeLevel)
      ? `${data.gradeLevel} - ${data.section}`
      : data.section;
    worksheet.getCell('N6').value = fullSectionName.toUpperCase();
    worksheet.getCell('D6').value = new Date(); // Weighing date

    // Clear all pre-filled/leftover template rows (Rows 10 to 74, columns C to G)
    for (let r = 10; r <= 74; r++) {
      worksheet.getCell(`C${r}`).value = null;
      worksheet.getCell(`D${r}`).value = null;
      worksheet.getCell(`E${r}`).value = null;
      worksheet.getCell(`F${r}`).value = null;
      worksheet.getCell(`G${r}`).value = null;
    }

    const males = data.learners.filter(s => !s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.name.localeCompare(b.name));
    const females = data.learners.filter(s => s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.name.localeCompare(b.name));

    // Helper to calculate and inject formulas and results safely
    const writeLearnerRow = (learner: HealthData, rowNum: number, genderSymbol: 'M' | 'F') => {
      worksheet.getCell(`C${rowNum}`).value = learner.name.toUpperCase();
      if (learner.birthDate) {
        const [yr, mo, dy] = learner.birthDate.split('-').map(Number);
        worksheet.getCell(`D${rowNum}`).value = new Date(yr, mo - 1, dy);
      }
      if (learner.weight > 0) {
        worksheet.getCell(`E${rowNum}`).value = learner.weight;
      }
      if (learner.height > 0) {
        worksheet.getCell(`F${rowNum}`).value = learner.height;
      }
      worksheet.getCell(`G${rowNum}`).value = genderSymbol;

      // Write results into the existing formula cell definitions
      const cellL = worksheet.getCell(`L${rowNum}`);
      if (learner.bmi > 0) {
        const formula = cellL.value && (cellL.value as any).formula ? (cellL.value as any).formula : null;
        cellL.value = formula ? { formula, result: parseFloat(learner.bmi.toFixed(1)) } : parseFloat(learner.bmi.toFixed(1));
      }

      const cellM = worksheet.getCell(`M${rowNum}`);
      if (learner.nutritionalStatus) {
        const formula = cellM.value && (cellM.value as any).formula ? (cellM.value as any).formula : null;
        cellM.value = formula ? { formula, result: learner.nutritionalStatus } : learner.nutritionalStatus;
      }

      const cellN = worksheet.getCell(`N${rowNum}`);
      if (learner.heightForAge) {
        const formula = cellN.value && (cellN.value as any).formula ? (cellN.value as any).formula : null;
        cellN.value = formula ? { formula, result: learner.heightForAge } : learner.heightForAge;
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

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF8_${data.gradeLevel.replace(/\s+/g, '_')}_${data.section.replace(/\s+/g, '_')}_${data.schoolYear}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error generating Admin SF8:', error);
    throw error;
  }
}


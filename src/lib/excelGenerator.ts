import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Student } from './teacherData';
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
    // C3: Region
    // E3: Division
    // J3: District
    // C5: School ID
    // G5: School Year
    // J5: Curriculum
    // C7: School Name
    // J7: Grade Level
    // L7: Section
    worksheet.getCell('C3').value = 'Cordillera Administrative Region (CAR)';
    worksheet.getCell('E3').value = 'Baguio City';
    worksheet.getCell('J3').value = 'Baguio Central';
    worksheet.getCell('C5').value = '123456';
    worksheet.getCell('G5').value = academicYear;
    worksheet.getCell('J5').value = 'K to 12 Basic Education Program';
    worksheet.getCell('C7').value = 'Sta. Maria Central School SPED Center';
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

    const writeStudentRow = (student: Student, rowNumber: number, gender: 'Male' | 'Female') => {
      // Columns in SF5 template:
      // Col 1 (A): LRN
      // Col 2 (B): Learner's Name (merged B to E)
      // Col 6 (F): General Average
      // Col 7 (G): Action Taken
      // Col 8 (H): Incomplete subjects from previous school years completed (merged H to I)
      // Col 10 (J): Incomplete subjects as of end of current school year (merged J to K)
      
      const fullName = `${student.lastName}, ${student.firstName} ${(student as any).middleName || ''}`.trim();
      worksheet.getCell(`A${rowNumber}`).value = student.lrn || '';
      worksheet.getCell(`B${rowNumber}`).value = fullName;

      const finalRatings: number[] = [];
      const failedSubjects: string[] = [];

      sectionSubjects.forEach(sub => {
        const code = sub.code ?? sub.name;
        const gradeKey = gradeLevel; // e.g. "Grade 6"
        const gradeData = (student.grades as any)?.[gradeKey]?.[code];
        
        let subAverage = 0;
        let quartersCount = 0;
        
        if (typeof gradeData === 'object' && gradeData !== null) {
          ['q1', 'q2', 'q3', 'q4'].forEach(q => {
            const qGrade = parseFloat(gradeData[q]);
            if (!isNaN(qGrade)) {
              subAverage += qGrade;
              quartersCount++;
            }
          });
        } else {
          // Fallback to legacy flat grades
          const legacyGrade = parseFloat((student.grades as any)?.[code]);
          if (!isNaN(legacyGrade)) {
            subAverage = legacyGrade;
            quartersCount = 1;
          }
        }
        
        if (quartersCount > 0) {
          const finalSubRating = subAverage / quartersCount;
          finalRatings.push(finalSubRating);
          if (finalSubRating < 75) {
            failedSubjects.push(sub.name || code);
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

export async function generateSF9(students: Student[], sectionName: string, academicYear: string) {
  try {
    const response = await fetch('/templates/SF9.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // For SF9 (Report Card), usually one worksheet per student, or you print multiple.
    // We will just do a basic export of the first sheet for now as a starting point.
    const worksheet = workbook.worksheets[0];

    // SF9 typically has Name at the top instead of a list.
    // For demonstration, we'll put the first student's name on it.
    if (students.length > 0) {
      const student = students[0];
      const fullName = `${student.lastName}, ${student.firstName} ${(student as any).middleName || ''}`.trim();
      worksheet.getCell('C10').value = fullName; // Example cell
      worksheet.getCell('C11').value = student.lrn;
    }

    removeStrikethrough(worksheet);

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

    // 4. Fill headers (Grade, Section, Month, SY)
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

    const females = data.learners.filter(s => s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.lastName.localeCompare(b.lastName));
    const males = data.learners.filter(s => !s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.lastName.localeCompare(b.lastName));

    // Write Header Information
    worksheet.getCell('D4').value = '100011'; // Default School ID
    worksheet.getCell('H4').value = 'IX'; // Default Region
    worksheet.getCell('K4').value = 'Zamboanga'; // Default Division
    worksheet.getCell('Q4').value = 'Zamboanga City'; // Default District
    worksheet.getCell('C6').value = 'Sta. Maria Elementary School';
    worksheet.getCell('L6').value = data.schoolYear;
    worksheet.getCell('Q6').value = data.gradeLevel;
    worksheet.getCell('U6').value = data.section;

    // The default template has 15 blank slots for learners (Rows 11 to 25).
    // If we have more learners, we need to duplicate row 11 to push the footer down
    // and create enough styled slots for everyone.
    const requiredRows = males.length + 2 + females.length; // +2 for the space between males and females
    const availableSlots = 15;
    if (requiredRows > availableSlots) {
      const rowsToAdd = requiredRows - availableSlots;
      // duplicateRow(rowNum, count, insert)
      worksheet.duplicateRow(11, rowsToAdd, true);
    }

    let currentRow = 11;

    const writeLearners = (learners: typeof data.learners) => {
      learners.forEach((learner) => {
        // Standard DepEd SF1 mapping
        worksheet.getCell(`B${currentRow}`).value = learner.lrn;

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

    // Dynamic signature placement: Find the row containing "(Signature of Adviser over Printed Name)" and write the name on the cell above it
    let signatureRow = 30;
    for (let r = 15; r <= worksheet.rowCount; r++) {
      const val = worksheet.getCell(`U${r}`).value;
      if (val && typeof val === 'string' && val.includes('Signature of Adviser')) {
        signatureRow = r - 1;
        break;
      }
    }

    const adviserName = (data.advisorName || '').toUpperCase();
    if (adviserName) {
      worksheet.getCell(`U${signatureRow}`).value = adviserName;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF1_${data.gradeLevel}_${data.section}_${data.schoolYear}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error generating Admin SF1:', error);
    throw error;
  }
}

export async function generateAdminSF4(data: SF4Data) {
  try {
    const response = await fetch('/templates/SF4.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    let currentRow = 12; // Start after headers

    // EXCELJS BUG FIX: duplicateRow does not shift merged cells properly, 
    // causing text to repeat across columns. We must unmerge everything below the table.
    // The text will visually overflow into adjacent empty cells perfectly.
    const merges = Object.keys(worksheet._merges);
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
      }

      worksheet.getCell(`A${currentRow}`).value = sec.gradeLevel;
      worksheet.getCell(`B${currentRow}`).value = sec.section;
      worksheet.getCell(`C${currentRow}`).value = sec.advisorName;
      worksheet.getCell(`E${currentRow}`).value = sec.maleCount;
      worksheet.getCell(`F${currentRow}`).value = sec.femaleCount;
      worksheet.getCell(`G${currentRow}`).value = sec.totalCount;
      currentRow++;
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


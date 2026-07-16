import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Student } from './teacherData';
import type { SF1Data, SF4Data } from './services/reportDataService';
import type { HealthData } from './services/healthAnalyticsService';

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

export async function generateSF5(students: Student[], sectionName: string, academicYear: string) {
  try {
    // 1. Fetch the template file
    const response = await fetch('/templates/SF5.xlsx');
    const arrayBuffer = await response.arrayBuffer();

    // 2. Load the template into exceljs
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // 3. Get the first worksheet
    const worksheet = workbook.worksheets[0];

    // 4. Populate Header Info (adjust these cells based on actual DepEd SF5 template)
    // For SF5, typical header might be around Row 5 or 6, but we'll try basic cells.
    // We can refine this later if the user provides exact cell mappings.
    // Example (fictional cells for now):
    // worksheet.getCell('B4').value = sectionName;
    // worksheet.getCell('D4').value = academicYear;

    // 5. Populate Students (Male then Female usually for DepEd)
    const males = students.filter(s => s.gender === 'Male').sort((a, b) => a.lastName.localeCompare(b.lastName));
    const females = students.filter(s => s.gender === 'Female').sort((a, b) => a.lastName.localeCompare(b.lastName));

    let currentRow = 15; // Starting row for student list in many DepEd forms

    const writeStudents = (studentList: Student[]) => {
      studentList.forEach((student, index) => {
        // Name format: LAST NAME, FIRST NAME MIDDLE NAME
        const fullName = `${student.lastName}, ${student.firstName} ${(student as any).middleName || ''}`.trim();
        worksheet.getCell(`B${currentRow}`).value = index + 1; // Number
        worksheet.getCell(`C${currentRow}`).value = student.lrn; // LRN
        worksheet.getCell(`D${currentRow}`).value = fullName; // Name
        // In SF5, we also have averages and actions (Promoted, Retained), we can leave them blank or add logic later.
        currentRow++;
      });
    };

    // Write Males
    writeStudents(males);

    // Add space between Males and Females
    currentRow += 2;

    // Write Females
    writeStudents(females);

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
    const worksheet = workbook.worksheets[0];

    const males = students.filter(s => s.gender === 'Male').sort((a, b) => a.lastName.localeCompare(b.lastName));
    const females = students.filter(s => s.gender === 'Female').sort((a, b) => a.lastName.localeCompare(b.lastName));
    let currentRow = 15;

    const writeStudents = (studentList: Student[]) => {
      studentList.forEach((student, index) => {
        const fullName = `${student.lastName}, ${student.firstName} ${(student as any).middleName || ''}`.trim();
        worksheet.getCell(`B${currentRow}`).value = index + 1;
        worksheet.getCell(`C${currentRow}`).value = student.lrn;
        worksheet.getCell(`D${currentRow}`).value = fullName;
        currentRow++;
      });
    };

    writeStudents(males);
    currentRow += 2;
    writeStudents(females);

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
    // Section: Cell AS5 (or prepend to current value)
    worksheet.getCell('AS5').value = `Section: ${data.section}`;

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
      worksheet.getCell(`BA${rowNum}`).value = { formula: `SUM(H${rowNum}:AY${rowNum})` };
      worksheet.getCell(`BC${rowNum}`).value = { formula: `SUM(${totalSchoolDays}-BA${rowNum})` };

      // Write attendance records
      for (let d = 1; d <= 31; d++) {
        const status = student.attendance[d];
        const colLetter = dayToColMap[d];
        if (colLetter) {
          const cell = worksheet.getCell(`${colLetter}${rowNum}`);
          if (status === 'absent') {
            cell.value = 1; // 1 for absent so SUM formula accumulates correctly
          } else if (status === 'late') {
            cell.value = 'L'; // 'L' is ignored by SUM, visually indicating late
          } else {
            cell.value = null; // Blank indicates present
          }
        }
      }
    };

    const males = data.learners.filter((l: any) => !l.gender?.toLowerCase().startsWith('f'));
    const females = data.learners.filter((l: any) => l.gender?.toLowerCase().startsWith('f'));

    // Populate Males starting from Row 9 (max 21 rows)
    males.slice(0, 21).forEach((student: any, idx: number) => {
      writeStudent(student, idx + 1, 9 + idx);
    });

    // Populate Females starting from Row 31 (max 26 rows)
    females.slice(0, 26).forEach((student: any, idx: number) => {
      writeStudent(student, idx + 1, 31 + idx);
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
    const worksheet = workbook.getWorksheet('Nutritional Status') || workbook.worksheets[1];

    if (!worksheet) {
      throw new Error("Could not find the Nutritional Status worksheet in the SF8 template.");
    }

    worksheet.getCell('F7').value = data.gradeLevel;
    worksheet.getCell('H7').value = data.section;
    worksheet.getCell('O7').value = data.schoolYear;

    const females = data.learners.filter(s => s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.name.localeCompare(b.name));
    const males = data.learners.filter(s => !s.gender?.toLowerCase().startsWith('f')).sort((a, b) => a.name.localeCompare(b.name));

    let femaleStartRow = 65;

    const writeLearners = (learners: typeof data.learners, startRow: number) => {
      let currentRow = startRow;
      learners.forEach((learner, index) => {
        const fullName = learner.name;

        const cols = [
          { col: 'B', val: learner.lrn },
          { col: 'C', val: fullName },
          { col: 'G', val: learner.birthDate ? new Date(learner.birthDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '' },
          { col: 'H', val: learner.age },
          { col: 'I', val: learner.weight > 0 ? learner.weight : '' },
          { col: 'J', val: learner.height > 0 ? learner.height : '' },
          { col: 'K', val: learner.height > 0 ? (learner.height * learner.height).toFixed(2) : '' },
          { col: 'L', val: learner.bmi > 0 ? learner.bmi : '' },
          { col: 'M', val: learner.nutritionalStatus || '' },
          { col: 'N', val: learner.heightForAge || '' }
        ];

        cols.forEach(({ col, val }) => {
          worksheet.getCell(`${col}${currentRow}`).value = val;
        });

        currentRow++;
      });
    };

    writeLearners(males, 12);
    writeLearners(females, femaleStartRow);

    // Compute Summary Table
    const countStats = (learnersList: typeof data.learners) => {
      const stats = {
        nutritional: { severelyWasted: 0, wasted: 0, normal: 0, overweight: 0, obese: 0 },
        hfa: { severelyStunted: 0, stunted: 0, normal: 0, tall: 0 }
      };

      learnersList.forEach(l => {
        const ns = l.nutritionalStatus?.toLowerCase() || '';
        if (ns.includes('severely wasted')) stats.nutritional.severelyWasted++;
        else if (ns.includes('wasted')) stats.nutritional.wasted++;
        else if (ns.includes('normal')) stats.nutritional.normal++;
        else if (ns.includes('overweight')) stats.nutritional.overweight++;
        else if (ns.includes('obese')) stats.nutritional.obese++;

        const hfa = l.heightForAge?.toLowerCase() || '';
        if (hfa.includes('severely stunted')) stats.hfa.severelyStunted++;
        else if (hfa.includes('stunted')) stats.hfa.stunted++;
        else if (hfa.includes('normal')) stats.hfa.normal++;
        else if (hfa.includes('tall')) stats.hfa.tall++;
      });
      return stats;
    };

    const maleStats = countStats(males);
    const femaleStats = countStats(females);

    const writeSummaryRow = (row: number, stats: ReturnType<typeof countStats>) => {
      // Nutritional Status
      worksheet.getCell(`C${row}`).value = stats.nutritional.severelyWasted || '';
      worksheet.getCell(`E${row}`).value = stats.nutritional.wasted || '';
      worksheet.getCell(`F${row}`).value = stats.nutritional.normal || '';
      worksheet.getCell(`G${row}`).value = stats.nutritional.overweight || '';
      worksheet.getCell(`H${row}`).value = stats.nutritional.obese || '';
      worksheet.getCell(`I${row}`).value = (stats.nutritional.severelyWasted + stats.nutritional.wasted + stats.nutritional.normal + stats.nutritional.overweight + stats.nutritional.obese) || '';

      // Height for Age
      worksheet.getCell(`J${row}`).value = stats.hfa.severelyStunted || '';
      worksheet.getCell(`K${row}`).value = stats.hfa.stunted || '';
      worksheet.getCell(`L${row}`).value = stats.hfa.normal || '';
      worksheet.getCell(`M${row}`).value = stats.hfa.tall || '';
      worksheet.getCell(`N${row}`).value = (stats.hfa.severelyStunted + stats.hfa.stunted + stats.hfa.normal + stats.hfa.tall) || '';
    };

    writeSummaryRow(114, maleStats);
    writeSummaryRow(115, femaleStats);

    const totalStats = {
      nutritional: {
        severelyWasted: maleStats.nutritional.severelyWasted + femaleStats.nutritional.severelyWasted,
        wasted: maleStats.nutritional.wasted + femaleStats.nutritional.wasted,
        normal: maleStats.nutritional.normal + femaleStats.nutritional.normal,
        overweight: maleStats.nutritional.overweight + femaleStats.nutritional.overweight,
        obese: maleStats.nutritional.obese + femaleStats.nutritional.obese
      },
      hfa: {
        severelyStunted: maleStats.hfa.severelyStunted + femaleStats.hfa.severelyStunted,
        stunted: maleStats.hfa.stunted + femaleStats.hfa.stunted,
        normal: maleStats.hfa.normal + femaleStats.hfa.normal,
        tall: maleStats.hfa.tall + femaleStats.hfa.tall
      }
    };

    writeSummaryRow(116, totalStats);

    removeStrikethrough(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `SF8_${data.gradeLevel}_${data.section}_${data.schoolYear}.xlsx`);
    return true;
  } catch (error) {
    console.error('Error generating Admin SF8:', error);
    throw error;
  }
}


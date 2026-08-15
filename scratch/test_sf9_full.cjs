const ExcelJS = require('exceljs');
const fs = require('fs');

async function testFullSF9() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('SF9 - DELA CRUZ, JUAN');

  // Page setup
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 }
  };

  // Set column widths
  const colWidths = [
    { col: 1, width: 22 }, // A - Row Labels
    { col: 2, width: 6 },  // B
    { col: 3, width: 6 },  // C
    { col: 4, width: 6 },  // D
    { col: 5, width: 6 },  // E
    { col: 6, width: 6 },  // F
    { col: 7, width: 6 },  // G
    { col: 8, width: 6 },  // H
    { col: 9, width: 6 },  // I
    { col: 10, width: 6 }, // J
    { col: 11, width: 6 }, // K
    { col: 12, width: 6 }, // L
    { col: 13, width: 10 },// M - Total / Final / Remarks
    { col: 14, width: 4 }, // N - Divider
    { col: 15, width: 16 },// O - Core Values
    { col: 16, width: 6 }, // P
    { col: 17, width: 6 }, // Q
    { col: 18, width: 6 }, // R
    { col: 19, width: 6 }, // S
    { col: 20, width: 6 }, // T
    { col: 21, width: 6 }, // U
    { col: 22, width: 6 }, // V
    { col: 23, width: 6 }, // W
    { col: 24, width: 6 }, // X
    { col: 25, width: 6 }, // Y
    { col: 26, width: 6 }, // Z
    { col: 27, width: 10 } // AA
  ];

  colWidths.forEach(cw => {
    worksheet.getColumn(cw.col).width = cw.width;
  });

  const fontName = 'Segoe UI';

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
    right: { style: 'thin', color: { argb: 'FF94A3B8' } }
  };

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

  const styleBox = (rangeStr, value, opts = {}) => {
    const { font = { name: fontName, size: 9 }, fill = null, align = { horizontal: 'center', vertical: 'middle' }, border = thinBorder } = opts;
    try { worksheet.mergeCells(rangeStr); } catch (e) {}
    const [start] = rangeStr.split(':');
    const cell = worksheet.getCell(start);
    cell.value = value;
    cell.font = font;
    cell.alignment = align;
    if (fill) cell.fill = fill;

    // Apply border to all cells in range
    const [startRef, endRef] = rangeStr.includes(':') ? rangeStr.split(':') : [rangeStr, rangeStr];
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

  // ================= PAGE 1 =================
  // LEFT PANEL: Attendance Record
  styleBox('A1:M1', 'ATTENDANCE RECORD', { font: { name: fontName, size: 10, bold: true }, fill: headerFill });

  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Total'];
  styleBox('A2', 'Month', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  months.forEach((m, idx) => {
    const colLetter = String.fromCharCode(66 + idx); // B is 66
    styleBox(`${colLetter}2`, m, { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  });

  const attRows = [
    { label: 'No. of School Days', val: 20 },
    { label: 'No. of Days Present', val: 19 },
    { label: 'No. of Times Absent', val: 1 }
  ];

  attRows.forEach((rowInfo, rIdx) => {
    const rowNum = 3 + rIdx;
    const cellA = worksheet.getCell(`A${rowNum}`);
    cellA.value = rowInfo.label;
    cellA.font = { name: fontName, size: 8, bold: false };
    cellA.alignment = { horizontal: 'left', vertical: 'middle' };
    cellA.border = thinBorder;

    let tot = 0;
    for (let m = 0; m < 11; m++) {
      const colLetter = String.fromCharCode(66 + m);
      const c = worksheet.getCell(`${colLetter}${rowNum}`);
      c.value = rowInfo.val;
      c.font = { name: fontName, size: 8 };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = thinBorder;
      tot += rowInfo.val;
    }
    const totCell = worksheet.getCell(`M${rowNum}`);
    totCell.value = tot;
    totCell.font = { name: fontName, size: 8, bold: true };
    totCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totCell.border = thinBorder;
  });

  // Parent Signature
  styleBox('A7:M7', "PARENT / GUARDIAN'S SIGNATURE", { font: { name: fontName, size: 10, bold: true }, fill: headerFill });
  const terms = ['1st Term', '2nd Term', '3rd Term', '4th Term'];
  terms.forEach((t, i) => {
    const r = 9 + (i * 2);
    styleBox(`A${r}:C${r}`, t, { font: { name: fontName, size: 8.5, bold: true }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
    styleBox(`D${r}:M${r}`, '________________________________________________', { font: { name: fontName, size: 8.5 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
  });

  // Certificate of Transfer
  styleBox('A18:M18', 'CERTIFICATE OF TRANSFER', { font: { name: fontName, size: 10, bold: true }, fill: headerFill });
  styleBox('A20:M20', 'Admitted to Grade: Grade 4      Section: Faith', { font: { name: fontName, size: 9 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
  styleBox('A22:M22', 'Eligible for Admission to Grade: Grade 5', { font: { name: fontName, size: 9 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
  
  styleBox('B25:F25', 'TEACHER GED', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
  styleBox('B26:F26', 'Adviser', { font: { name: fontName, size: 8 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
  
  styleBox('H25:L25', 'MRS. LEPIDAPTERA VILLANUEVA', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
  styleBox('H26:L26', 'Principal I', { font: { name: fontName, size: 8 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });

  // Cancellation of Eligibility
  styleBox('A29:M29', 'CANCELLATION OF ELIGIBILITY TO TRANSFER', { font: { name: fontName, size: 10, bold: true }, fill: headerFill });
  styleBox('A31:M31', 'Admitted in: ____________________', { font: { name: fontName, size: 9 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
  styleBox('A33:M33', 'Date: ________________________', { font: { name: fontName, size: 9 }, align: { horizontal: 'left', vertical: 'middle' }, border: null });
  
  styleBox('G36:K36', 'MRS. LEPIDAPTERA VILLANUEVA', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
  styleBox('G37:K37', 'Principal I', { font: { name: fontName, size: 8 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });


  // RIGHT PANEL: Header & Learner Info
  styleBox('O1:AA1', 'Republic of the Philippines', { font: { name: fontName, size: 8.5 }, border: null });
  styleBox('O2:AA2', 'Department of Education', { font: { name: fontName, size: 11, bold: true, color: { argb: 'FF1E3A8A' } }, border: null });
  styleBox('O3:AA3', 'REGION IX', { font: { name: fontName, size: 9, bold: true }, border: null });
  styleBox('O4:AA4', 'DIVISION OF ZAMBOANGA CITY', { font: { name: fontName, size: 9, bold: true }, border: null });
  styleBox('O5:AA5', 'STA. MARIA DISTRICT', { font: { name: fontName, size: 9, bold: true }, border: null });
  styleBox('O6:AA6', 'STA. MARIA CS SPED CENTER', { font: { name: fontName, size: 11, bold: true }, border: null });
  styleBox('O7:AA7', 'School ID: 199006', { font: { name: fontName, size: 8, italic: true }, border: null });

  styleBox('O9:AA9', 'PROGRESS REPORT CARD (SF9)', { font: { name: fontName, size: 13, bold: true, color: { argb: 'FF1E3A8A' } }, border: null });
  styleBox('O10:AA10', 'School Year 2026-2027', { font: { name: fontName, size: 9, italic: true }, border: null });

  // Learner details
  styleBox('O12:P12', 'NAME:', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' } });
  styleBox('Q12:AA12', 'DELA CRUZ, JUAN A.', { font: { name: fontName, size: 10, bold: true }, align: { horizontal: 'left', vertical: 'middle' } });

  styleBox('O13', 'Age:', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' } });
  styleBox('P13:R13', '10', { font: { name: fontName, size: 9, bold: true } });
  styleBox('S13', 'Sex:', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' } });
  styleBox('T13:V13', 'Male', { font: { name: fontName, size: 9, bold: true } });
  styleBox('W13', 'LRN:', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' } });
  styleBox('X13:AA13', '109123456789', { font: { name: fontName, size: 9, bold: true } });

  styleBox('O14', 'Grade:', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' } });
  styleBox('P14:R14', 'Grade 4', { font: { name: fontName, size: 9, bold: true } });
  styleBox('S14', 'Section:', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'right', vertical: 'middle' } });
  styleBox('T14:AA14', 'Faith', { font: { name: fontName, size: 9, bold: true } });

  // Dear parent
  styleBox('O16:AA18', 'Dear Parent:\nThis report card shows the ability and the progress your child has made in the different learning areas as well as his/her progress in core values. The school welcomes you should you desire to know more about your child\'s progress.', { font: { name: fontName, size: 8.5, italic: true }, align: { horizontal: 'left', vertical: 'middle', wrapText: true } });

  styleBox('P21:T21', 'TEACHER GED', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
  styleBox('P22:T22', 'Adviser', { font: { name: fontName, size: 8 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });

  styleBox('V21:Z21', 'MRS. LEPIDAPTERA VILLANUEVA', { font: { name: fontName, size: 9, bold: true }, align: { horizontal: 'center', vertical: 'middle' }, border: null });
  styleBox('V22:Z22', 'Principal I', { font: { name: fontName, size: 8 }, align: { horizontal: 'center', vertical: 'middle' }, border: null });


  // ================= PAGE 2 =================
  const startP2 = 41;

  // LEFT PANEL: Report on Learning Progress
  styleBox(`A${startP2}:M${startP2}`, 'REPORT ON LEARNING PROGRESS AND ACHIEVEMENT', { font: { name: fontName, size: 10, bold: true }, fill: headerFill });

  styleBox(`A${startP2+2}:D${startP2+2}`, 'Learning Areas', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill, align: { horizontal: 'left', vertical: 'middle' } });
  styleBox(`E${startP2+2}`, '1', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  styleBox(`F${startP2+2}`, '2', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  styleBox(`G${startP2+2}`, '3', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  styleBox(`H${startP2+2}`, '4', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  styleBox(`I${startP2+2}:K${startP2+2}`, 'Final Rating', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  styleBox(`L${startP2+2}:M${startP2+2}`, 'Remarks', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });

  const sampleSubjects = [
    { name: 'English', q1: 88, q2: 90, q3: 89, q4: 91 },
    { name: 'Filipino', q1: 85, q2: 87, q3: 88, q4: 90 },
    { name: 'Mathematics', q1: 92, q2: 94, q3: 93, q4: 95 },
    { name: 'Science', q1: 89, q2: 91, q3: 90, q4: 92 },
    { name: 'AP/Makabansa', q1: 87, q2: 89, q3: 90, q4: 91 },
    { name: 'EPP/TLE', q1: 86, q2: 88, q3: 89, q4: 90 },
    { name: 'MAPEH', q1: 90, q2: 91, q3: 92, q4: 93 },
    { name: '  • Music', q1: 90, q2: 91, q3: 92, q4: 93, isComp: true },
    { name: '  • Arts', q1: 89, q2: 90, q3: 91, q4: 92, isComp: true },
    { name: '  • PE', q1: 91, q2: 92, q3: 93, q4: 94, isComp: true },
    { name: '  • Health', q1: 90, q2: 91, q3: 92, q4: 93, isComp: true },
    { name: 'GMRC', q1: 92, q2: 93, q3: 94, q4: 95 }
  ];

  let currentR = startP2 + 3;
  let sumFinal = 0;
  let countFinal = 0;

  sampleSubjects.forEach(sub => {
    const final = Math.round((sub.q1 + sub.q2 + sub.q3 + sub.q4) / 4);
    const remarks = final >= 75 ? 'PASSED' : 'FAILED';
    if (!sub.isComp) {
      sumFinal += final;
      countFinal++;
    }

    styleBox(`A${currentR}:D${currentR}`, sub.name, { font: { name: fontName, size: 8.5, bold: !sub.isComp, italic: sub.isComp }, align: { horizontal: 'left', vertical: 'middle' } });
    styleBox(`E${currentR}`, sub.q1, { font: { name: fontName, size: 8.5 } });
    styleBox(`F${currentR}`, sub.q2, { font: { name: fontName, size: 8.5 } });
    styleBox(`G${currentR}`, sub.q3, { font: { name: fontName, size: 8.5 } });
    styleBox(`H${currentR}`, sub.q4, { font: { name: fontName, size: 8.5 } });
    styleBox(`I${currentR}:K${currentR}`, final, { font: { name: fontName, size: 8.5, bold: !sub.isComp } });
    styleBox(`L${currentR}:M${currentR}`, remarks, { font: { name: fontName, size: 8, bold: true } });
    currentR++;
  });

  const genAvg = Math.round(sumFinal / countFinal);
  const genRemarks = genAvg >= 75 ? 'PASSED' : 'FAILED';

  styleBox(`A${currentR}:D${currentR}`, 'General Average', { font: { name: fontName, size: 9, bold: true }, fill: headerFill, align: { horizontal: 'left', vertical: 'middle' } });
  styleBox(`E${currentR}:H${currentR}`, '', { fill: headerFill });
  styleBox(`I${currentR}:K${currentR}`, genAvg, { font: { name: fontName, size: 10, bold: true }, fill: headerFill });
  styleBox(`L${currentR}:M${currentR}`, genRemarks, { font: { name: fontName, size: 8.5, bold: true }, fill: headerFill });
  currentR += 2;

  // Descriptors
  styleBox(`A${currentR}:M${currentR}`, 'DESCRIPTORS AND GRADING SCALE', { font: { name: fontName, size: 9, bold: true }, fill: subHeaderFill });
  currentR++;
  styleBox(`A${currentR}:E${currentR}`, 'Descriptors', { font: { name: fontName, size: 8, bold: true }, fill: subHeaderFill, align: { horizontal: 'left', vertical: 'middle' } });
  styleBox(`F${currentR}:I${currentR}`, 'Grading Scale', { font: { name: fontName, size: 8, bold: true }, fill: subHeaderFill });
  styleBox(`J${currentR}:M${currentR}`, 'Remarks', { font: { name: fontName, size: 8, bold: true }, fill: subHeaderFill });
  currentR++;

  const descRows = [
    { d: 'Advancing', s: '90 - 100', r: 'Passed' },
    { d: 'Benchmarking', s: '80 - 89', r: 'Passed' },
    { d: 'Connecting', s: '75 - 79', r: 'Passed' },
    { d: 'Developing', s: '65 - 74', r: 'Failed' },
    { d: 'Emerging', s: '0 - 64', r: 'Failed' }
  ];

  descRows.forEach(dr => {
    styleBox(`A${currentR}:E${currentR}`, dr.d, { font: { name: fontName, size: 8 }, align: { horizontal: 'left', vertical: 'middle' } });
    styleBox(`F${currentR}:I${currentR}`, dr.s, { font: { name: fontName, size: 8 } });
    styleBox(`J${currentR}:M${currentR}`, dr.r, { font: { name: fontName, size: 8, bold: true } });
    currentR++;
  });


  // RIGHT PANEL: Observed Values
  styleBox(`O${startP2}:AA${startP2}`, 'REPORT ON LEARNER\'S OBSERVED VALUES', { font: { name: fontName, size: 10, bold: true }, fill: headerFill });

  styleBox(`O${startP2+2}:Q${startP2+2}`, 'Core Values', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  styleBox(`R${startP2+2}:W${startP2+2}`, 'Behavior Statements', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill, align: { horizontal: 'left', vertical: 'middle' } });
  styleBox(`X${startP2+2}`, '1', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  styleBox(`Y${startP2+2}`, '2', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  styleBox(`Z${startP2+2}`, '3', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  styleBox(`AA${startP2+2}`, '4', { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });

  const coreValuesData = [
    {
      core: '1. Maka-Diyos',
      statements: [
        "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others",
        "Show adherence to ethical principles by upholding truth"
      ]
    },
    {
      core: '2. Makatao',
      statements: [
        "Is sensitive to individual, social, cultural, differences",
        "Demonstrate contributions toward solidarity."
      ]
    },
    {
      core: '3. Maka-Kalikasan',
      statements: [
        "Cares for the environment and utilizes resources wisely, judiciously, and economically"
      ]
    },
    {
      core: '4. Makabansa',
      statements: [
        "Demonstrates pride in being a Filipino; exercises the rights and responsibilities of a Filipino citizen",
        "Demonstrates appropriate behavior in carrying out activities in the school, community, and country"
      ]
    }
  ];

  let ovR = startP2 + 3;
  coreValuesData.forEach(cv => {
    const startRowCV = ovR;
    cv.statements.forEach(stmt => {
      styleBox(`R${ovR}:W${ovR}`, stmt, { font: { name: fontName, size: 8 }, align: { horizontal: 'left', vertical: 'middle', wrapText: true } });
      styleBox(`X${ovR}`, 'AO', { font: { name: fontName, size: 8, bold: true } });
      styleBox(`Y${ovR}`, 'AO', { font: { name: fontName, size: 8, bold: true } });
      styleBox(`Z${ovR}`, 'AO', { font: { name: fontName, size: 8, bold: true } });
      styleBox(`AA${ovR}`, 'AO', { font: { name: fontName, size: 8, bold: true } });
      ovR++;
    });
    const endRowCV = ovR - 1;
    styleBox(`O${startRowCV}:Q${endRowCV}`, cv.core, { font: { name: fontName, size: 8.5, bold: true }, fill: subHeaderFill });
  });

  ovR++;
  styleBox(`O${ovR}:AA${ovR}`, 'OBSERVED VALUES MARKING LEGEND', { font: { name: fontName, size: 9, bold: true }, fill: subHeaderFill });
  ovR++;
  styleBox(`O${ovR}:R${ovR}`, 'Marking', { font: { name: fontName, size: 8, bold: true }, fill: subHeaderFill });
  styleBox(`S${ovR}:AA${ovR}`, 'Non-numerical Rating', { font: { name: fontName, size: 8, bold: true }, fill: subHeaderFill, align: { horizontal: 'left', vertical: 'middle' } });
  ovR++;

  const legendRows = [
    { m: 'AO', r: 'Always Observed' },
    { m: 'SO', r: 'Sometimes Observed' },
    { m: 'RO', r: 'Rarely Observed' },
    { m: 'NO', r: 'Not Observed' }
  ];

  legendRows.forEach(lr => {
    styleBox(`O${ovR}:R${ovR}`, lr.m, { font: { name: fontName, size: 8, bold: true } });
    styleBox(`S${ovR}:AA${ovR}`, lr.r, { font: { name: fontName, size: 8 }, align: { horizontal: 'left', vertical: 'middle' } });
    ovR++;
  });

  await workbook.xlsx.writeFile('scratch/test_sf9_full_out.xlsx');
  console.log('Saved test_sf9_full_out.xlsx successfully!');
}

testFullSF9();

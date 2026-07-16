import ExcelJS from 'exceljs';

async function checkRow5() {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('public/templates/SF2.xlsx');
    const ws = workbook.worksheets[0];
    
    console.log('--- SF2 Row 5 Cell Values ---');
    const r5 = ws.getRow(5);
    for (let c = 40; c <= 60; c++) {
      const cell = r5.getCell(c);
      console.log(`Col ${c} (${ws.getColumn(c).letter}): value=${JSON.stringify(cell.value)} master=${cell.isMerged ? cell.master.address : 'none'}`);
    }
  } catch (err) {
    console.error(err);
  }
}

checkRow5();

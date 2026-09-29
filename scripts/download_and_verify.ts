import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as XLSX from 'xlsx';

const files = [
  { id: '1tLAWldS4GOt5IaD2UwA8mqC-LkySyv4x', name: 'Project QC Thai Osuka (EN).xlsx', group: 'EN' },
  { id: '1iUo375l-hG2Qi9mhzVEIKWiGVHo-75YV', name: 'Project QC Thai Osuka (IV).xlsx', group: 'IV' },
  { id: '1ZPMd51VAJHilGaHqHMVzaInm7t7zm2A5', name: 'Project QC Thai Osuka (RM-1).xlsx', group: 'RM-1' },
  { id: '1Hb00lG3DoXv-fvqwAnYh67Hdude9k8LZ', name: 'Project QC Thai Osuka (RM-2).xlsx', group: 'RM-2' },
  { id: '1kD-ZtGTfl8oOCYehAaCi-ZC5AxL0SSuJ', name: 'Project QC Thai Osuka (RM-3).xlsx', group: 'RM-3' },
];

const downloadDir = path.join(process.cwd(), 'raw_files');
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

async function downloadFile(id: string, dest: string): Promise<boolean> {
  const url = `https://drive.usercontent.google.com/download?id=${id}&export=download`;
  console.log(`Downloading ${url} to ${dest}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to download ${id}: HTTP ${res.status}`);
      return false;
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(dest, buffer);
    console.log(`Saved ${dest} (${buffer.length} bytes)`);
    return true;
  } catch (err) {
    console.error(`Error downloading ${id}:`, err);
    return false;
  }
}

async function main() {
  const results: any[] = [];
  let totalAllRows = 0;

  for (const f of files) {
    const dest = path.join(downloadDir, f.name);
    let downloaded = true;
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 1000) {
      downloaded = await downloadFile(f.id, dest);
    }
    if (!downloaded || !fs.existsSync(dest)) {
      results.push({ name: f.name, status: 'FAILED' });
      continue;
    }

    const fileBuffer = fs.readFileSync(dest);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    console.log(`\nWorkbook: ${f.name} (Sheets: ${workbook.SheetNames.join(', ')})`);
    const sheetDetails: any[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      console.log(`  Sheet: ${sheetName}, range: ${sheet['!ref']}`);

      // Inspect header
      // Check row 1 and row 2
      const r1 = [];
      const r2 = [];
      for (let c = 0; c <= 12; c++) {
        const cell1 = sheet[XLSX.utils.encode_cell({ r: 0, c })];
        const cell2 = sheet[XLSX.utils.encode_cell({ r: 1, c })];
        r1.push(cell1 ? cell1.v : '');
        r2.push(cell2 ? cell2.v : '');
      }

      // Determine header row:
      // EN sheet EN has header on row 2 (0-indexed r=1)
      let headerRowIndex = 0;
      if (f.group === 'EN' && sheetName === 'EN') {
        headerRowIndex = 1; // row 2
      } else {
        headerRowIndex = 0; // row 1
      }

      // Count data rows: rows after header that have at least one value in col A-J (0..9)
      let dataRowCount = 0;
      for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
        let hasValue = false;
        for (let c = 0; c <= 9; c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c })];
          if (cell !== undefined && cell.v !== null && cell.v !== undefined && String(cell.v).trim() !== '') {
            hasValue = true;
            break;
          }
        }
        if (hasValue) {
          dataRowCount++;
        }
      }

      console.log(`    Header row (1-based): ${headerRowIndex + 1}, Data rows count: ${dataRowCount}`);
      totalAllRows += dataRowCount;
      sheetDetails.push({ sheetName, headerRow: headerRowIndex + 1, dataRowCount });
    }

    results.push({ name: f.name, hash, size: fileBuffer.length, sheets: sheetDetails });
  }

  console.log(`\n========================================`);
  console.log(`TOTAL DATA ROWS ACROSS ALL 10 SHEETS: ${totalAllRows}`);
  console.log(`========================================`);
}

main().catch(console.error);

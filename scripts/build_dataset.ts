import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as XLSX from 'xlsx';

export interface RawRow {
  workType: string;
  product: string;
  testItem: string;
  replicate: any;
  itemNo: string;
  item: string;
  type: any;
  qtyPerRep: any;
  unit: string;
  reagentNo: string;
  colK: string;
}

export interface DataIssue {
  code: string;
  field: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface ResourceRecord {
  rowId: string;
  datasetVersion: string;
  sourceFile: string;
  sourceSheet: string;
  sourceRow: number;
  sourceGroup: 'EN' | 'IV' | 'RM-1' | 'RM-2' | 'RM-3';
  isStandardSheet: boolean;
  rawFields: RawRow;
  normalizedSearchFields: {
    workType: string;
    product: string;
    testItem: string;
    itemNo: string;
    item: string;
  };
  parsedReplicate: number | null;
  parsedQuantity: number | null;
  unitRaw: string;
  typeRaw: any;
  typeLabel: string;
  scopes: string[];
  dataIssues: DataIssue[];
  defaultCalculable: boolean; // independent of sampleCount
  blockReasons: string[];
  hasControlNote: boolean;
}

export interface DatasetManifest {
  datasetVersion: string;
  importedAt: string;
  sourceOrigin: string;
  rawRecordCount: number;
  ruleSetVersion: string;
  activeStatus: boolean;
  sourceFiles: {
    fileName: string;
    checksum: string;
    sizeBytes: number;
    sheets: {
      sheetName: string;
      headerRow: number;
      rowCount: number;
    }[];
  }[];
}

const TYPE_MAP: Record<string, string> = {
  '1': '1: Reagent ที่ซื้อ',
  '2': '2: Reagent ที่ต้องเตรียม',
  '3': '3: สิ้นเปลือง',
  '4': '4: อุปกรณ์เครื่องแก้ว',
  '5': '5: Machine',
};

const ALLOWED_UNITS = new Set(['ml.', 'g.', 'pcs', 'pcs.', 'min', 'min.', 'drop']);

export function parseNumberStrict(val: any): { num: number | null; isNumericZero: boolean; rawText: string } {
  if (val === null || val === undefined) {
    return { num: null, isNumericZero: false, rawText: '' };
  }
  const text = String(val).trim();
  if (text === '' || text === '-' || text.toLowerCase() === 'none' || text.toLowerCase() === 'none in wi') {
    return { num: null, isNumericZero: false, rawText: text };
  }
  // Check if string contains ranges like "3 to 5" or any letters
  if (!/^[-+]?(\d+(\.\d+)?|\.\d+)$/.test(text)) {
    return { num: null, isNumericZero: false, rawText: text };
  }
  const n = Number(text);
  if (!Number.isFinite(n)) {
    return { num: null, isNumericZero: false, rawText: text };
  }
  return { num: n, isNumericZero: n === 0, rawText: text };
}

export function classifyScopes(rec: { sourceGroup: string; workType: string }): string[] {
  const scopes = ['All'];
  const wt = (rec.workType || '').trim().toLowerCase();
  const isRoutine = wt === 'routine' || wt === 'routine & stability';
  const isStability = wt === 'stability' || wt === 'routine & stability';
  const isQCLine = wt === 'qc line';

  if (rec.sourceGroup === 'IV') {
    if (isRoutine) scopes.push('IV Routine');
    if (isStability) scopes.push('IV Stability');
  }
  if (rec.sourceGroup === 'EN') {
    if (isRoutine) scopes.push('EN Routine');
    if (isStability) scopes.push('EN Stability');
  }
  if (rec.sourceGroup.startsWith('RM')) {
    scopes.push('RM');
  }
  if (isQCLine) {
    scopes.push('QC line');
  }
  return scopes;
}

export function validateAndProcessRow(
  raw: RawRow,
  rowId: string,
  datasetVersion: string,
  sourceFile: string,
  sourceSheet: string,
  sourceRow: number,
  sourceGroup: 'EN' | 'IV' | 'RM-1' | 'RM-2' | 'RM-3'
): ResourceRecord {
  const dataIssues: DataIssue[] = [];
  const blockReasons: string[] = [];

  const workTypeRaw = String(raw.workType || '').trim();
  const productRaw = String(raw.product || '').trim();
  const testItemRaw = String(raw.testItem || '').trim();
  const itemNoRaw = String(raw.itemNo || '').trim();
  const itemRaw = String(raw.item || '').trim();
  const unitRaw = String(raw.unit || '').trim();
  const colKRaw = String(raw.colK || '').trim();
  const typeStr = String(raw.type || '').trim();

  // Normalize search fields (NFC, lowercase, trimmed)
  const normalizedSearchFields = {
    workType: workTypeRaw.normalize('NFC').toLowerCase(),
    product: productRaw.normalize('NFC').toLowerCase(),
    testItem: testItemRaw.normalize('NFC').toLowerCase(),
    itemNo: itemNoRaw.normalize('NFC').toLowerCase(),
    item: itemRaw.normalize('NFC').toLowerCase(),
  };

  // Replicate parsing
  const repParse = parseNumberStrict(raw.replicate);
  let parsedReplicate: number | null = null;
  if (repParse.num !== null && Number.isInteger(repParse.num) && repParse.num > 0) {
    parsedReplicate = repParse.num;
  } else {
    blockReasons.push(`Replicate (${repParse.rawText || 'ว่าง'}) ไม่ใช่จำนวนเต็มบวก`);
    dataIssues.push({
      code: 'INVALID_REPLICATE',
      field: 'Replicate per 1 sample',
      message: `Replicate (${repParse.rawText || 'ว่าง'}) ไม่ใช่จำนวนเต็มบวก`,
      severity: 'error',
    });
  }

  // Quantity per replicate parsing
  const qtyParse = parseNumberStrict(raw.qtyPerRep);
  let parsedQuantity: number | null = null;
  if (qtyParse.num !== null && qtyParse.num >= 0) {
    parsedQuantity = qtyParse.num;
  } else {
    blockReasons.push(`ปริมาณต่อ rep (${qtyParse.rawText || 'ว่าง'}) ไม่ใช่ตัวเลขที่คำนวณได้`);
    dataIssues.push({
      code: 'INVALID_QTY_PER_REP',
      field: 'Quility per 1 rep',
      message: `ปริมาณต่อ rep (${qtyParse.rawText || 'ว่าง'}) ไม่ใช่ตัวเลขที่คำนวณได้`,
      severity: 'error',
    });
  }

  // Unit validation
  const unitLower = unitRaw.toLowerCase();
  if (!unitRaw) {
    blockReasons.push('ไม่ระบุหน่วย (Unit ว่าง)');
    dataIssues.push({
      code: 'MISSING_UNIT',
      field: 'Unit',
      message: 'ไม่มีการระบุหน่วย',
      severity: 'error',
    });
  } else if (unitLower === 'mi.') {
    blockReasons.push("หน่วย 'mi.' ต้องยืนยันความหมาย (ml. หรือ min)");
    dataIssues.push({
      code: 'AMBIGUOUS_UNIT_MI',
      field: 'Unit',
      message: "หน่วย 'mi.' ต้องตรวจสอบ ไม่แก้เป็น ml. หรือ min เอง",
      severity: 'warning',
    });
  } else if (!ALLOWED_UNITS.has(unitLower)) {
    blockReasons.push(`หน่วย '${unitRaw}' ต้องตรวจสอบ`);
    dataIssues.push({
      code: 'UNEXPECTED_UNIT',
      field: 'Unit',
      message: `หน่วย '${unitRaw}' ไม่อยู่ในรายการที่รองรับคำนวณ`,
      severity: 'warning',
    });
  }

  // Type validation
  let typeLabel = TYPE_MAP[typeStr] || `Type: ${typeStr || 'ไม่ระบุ'}`;
  if (!typeStr || !TYPE_MAP[typeStr]) {
    blockReasons.push(`Type (${typeStr || 'ว่าง'}) ไม่อยู่ใน mapping`);
    dataIssues.push({
      code: 'UNKNOWN_TYPE',
      field: 'Type',
      message: `Type (${typeStr || 'ว่าง'}) ไม่ทราบฐานการคำนวณ`,
      severity: 'warning',
    });
  }

  // Machine / Type 5 check
  if (typeStr === '5') {
    blockReasons.push('ต้องยืนยันฐานเวลา: ต่อ sample หรือต่อ replicate');
    dataIssues.push({
      code: 'MACHINE_TIME_BASE_AMBIGUOUS',
      field: 'Type',
      message: 'Type 5 (Machine): คอลัมน์ H ระบุต่อ rep แต่คำอธิบายระบุต่อ sample ต้องยืนยันฐานเวลา',
      severity: 'warning',
    });
  }

  // Column K "Control" check
  const hasControlNote = colKRaw.toLowerCase().includes('control');
  if (hasControlNote) {
    blockReasons.push('ต้องยืนยันฐานการใช้ Control (คอลัมน์ K)');
    dataIssues.push({
      code: 'CONTROL_AMBIGUOUS',
      field: 'คอลัมน์ K',
      message: `พบข้อความ '${colKRaw}' ในคอลัมน์ K: ต้องยืนยันว่าใช้ต่อ sample หรือต่อ batch`,
      severity: 'warning',
    });
  }

  // Work type validation: check for weird values like '6'
  const wtLower = workTypeRaw.toLowerCase();
  const knownWts = ['routine', 'stability', 'routine & stability', 'rm', 'qc line'];
  if (workTypeRaw && !knownWts.includes(wtLower)) {
    dataIssues.push({
      code: 'UNEXPECTED_WORK_TYPE',
      field: 'Work type',
      message: `Work type '${workTypeRaw}' ผิดรูปแบบ ต้องตรวจสอบ`,
      severity: 'warning',
    });
  }

  // Product / Test item completeness
  if (!productRaw) {
    dataIssues.push({
      code: 'MISSING_PRODUCT',
      field: 'Product',
      message: 'ไม่มีชื่อ Product ในแถวนี้',
      severity: 'warning',
    });
  }
  if (!testItemRaw) {
    dataIssues.push({
      code: 'MISSING_TEST_ITEM',
      field: 'Test item',
      message: 'ไม่มีชื่อ Test item ในแถวนี้',
      severity: 'warning',
    });
  }

  const scopes = classifyScopes({ sourceGroup, workType: workTypeRaw });
  const isStandardSheet = sourceSheet.toLowerCase().includes('standard');

  return {
    rowId,
    datasetVersion,
    sourceFile,
    sourceSheet,
    sourceRow,
    sourceGroup,
    isStandardSheet,
    rawFields: raw,
    normalizedSearchFields,
    parsedReplicate,
    parsedQuantity,
    unitRaw,
    typeRaw: raw.type,
    typeLabel,
    scopes,
    dataIssues,
    defaultCalculable: blockReasons.length === 0,
    blockReasons,
    hasControlNote,
  };
}

export function buildDatasetFromFiles(): { manifest: DatasetManifest; records: ResourceRecord[] } {
  const files = [
    { file: 'Project QC Thai Osuka (EN).xlsx', group: 'EN' as const, headerRow: { EN: 2, Standard: 2 } },
    { file: 'Project QC Thai Osuka (IV).xlsx', group: 'IV' as const, headerRow: { Product: 1, Standard: 1 } },
    { file: 'Project QC Thai Osuka (RM-1).xlsx', group: 'RM-1' as const, headerRow: { Product: 1, Standard: 1 } },
    { file: 'Project QC Thai Osuka (RM-2).xlsx', group: 'RM-2' as const, headerRow: { Product: 1, Standard: 1 } },
    { file: 'Project QC Thai Osuka (RM-3).xlsx', group: 'RM-3' as const, headerRow: { Product: 1, Standard: 1 } },
  ];

  const datasetVersion = 'v2026.09.29-drive';
  const records: ResourceRecord[] = [];
  const fileManifests: any[] = [];
  let rowSeq = 1;

  for (const f of files) {
    const filePath = path.join(process.cwd(), 'raw_files', f.file);
    const buffer = fs.readFileSync(filePath);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetSummaries: any[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      const headerRow = (f.headerRow as any)[sheetName] || 1;
      const headerR = headerRow - 1;
      let sheetRowCount = 0;

      for (let r = headerR + 1; r <= range.e.r; r++) {
        let hasValue = false;
        const rowVals: any[] = [];
        for (let c = 0; c <= 10; c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c })];
          const val = cell !== undefined && cell.v !== null && cell.v !== undefined ? cell.v : '';
          rowVals.push(val);
          if (c <= 9 && String(val).trim() !== '') hasValue = true;
        }
        if (!hasValue) continue;

        sheetRowCount++;
        const rawRow: RawRow = {
          workType: String(rowVals[0] !== undefined ? rowVals[0] : ''),
          product: String(rowVals[1] !== undefined ? rowVals[1] : ''),
          testItem: String(rowVals[2] !== undefined ? rowVals[2] : ''),
          replicate: rowVals[3],
          itemNo: String(rowVals[4] !== undefined ? rowVals[4] : ''),
          item: String(rowVals[5] !== undefined ? rowVals[5] : ''),
          type: rowVals[6],
          qtyPerRep: rowVals[7],
          unit: String(rowVals[8] !== undefined ? rowVals[8] : ''),
          reagentNo: String(rowVals[9] !== undefined ? rowVals[9] : ''),
          colK: String(rowVals[10] !== undefined ? rowVals[10] : ''),
        };

        const rec = validateAndProcessRow(
          rawRow,
          `rec-${rowSeq++}`,
          datasetVersion,
          f.file,
          sheetName,
          r + 1,
          f.group
        );
        records.push(rec);
      }

      sheetSummaries.push({
        sheetName,
        headerRow,
        rowCount: sheetRowCount,
      });
    }

    fileManifests.push({
      fileName: f.file,
      checksum,
      sizeBytes: buffer.length,
      sheets: sheetSummaries,
    });
  }

  const manifest: DatasetManifest = {
    datasetVersion,
    importedAt: '29 กันยายน 2026, 11:46:00 UTC+7',
    sourceOrigin: 'Google Drive (Folder: 1MCuJo7PkeAA1-8s5j-idDuZIVDu2uU6P)',
    rawRecordCount: records.length,
    ruleSetVersion: '1.0.0-strict',
    activeStatus: true,
    sourceFiles: fileManifests,
  };

  return { manifest, records };
}

// Generate data file
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('Building dataset...');
const { manifest, records } = buildDatasetFromFiles();
console.log(`Parsed ${records.length} records.`);
fs.writeFileSync(path.join(dataDir, 'dataset_manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(dataDir, 'dataset_records.json'), JSON.stringify(records));
console.log(`Saved to data/dataset_manifest.json and data/dataset_records.json`);

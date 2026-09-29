import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import {
  ResourceRecord,
  DatasetManifest,
  SearchRequest,
  SearchResponse,
  WorkTypeScope,
  ConfirmedRule,
} from './src/types/qc';
import { executeSearch, getAutocompleteSuggestions } from './src/utils/searchEngine';
import { validateAndProcessRow, RawRow } from './scripts/build_dataset';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// In-Memory Data Store
let activeManifest: DatasetManifest | null = null;
let activeRecords: ResourceRecord[] = [];
const versionHistory: { manifest: DatasetManifest; records: ResourceRecord[] }[] = [];

// Confirmed Rules store (schema ready, initial empty)
const confirmedRules: ConfirmedRule[] = [];

function loadInitialData() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const manifestPath = path.join(dataDir, 'dataset_manifest.json');
    const recordsPath = path.join(dataDir, 'dataset_records.json');

    if (fs.existsSync(manifestPath) && fs.existsSync(recordsPath)) {
      activeManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      activeRecords = JSON.parse(fs.readFileSync(recordsPath, 'utf-8'));
      console.log(`[Data] Loaded active dataset ${activeManifest?.datasetVersion}: ${activeRecords.length} records.`);
      if (activeManifest) {
        versionHistory.push({ manifest: activeManifest, records: activeRecords });
      }
    } else {
      console.warn('[Data] Dataset files not found in /data. Waiting for import.');
    }
  } catch (err) {
    console.error('[Data] Error loading initial dataset:', err);
  }
}

loadInitialData();

// API Endpoints
app.get('/api/manifest', (req: Request, res: Response) => {
  if (!activeManifest) {
    return res.status(404).json({ error: 'No active dataset available' });
  }
  res.json({
    manifest: activeManifest,
    versionHistory: versionHistory.map((v) => ({
      version: v.manifest.datasetVersion,
      importedAt: v.manifest.importedAt,
      recordCount: v.manifest.rawRecordCount,
      sourceOrigin: v.manifest.sourceOrigin,
      isActive: v.manifest.datasetVersion === activeManifest?.datasetVersion,
    })),
  });
});

app.post('/api/search', (req: Request, res: Response) => {
  if (!activeManifest || activeRecords.length === 0) {
    return res.status(503).json({ error: 'ชุดข้อมูล QC ยังไม่พร้อมใช้งาน' });
  }

  const {
    keyword = '',
    searchField = 'all',
    scopes = ['All'],
    sampleCount = 1,
    page = 1,
    pageSize = 25,
    viewMode = 'table',
    statusFilter = 'all',
  } = req.body;

  // Strict validation on sampleCount
  const parsedSampleCount = Number(sampleCount);
  if (!Number.isInteger(parsedSampleCount) || parsedSampleCount <= 0 || !Number.isFinite(parsedSampleCount)) {
    return res.status(400).json({
      error: 'จำนวนตัวอย่างต้องเป็นจำนวนเต็มบวก (1, 2, 3, ...) เท่านั้น ไม่ยอมรับ 0, ค่าลบ, ทศนิยม หรือค่าว่าง',
    });
  }

  const searchReq: SearchRequest = {
    keyword: String(keyword),
    searchField: searchField as any,
    scopes: Array.isArray(scopes) && scopes.length > 0 ? (scopes as WorkTypeScope[]) : ['All'],
    sampleCount: parsedSampleCount,
    page: Math.max(1, Number(page) || 1),
    pageSize: Math.max(1, Number(pageSize) || 25),
    viewMode: viewMode === 'grouped' ? 'grouped' : 'table',
    statusFilter: statusFilter as any,
  };

  const result: SearchResponse = executeSearch(
    activeRecords,
    searchReq,
    activeManifest.datasetVersion,
    activeManifest.ruleSetVersion
  );

  res.json(result);
});

app.get('/api/autocomplete', (req: Request, res: Response) => {
  const q = String(req.query.q || '');
  const field = String(req.query.field || 'all');
  const suggestions = getAutocompleteSuggestions(activeRecords, q, field, 8);
  res.json({ suggestions });
});

app.get('/api/records/:id', (req: Request, res: Response) => {
  const rowId = req.params.id;
  const record = activeRecords.find((r) => r.rowId === rowId);
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json({ record });
});

app.get('/api/confirmed-rules', (req: Request, res: Response) => {
  res.json({
    ruleSetVersion: activeManifest?.ruleSetVersion || '1.0.0-strict',
    confirmedRules,
    pendingQuestions: [
      {
        field: 'Type 5 (Machine)',
        issue: 'ความขัดแย้งของฐานเวลา: คอลัมน์ H เขียน "Quility per 1 rep" แต่คำอธิบายเขียน "เวลาที่ใช้ใน 1 sample (min)"',
        status: 'ระงับการคำนวณทั้งหมดจนกว่าเจ้าของข้อมูลจะยืนยัน (H × N หรือ D × H × N)',
      },
      {
        field: 'คอลัมน์ K (Control)',
        issue: 'พบข้อความ "Control" ใน 72 แถวของ RM-3 Product โดยไม่มีหัวคอลัมน์',
        status: 'ระงับการคำนวณแถวที่มี Control จนกว่าจะยืนยันว่าใช้ต่อ sample หรือต่อ batch',
      },
      {
        field: 'Unit (mi.)',
        issue: 'พบหน่วย "mi." ในบางแถว',
        status: 'ระงับการคำนวณจนกว่าจะยืนยันความหมาย (ห้ามเดาเป็น ml. หรือ min)',
      },
      {
        field: 'Product / Standard Name Aliases',
        issue: 'ชื่อผลิตภัณฑ์ในชีต Product กับ Standard อาจสะกดต่างกัน เช่น L-Histidine (IV) vs L-Histidine',
        status: 'ค้นหาเป็นอิสระต่อกัน ไม่ fuzzy join เพื่อป้องกันการจับคู่ผิดพลาด',
      },
    ],
  });
});

// Admin Import Multi-File Endpoint
app.post('/api/admin/import', upload.any(), async (req: Request, res: Response) => {
  try {
    const uploadedFiles = req.files as Express.Multer.File[];
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด กรุณาเลือกไฟล์ Excel (.xlsx)' });
    }

    const expectedGroups = [
      { pattern: /EN/i, group: 'EN' as const, headerRow: { EN: 2, Standard: 2 } },
      { pattern: /IV/i, group: 'IV' as const, headerRow: { Product: 1, Standard: 1 } },
      { pattern: /RM-1/i, group: 'RM-1' as const, headerRow: { Product: 1, Standard: 1 } },
      { pattern: /RM-2/i, group: 'RM-2' as const, headerRow: { Product: 1, Standard: 1 } },
      { pattern: /RM-3/i, group: 'RM-3' as const, headerRow: { Product: 1, Standard: 1 } },
    ];

    const matchedFiles: {
      file: Express.Multer.File;
      group: 'EN' | 'IV' | 'RM-1' | 'RM-2' | 'RM-3';
      headerRow: Record<string, number>;
    }[] = [];

    for (const conf of expectedGroups) {
      const match = uploadedFiles.find((f) => conf.pattern.test(f.originalname));
      if (!match) {
        return res.status(400).json({
          error: `ไฟล์ไม่ครบตามโครงสร้างที่ต้องการ: ขาดไฟล์กลุ่ม ${conf.group} (ต้องการ EN, IV, RM-1, RM-2, RM-3 ครบทั้ง 5 ไฟล์)`,
        });
      }
      matchedFiles.push({ file: match, group: conf.group, headerRow: conf.headerRow as unknown as Record<string, number> });
    }

    // Parse all files
    const now = new Date();
    const thaiDateStr = `${now.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}, ${now.toLocaleTimeString('th-TH')} น.`;
    const newVersion = `v${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
      now.getDate()
    ).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    const newRecords: ResourceRecord[] = [];
    const sourceFilesSummary: any[] = [];
    let rowSeq = 1;

    for (const item of matchedFiles) {
      const checksum = crypto.createHash('sha256').update(item.file.buffer).digest('hex');
      const workbook = XLSX.read(item.file.buffer, { type: 'buffer' });
      const sheetSummaries: any[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        const headerRow = item.headerRow[sheetName] || 1;
        const headerR = headerRow - 1;
        let count = 0;

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

          count++;
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
            newVersion,
            item.file.originalname,
            sheetName,
            r + 1,
            item.group
          );
          newRecords.push(rec);
        }

        sheetSummaries.push({
          sheetName,
          headerRow,
          rowCount: count,
        });
      }

      sourceFilesSummary.push({
        fileName: item.file.originalname,
        checksum,
        sizeBytes: item.file.size,
        sheets: sheetSummaries,
      });
    }

    const newManifest: DatasetManifest = {
      datasetVersion: newVersion,
      importedAt: thaiDateStr,
      sourceOrigin: 'Admin File Upload (อัปโหลดผ่านเว็บแอปพลิเคชัน)',
      rawRecordCount: newRecords.length,
      ruleSetVersion: '1.0.0-strict',
      activeStatus: true,
      sourceFiles: sourceFilesSummary,
    };

    // Save to disk
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'dataset_manifest.json'), JSON.stringify(newManifest, null, 2));
    fs.writeFileSync(path.join(dataDir, 'dataset_records.json'), JSON.stringify(newRecords));

    // Update in-memory atomically
    activeManifest = newManifest;
    activeRecords = newRecords;
    versionHistory.unshift({ manifest: newManifest, records: newRecords });

    res.json({
      success: true,
      manifest: newManifest,
      message: `นำเข้าข้อมูลและเปลี่ยนรุ่นเป็น ${newVersion} สำเร็จ ครบทั้ง 5 ไฟล์ รวม ${newRecords.length} แถวข้อมูล`,
    });
  } catch (err: any) {
    console.error('Import error:', err);
    res.status(500).json({ error: `เกิดข้อผิดพลาดในการนำเข้าไฟล์: ${err.message}` });
  }
});

app.post('/api/admin/rollback', (req: Request, res: Response) => {
  const { targetVersion } = req.body;
  const target = versionHistory.find((v) => v.manifest.datasetVersion === targetVersion);
  if (!target) {
    return res.status(404).json({ error: `ไม่พบชุดข้อมูลรุ่น ${targetVersion}` });
  }

  activeManifest = target.manifest;
  activeRecords = target.records;

  const dataDir = path.join(process.cwd(), 'data');
  fs.writeFileSync(path.join(dataDir, 'dataset_manifest.json'), JSON.stringify(activeManifest, null, 2));
  fs.writeFileSync(path.join(dataDir, 'dataset_records.json'), JSON.stringify(activeRecords));

  res.json({
    success: true,
    message: `ย้อนกลับไปใช้ชุดข้อมูลรุ่น ${targetVersion} สำเร็จ (${activeRecords.length} แถว)`,
    manifest: activeManifest,
  });
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] TOP QC Database server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);

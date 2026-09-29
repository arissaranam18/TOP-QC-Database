import fs from 'fs';
import path from 'path';

interface ResourceRecord {
  rowId: string;
  datasetVersion: string;
  sourceFile: string;
  sourceSheet: string;
  sourceRow: number;
  sourceGroup: string;
  isStandardSheet: boolean;
  rawFields: any;
  normalizedSearchFields: any;
  parsedReplicate: number | null;
  parsedQuantity: number | null;
  unitRaw: string;
  typeRaw: any;
  typeLabel: string;
  scopes: string[];
  dataIssues: any[];
  defaultCalculable: boolean;
  blockReasons: string[];
  hasControlNote: boolean;
}

const records: ResourceRecord[] = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data', 'dataset_records.json'), 'utf-8')
);

console.log(`Loaded ${records.length} records for testing.`);

function calculateRecordQty(rec: ResourceRecord, sampleCount: number) {
  if (
    !Number.isInteger(sampleCount) ||
    sampleCount <= 0 ||
    !Number.isFinite(sampleCount)
  ) {
    return {
      status: 'blocked',
      reasons: ['จำนวนตัวอย่างต้องเป็นจำนวนเต็มบวก'],
      computedQty: null,
      unit: rec.unitRaw,
      trace: '',
    };
  }

  if (!rec.defaultCalculable) {
    return {
      status: 'blocked',
      reasons: rec.blockReasons,
      computedQty: null,
      unit: rec.unitRaw,
      trace: '',
    };
  }

  // Exact arithmetic
  // Replicate is integer, sampleCount is integer
  // parsedQuantity might be decimal e.g. 0.5 or integer e.g. 6
  const rep = rec.parsedReplicate!;
  const qtyPerRep = rec.parsedQuantity!;
  const n = sampleCount;
  
  // Calculate total: rep * qtyPerRep * n
  // Avoid floating-point glitches by checking decimal places of qtyPerRep
  const qtyStr = String(qtyPerRep);
  const decimalPlaces = (qtyStr.split('.')[1] || '').length;
  const factor = Math.pow(10, decimalPlaces);
  const total = Math.round(rep * Math.round(qtyPerRep * factor) * n) / factor;

  const note = rec.typeRaw === 4 || rec.typeRaw === '4' ? ' (จำนวนตามสูตรในฐานข้อมูล)' : '';
  const trace = `${rep} × ${qtyPerRep} × ${n} = ${total} ${rec.unitRaw}${note}`;

  return {
    status: 'calculable',
    reasons: [],
    computedQty: total,
    unit: rec.unitRaw,
    trace,
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName} - ${detail || ''}`);
    failed++;
  }
}

// 1. Total records
assert(records.length === 15388, '1. Total records is exactly 15,388', `Found ${records.length}`);

// 2. Scope counts
const allCount = records.length;
const ivRoutine = records.filter(r => r.scopes.includes('IV Routine')).length;
const ivStability = records.filter(r => r.scopes.includes('IV Stability')).length;
const enRoutine = records.filter(r => r.scopes.includes('EN Routine')).length;
const enStability = records.filter(r => r.scopes.includes('EN Stability')).length;
const rm = records.filter(r => r.scopes.includes('RM')).length;
const qcLine = records.filter(r => r.scopes.includes('QC line')).length;
const rmProduct = records.filter(r => r.scopes.includes('RM') && r.sourceSheet === 'Product').length;
const rmStandard = records.filter(r => r.scopes.includes('RM') && r.sourceSheet === 'Standard').length;
const qcLineEN = records.filter(r => r.scopes.includes('QC line') && r.sourceSheet === 'EN').length;
const qcLineStd = records.filter(r => r.scopes.includes('QC line') && r.sourceSheet === 'Standard').length;
const rmOrQcLine = records.filter(r => r.scopes.includes('RM') || r.scopes.includes('QC line')).length;

assert(allCount === 15388, '2a. Scope All = 15,388', `Got ${allCount}`);
assert(ivRoutine === 3413, '2b. Scope IV Routine = 3,413', `Got ${ivRoutine}`);
assert(ivStability === 3134, '2c. Scope IV Stability = 3,134', `Got ${ivStability}`);
assert(enRoutine === 1099, '2d. Scope EN Routine = 1,099', `Got ${enRoutine}`);
assert(enStability === 2232, '2e. Scope EN Stability = 2,232', `Got ${enStability}`);
assert(rm === 7787, '2f. Scope RM = 7,787', `Got ${rm}`);
assert(rmProduct === 7544, '2g. RM Product sheet = 7,544', `Got ${rmProduct}`);
assert(rmStandard === 243, '2h. RM Standard sheet = 243', `Got ${rmStandard}`);
assert(qcLine === 118, '2i. Scope QC line = 118', `Got ${qcLine}`);
assert(qcLineEN === 60, '2j. QC line EN sheet = 60', `Got ${qcLineEN}`);
assert(qcLineStd === 58, '2k. QC line Standard sheet = 58', `Got ${qcLineStd}`);
assert(rmOrQcLine === 7905, '2l. RM + QC line union = 7,905', `Got ${rmOrQcLine}`);

// 3. Test Example A: EN / EN / row 60
const exA = records.find(r => r.sourceFile.includes('(EN)') && r.sourceSheet === 'EN' && r.sourceRow === 60);
assert(!!exA, '3a. Found Example A (EN / EN / 60)');
if (exA) {
  assert(exA.rawFields.product.trim() === 'Neomune', '3b. Example A Product is Neomune');
  assert(exA.rawFields.testItem.trim() === 'Sodium + Potassium', '3c. Example A Test item is Sodium + Potassium');
  assert(exA.rawFields.item.trim() === 'Hydrochloric acid', '3d. Example A Item is Hydrochloric acid');
  assert(exA.rawFields.reagentNo.trim() === '-', '3e. Example A Reagent No is -');
  const res1 = calculateRecordQty(exA, 1);
  assert(res1.status === 'calculable' && res1.computedQty === 6 && res1.unit === 'ml.', '3f. Example A Sample=1 is 6 ml.', `${res1.computedQty} ${res1.unit}`);
  const res3 = calculateRecordQty(exA, 3);
  assert(res3.status === 'calculable' && res3.computedQty === 18 && res3.unit === 'ml.', '3g. Example A Sample=3 is 18 ml.', `${res3.computedQty} ${res3.unit}`);
}

// 4. Test Example B: RM-2 / Product / row 9
const exB = records.find(r => r.sourceFile.includes('(RM-2)') && r.sourceSheet === 'Product' && r.sourceRow === 9);
assert(!!exB, '4a. Found Example B (RM-2 / Product / 9)');
if (exB) {
  assert(exB.rawFields.product.trim() === 'L-Histidine (IV)', '4b. Example B Product is L-Histidine (IV)');
  assert(exB.scopes.includes('RM') && exB.scopes.includes('All'), '4c. Example B is in RM and All');
  assert(!exB.scopes.includes('IV Routine'), '4d. Example B is NOT in IV Routine (despite (IV) in name)');
  const resB = calculateRecordQty(exB, 3);
  assert(resB.status === 'calculable' && resB.computedQty === 120 && resB.unit === 'ml.', '4e. Example B Sample=3 is 120 ml. (4 * 10 * 3 = 120)', `${resB.computedQty} ${resB.unit}`);
}

// 5. Test Example C: EN / EN / row 969
const exC = records.find(r => r.sourceFile.includes('(EN)') && r.sourceSheet === 'EN' && r.sourceRow === 969);
assert(!!exC, '5a. Found Example C (EN / EN / 969)');
if (exC) {
  assert(String(exC.rawFields.workType).trim() === '6', '5b. Example C raw workType is 6');
  assert(exC.dataIssues.some(i => i.code === 'UNEXPECTED_WORK_TYPE'), '5c. Example C has UNEXPECTED_WORK_TYPE issue');
  assert(exC.scopes.includes('All'), '5d. Example C is in All');
  assert(!exC.scopes.includes('EN Routine') && !exC.scopes.includes('EN Stability'), '5e. Example C is not in EN Routine/Stability');
}

// 6. Test Example D: IV / Product / row 3710
const exD = records.find(r => r.sourceFile.includes('(IV)') && r.sourceSheet === 'Product' && r.sourceRow === 3710);
assert(!!exD, '6a. Found Example D (IV / Product / 3710)');
if (exD) {
  assert(String(exD.rawFields.qtyPerRep).trim() === '3 to 5', '6b. Example D raw qty is "3 to 5"');
  assert(exD.parsedQuantity === null, '6c. Example D parsedQuantity is null');
  const resD = calculateRecordQty(exD, 1);
  assert(resD.status === 'blocked', '6d. Example D calculation is BLOCKED');
  assert(resD.computedQty === null, '6e. Example D computedQty is null');
}

// 7. Test Example E: RM-1 / Product / row 1473
const exE = records.find(r => r.sourceFile.includes('(RM-1)') && r.sourceSheet === 'Product' && r.sourceRow === 1473);
assert(!!exE, '7a. Found Example E (RM-1 / Product / 1473)');
if (exE) {
  assert(String(exE.rawFields.replicate).trim() === '-', '7b. Example E replicate is "-"');
  assert(exE.parsedReplicate === null, '7c. Example E parsedReplicate is null');
  const resE = calculateRecordQty(exE, 1);
  assert(resE.status === 'blocked', '7d. Example E calculation is BLOCKED');
  assert(resE.computedQty === null, '7e. Example E computedQty is null');
}

// 8. Test Example F: RM-3 / Product / row 1480
const exF = records.find(r => r.sourceFile.includes('(RM-3)') && r.sourceSheet === 'Product' && r.sourceRow === 1480);
assert(!!exF, '8a. Found Example F (RM-3 / Product / 1480)');
if (exF) {
  assert(String(exF.rawFields.colK).trim() === 'Control', '8b. Example F colK is "Control"');
  assert(String(exF.rawFields.type).trim() === '5', '8c. Example F Type is 5');
  const resF = calculateRecordQty(exF, 1);
  assert(resF.status === 'blocked', '8d. Example F calculation is BLOCKED');
  const hasTimeBaseReason = exF.blockReasons.some(r => r.includes('ฐานเวลา'));
  const hasControlReason = exF.blockReasons.some(r => r.includes('Control'));
  assert(hasTimeBaseReason && hasControlReason, '8e. Example F has BOTH time base and Control ambiguity reasons', JSON.stringify(exF.blockReasons));
}

// 9. Input validation for sampleCount
const invalidSampleCounts = [0, -1, 1.5, NaN, 'abc' as any, null as any];
for (const sc of invalidSampleCounts) {
  const res = calculateRecordQty(exA!, sc);
  assert(res.status === 'blocked' && res.computedQty === null, `9. Sample count ${sc} is rejected`);
}

console.log(`\n================================`);
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`================================`);

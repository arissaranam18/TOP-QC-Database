import { ResourceRecord, RowCalculationResult } from '../types/qc';

/**
 * Perform exact decimal multiplication to eliminate JavaScript IEEE-754 floating point artifacts
 * Example: 0.1 * 3 = 0.3, 0.05 * 4 * 3 = 0.6
 */
export function multiplyExact(rep: number, qtyPerRep: number, sampleCount: number): number {
  const qtyStr = String(qtyPerRep);
  const parts = qtyStr.split('.');
  const decimalPlaces = parts.length > 1 ? parts[1].length : 0;
  const factor = Math.pow(10, decimalPlaces);

  const integerQty = Math.round(qtyPerRep * factor);
  const totalScaled = rep * integerQty * sampleCount;
  return totalScaled / factor;
}

/**
 * Calculates resource quantity for a single record row.
 * Strictly adheres to formula:
 * QTY = Replicate per 1 sample × QTY per 1 replicate × จำนวนตัวอย่าง
 */
export function calculateRow(rec: ResourceRecord, sampleCount: number): RowCalculationResult {
  const unit = rec.unitRaw || '';

  // 1. Validate sampleCount
  if (
    typeof sampleCount !== 'number' ||
    !Number.isInteger(sampleCount) ||
    sampleCount <= 0 ||
    !Number.isFinite(sampleCount)
  ) {
    return {
      status: 'blocked',
      computedQty: null,
      unit,
      reasons: ['จำนวนตัวอย่างต้องเป็นจำนวนเต็มบวก (>= 1)'],
      trace: '',
    };
  }

  // 2. If row has static block reasons from Excel data validation
  if (!rec.defaultCalculable || rec.blockReasons.length > 0) {
    return {
      status: 'blocked',
      computedQty: null,
      unit,
      reasons: rec.blockReasons,
      trace: '',
    };
  }

  // 3. Safety check on parsed values
  if (rec.parsedReplicate === null || rec.parsedQuantity === null) {
    return {
      status: 'blocked',
      computedQty: null,
      unit,
      reasons: ['ข้อมูล Replicate หรือ QTY per replicate ไม่พร้อมสำหรับการคำนวณ'],
      trace: '',
    };
  }

  const rep = rec.parsedReplicate;
  const qtyPerRep = rec.parsedQuantity;
  const n = sampleCount;

  const total = multiplyExact(rep, qtyPerRep, n);

  // Type 4: glassware note
  const isGlassware = String(rec.typeRaw).trim() === '4';
  const glasswareNote = isGlassware ? ' (จำนวนตามสูตรในฐานข้อมูล)' : '';

  const trace = `${rep} × ${qtyPerRep} × ${n} = ${total} ${unit}${glasswareNote}`;

  return {
    status: 'calculable',
    computedQty: total,
    unit,
    reasons: [],
    trace,
  };
}

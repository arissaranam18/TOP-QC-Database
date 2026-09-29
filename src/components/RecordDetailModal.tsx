import React from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, FileSpreadsheet, Calculator, Info } from 'lucide-react';
import { ResourceRecord } from '../types/qc';
import { calculateRow } from '../utils/calculator';

interface RecordDetailModalProps {
  record: ResourceRecord | null;
  sampleCount: number;
  onClose: () => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  sampleCount,
  onClose,
}) => {
  if (!record) return null;

  const calc = calculateRow(record, sampleCount);
  const isCalculable = calc.status === 'calculable';
  const { rawFields, sourceFile, sourceSheet, sourceRow, sourceGroup, isStandardSheet, dataIssues, hasControlNote } = record;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-blue-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-300" />
            <h3 className="font-bold text-base sm:text-lg">
              รายละเอียดข้อมูลแถวและที่มา (Row Audit Detail)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-sm">
          {/* Top Banner: Product & Test Item */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">Product / Material</span>
                <h4 className="text-lg font-bold text-slate-900">{rawFields.product || '-'}</h4>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-md font-mono font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  {sourceGroup}
                </span>
                {isStandardSheet && (
                  <span className="text-xs px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
                    Standard Sheet
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
              <div>
                <span className="text-slate-500">Test item:</span>{' '}
                <strong className="text-slate-800">{rawFields.testItem || '-'}</strong>
              </div>
              <div>
                <span className="text-slate-500">Work type:</span>{' '}
                <strong className="text-slate-800">{rawFields.workType || '-'}</strong>
              </div>
            </div>
          </div>

          {/* Calculation Box */}
          <div
            className={`p-4 rounded-xl border ${
              isCalculable
                ? 'bg-emerald-50/70 border-emerald-300'
                : 'bg-rose-50/70 border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Calculator className="w-4 h-4" />
                <span>ผลการคำนวณทรัพยากร (จำนวนตัวอย่าง N = {sampleCount})</span>
              </span>
              {isCalculable ? (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  คำนวณได้
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold border border-rose-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  คำนวณไม่ได้
                </span>
              )}
            </div>

            {isCalculable ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-emerald-900 font-mono-num">
                    {calc.computedQty}
                  </span>
                  <span className="text-base font-semibold text-emerald-800">{calc.unit}</span>
                </div>
                <div className="text-xs text-emerald-800 font-mono bg-white/70 p-2 rounded-md border border-emerald-200">
                  สูตร: Replicate ({record.parsedReplicate}) × QTY/rep ({record.parsedQuantity}) × ตัวอย่าง ({sampleCount}) = {calc.computedQty} {calc.unit}
                </div>
                {calc.trace && (
                  <p className="text-[11px] text-slate-500 font-mono">{calc.trace}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-rose-900 font-semibold text-sm">
                  ไม่สามารถคำนวณปริมาณได้สำหรับแถวนี้เนื่องจาก:
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-rose-800 bg-white/70 p-2.5 rounded-md border border-rose-200">
                  {calc.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Raw Values Table (Columns A-K) */}
          <div className="space-y-2">
            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-600">
              ค่าข้อมูลดิบจากไฟล์ต้นฉบับ (Raw Excel Fields)
            </h5>
            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-200/80">
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-500 w-1/3">A: Work type</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 font-mono">{String(rawFields.workType ?? '')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-500">B: Product</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{String(rawFields.product ?? '')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-500">C: Test item</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{String(rawFields.testItem ?? '')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-500">D: Replicate per 1 sample</td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">{String(rawFields.replicate ?? '')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-500">E: Item no.</td>
                    <td className="py-2 px-3 font-mono text-slate-800">{String(rawFields.itemNo ?? '')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-500">F: Item (ชื่อทรัพยากร)</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{String(rawFields.item ?? '')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-500">G: Type</td>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {String(rawFields.type ?? '')} <span className="text-slate-500">({record.typeLabel})</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-500">H: Quility per 1 rep (ค่าดิบ)</td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900">{String(rawFields.qtyPerRep ?? '')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-500">I: Unit</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 font-mono">{String(rawFields.unit ?? '')}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium text-slate-500">J: Reagent No. if type 2</td>
                    <td className="py-2 px-3 font-mono text-slate-800">{String(rawFields.reagentNo ?? '')}</td>
                  </tr>
                  {rawFields.colK && (
                    <tr className="bg-amber-50/50">
                      <td className="py-2 px-3 font-semibold text-amber-800">K: ข้อมูลเพิ่มเติม</td>
                      <td className="py-2 px-3 font-bold text-amber-900 font-mono">{String(rawFields.colK)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Issues (if any) */}
          {dataIssues.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-bold text-xs uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>ประเด็นข้อมูลที่ตรวจพบ ({dataIssues.length} รายการ)</span>
              </h5>
              <div className="space-y-1.5">
                {dataIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2"
                  >
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 font-semibold shrink-0">
                      {issue.field}
                    </span>
                    <span>{issue.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Provenance Info */}
          <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 space-y-1 border border-slate-200">
            <div className="font-semibold text-slate-800">ข้อมูลการตรวจสอบย้อนกลับ (Provenance):</div>
            <div>
              ไฟล์: <strong className="text-slate-900">{sourceFile}</strong> • ชีต:{' '}
              <strong className="text-slate-900">{sourceSheet}</strong> • แถวที่:{' '}
              <strong className="text-slate-900">{sourceRow}</strong>
            </div>
            <div>
              ID: <code className="font-mono text-slate-800">{record.rowId}</code> • Dataset Version:{' '}
              <code className="font-mono text-slate-800">{record.datasetVersion}</code>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

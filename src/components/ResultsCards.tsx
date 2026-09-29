import React from 'react';
import { Eye, AlertCircle, AlertTriangle, Layers, ChevronRight } from 'lucide-react';
import { SearchRowItem, ResourceRecord } from '../types/qc';

interface ResultsCardsProps {
  rows: SearchRowItem[];
  onSelectRecord: (record: ResourceRecord, sampleCount: number) => void;
}

export const ResultsCards: React.FC<ResultsCardsProps> = ({ rows, onSelectRecord }) => {
  return (
    <div className="space-y-3.5">
      {rows.map((rowItem) => {
        const { seqNo, record, calculation, sampleCountUsed } = rowItem;
        const { rawFields, sourceGroup, isStandardSheet, dataIssues, hasControlNote } = record;
        const isCalculable = calculation.status === 'calculable';
        const hasIssues = dataIssues.length > 0;

        const groupBadgeClass =
          sourceGroup === 'EN'
            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
            : sourceGroup === 'IV'
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'bg-amber-100 text-amber-900 border-amber-200';

        return (
          <div
            key={`card-${record.rowId}-${seqNo}`}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3 hover:border-blue-300 transition-all"
          >
            {/* Header Row: No., Product, Badges */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  #{seqNo}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-semibold border ${groupBadgeClass}`}>
                  {sourceGroup}
                </span>
                {isStandardSheet && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-medium">
                    Standard
                  </span>
                )}
                {hasIssues && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>มีประเด็น</span>
                  </span>
                )}
              </div>

              {/* Work Type Badge */}
              <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md shrink-0">
                {rawFields.workType || '-'}
              </span>
            </div>

            {/* Product & Test Item */}
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {rawFields.product || '-'}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                <span className="font-semibold text-slate-500">Test item:</span>
                <span className="font-medium text-slate-800">{rawFields.testItem || '-'}</span>
              </div>
            </div>

            {/* Item & Type */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Item (ทรัพยากร)</span>
                  <p className="text-sm font-semibold text-slate-900 break-words">
                    {rawFields.item || '-'}
                  </p>
                  {rawFields.itemNo && (
                    <p className="text-xs font-mono text-slate-500">รหัส: {rawFields.itemNo}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 shrink-0 font-medium">
                  {record.typeLabel}
                </span>
              </div>

              {hasControlNote && (
                <div className="text-xs text-amber-800 font-medium flex items-center gap-1 mt-1 pt-1 border-t border-slate-200/50">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>พบข้อความ Control ในคอลัมน์ K</span>
                </div>
              )}
            </div>

            {/* Calculation & QTY Section */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>
                  Rep: <strong className="text-slate-800">{String(rawFields.replicate ?? '-')}</strong> × QTY/rep:{' '}
                  <strong className="text-slate-800">{String(rawFields.qtyPerRep ?? '-')}</strong>
                </div>
                <div className="text-emerald-700 font-medium">
                  จำนวนตัวอย่าง (N): <span className="font-bold">{sampleCountUsed}</span>
                </div>
              </div>

              {/* Large QTY display */}
              <div className="text-right">
                {isCalculable ? (
                  <div>
                    <div className="flex items-baseline justify-end gap-1 text-xl font-bold text-blue-900 font-mono-num">
                      <span>{calculation.computedQty}</span>
                      <span className="text-xs font-normal text-slate-600">{calculation.unit}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {calculation.trace}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 border border-rose-200 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>คำนวณไม่ได้</span>
                    </span>
                    <p className="text-[10px] text-rose-700 max-w-[150px] truncate text-right">
                      {calculation.reasons[0]}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Button: View Full Details */}
            <button
              type="button"
              onClick={() => onSelectRecord(record, sampleCountUsed)}
              className="w-full h-11 rounded-xl bg-slate-50 hover:bg-blue-50 text-blue-900 border border-slate-200 hover:border-blue-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-blue-600" />
              <span>ดูข้อมูลดิบครบ 13 ฟิลด์และที่มา</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

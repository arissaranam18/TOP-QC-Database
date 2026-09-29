import React from 'react';
import { Eye, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { SearchRowItem, ResourceRecord } from '../types/qc';

interface ResultsTableProps {
  rows: SearchRowItem[];
  onSelectRecord: (record: ResourceRecord, sampleCount: number) => void;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ rows, onSelectRecord }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden">
      <div className="overflow-x-auto max-h-[750px] relative">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          {/* Sticky Navy Header */}
          <thead className="sticky top-0 z-20 bg-blue-900 text-white shadow-sm font-semibold select-none">
            <tr className="border-b border-blue-800 text-[11px] sm:text-xs uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-12 shrink-0">No.</th>
              <th className="py-3 px-3 min-w-[130px]">Work type</th>
              <th className="py-3 px-3 min-w-[150px]">Product</th>
              <th className="py-3 px-3 min-w-[140px]">Test item</th>
              <th className="py-3 px-2.5 text-center min-w-[85px] leading-tight">
                Replicate<br /><span className="text-[10px] text-blue-200 font-normal">per 1 sample</span>
              </th>
              <th className="py-3 px-3 min-w-[90px]">Item no.</th>
              <th className="py-3 px-3 min-w-[180px]">Item</th>
              <th className="py-3 px-3 min-w-[120px]">Type</th>
              <th className="py-3 px-2.5 text-right min-w-[90px] leading-tight">
                QTY per<br /><span className="text-[10px] text-blue-200 font-normal">1 replicate</span>
              </th>
              <th className="py-3 px-2.5 text-center min-w-[65px]">Unit</th>
              <th className="py-3 px-3 min-w-[95px] text-center leading-tight">
                Reagent No.<br /><span className="text-[10px] text-blue-200 font-normal">if type 2</span>
              </th>
              <th className="py-3 px-2.5 text-center min-w-[90px] leading-tight bg-blue-950/60">
                จำนวนตัวอย่าง<br /><span className="text-[10px] text-emerald-300 font-normal">ที่ใช้คำนวณ</span>
              </th>
              <th className="py-3 px-3 text-right min-w-[140px] bg-blue-950/90 font-bold text-white">
                QTY
              </th>
              <th className="py-3 px-2 text-center w-12"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-slate-800">
            {rows.map((rowItem) => {
              const { seqNo, record, calculation, sampleCountUsed } = rowItem;
              const { rawFields, sourceGroup, isStandardSheet, dataIssues, hasControlNote } = record;
              const isCalculable = calculation.status === 'calculable';
              const hasIssues = dataIssues.length > 0;

              // Group badge color
              const groupBadgeClass =
                sourceGroup === 'EN'
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                  : sourceGroup === 'IV'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-amber-100 text-amber-900 border-amber-200';

              return (
                <tr
                  key={`${record.rowId}-${seqNo}`}
                  className={`hover:bg-blue-50/40 transition-colors group ${
                    !isCalculable ? 'bg-slate-50/50' : ''
                  }`}
                >
                  {/* 1. No. */}
                  <td className="py-2.5 px-3 text-center font-mono-num text-xs text-slate-500 font-medium">
                    {seqNo}
                  </td>

                  {/* 2. Work type + Badges */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col gap-1 items-start">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900">
                          {rawFields.workType || '-'}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold border ${groupBadgeClass}`}
                        >
                          {sourceGroup}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {isStandardSheet && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200 font-medium">
                            Standard
                          </span>
                        )}
                        {hasIssues && (
                          <span
                            className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5"
                            title={dataIssues.map((i) => i.message).join('\n')}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>มีประเด็น</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 3. Product */}
                  <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[200px]">
                    <span className="break-words">{rawFields.product || '-'}</span>
                  </td>

                  {/* 4. Test item */}
                  <td className="py-2.5 px-3 text-slate-800 max-w-[180px]">
                    <span className="break-words">{rawFields.testItem || '-'}</span>
                  </td>

                  {/* 5. Replicate per 1 sample */}
                  <td className="py-2.5 px-2.5 text-center font-mono-num font-medium text-slate-700">
                    {rawFields.replicate !== undefined && rawFields.replicate !== ''
                      ? String(rawFields.replicate)
                      : '-'}
                  </td>

                  {/* 6. Item no. */}
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-600">
                    {rawFields.itemNo ? String(rawFields.itemNo) : '-'}
                  </td>

                  {/* 7. Item (Name) */}
                  <td className="py-2.5 px-3 max-w-[240px]">
                    <div className="space-y-0.5">
                      <span className="font-medium text-slate-900 break-words">
                        {rawFields.item || '-'}
                      </span>
                      {hasControlNote && (
                        <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Control (คอลัมน์ K)</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 8. Type */}
                  <td className="py-2.5 px-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 inline-block font-medium truncate max-w-[130px]"
                      title={record.typeLabel}
                    >
                      {record.typeLabel}
                    </span>
                  </td>

                  {/* 9. QTY per 1 rep */}
                  <td className="py-2.5 px-2.5 text-right font-mono-num font-medium text-slate-800">
                    {rawFields.qtyPerRep !== undefined && rawFields.qtyPerRep !== ''
                      ? String(rawFields.qtyPerRep)
                      : '-'}
                  </td>

                  {/* 10. Unit */}
                  <td className="py-2.5 px-2.5 text-center font-medium text-slate-600">
                    {rawFields.unit ? String(rawFields.unit) : '-'}
                  </td>

                  {/* 11. Reagent No. */}
                  <td className="py-2.5 px-3 text-center font-mono text-xs text-slate-600">
                    {rawFields.reagentNo ? String(rawFields.reagentNo) : '-'}
                  </td>

                  {/* 12. Sample Count Used */}
                  <td className="py-2.5 px-2.5 text-center font-mono-num font-bold text-slate-900 bg-slate-50/50">
                    {sampleCountUsed}
                  </td>

                  {/* 13. Calculated QTY */}
                  <td className="py-2.5 px-3 text-right bg-blue-50/30">
                    {isCalculable ? (
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-1 font-bold text-blue-900 text-sm sm:text-base font-mono-num">
                          <span>{calculation.computedQty}</span>
                          <span className="text-xs font-normal text-slate-600">{calculation.unit}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono" title={calculation.trace}>
                          {calculation.trace}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-medium cursor-help text-right"
                          title={calculation.reasons.join('\n')}
                        >
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>คำนวณไม่ได้</span>
                        </span>
                        <span className="text-[10px] text-rose-700 mt-0.5 truncate max-w-[140px]" title={calculation.reasons.join(', ')}>
                          {calculation.reasons[0]}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Action: Detail View */}
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => onSelectRecord(record, sampleCountUsed)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="ดูรายละเอียดข้อมูลดิบและที่มา"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

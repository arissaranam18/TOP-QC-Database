import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, Layers, FileText, Eye, AlertCircle } from 'lucide-react';
import { SearchRowItem, ResourceRecord } from '../types/qc';

interface ResultsGroupedProps {
  rows: SearchRowItem[];
  onSelectRecord: (record: ResourceRecord, sampleCount: number) => void;
}

export const ResultsGrouped: React.FC<ResultsGroupedProps> = ({ rows, onSelectRecord }) => {
  // Build nested grouping structure for the current page rows
  // Structure: Group (EN/IV/RM) -> Product -> Work type -> Test item -> items
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Grouping logic
  interface GroupedData {
    [fileGroup: string]: {
      [product: string]: {
        [workType: string]: {
          [testItem: string]: SearchRowItem[];
        };
      };
    };
  }

  const grouped: GroupedData = {};

  for (const item of rows) {
    const fg = item.record.sourceGroup.startsWith('RM') ? 'RM' : item.record.sourceGroup;
    const prod = item.record.rawFields.product || '(ไม่ระบุชื่อผลิตภัณฑ์)';
    const wt = item.record.rawFields.workType || '(ไม่ระบุ Work type)';
    const ti = item.record.rawFields.testItem || '(ไม่ระบุ Test item)';

    if (!grouped[fg]) grouped[fg] = {};
    if (!grouped[fg][prod]) grouped[fg][prod] = {};
    if (!grouped[fg][prod][wt]) grouped[fg][prod][wt] = {};
    if (!grouped[fg][prod][wt][ti]) grouped[fg][prod][wt][ti] = [];

    grouped[fg][prod][wt][ti].push(item);
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900">
        💡 <strong>มุมมองจัดกลุ่ม:</strong> แสดงโครงสร้าง Product → Work type → Test item → รายการทรัพยากร
        (แต่ละแถวมีค่าคำนวณแยกอิสระ ไม่มีการบวกผลรวมทรัพยากรข้ามแถว)
      </div>

      {Object.entries(grouped).map(([fileGroup, products]) => (
        <div key={fileGroup} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* File Group Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between font-semibold text-sm">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-blue-400" />
              <span>กลุ่มไฟล์ {fileGroup}</span>
            </div>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-blue-200">
              {Object.keys(products).length} ผลิตภัณฑ์ในหน้านี้
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {Object.entries(products).map(([productName, workTypes]) => {
              const productKey = `${fileGroup}-${productName}`;
              const isCollapsed = !!collapsedGroups[productKey];

              return (
                <div key={productKey} className="p-4 space-y-3">
                  {/* Product Header */}
                  <div
                    onClick={() => toggleGroup(productKey)}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors select-none"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                      <h4 className="text-base font-bold text-slate-900">{productName}</h4>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {Object.keys(workTypes).length} Work type
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div className="pl-4 sm:pl-6 space-y-4">
                      {Object.entries(workTypes).map(([workTypeName, testItems]) => (
                        <div key={`${productKey}-${workTypeName}`} className="border-l-2 border-blue-500/40 pl-3 sm:pl-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs font-semibold text-slate-700 bg-blue-50 text-blue-900 px-2 py-0.5 rounded">
                              Work type: {workTypeName}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {Object.entries(testItems).map(([testItemName, items]) => (
                              <div
                                key={`${productKey}-${workTypeName}-${testItemName}`}
                                className="bg-slate-50/70 rounded-xl p-3 sm:p-4 border border-slate-200/80 space-y-2.5"
                              >
                                <div className="flex items-center justify-between text-xs font-medium text-slate-800 border-b border-slate-200 pb-2">
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="font-bold text-slate-900">
                                      Test item: {testItemName}
                                    </span>
                                  </div>
                                  <span className="text-slate-500 text-[11px]">
                                    {items.length} รายการทรัพยากร
                                  </span>
                                </div>

                                {/* Resource Table for this test item */}
                                <div className="divide-y divide-slate-200/60 text-xs">
                                  {items.map((rowItem) => {
                                    const { seqNo, record, calculation, sampleCountUsed } = rowItem;
                                    const isCalc = calculation.status === 'calculable';

                                    return (
                                      <div
                                        key={`grp-item-${record.rowId}-${seqNo}`}
                                        className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/80 rounded-lg px-2 transition-colors"
                                      >
                                        <div className="space-y-0.5 max-w-md">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-semibold text-slate-900">
                                              {record.rawFields.item || '-'}
                                            </span>
                                            {record.rawFields.itemNo && (
                                              <span className="font-mono text-[11px] text-slate-500">
                                                [{record.rawFields.itemNo}]
                                              </span>
                                            )}
                                            {record.isStandardSheet && (
                                              <span className="text-[10px] px-1.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                                Standard
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                            <span>{record.typeLabel}</span>
                                            <span>•</span>
                                            <span>
                                              Rep: {String(record.rawFields.replicate ?? '-')} × QTY/rep:{' '}
                                              {String(record.rawFields.qtyPerRep ?? '-')} {record.unitRaw}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 self-end sm:self-center">
                                          {isCalc ? (
                                            <div className="text-right">
                                              <div className="font-bold text-blue-900 text-sm font-mono-num">
                                                {calculation.computedQty} {calculation.unit}
                                              </div>
                                              <div className="text-[10px] text-slate-400 font-mono">
                                                {calculation.trace}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-right">
                                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-medium">
                                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                                <span>คำนวณไม่ได้</span>
                                              </span>
                                            </div>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => onSelectRecord(record, sampleCountUsed)}
                                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-white transition-colors cursor-pointer"
                                            title="ดูรายละเอียดข้อมูลดิบ"
                                          >
                                            <Eye className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

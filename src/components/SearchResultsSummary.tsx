import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ArrowUp,
  Table,
  FolderTree,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { SearchResponse } from '../types/qc';

interface SearchResultsSummaryProps {
  result: SearchResponse;
  currentFilter: 'all' | 'calculable' | 'blocked' | 'issues';
  onFilterChange: (filter: 'all' | 'calculable' | 'blocked' | 'issues') => void;
  currentViewMode: 'table' | 'grouped';
  onViewModeChange: (mode: 'table' | 'grouped') => void;
  onScrollToTop: () => void;
  totalDatasetRows: number;
}

export const SearchResultsSummary: React.FC<SearchResultsSummaryProps> = ({
  result,
  currentFilter,
  onFilterChange,
  currentViewMode,
  onViewModeChange,
  onScrollToTop,
  totalDatasetRows,
}) => {
  const {
    appliedQuery,
    totalMatchedRecords,
    calculableCount,
    blockedCount,
    recordsWithIssuesCount,
    distinctProductCount,
    distinctTestContextCount,
    datasetVersion,
    searchDurationMs,
  } = result;

  return (
    <div className="space-y-4">
      {/* Permanent Regulatory Disclaimer Banner */}
      <div className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-amber-950 flex items-start gap-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-900">
            ผลนี้เป็นรายการที่ตรงกับคำค้น ไม่ยืนยันว่าครบทุกทรัพยากรของวิธีทดสอบ
          </p>
          <p className="text-amber-800/90 leading-relaxed text-[12px] sm:text-xs">
            ชื่อผลิตภัณฑ์ในชีต Product/EN และ Standard อาจต่างกัน (เช่น <em>L-Histidine (IV)</em> ใน
            Product และ <em>L-Histidine</em> ใน Standard) การค้นคำเฉพาะอาจไม่พบทั้งสองชุดพร้อมกัน
            และแต่ละแถวคำนวณแยกตามค่าในฐานข้อมูล ไม่มีการรวมปริมาณข้ามแถวหรือข้ามผลิตภัณฑ์
          </p>
        </div>
      </div>

      {/* Applied Query Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs sm:text-sm">
          <span className="text-slate-400 font-medium">เงื่อนไขผลลัพธ์:</span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-blue-200 border border-slate-700 font-medium">
            Keyword: <strong className="text-white">{appliedQuery.keyword || '(ทั้งหมด)'}</strong>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 text-blue-200 border border-slate-700">
            Scope: <strong className="text-white">{appliedQuery.scopes.join(', ')}</strong>
          </span>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold font-mono-num">
            จำนวนตัวอย่าง: {appliedQuery.sampleCount}
          </span>

          <span className="text-[11px] text-slate-400 hidden lg:inline">
            • ฐานข้อมูล {datasetVersion} ({totalDatasetRows.toLocaleString()} แถว) • {searchDurationMs} ms
          </span>
        </div>

        <button
          type="button"
          onClick={onScrollToTop}
          className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors cursor-pointer"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>กลับไปแก้เงื่อนไข</span>
        </button>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Matched */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">พบทั้งหมด</span>
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono-num">
              {totalMatchedRecords.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium">รายการ</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Product ไม่ซ้ำ:</span>
            <span className="font-semibold text-slate-700">
              {distinctProductCount.total} (EN:{distinctProductCount.byGroup.EN || 0}, IV:{distinctProductCount.byGroup.IV || 0}, RM:{distinctProductCount.byGroup.RM || 0})
            </span>
          </div>
        </div>

        {/* Card 2: Calculable */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200/80 shadow-2xs flex flex-col justify-between bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">คำนวณได้</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono-num">
              {calculableCount.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-600 font-medium">รายการ</span>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100 text-[11px] text-emerald-700">
            คำนวณ QTY ได้ตรงตามสูตรต่อ Replicate
          </div>
        </div>

        {/* Card 3: Blocked Calculation */}
        <div className="bg-white rounded-xl p-4 border border-rose-200/80 shadow-2xs flex flex-col justify-between bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-800 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">คำนวณไม่ได้</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-700 font-mono-num">
              {blockedCount.toLocaleString()}
            </span>
            <span className="text-xs text-rose-600 font-medium">รายการ</span>
          </div>
          <div className="mt-2 pt-2 border-t border-rose-100 text-[11px] text-rose-700">
            ระงับผล (Type 5 / Control / ช่วงปริมาณ / เครื่องหมาย)
          </div>
        </div>

        {/* Card 4: Data Issues */}
        <div className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-2xs flex flex-col justify-between bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">มีประเด็นข้อมูล</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-700 font-mono-num">
              {recordsWithIssuesCount.toLocaleString()}
            </span>
            <span className="text-xs text-amber-600 font-medium">รายการ</span>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-100 text-[11px] text-amber-700">
            ยอดแยกต่างหาก (อาจคำนวณได้หรือไม่ได้)
          </div>
        </div>
      </div>

      {/* Filter Tabs & View Mode Switcher */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              currentFilter === 'all'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            ทั้งหมด ({totalMatchedRecords.toLocaleString()})
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('calculable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              currentFilter === 'calculable'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            คำนวณได้ ({calculableCount.toLocaleString()})
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('blocked')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              currentFilter === 'blocked'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
            }`}
          >
            คำนวณไม่ได้ ({blockedCount.toLocaleString()})
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('issues')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              currentFilter === 'issues'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
            }`}
          >
            มีประเด็น ({recordsWithIssuesCount.toLocaleString()})
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              currentViewMode === 'table'
                ? 'bg-white text-blue-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>ตารางรายละเอียด</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('grouped')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              currentViewMode === 'grouped'
                ? 'bg-white text-blue-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>จัดกลุ่ม</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { SearchForm } from './components/SearchForm';
import { SearchResultsSummary } from './components/SearchResultsSummary';
import { ResultsTable } from './components/ResultsTable';
import { ResultsCards } from './components/ResultsCards';
import { ResultsGrouped } from './components/ResultsGrouped';
import { Pagination } from './components/Pagination';
import { RecordDetailModal } from './components/RecordDetailModal';
import { AdminImportModal } from './components/AdminImportModal';
import { PendingRulesModal } from './components/PendingRulesModal';
import {
  DatasetManifest,
  SearchRequest,
  SearchResponse,
  ResourceRecord,
  WorkTypeScope,
  SearchFieldType,
} from './types/qc';
import { Search, Sparkles, Layers, ShieldCheck, HelpCircle, FileText } from 'lucide-react';

export const App: React.FC = () => {
  const [manifest, setManifest] = useState<DatasetManifest | null>(null);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);
  const [isLoadingManifest, setIsLoadingManifest] = useState<boolean>(true);

  // Search states
  const [searchParams, setSearchParams] = useState<{
    keyword: string;
    searchField: SearchFieldType;
    scopes: WorkTypeScope[];
    sampleCount: number;
    page: number;
    pageSize: number;
    viewMode: 'table' | 'grouped';
    statusFilter: 'all' | 'calculable' | 'blocked' | 'issues';
  }>({
    keyword: '',
    searchField: 'all',
    scopes: ['All'],
    sampleCount: 1,
    page: 1,
    pageSize: 25,
    viewMode: 'table',
    statusFilter: 'all',
  });

  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<ResourceRecord | null>(null);
  const [sampleCountForModal, setSampleCountForModal] = useState<number>(1);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);

  // Race condition guard ref
  const latestRequestId = useRef<number>(0);
  const searchFormRef = useRef<HTMLDivElement>(null);

  // Load manifest on mount
  const fetchManifest = async () => {
    try {
      setIsLoadingManifest(true);
      const res = await fetch('/api/manifest');
      if (res.ok) {
        const data = await res.json();
        setManifest(data.manifest);
        setVersionHistory(data.versionHistory || []);
      }
    } catch (err) {
      console.error('Failed to fetch manifest:', err);
    } finally {
      setIsLoadingManifest(false);
    }
  };

  useEffect(() => {
    fetchManifest();
  }, []);

  // Perform search
  const doSearch = async (params = searchParams) => {
    setIsSearching(true);
    setSearchError(null);
    const reqId = ++latestRequestId.current;

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: params.keyword,
          searchField: params.searchField,
          scopes: params.scopes,
          sampleCount: params.sampleCount,
          page: params.page,
          pageSize: params.pageSize,
          viewMode: params.viewMode,
          statusFilter: params.statusFilter,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'เกิดข้อผิดพลาดในการค้นหา');
      }

      const data: SearchResponse = await res.json();
      if (reqId === latestRequestId.current) {
        setSearchResult(data);
        setHasSearched(true);
      }
    } catch (err: any) {
      if (reqId === latestRequestId.current) {
        setSearchError(err.message || 'ไม่สามารถค้นหาข้อมูลได้');
      }
    } finally {
      if (reqId === latestRequestId.current) {
        setIsSearching(false);
      }
    }
  };

  // Quick initial search so user immediately sees results on first load
  useEffect(() => {
    if (manifest && !hasSearched) {
      doSearch();
    }
  }, [manifest]);

  // Handle submit from SearchForm
  const handleSearchSubmit = (newCriteria: {
    keyword: string;
    searchField: SearchFieldType;
    scopes: WorkTypeScope[];
    sampleCount: number;
  }) => {
    const updated = {
      ...searchParams,
      ...newCriteria,
      page: 1, // Reset to page 1 on new search criteria
    };
    setSearchParams(updated);
    doSearch(updated);
  };

  // Handle Reset from SearchForm
  const handleReset = () => {
    const resetParams = {
      keyword: '',
      searchField: 'all' as SearchFieldType,
      scopes: ['All' as WorkTypeScope],
      sampleCount: 1,
      page: 1,
      pageSize: 25,
      viewMode: 'table' as const,
      statusFilter: 'all' as const,
    };
    setSearchParams(resetParams);
    setSearchResult(null);
    setHasSearched(false);
    setSearchError(null);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    const updated = { ...searchParams, page: newPage };
    setSearchParams(updated);
    doSearch(updated);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    const updated = { ...searchParams, pageSize: newSize, page: 1 };
    setSearchParams(updated);
    doSearch(updated);
  };

  // Handle filter status change
  const handleFilterChange = (filter: 'all' | 'calculable' | 'blocked' | 'issues') => {
    const updated = { ...searchParams, statusFilter: filter, page: 1 };
    setSearchParams(updated);
    doSearch(updated);
  };

  // Handle view mode change
  const handleViewModeChange = (mode: 'table' | 'grouped') => {
    const updated = { ...searchParams, viewMode: mode };
    setSearchParams(updated);
    doSearch(updated);
  };

  const handleScrollToTop = () => {
    searchFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenDetailModal = (record: ResourceRecord, sampleCount: number) => {
    setSelectedRecord(record);
    setSampleCountForModal(sampleCount);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        manifest={manifest}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Search Form Card */}
        <div ref={searchFormRef}>
          <SearchForm
            onSearch={handleSearchSubmit}
            onReset={handleReset}
            isLoading={isSearching}
            initialKeyword={searchParams.keyword}
            initialScopes={searchParams.scopes}
            initialSampleCount={searchParams.sampleCount}
            initialSearchField={searchParams.searchField}
          />
        </div>

        {/* Search Error Notice */}
        {searchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 flex items-center justify-between gap-3 shadow-xs">
            <span>{searchError}</span>
            <button
              type="button"
              onClick={() => doSearch()}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors shrink-0"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Loading State Skeleton */}
        {isSearching && !searchResult && (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700">กำลังประมวลผลการค้นหาและคำนวณทรัพยากร...</p>
          </div>
        )}

        {/* Search Results Section */}
        {searchResult && (
          <div className="space-y-5">
            {/* KPI Summary and Filters */}
            <SearchResultsSummary
              result={searchResult}
              currentFilter={searchParams.statusFilter}
              onFilterChange={handleFilterChange}
              currentViewMode={searchParams.viewMode}
              onViewModeChange={handleViewModeChange}
              onScrollToTop={handleScrollToTop}
              totalDatasetRows={manifest?.rawRecordCount || 15388}
            />

            {/* Results Views */}
            {searchResult.rows.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3 shadow-2xs">
                <Search className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">ไม่พบรายการที่ตรงกับเงื่อนไข</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  ลองเปลี่ยนคำค้นหา หรือเลือก Work type scope เพิ่มเติม เช่น All หรือเลือกค้นหาใน ทุกช่อง
                </p>
              </div>
            ) : searchParams.viewMode === 'grouped' ? (
              <ResultsGrouped
                rows={searchResult.rows}
                onSelectRecord={handleOpenDetailModal}
              />
            ) : (
              <>
                {/* Desktop & Tablet Table (Hidden on small mobile) */}
                <div className="hidden md:block">
                  <ResultsTable
                    rows={searchResult.rows}
                    onSelectRecord={handleOpenDetailModal}
                  />
                </div>

                {/* Mobile Cards (Visible only on mobile) */}
                <div className="block md:hidden">
                  <ResultsCards
                    rows={searchResult.rows}
                    onSelectRecord={handleOpenDetailModal}
                  />
                </div>
              </>
            )}

            {/* Bottom Pagination */}
            {searchResult.rows.length > 0 && (
              <Pagination
                currentPage={searchResult.page}
                totalPages={searchResult.totalPages}
                pageSize={searchResult.pageSize}
                totalItems={searchResult.totalMatchedRecords}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )}
          </div>
        )}

        {/* Initial Welcome & Quick Helper Guide when reset */}
        {!hasSearched && !isSearching && (
          <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200 text-center space-y-6 shadow-2xs">
            <div className="max-w-xl mx-auto space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                ยินดีต้อนรับสู่ระบบ TOP QC Database
              </h2>
              <p className="text-sm text-slate-600">
                ระบบค้นหาข้อมูลทรัพยากรการทดสอบและคำนวณปริมาณสาร/อุปกรณ์อัตโนมัติตามจำนวนตัวอย่าง
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="font-semibold text-blue-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-blue-600" />
                  <span>ค้นหาได้รวดเร็วและตรงจุด</span>
                </span>
                <p className="text-xs text-slate-500">
                  ค้นหาจาก Product, วัตถุดิบ RM, Test item, ชื่อสาร หรือรหัสทรัพยากร พร้อมระบบแนะนำคำอัตโนมัติ
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="font-semibold text-emerald-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>คำนวณแม่นยำตามข้อมูลแล็ป</span>
                </span>
                <p className="text-xs text-slate-500">
                  คำนวณ Replicate × QTY per rep × จำนวนตัวอย่าง อย่างแม่นยำ ไม่ปะปนหน่วย และระงับแถวที่มีข้อกำกวม
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="font-semibold text-indigo-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>ครอบคลุมทุกสายงาน</span>
                </span>
                <p className="text-xs text-slate-500">
                  รองรับทั้ง IV Routine, IV Stability, EN Routine, EN Stability, RM และ QC line ครบทั้ง 15,388 แถว
                </p>
              </div>
            </div>

            {/* Quick Keyword Buttons */}
            <div className="pt-2">
              <span className="text-xs text-slate-400 block mb-2 font-medium">ตัวอย่างคำค้นที่พบบ่อย:</span>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {['Neomune', 'Sodium + Potassium', 'L-Histidine', 'Assay', 'Hydrochloric acid'].map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => {
                      handleSearchSubmit({
                        keyword: kw,
                        searchField: 'all',
                        scopes: ['All'],
                        sampleCount: 1,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold border border-blue-200 transition-colors cursor-pointer"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-medium text-slate-700">
            TOP QC Database — แผนกประกันและควบคุมคุณภาพ (QC Department)
          </p>
          <p className="text-[11px] text-slate-400">
            ฐานข้อมูลอ้างอิงทรัพยากรการทดสอบ • ข้อมูลจริงจากชุดไฟล์ QC (EN, IV, RM-1, RM-2, RM-3)
          </p>
        </div>
      </footer>

      {/* Row Audit Detail Modal */}
      <RecordDetailModal
        record={selectedRecord}
        sampleCount={sampleCountForModal}
        onClose={() => setSelectedRecord(null)}
      />

      {/* Admin Import Modal */}
      <AdminImportModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        manifest={manifest}
        versionHistory={versionHistory}
        onImportSuccess={() => {
          fetchManifest();
          doSearch();
        }}
      />

      {/* Pending Confirmations Modal */}
      <PendingRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </div>
  );
};

export default App;

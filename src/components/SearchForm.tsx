import React, { useState, useEffect, useRef } from 'react';
import { Search, RotateCcw, Filter, Layers, Calculator, Tag, Check, AlertCircle } from 'lucide-react';
import { WorkTypeScope, ALL_SCOPES, SearchFieldType, AutocompleteItem } from '../types/qc';

interface SearchFormProps {
  onSearch: (params: {
    keyword: string;
    searchField: SearchFieldType;
    scopes: WorkTypeScope[];
    sampleCount: number;
  }) => void;
  onReset: () => void;
  isLoading: boolean;
  initialKeyword?: string;
  initialScopes?: WorkTypeScope[];
  initialSampleCount?: number;
  initialSearchField?: SearchFieldType;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  onSearch,
  onReset,
  isLoading,
  initialKeyword = '',
  initialScopes = ['All'],
  initialSampleCount = 1,
  initialSearchField = 'all',
}) => {
  const [keyword, setKeyword] = useState<string>(initialKeyword);
  const [searchField, setSearchField] = useState<SearchFieldType>(initialSearchField);
  const [scopes, setScopes] = useState<WorkTypeScope[]>(initialScopes);
  const [sampleCountStr, setSampleCountStr] = useState<string>(String(initialSampleCount));
  const [sampleError, setSampleError] = useState<string | null>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);

  // Sync when initial values change
  useEffect(() => {
    setKeyword(initialKeyword);
    setSearchField(initialSearchField);
    setScopes(initialScopes);
    setSampleCountStr(String(initialSampleCount));
  }, [initialKeyword, initialSearchField, initialScopes, initialSampleCount]);

  // Fetch autocomplete suggestions with debounce
  useEffect(() => {
    const trimmed = keyword.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(trimmed)}&field=${searchField}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions((data.suggestions || []).length > 0);
          setActiveSuggestionIndex(-1);
        }
      } catch (err) {
        console.error('Autocomplete fetch error:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [keyword, searchField]);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        autocompleteContainerRef.current &&
        !autocompleteContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Scope toggle with strict exclusivity for 'All'
  const handleToggleScope = (scope: WorkTypeScope) => {
    if (scope === 'All') {
      setScopes(['All']);
      return;
    }

    const currentWithoutAll = scopes.filter((s) => s !== 'All');
    if (currentWithoutAll.includes(scope)) {
      const remaining = currentWithoutAll.filter((s) => s !== scope);
      if (remaining.length === 0) {
        setScopes(['All']); // Do not leave empty; default to All
      } else {
        setScopes(remaining);
      }
    } else {
      setScopes([...currentWithoutAll, scope]);
    }
  };

  // Sample Count Validation
  const validateSampleCount = (val: string): number | null => {
    const trimmed = val.trim();
    if (!trimmed) {
      setSampleError('กรุณาระบุจำนวนตัวอย่าง');
      return null;
    }
    const num = Number(trimmed);
    if (!Number.isInteger(num) || num <= 0 || !Number.isFinite(num)) {
      setSampleError('จำนวนตัวอย่างต้องเป็นจำนวนเต็มบวก (1, 2, 3...) เท่านั้น');
      return null;
    }
    setSampleError(null);
    return num;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);

    const validN = validateSampleCount(sampleCountStr);
    if (validN === null) {
      return;
    }

    onSearch({
      keyword: keyword.trim(),
      searchField,
      scopes: scopes.length > 0 ? scopes : ['All'],
      sampleCount: validN,
    });
  };

  const handleReset = () => {
    setKeyword('');
    setSearchField('all');
    setScopes(['All']);
    setSampleCountStr('1');
    setSampleError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    onReset();
  };

  const handleSelectSuggestion = (item: AutocompleteItem) => {
    setKeyword(item.value);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeSuggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 sm:p-7">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Row: Keyword & Search Field */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Keyword Input with Autocomplete */}
          <div className="lg:col-span-8 relative" ref={autocompleteContainerRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="keyword-input"
                className="text-sm font-semibold text-slate-900 flex items-center gap-1.5"
              >
                <Search className="w-4 h-4 text-blue-600" />
                <span>Keyword</span>
              </label>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Keyword สามารถเป็นได้ทั้ง Product, Material, Test item
              </span>
            </div>

            <div className="relative">
              <input
                id="keyword-input"
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์ชื่อผลิตภัณฑ์, วัตถุดิบ, หรือหัวข้อทดสอบ (เช่น Neomune, Sodium, Assay)..."
                className="w-full h-11 sm:h-12 pl-4 pr-10 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-base placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                autoComplete="off"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => {
                    setKeyword('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-sm rounded-full"
                  title="ล้างข้อความค้นหา"
                >
                  ✕
                </button>
              )}
            </div>

            <p className="text-[12px] text-slate-500 mt-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                สามารถค้นหา Item (ชื่อสาร/ทรัพยากร) และ Item no. (รหัสสาร) ได้เช่นกัน • ปล่อยว่างเพื่อค้นหาทั้งหมดใน Scope
              </span>
            </p>

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-medium text-slate-500 border-b border-slate-200 flex justify-between items-center">
                  <span>ข้อความที่ตรงในฐานข้อมูล</span>
                  <span>ใช้ลูกศรขึ้น-ลง เพื่อเลือก</span>
                </div>
                {suggestions.map((item, idx) => {
                  const isActive = idx === activeSuggestionIndex;
                  return (
                    <button
                      key={`${item.field}-${item.value}-${idx}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-sm transition-colors cursor-pointer border-b border-slate-100 last:border-b-0 ${
                        isActive ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{item.value}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {item.fieldLabel}
                        </span>
                        {item.sourceGroups.map((grp) => (
                          <span
                            key={grp}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                              grp === 'EN'
                                ? 'bg-indigo-100 text-indigo-700'
                                : grp === 'IV'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {grp}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search In Field Selector */}
          <div className="lg:col-span-4">
            <label
              htmlFor="search-field-select"
              className="text-sm font-semibold text-slate-900 block mb-1.5 flex items-center gap-1.5"
            >
              <Filter className="w-4 h-4 text-slate-600" />
              <span>ค้นหาใน</span>
            </label>
            <select
              id="search-field-select"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as SearchFieldType)}
              className="w-full h-11 sm:h-12 px-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer"
            >
              <option value="all">ทุกช่อง (Product, Test item, Item, Item no.)</option>
              <option value="product">Product / Material (คอลัมน์ B)</option>
              <option value="testItem">Test item (หัวข้อการทดสอบ คอลัมน์ C)</option>
              <option value="item">Item (ชื่อสารเคมี / อุปกรณ์ คอลัมน์ F)</option>
              <option value="itemNo">Item no. (รหัสทรัพยากร คอลัมน์ E)</option>
            </select>
            <p className="text-[12px] text-slate-500 mt-1.5">
              กำหนดขอบเขตคอลัมน์เพื่อความรวดเร็วและแม่นยำ
            </p>
          </div>
        </div>

        {/* Middle Section: Work Type Scope Selector */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Work type scope</span>
            </span>
            <span className="text-xs text-slate-500">
              เลือกได้หลายรายการ (หากเลือก All จะครอบคลุมทุกไฟล์ รวม RM และ QC line)
            </span>
          </div>

          {/* Scope Pills / Checkbox Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {ALL_SCOPES.map((scope) => {
              const isSelected = scopes.includes(scope);
              const isAll = scope === 'All';

              return (
                <button
                  key={scope}
                  type="button"
                  onClick={() => handleToggleScope(scope)}
                  className={`h-11 sm:h-12 px-3 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                    isSelected
                      ? isAll
                        ? 'bg-blue-900 text-white border-blue-950 shadow-sm ring-2 ring-blue-900/20'
                        : 'bg-blue-700 text-white border-blue-800 shadow-sm ring-2 ring-blue-600/20'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-white text-blue-900 border-white'
                        : 'border-slate-400 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <span className="truncate">{scope}</span>
                </button>
              );
            })}
          </div>

          {/* Scope Explanation Note */}
          <div className="text-[12px] text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 flex items-start gap-2">
            <span className="font-semibold text-blue-900 shrink-0">กติกา Scope:</span>
            <span>
              {scopes.includes('All') ? (
                <>
                  <strong className="text-blue-900">All</strong>: ครอบคลุมทุกไฟล์ รวม RM และ QC line
                  รวมทั้งรายการที่มี Work type ผิดรูปแบบ
                </>
              ) : (
                <>
                  เลือกใช้งาน {scopes.join(' + ')} (รายการที่อยู่ในหลาย Scope เช่น Routine &amp;
                  Stability จะนับและแสดงเพียงครั้งเดียว ไม่เกิดแถวซ้ำ)
                </>
              )}
            </span>
          </div>
        </div>

        {/* Bottom Row: Sample Count & Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end pt-2 border-t border-slate-100">
          {/* Sample Count Input */}
          <div className="md:col-span-6 lg:col-span-5">
            <label
              htmlFor="sample-count-input"
              className="text-sm font-semibold text-slate-900 block mb-1.5 flex items-center gap-1.5"
            >
              <Calculator className="w-4 h-4 text-emerald-600" />
              <span>จำนวนตัวอย่างที่ใช้คำนวณ</span>
            </label>

            <div className="flex items-center gap-2">
              <input
                id="sample-count-input"
                type="number"
                min="1"
                step="1"
                value={sampleCountStr}
                onChange={(e) => {
                  setSampleCountStr(e.target.value);
                  validateSampleCount(e.target.value);
                }}
                className={`w-28 sm:w-32 h-11 px-3 rounded-xl border bg-slate-50 text-slate-900 font-mono-num text-lg font-semibold text-center focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                  sampleError
                    ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 text-red-900'
                    : 'border-slate-300 focus:ring-blue-600/20 focus:border-blue-600'
                }`}
              />

              {/* Preset quick buttons */}
              <div className="flex items-center gap-1 flex-wrap">
                {[1, 2, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setSampleCountStr(String(n));
                      setSampleError(null);
                    }}
                    className={`h-11 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      sampleCountStr === String(n)
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {sampleError ? (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{sampleError}</span>
              </p>
            ) : (
              <p className="text-[12px] text-slate-500 mt-1.5">
                จำนวนนี้ใช้คำนวณแยกสำหรับแต่ละรายการที่ค้นพบ (ไม่หารเฉลี่ย และไม่รวมยอดข้ามผลิตภัณฑ์)
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-6 lg:col-span-7 flex items-center justify-end gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleReset}
              className="h-11 sm:h-12 px-5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>ล้างเงื่อนไข</span>
            </button>

            <button
              type="submit"
              disabled={isLoading || !!sampleError}
              className="h-11 sm:h-12 px-7 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm sm:text-base flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer min-w-[130px] justify-center"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังค้นหา...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>ค้นหา</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

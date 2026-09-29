import {
  ResourceRecord,
  SearchRequest,
  SearchResponse,
  SearchRowItem,
  WorkTypeScope,
  DistinctProductSummary,
  AutocompleteItem,
} from '../types/qc';
import { calculateRow } from './calculator';

export function matchesScope(rec: ResourceRecord, selectedScopes: WorkTypeScope[]): boolean {
  if (selectedScopes.includes('All')) {
    return true;
  }
  for (const scope of selectedScopes) {
    if (rec.scopes.includes(scope)) {
      return true;
    }
  }
  return false;
}

export function evaluateRowMatch(
  rec: ResourceRecord,
  keywordTrimmed: string,
  searchField: string
): { matched: boolean; matchedFields: string[]; matchPriority: number } {
  if (!keywordTrimmed) {
    return { matched: true, matchedFields: [], matchPriority: 3 };
  }

  const norm = rec.normalizedSearchFields;
  const kw = keywordTrimmed.normalize('NFC').toLowerCase();
  const matchedFields: string[] = [];
  let highestPriority = 99; // 1 = exact, 2 = startsWith, 3 = contains

  const checkField = (fieldName: string, label: string, val: string) => {
    if (!val) return;
    if (val === kw) {
      matchedFields.push(label);
      if (1 < highestPriority) highestPriority = 1;
    } else if (val.startsWith(kw)) {
      matchedFields.push(label);
      if (2 < highestPriority) highestPriority = 2;
    } else if (val.includes(kw)) {
      matchedFields.push(label);
      if (3 < highestPriority) highestPriority = 3;
    }
  };

  if (searchField === 'all' || searchField === 'product') {
    checkField('product', 'Product/Material', norm.product);
  }
  if (searchField === 'all' || searchField === 'testItem') {
    checkField('testItem', 'Test item', norm.testItem);
  }
  if (searchField === 'all' || searchField === 'item') {
    checkField('item', 'Item', norm.item);
  }
  if (searchField === 'all' || searchField === 'itemNo') {
    checkField('itemNo', 'Item no.', norm.itemNo);
  }

  return {
    matched: matchedFields.length > 0,
    matchedFields,
    matchPriority: highestPriority,
  };
}

export function executeSearch(
  allRecords: ResourceRecord[],
  req: SearchRequest,
  datasetVersion: string,
  ruleSetVersion: string
): SearchResponse {
  const startTime = Date.now();
  const kw = (req.keyword || '').trim();
  const scopes = (req.scopes && req.scopes.length > 0 ? req.scopes : ['All']) as WorkTypeScope[];
  const sampleCount = Number.isInteger(req.sampleCount) && req.sampleCount > 0 ? req.sampleCount : 1;

  // 1. Filter by Scope
  const scopeFiltered = allRecords.filter((rec) => matchesScope(rec, scopes));

  // 2. Filter & score by Keyword
  type ScoredRecord = {
    record: ResourceRecord;
    matchedFields: string[];
    matchPriority: number;
  };

  const matchedList: ScoredRecord[] = [];
  for (const rec of scopeFiltered) {
    const evalRes = evaluateRowMatch(rec, kw, req.searchField);
    if (evalRes.matched) {
      matchedList.push({
        record: rec,
        matchedFields: evalRes.matchedFields,
        matchPriority: evalRes.matchPriority,
      });
    }
  }

  // 3. Stable sort:
  // priority 1 (exact) -> 2 (startsWith) -> 3 (contains)
  // then sourceGroup, product, workType, testItem, sourceSheet, sourceRow
  matchedList.sort((a, b) => {
    if (a.matchPriority !== b.matchPriority) {
      return a.matchPriority - b.matchPriority;
    }
    const groupCmp = a.record.sourceGroup.localeCompare(b.record.sourceGroup);
    if (groupCmp !== 0) return groupCmp;

    const prodCmp = a.record.rawFields.product.localeCompare(b.record.rawFields.product);
    if (prodCmp !== 0) return prodCmp;

    const wtCmp = a.record.rawFields.workType.localeCompare(b.record.rawFields.workType);
    if (wtCmp !== 0) return wtCmp;

    const testCmp = a.record.rawFields.testItem.localeCompare(b.record.rawFields.testItem);
    if (testCmp !== 0) return testCmp;

    const sheetCmp = a.record.sourceSheet.localeCompare(b.record.sourceSheet);
    if (sheetCmp !== 0) return sheetCmp;

    return a.record.sourceRow - b.record.sourceRow;
  });

  // 4. Calculate metrics across the ENTIRE matched dataset (not just the page)
  let calculableCount = 0;
  let blockedCount = 0;
  let recordsWithIssuesCount = 0;

  const distinctProductsByGroup: Record<string, Set<string>> = {
    EN: new Set(),
    IV: new Set(),
    RM: new Set(),
  };
  const distinctProductAll = new Set<string>();
  const distinctTestContexts = new Set<string>();

  for (const item of matchedList) {
    const rec = item.record;
    if (rec.defaultCalculable) {
      calculableCount++;
    } else {
      blockedCount++;
    }

    if (rec.dataIssues.length > 0) {
      recordsWithIssuesCount++;
    }

    const normProd = rec.normalizedSearchFields.product;
    if (normProd) {
      const groupKey = rec.sourceGroup.startsWith('RM') ? 'RM' : rec.sourceGroup;
      if (distinctProductsByGroup[groupKey]) {
        distinctProductsByGroup[groupKey].add(normProd);
      }
      distinctProductAll.add(`${groupKey}::${normProd}`);
    }

    const contextKey = `${rec.sourceGroup}::${rec.normalizedSearchFields.product}::${rec.normalizedSearchFields.workType}::${rec.normalizedSearchFields.testItem}`;
    distinctTestContexts.add(contextKey);
  }

  // 5. Optional statusFilter (all | calculable | blocked | issues)
  let finalList = matchedList;
  if (req.statusFilter && req.statusFilter !== 'all') {
    if (req.statusFilter === 'calculable') {
      finalList = matchedList.filter((m) => m.record.defaultCalculable);
    } else if (req.statusFilter === 'blocked') {
      finalList = matchedList.filter((m) => !m.record.defaultCalculable);
    } else if (req.statusFilter === 'issues') {
      finalList = matchedList.filter((m) => m.record.dataIssues.length > 0);
    }
  }

  // 6. Pagination
  const pageSize = [25, 50, 100].includes(req.pageSize) ? req.pageSize : 25;
  const totalMatched = finalList.length;
  const totalPages = Math.max(1, Math.ceil(totalMatched / pageSize));
  const currentPage = Math.min(Math.max(1, req.page || 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedRecords = finalList.slice(startIndex, startIndex + pageSize);

  // 7. Compute QTY for the page items
  const rows: SearchRowItem[] = pagedRecords.map((item, idx) => {
    const seqNo = startIndex + idx + 1;
    const calc = calculateRow(item.record, sampleCount);
    return {
      seqNo,
      record: item.record,
      matchedFields: item.matchedFields,
      calculation: calc,
      sampleCountUsed: sampleCount,
    };
  });

  const distinctProductCount: DistinctProductSummary = {
    total: distinctProductAll.size,
    byGroup: {
      EN: distinctProductsByGroup.EN.size,
      IV: distinctProductsByGroup.IV.size,
      RM: distinctProductsByGroup.RM.size,
    },
  };

  const searchDurationMs = Date.now() - startTime;

  return {
    appliedQuery: {
      keyword: kw,
      searchField: req.searchField,
      scopes,
      sampleCount,
      page: currentPage,
      pageSize,
      viewMode: req.viewMode,
      statusFilter: req.statusFilter,
    },
    datasetVersion,
    ruleSetVersion,
    totalMatchedRecords: matchedList.length,
    calculableCount,
    blockedCount,
    recordsWithIssuesCount,
    distinctProductCount,
    distinctTestContextCount: distinctTestContexts.size,
    totalPages,
    page: currentPage,
    pageSize,
    rows,
    searchDurationMs,
  };
}

export function getAutocompleteSuggestions(
  records: ResourceRecord[],
  query: string,
  field: string = 'all',
  limit: number = 8
): AutocompleteItem[] {
  const q = (query || '').trim().normalize('NFC').toLowerCase();
  if (!q || q.length < 2) return [];

  const candidateMap = new Map<string, { value: string; field: string; fieldLabel: string; groups: Set<string> }>();

  for (const rec of records) {
    const group = rec.sourceGroup.startsWith('RM') ? 'RM' : rec.sourceGroup;

    const check = (rawVal: string, normVal: string, fName: string, fLabel: string) => {
      if (!normVal || !normVal.includes(q)) return;
      const key = `${fName}::${normVal}`;
      if (!candidateMap.has(key)) {
        candidateMap.set(key, {
          value: rawVal,
          field: fName,
          fieldLabel: fLabel,
          groups: new Set([group]),
        });
      } else {
        candidateMap.get(key)!.groups.add(group);
      }
    };

    if (field === 'all' || field === 'product') {
      check(rec.rawFields.product, rec.normalizedSearchFields.product, 'product', 'Product/Material');
    }
    if (field === 'all' || field === 'testItem') {
      check(rec.rawFields.testItem, rec.normalizedSearchFields.testItem, 'testItem', 'Test item');
    }
    if (field === 'all' || field === 'item') {
      check(rec.rawFields.item, rec.normalizedSearchFields.item, 'item', 'Item');
    }
    if (field === 'all' || field === 'itemNo') {
      check(rec.rawFields.itemNo, rec.normalizedSearchFields.itemNo, 'itemNo', 'Item no.');
    }

    if (candidateMap.size >= limit * 3) break;
  }

  const results: AutocompleteItem[] = Array.from(candidateMap.values())
    .slice(0, limit)
    .map((c) => ({
      value: c.value,
      field: c.field,
      fieldLabel: c.fieldLabel,
      sourceGroups: Array.from(c.groups),
    }));

  return results;
}

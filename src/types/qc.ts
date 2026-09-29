export type WorkTypeScope =
  | 'All'
  | 'IV Routine'
  | 'IV Stability'
  | 'EN Routine'
  | 'EN Stability'
  | 'RM'
  | 'QC line';

export const ALL_SCOPES: WorkTypeScope[] = [
  'All',
  'IV Routine',
  'IV Stability',
  'EN Routine',
  'EN Stability',
  'RM',
  'QC line',
];

export type SearchFieldType = 'all' | 'product' | 'testItem' | 'item' | 'itemNo';

export interface DataIssue {
  code: string;
  field: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface RawRowFields {
  workType: string;
  product: string;
  testItem: string;
  replicate: any;
  itemNo: string;
  item: string;
  type: any;
  qtyPerRep: any; // "Quility per 1 rep" in Excel
  unit: string;
  reagentNo: string;
  colK: string;
}

export interface ResourceRecord {
  rowId: string;
  datasetVersion: string;
  sourceFile: string;
  sourceSheet: string;
  sourceRow: number;
  sourceGroup: 'EN' | 'IV' | 'RM-1' | 'RM-2' | 'RM-3';
  isStandardSheet: boolean;
  rawFields: RawRowFields;
  normalizedSearchFields: {
    workType: string;
    product: string;
    testItem: string;
    itemNo: string;
    item: string;
  };
  parsedReplicate: number | null;
  parsedQuantity: number | null;
  unitRaw: string;
  typeRaw: any;
  typeLabel: string;
  scopes: string[];
  dataIssues: DataIssue[];
  defaultCalculable: boolean;
  blockReasons: string[];
  hasControlNote: boolean;
}

export interface DatasetManifest {
  datasetVersion: string;
  importedAt: string;
  sourceOrigin: string;
  rawRecordCount: number;
  ruleSetVersion: string;
  activeStatus: boolean;
  sourceFiles: {
    fileName: string;
    checksum: string;
    sizeBytes: number;
    sheets: {
      sheetName: string;
      headerRow: number;
      rowCount: number;
    }[];
  }[];
}

export interface SearchRequest {
  keyword: string;
  searchField: SearchFieldType;
  scopes: WorkTypeScope[];
  sampleCount: number;
  page: number;
  pageSize: number;
  viewMode: 'table' | 'grouped';
  statusFilter?: 'all' | 'calculable' | 'blocked' | 'issues';
}

export interface RowCalculationResult {
  status: 'calculable' | 'blocked';
  computedQty: number | null;
  unit: string;
  reasons: string[];
  trace: string;
}

export interface SearchRowItem {
  seqNo: number; // 1-based index in the filtered results
  record: ResourceRecord;
  matchedFields: string[];
  calculation: RowCalculationResult;
  sampleCountUsed: number;
}

export interface DistinctProductSummary {
  total: number;
  byGroup: Record<string, number>;
}

export interface SearchResponse {
  appliedQuery: {
    keyword: string;
    searchField: SearchFieldType;
    scopes: WorkTypeScope[];
    sampleCount: number;
    page: number;
    pageSize: number;
    viewMode: 'table' | 'grouped';
    statusFilter?: string;
  };
  datasetVersion: string;
  ruleSetVersion: string;
  totalMatchedRecords: number;
  calculableCount: number;
  blockedCount: number;
  recordsWithIssuesCount: number;
  distinctProductCount: DistinctProductSummary;
  distinctTestContextCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  rows: SearchRowItem[];
  searchDurationMs: number;
}

export interface AutocompleteItem {
  value: string;
  field: string;
  fieldLabel: string;
  sourceGroups: string[];
}

export interface ConfirmedRule {
  ruleId: string;
  ruleSetVersion: string;
  targetScope: {
    sourceGroup?: string;
    product?: string;
    testItem?: string;
    item?: string;
  };
  ruleType: 'time_base' | 'unit_override' | 'control_policy' | 'name_alias';
  confirmedValue: string;
  evidenceReference: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

// Core SPC Data Types
export interface DataPoint {
  id: string;
  timestamp: Date;
  value: number;
  subgroup?: number;
  batch?: string;
  operator?: string;
  notes?: string;
}

export interface Subgroup {
  id: string;
  subgroupNumber: number;
  values: number[];
  timestamp: Date;
  batch?: string;
  operator?: string;
}

export interface ProcessData {
  id: string;
  name: string;
  description?: string;
  dataPoints: DataPoint[];
  subgroups: Subgroup[];
  specifications?: Specifications;
  createdAt: Date;
  updatedAt: Date;
}

export interface Specifications {
  usl?: number; // Upper Specification Limit
  lsl?: number; // Lower Specification Limit
  target?: number;
  unit: string;
}

// Chart Types
export type ChartType = 
  | 'xbar-r' 
  | 'xbar-s' 
  | 'i-mr' 
  | 'p-chart' 
  | 'np-chart' 
  | 'c-chart' 
  | 'u-chart';

export interface ChartConfig {
  id: string;
  type: ChartType;
  processId: string;
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  sigmaLevel: number;
  showSpecifications: boolean;
  showTrendLine: boolean;
  showCapability: boolean;
  colors: ChartColors;
}

export interface ChartColors {
  dataPoint: string;
  centerLine: string;
  controlLimits: string;
  specificationLimits: string;
  outOfControl: string;
  trendLine: string;
}

export interface ControlLimits {
  ucl: number; // Upper Control Limit
  lcl: number; // Lower Control Limit
  cl: number;  // Center Line
  sigma: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
  controlLimits: ControlLimits;
  specifications?: Specifications;
}

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  pointBackgroundColor: string;
  pointBorderColor: string;
  pointRadius: number;
  pointHoverRadius: number;
  tension?: number;
  fill?: boolean;
}

// Statistical Calculations
export interface ProcessCapability {
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  cpu: number;
  cpl: number;
  sigma: number;
  ppm: number;
}

export interface StatisticalSummary {
  count: number;
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  variance: number;
  range: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
}

// Control Rules (Western Electric Rules)
export interface ControlRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'warning' | 'error';
}

export interface RuleViolation {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'warning' | 'error';
  dataPoints: number[];
  description: string;
  timestamp: Date;
}

// Dashboard and UI
export interface DashboardWidget {
  id: string;
  type: 'chart' | 'summary' | 'alert' | 'gauge';
  title: string;
  chartConfig?: ChartConfig;
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  layout: 'grid' | 'free';
  createdAt: Date;
  updatedAt: Date;
}

// Data Import/Export
export interface ImportOptions {
  fileType: 'csv' | 'excel';
  hasHeader: boolean;
  delimiter?: string;
  dateFormat?: string;
  valueColumn: number;
  timestampColumn?: number;
  subgroupColumn?: number;
  batchColumn?: number;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeCharts: boolean;
  includeStatistics: boolean;
  includeData: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// User Preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'pt';
  defaultSigmaLevel: number;
  chartColors: ChartColors;
  autoSave: boolean;
  notifications: {
    email: boolean;
    browser: boolean;
    violations: boolean;
  };
  keyboardShortcuts: Record<string, string>;
}

// Application State
export interface AppState {
  processes: ProcessData[];
  currentProcess?: ProcessData;
  dashboards: Dashboard[];
  currentDashboard?: Dashboard;
  preferences: UserPreferences;
  isLoading: boolean;
  error?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form Types
export interface ProcessFormData {
  name: string;
  description?: string;
  specifications?: {
    usl?: number;
    lsl?: number;
    target?: number;
    unit: string;
  };
}

export interface DataEntryFormData {
  value: number;
  timestamp: Date;
  subgroup?: number;
  batch?: string;
  operator?: string;
  notes?: string;
}

// Report Types
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: ReportSection[];
  defaultFormat: 'pdf' | 'excel' | 'csv';
}

export interface ReportSection {
  id: string;
  type: 'summary' | 'chart' | 'table' | 'text';
  title: string;
  content: any;
  visible: boolean;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  processId: string;
  title: string;
  generatedAt: Date;
  format: 'pdf' | 'excel' | 'csv';
  filePath?: string;
  size?: number;
}
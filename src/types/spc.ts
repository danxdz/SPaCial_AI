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
  name: string;
  type: ChartType;
  processId: string;
  specifications?: Specifications;
  controlLimits?: ControlLimits;
  subgroups?: Subgroup[];
  dataPoints?: DataPoint[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ControlLimits {
  ucl: number; // Upper Control Limit
  lcl: number; // Lower Control Limit
  centerLine: number;
  sigmaLevel: number;
}

// User and Authentication Types
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'controle' | 'method' | 'prod';
  group_id?: number;
  group_name?: string;
  workstation_id?: number;
  workstation_name?: string;
  workshop_id?: number;
  workshop_name?: string;
}

// Database Entity Types
export interface Workshop {
  id: number;
  name: string;
  description?: string;
  image_filename?: string;
  created_at: string;
  updated_at: string;
}

export interface Workstation {
  id: number;
  name: string;
  workshop_id: number;
  description?: string;
  image_filename?: string;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: number;
  name: string;
  description?: string;
  image_filename?: string;
  created_at: string;
  updated_at: string;
  // Many-to-many relationship with workshops through family_workshops junction table
  workshops?: Workshop[];
}

export interface FamilyWorkshop {
  id: number;
  family_id: number;
  workshop_id: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  family_id?: number;
  workshop_id?: number;
  image_filename?: string;
  created_at: string;
  updated_at: string;
}

export interface Route {
  id: number;
  name: string;
  description?: string;
  product_id?: number;
  workshop_id?: number;
  image_filename?: string;
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: number;
  name: string;
  description?: string;
  route_id?: number;
  product_id?: number;
  workshop_id?: number;
  specification_min?: number;
  specification_max?: number;
  target_value?: number;
  unit?: string;
  image_filename?: string;
  created_at: string;
  updated_at: string;
}

export interface Measurement {
  id: number;
  feature_id: number;
  route_id?: number;
  product_id?: number;
  value: number;
  operator_id?: number;
  workstation_id?: number;
  workshop_id?: number;
  timestamp: string;
  notes?: string;
}

// Utility Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  workshopId?: number;
  workstationId?: number;
  userId?: number;
  role?: string;
}
export type Role = "admin" | "user";

export type ReportStatus = "pending" | "in_progress" | "completed" | "rejected";

export type ReportCategory = "organic" | "plastic" | "paper";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Report {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: ReportCategory;
  address: string | null;
  latitude: number;
  longitude: number;
  photoUrl: string | null;
  predictedCategory: ReportCategory | null;
  predictedConfidence: number | null;
  status: ReportStatus;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User | null;
  reporter?: User | string | null;
  reporterName?: string | null;
}

export interface ReportHistoryEntry {
  id: string;
  reportId: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  changedBy: string | User;
  changedByUser?: User | null;
  user?: User | null;
  note: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ClassifyResult {
  category: ReportCategory;
  confidence: number;
  probabilities: Record<ReportCategory, number>;
  needsReview: boolean;
}

export interface DashboardSummary {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  rejected: number;
}

export interface DashboardStatusPoint {
  status: ReportStatus;
  count: number;
}

export interface DashboardCategoryPoint {
  category: ReportCategory;
  count: number;
}

export interface DashboardTrendPoint {
  date: string;
  count: number;
}

export interface DashboardLocationPoint {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  count: number;
}

export interface DashboardStats {
  summary: DashboardSummary;
  byStatus: DashboardStatusPoint[];
  byCategory: DashboardCategoryPoint[];
  trend: DashboardTrendPoint[];
  topLocations: DashboardLocationPoint[];
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: PaginationMeta;
}

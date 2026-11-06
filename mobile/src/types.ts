export type Role = "admin" | "user";
export type Category = "organic" | "plastic" | "paper";
export type Status = "pending" | "in_progress" | "completed" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// numeric PostgreSQL bisa datang sebagai string; koersi dengan Number() saat tampil.
export interface Report {
  id: string;
  title: string;
  description: string;
  category: Category;
  address: string | null;
  latitude: number | string;
  longitude: number | string;
  photoUrl: string | null;
  predictedCategory: Category | null;
  predictedConfidence: number | string | null;
  status: Status;
  rejectReason: string | null;
  createdAt: string;
}

export interface HistoryItem {
  fromStatus: Status | null;
  toStatus: Status;
  note: string | null;
  createdAt: string;
}

export interface ClassifyResult {
  category: Category;
  confidence: number;
  probabilities: Record<string, number>;
  needsReview: boolean;
}

export interface Stats {
  summary: { total: number; pending: number; in_progress: number; completed: number; rejected: number };
  byStatus: { status: Status; count: number }[];
  byCategory: { category: Category; count: number }[];
  trend: { date: string; count: number }[];
  topLocations: { latitude: number; longitude: number; count: number }[];
}

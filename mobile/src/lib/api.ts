import * as SecureStore from "expo-secure-store";

// SecureStore tidak ada di web; pakai localStorage. Deteksi tanpa import
// react-native agar file ini tetap bisa dites di Node polos.
export const isWeb =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const store = isWeb
  ? {
      getItemAsync: async (k: string) => window.localStorage.getItem(k),
      setItemAsync: async (k: string, v: string) => void window.localStorage.setItem(k, v),
      deleteItemAsync: async (k: string) => void window.localStorage.removeItem(k),
    }
  : SecureStore;

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api";

const TOKEN_KEY = "auth_token";
let mem: string | null | undefined;

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export async function getToken(): Promise<string | null> {
  if (mem !== undefined) return mem;
  mem = await store.getItemAsync(TOKEN_KEY);
  return mem;
}

export async function setToken(t: string) {
  mem = t;
  await store.setItemAsync(TOKEN_KEY, t);
}

export async function clearToken() {
  mem = null;
  await store.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "UNKNOWN", status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface Opts {
  method?: string;
  json?: unknown;
  form?: FormData;
  auth?: boolean;
}

type Envelope<T> = { data: T; meta?: { page: number; limit: number; total: number; totalPages: number } } & Record<string, unknown>;

// POST /auth/* mengembalikan { data, token }; endpoint lain { data, meta? }.
export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<Envelope<T>> {
  const headers: Record<string, string> = {};
  if (opts.json !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.json !== undefined || opts.form ? "POST" : "GET"),
      headers,
      body: opts.form ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
    });
  } catch {
    throw new ApiError("Tidak dapat menghubungi server. Periksa koneksi dan EXPO_PUBLIC_API_URL.", "NETWORK", 0);
  }
  if (res.status === 204) return { data: null as T };
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) {
      await clearToken();
      onUnauthorized?.();
    }
    throw new ApiError(
      body?.error?.message ?? `Request gagal (${res.status})`,
      body?.error?.code ?? "UNKNOWN",
      res.status,
    );
  }
  return body;
}

// photoUrl backend berbentuk "/uploads/..." relatif; gabung dengan origin API.
export function fileUrl(path: string | null): string | null {
  if (!path) return null;
  return API_URL.replace(/\/api\/?$/, "") + path;
}

export async function photoForm(uri: string, field: string): Promise<FormData> {
  const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] ?? "jpg";
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const form = new FormData();
  if (isWeb) {
    // FormData web butuh Blob asli; object RN { uri, name, type } ditolak fetch.
    const blob = await (await fetch(uri)).blob();
    form.append(field, blob, `photo.${ext}`);
  } else {
    form.append(field, { uri, name: `photo.${ext}`, type } as unknown as Blob);
  }
  return form;
}

import * as SecureStore from "expo-secure-store";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api";

const TOKEN_KEY = "auth_token";
let mem: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (mem !== undefined) return mem;
  mem = await SecureStore.getItemAsync(TOKEN_KEY);
  return mem;
}

export async function setToken(t: string) {
  mem = t;
  await SecureStore.setItemAsync(TOKEN_KEY, t);
}

export async function clearToken() {
  mem = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY);
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
    if (res.status === 401) await clearToken();
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

export function photoForm(uri: string, field: string): FormData {
  const ext = uri.split(".").pop()?.toLowerCase().split("?")[0] ?? "jpg";
  const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const form = new FormData();
  form.append(field, { uri, name: `photo.${ext}`, type } as unknown as Blob);
  return form;
}

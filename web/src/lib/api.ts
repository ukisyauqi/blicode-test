import type { ApiEnvelope, PaginationMeta } from "@/types";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api").replace(
  /\/+$/,
  "",
);

export const AUTH_UNAUTHORIZED_EVENT = "lapor-sampah:unauthorized";

export type QueryValue = string | number | boolean | null | undefined;

export type QueryParams = Record<string, QueryValue>;

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: QueryParams;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get fieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    if (Array.isArray(this.details)) {
      for (const item of this.details) {
        if (
          typeof item === "object" &&
          item !== null &&
          "path" in item &&
          "message" in item &&
          typeof item.message === "string"
        ) {
          const path = typeof item.path === "string" ? item.path : "";
          if (path) result[path] = item.message;
        }
      }
    }
    return result;
  }
}

export function buildQueryString(query?: QueryParams): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function shouldNotifyUnauthorized(path: string): boolean {
  return !path.startsWith("/auth/login") && !path.startsWith("/auth/register");
}

function toApiError(status: number, payload: unknown, fallbackMessage: string): ApiError {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "object" && error !== null) {
      const code =
        "code" in error && typeof error.code === "string" ? error.code : `HTTP_${status}`;
      const message =
        "message" in error && typeof error.message === "string" ? error.message : fallbackMessage;
      const details = "details" in error ? error.details : undefined;
      return new ApiError(status, code, message, details);
    }
  }
  return new ApiError(status, `HTTP_${status}`, fallbackMessage);
}

function serializeBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob) {
    return body;
  }
  headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<ApiEnvelope<T>> {
  const { method = "GET", query, body, headers, signal } = options;
  const url = `${API_URL}${path}${buildQueryString(query)}`;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      credentials: "include",
      headers: requestHeaders,
      body: serializeBody(body, requestHeaders),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
    );
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  const contentType = response.headers.get("content-type") ?? "";
  const rawText = await response.text();
  let payload: unknown = undefined;

  if (contentType.includes("application/json") && rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      shouldNotifyUnauthorized(path)
    ) {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    }
    throw toApiError(response.status, payload, response.statusText || "Permintaan gagal");
  }

  if (payload === undefined) {
    throw new ApiError(response.status, "INVALID_RESPONSE", "Respons server tidak valid");
  }

  return payload as ApiEnvelope<T>;
}

export const api = {
  get<T>(path: string, query?: QueryParams, signal?: AbortSignal) {
    return apiRequest<T>(path, { query, signal });
  },
  post<T>(path: string, body?: unknown, query?: QueryParams) {
    return apiRequest<T>(path, { method: "POST", body, query });
  },
  put<T>(path: string, body?: unknown, query?: QueryParams) {
    return apiRequest<T>(path, { method: "PUT", body, query });
  },
  patch<T>(path: string, body?: unknown, query?: QueryParams) {
    return apiRequest<T>(path, { method: "PATCH", body, query });
  },
  delete<T>(path: string, query?: QueryParams) {
    return apiRequest<T>(path, { method: "DELETE", query });
  },
};

export function withMeta<T>(
  envelope: ApiEnvelope<T>,
  fallbackMeta: PaginationMeta,
): {
  data: T;
  meta: PaginationMeta;
} {
  return { data: envelope.data, meta: envelope.meta ?? fallbackMeta };
}

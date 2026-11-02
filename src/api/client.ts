const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TOKEN_KEY = "recruitment.token";
const NETWORK_ERROR = "Cannot reach the server. Is the API running?";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** The raw `detail` from the response, for errors that carry more than a message. */
    public detail?: unknown,
  ) {
    super(message);
  }
}

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// AuthProvider registers this so any 401 (e.g. expired token) logs the user out.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

function errorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  // FastAPI validation errors: [{loc: [...], msg: "..."}]
  if (Array.isArray(detail)) {
    return detail.map((d) => `${(d.loc ?? []).slice(1).join(".")}: ${d.msg}`).join("; ");
  }
  // Structured errors, e.g. {message, resume_id} for a duplicate upload.
  const message = (detail as { message?: unknown } | null)?.message;
  if (typeof message === "string") return message;
  return fallback;
}

function apiError(status: number, body: unknown, hadToken: boolean): ApiError {
  if (status === 401 && hadToken) onUnauthorized?.();
  const detail = (body as { detail?: unknown } | null)?.detail;
  return new ApiError(status, errorMessage(detail, `Request failed (${status})`), detail);
}

async function send(path: string, options: RequestInit = {}): Promise<Response> {
  const token = tokenStore.get();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, NETWORK_ERROR);
  }
  if (!response.ok) {
    throw apiError(response.status, await response.json().catch(() => null), token !== null);
  }
  return response;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await send(path, options);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** GET a file. Needed because <iframe>/<a href> can't send the Authorization header. */
export async function apiBlob(path: string): Promise<Blob> {
  return (await send(path)).blob();
}

/**
 * POST one file as multipart/form-data under the field name "file".
 * Uses XMLHttpRequest because fetch() can't report upload progress.
 */
export function apiUpload<T>(
  path: string,
  file: File,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const token = tokenStore.get();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}${path}`);
    xhr.responseType = "json";
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response as T);
      else reject(apiError(xhr.status, xhr.response, token !== null));
    };
    xhr.onerror = () => reject(new ApiError(0, NETWORK_ERROR));
    xhr.onabort = () => reject(new ApiError(0, "Upload cancelled"));
    signal?.addEventListener("abort", () => xhr.abort());

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

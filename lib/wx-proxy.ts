const STORAGE_KEY = "wxBaseUrl";

export function getWxBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY) || "";
}

export async function wxFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getWxBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "WeChat API base URL is not configured. Please set it in Settings."
    );
  }
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const res = await fetch(`/api/wx-proxy/${cleanPath}`, {
    ...options,
    headers: {
      ...options.headers,
      "X-Wx-Base-Url": baseUrl,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed with status ${res.status}`);
  }
  return res.json();
}

import { useUserStore } from "@/stores/user";

export class ApiError extends Error {
  code?: string;
  status: number;
  data?: any;

  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export async function request<T>(url: string, options: RequestInit = {}) {
  const user = useUserStore();

  // Normalize headers and default to JSON.
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  // Attach auth token if present.
  if (user.token) {
    headers.set("Authorization", `Bearer ${user.token}`);
  }

  // Send request; throw a rich error on non-2xx.
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) {
      user.logout();
    }
    throw new ApiError(
      err.message || `HTTP ${res.status}`,
      res.status,
      err.code,
      err
    );
  }

  // Parse JSON response.
  return (await res.json()) as T;
}

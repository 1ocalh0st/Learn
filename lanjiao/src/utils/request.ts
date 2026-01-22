import { useUserStore } from "@/stores/user";

export async function request<T>(url: string, options: RequestInit = {}) {
  const user = useUserStore();

  // 规范化请求头，并把 Content-Type 设为 application/json
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  // 如果有鉴权 token，就带上。
  if (user.token) {
    headers.set("Authorization", `Bearer ${user.token}`);
  }

  // 发起请求；如果返回非 2xx，就抛出带信息的错误。
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  // 解析 JSON 响应。
  return (await res.json()) as T;
}

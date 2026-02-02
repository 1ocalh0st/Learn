import { defineStore } from 'pinia'

const KEY = "auth";

type Auth = { token: string; name: string; exp?: number };

const canUseWindow = typeof window !== "undefined";
const storage = canUseWindow ? window.localStorage : null;
const atobFn = typeof globalThis.atob === "function" ? globalThis.atob.bind(globalThis) : null;

let expiryTimer: ReturnType<typeof setTimeout> | null = null;

function clearExpiryTimer() {
  if (expiryTimer !== null) {
    clearTimeout(expiryTimer);
    expiryTimer = null;
  }
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  try {
    if (!atobFn) return null;
    return JSON.parse(atobFn(base64 + pad));
  } catch {
    return null;
  }
}

function getTokenExpMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return null;
  return exp * 1000;
}

function scheduleExpiry(expMs: number | null, onExpire: () => void) {
  clearExpiryTimer();
  if (!expMs) return;
  const delay = expMs - Date.now();
  if (delay <= 0) {
    onExpire();
    return;
  }
  expiryTimer = setTimeout(onExpire, delay);
}

function safeGetItem(key: string) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string) {
  try {
    storage?.setItem(key, value);
  } catch {
    // ignore storage failures (e.g., private mode restrictions)
  }
}

function safeRemoveItem(key: string) {
  try {
    storage?.removeItem(key);
  } catch {
    // ignore storage failures
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    name: '',
    exp: null as number | null,
    info: null as any,
  }),
  actions: {
    initFromStorage() {
      if (!canUseWindow) return;
      const raw = safeGetItem(KEY);
      if (!raw) return;
      try {
        const data = JSON.parse(raw) as Auth;
        const token = data.token || "";
        const expMs = typeof data.exp === "number" ? data.exp : getTokenExpMs(token);
        if (!token || !expMs || Date.now() >= expMs) {
          this.logout();
          return;
        }
        this.token = token;
        this.name = data.name || "";
        this.exp = expMs;
        scheduleExpiry(expMs, () => this.logout());
      } catch {
        safeRemoveItem(KEY);
      }
    },
    setAuth(token: string, name: string) {
      const expMs = getTokenExpMs(token);
      this.token = token;
      this.name = name;
      this.exp = expMs;
      safeSetItem(KEY, JSON.stringify({ token, name, exp: expMs ?? undefined }));
      scheduleExpiry(expMs, () => this.logout());
    },
    logout() {
      this.token = '';
      this.name = '';
      this.exp = null;
      clearExpiryTimer();
      safeRemoveItem(KEY);
    },
    setInfo(info: any) {
      this.info = info;
    },
  },
});

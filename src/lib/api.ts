// Sheet Best API client.
// Base URL points at the user's spreadsheet; tabs are addressed via /tabs/<Tab>.
// Filter-based row updates: /tabs/<Tab>/<Column>/<Value>  (PATCH or DELETE).
import { toast } from "sonner";

export const SHEET_BEST_BASE =
  "https://api.sheetbest.com/sheets/92442446-67ee-419b-afdf-8c54107b0fba";

const tabUrl = (tab: string) => `${SHEET_BEST_BASE}/tabs/${encodeURIComponent(tab)}`;
const rowUrl = (tab: string, col: string, val: string) =>
  `${tabUrl(tab)}/${encodeURIComponent(col)}/${encodeURIComponent(val)}`;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${txt.slice(0, 120)}`);
  }
  // Sheet Best can return empty bodies for DELETE
  const text = await res.text();
  return (text ? JSON.parse(text) : ([] as unknown)) as T;
}

export const sheet = {
  get: <T = any>(tab: string) => request<T[]>(tabUrl(tab)),
  post: <T = any>(tab: string, row: T | T[]) =>
    request<T>(tabUrl(tab), { method: "POST", body: JSON.stringify(row) }),
  patch: <T = any>(tab: string, col: string, val: string, row: Partial<T>) =>
    request<T>(rowUrl(tab, col, val), { method: "PATCH", body: JSON.stringify(row) }),
  remove: (tab: string, col: string, val: string) =>
    request<unknown>(rowUrl(tab, col, val), { method: "DELETE" }),
};

export function notifyApiError(action: string, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[SheetBest] ${action} failed:`, msg);
  toast.error(`فشل الاتصال بالخادم (${action})`);
}

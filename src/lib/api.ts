const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
let token: string | null = localStorage.getItem("admin_token");

export const hasToken = () => !!token;
export const setToken = (t: string | null) => {
  token = t;
  if (t) localStorage.setItem("admin_token", t); else localStorage.removeItem("admin_token");
};

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}/api${path}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401 && token) { setToken(null); window.dispatchEvent(new Event("auth-expired")); }
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = typeof j.detail === "string" ? j.detail : j.detail?.[0]?.msg ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ---- formatting: the hospital runs on East Africa Time (UTC+3, no DST) ----
const EAT = 3 * 3600 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const todayKey = () => new Date(Date.now() + EAT).toISOString().slice(0, 10);
const eat = (iso: string) => new Date(new Date(iso).getTime() + EAT);
export const fmtTime = (iso: string) => { const d = eat(iso); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
export const fmtDateTime = (iso: string) => { const d = eat(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${fmtTime(iso)}`; };
export const fmtDay = (key: string) => { const d = new Date(`${key}T00:00:00Z`); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
export const money = (n: number) => `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
/** Local-time ISO for a slot start the API returned, passed back unchanged. */
export const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

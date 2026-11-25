import { useCallback, useEffect, useMemo, useState } from "react";
import { api, fmtDateTime } from "../lib/api";
import type { NotifRow } from "../lib/types";
import { Badge, Button, ErrorText, inputCls, PageHeader, Stat, Table } from "../components";

export default function NotificationLog() {
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [rows, setRows] = useState<NotifRow[] | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    const q = new URLSearchParams({ ...(status && { status }), ...(channel && { channel }) }).toString();
    api<NotifRow[]>(`/admin/notifications${q ? `?${q}` : ""}`).then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  }, [status, channel]);
  useEffect(() => { setRows(null); load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const count = useMemo(() => (s: string) => (rows ?? []).filter((r) => r.status === s).length, [rows]);

  const retry = async (n: NotifRow) => {
    try { await api(`/admin/notifications/${n.id}/retry`, { method: "POST" }); load(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <PageHeader title="Notifications">
        <select className={`${inputCls} w-auto`} value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="">Email + SMS</option><option value="email">Email</option><option value="sms">SMS</option>
        </select>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option><option value="sent">Sent</option><option value="pending">Pending</option>
          <option value="failed">Failed</option><option value="dry_run">Dry run</option>
        </select>
      </PageHeader>
      <ErrorText msg={err} />
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Sent" value={String(count("sent"))} />
        <Stat label="Pending" value={String(count("pending"))} tone={count("pending") ? "text-amber-600" : ""} />
        <Stat label="Failed" value={String(count("failed"))} tone={count("failed") ? "text-red-600" : ""} hint="retry from the table" />
        <Stat label="Dry run" value={String(count("dry_run"))} hint="no SMTP / SMS keys set: logged only" />
      </div>
      <Table head={["Created", "To", "Channel", "Type", "Message", "Status", ""]} empty={rows && !rows.length ? "No notifications yet." : rows ? undefined : "Loading…"}>
        {rows?.map((n) => (
          <tr key={n.id}>
            <td className="whitespace-nowrap px-4 py-3">{fmtDateTime(n.created_at)}</td>
            <td className="px-4 py-3">{n.user_name}<div className="text-xs text-slate-500">{n.recipient}</div></td>
            <td className="px-4 py-3 uppercase text-xs font-semibold text-slate-600">{n.channel}</td>
            <td className="px-4 py-3 font-mono text-xs">{n.kind}</td>
            <td className="max-w-xs px-4 py-3 text-slate-600"><div className="line-clamp-2" title={n.body}>{n.body}</div></td>
            <td className="px-4 py-3"><Badge value={n.status} />{n.error && n.status !== "dry_run" && <div className="mt-1 max-w-[12rem] truncate text-xs text-red-600" title={n.error}>{n.error}</div>}</td>
            <td className="px-4 py-3 text-right">{(n.status === "failed" || n.status === "dry_run") && <Button variant="outline" onClick={() => retry(n)}>Retry</Button>}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

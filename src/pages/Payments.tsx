import { useCallback, useEffect, useMemo, useState } from "react";
import { api, downloadCsv, fmtDateTime, money } from "../lib/api";
import type { PaymentRow } from "../lib/types";
import { Badge, Button, ErrorText, inputCls, PageHeader, Stat, Table } from "../components";

const STATUSES = ["", "paid", "pending", "failed", "refund_due", "refunded"];

export default function Payments() {
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setRows(null);
    api<PaymentRow[]>(`/admin/payments${status ? `?status=${status}` : ""}`).then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  }, [status]);
  useEffect(load, [load]);

  const totals = useMemo(() => {
    const t = (s: string) => (rows ?? []).filter((r) => r.status === s).reduce((a, r) => a + r.amount, 0);
    return { paid: t("paid"), refundDue: t("refund_due"), refunded: t("refunded") };
  }, [rows]);

  const refund = async (p: PaymentRow) => {
    if (!confirm(`Confirm you have refunded ${money(p.amount)} to ${p.patient}? Reverse it in M-Pesa/your bank first.`)) return;
    try { await api(`/admin/payments/${p.id}/refunded`, { method: "POST" }); load(); } catch (e) { setErr((e as Error).message); }
  };

  const exportCsv = () =>
    downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["ID", "Appointment", "Patient", "Doctor", "Method", "Amount", "Status", "Reference", "Date"],
      ...(rows ?? []).map((r) => [r.id, r.appointment_id, r.patient, r.doctor, r.method, r.amount, r.status, r.provider_ref ?? "", r.created_at]),
    ]);

  return (
    <>
      <PageHeader title="Payments">
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace("_", " ") : "All statuses"}</option>)}
        </select>
        <Button variant="outline" onClick={exportCsv} disabled={!rows?.length}>Export CSV</Button>
      </PageHeader>
      <ErrorText msg={err} />
      <div className="mb-5 grid grid-cols-3 gap-4">
        <Stat label="Paid (shown)" value={money(totals.paid)} />
        <Stat label="Refunds due" value={money(totals.refundDue)} tone={totals.refundDue ? "text-orange-600" : ""} />
        <Stat label="Refunded" value={money(totals.refunded)} />
      </div>
      <Table head={["Date", "Patient", "Doctor", "Method", "Amount", "Status", "Reference", ""]} empty={rows && !rows.length ? "No payments found." : rows ? undefined : "Loading…"}>
        {rows?.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap px-4 py-3">{fmtDateTime(r.created_at)}</td>
            <td className="px-4 py-3">{r.patient}</td>
            <td className="px-4 py-3">{r.doctor}</td>
            <td className="px-4 py-3 capitalize">{r.method}</td>
            <td className="px-4 py-3 font-medium">{money(r.amount)}</td>
            <td className="px-4 py-3"><Badge value={r.status} /></td>
            <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.provider_ref ?? "—"}</td>
            <td className="px-4 py-3 text-right">{r.status === "refund_due" && <Button variant="outline" onClick={() => refund(r)}>Mark refunded</Button>}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

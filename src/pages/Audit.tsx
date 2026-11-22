import { useEffect, useState } from "react";
import { api, fmtDateTime } from "../lib/api";
import type { AuditRow } from "../lib/types";
import { ErrorText, PageHeader, Table } from "../components";

export default function Audit() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api<AuditRow[]>("/admin/audit?limit=200").then(setRows).catch((e) => { setErr(e.message); setRows([]); }); }, []);

  return (
    <>
      <PageHeader title="Audit log" />
      <ErrorText msg={err} />
      <Table head={["When", "Staff", "Action", "Detail"]} empty={rows && !rows.length ? "No activity recorded yet." : rows ? undefined : "Loading…"}>
        {rows?.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap px-4 py-3">{fmtDateTime(r.created_at)}</td>
            <td className="px-4 py-3">{r.admin}</td>
            <td className="px-4 py-3 font-mono text-xs">{r.action}</td>
            <td className="px-4 py-3 text-slate-600">{r.detail}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

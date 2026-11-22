import { useEffect, useState } from "react";
import { api, fmtDay, money, pct } from "../lib/api";
import type { Summary } from "../lib/types";
import { Bars, Card, ErrorText, inputCls, PageHeader, Stat } from "../components";

export default function Overview() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setS(null);
    setErr("");
    api<Summary>(`/admin/reports/summary?days=${days}`)
      .then(setS)
      .catch((e) => setErr(e.message || "Failed to load overview summary."));
  }, [days]);

  return (
    <>
      <PageHeader title="Overview">
        <select
          className={`${inputCls} w-auto`}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </PageHeader>
      <ErrorText msg={err} />
      {!s ? (
        <p className="text-slate-500">{err ? "" : "Loading…"}</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Stat
              label="Fees collected"
              value={money(s.collected ?? 0)}
              hint={`last ${s.period_days ?? days} days`}
            />
            <Stat
              label="Awaiting payment"
              value={money(s.pending_payments ?? 0)}
              hint="held slots not yet paid"
              tone="text-amber-600"
            />
            <Stat
              label="Refunds due"
              value={money(s.refunds_due ?? 0)}
              hint="needs action in Payments"
              tone={s.refunds_due ? "text-orange-600" : ""}
            />
            <Stat
              label="Patient turnout"
              value={pct(s.turnout_rate ?? 0)}
              hint="attended ÷ (attended + no-show)"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-semibold">Daily collections</h2>
              <Bars
                items={(s.daily_collected ?? []).map((d) => ({
                  label: fmtDay(d.date),
                  value: d.amount,
                }))}
                format={money}
              />
            </Card>
            <Card>
              <h2 className="mb-4 font-semibold">Peak booking hours</h2>
              <Bars
                items={Object.entries(s.bookings_by_hour ?? {}).map(([h, v]) => ({
                  label: `${h.padStart(2, "0")}:00`,
                  value: v,
                }))}
              />
            </Card>
            <Card>
              <h2 className="mb-4 font-semibold">
                Doctor utilisation{" "}
                <span className="text-xs font-normal text-slate-500">
                  (confirmed + completed bookings)
                </span>
              </h2>
              <Bars
                items={Object.entries(s.bookings_per_doctor ?? {})
                  .map(([label, value]) => ({ label, value }))
                  .sort((a, b) => b.value - a.value)}
              />
            </Card>
            <Card>
              <h2 className="mb-4 font-semibold">Collected by method</h2>
              <Bars
                items={Object.entries(s.collected_by_method ?? {}).map(
                  ([label, value]) => ({ label, value })
                )}
                format={money}
              />
              <h2 className="mb-3 mt-6 font-semibold">Appointments by status</h2>
              <Bars
                items={Object.entries(s.appointments_by_status ?? {}).map(
                  ([label, value]) => ({
                    label: label.replace("_", " "),
                    value,
                  })
                )}
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
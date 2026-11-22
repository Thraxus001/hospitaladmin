import { useCallback, useEffect, useRef, useState } from "react";
import { api, fmtDateTime, fmtTime } from "../lib/api";
import type { Appointment, Doctor, Notif } from "../lib/types";
import { Badge, Button, Card, ErrorText, PageHeader, Table } from "../components";

const countdown = (mins: number) =>
  mins <= 0 ? "now" : mins < 60 ? `in ${Math.ceil(mins)} min` : `in ${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;

export default function DoctorHome() {
  const [me, setMe] = useState<Doctor | null>(null);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [today, setToday] = useState<Appointment[]>([]);
  const [feed, setFeed] = useState<Notif[]>([]);
  const [now, setNow] = useState(Date.now());
  const [err, setErr] = useState("");
  const [perm, setPerm] = useState<string>(typeof Notification === "undefined" ? "denied" : Notification.permission);
  const seen = useRef<Set<number> | null>(null);

  const load = useCallback(async () => {
    try {
      const [u, t, f] = await Promise.all([
        api<Appointment[]>("/doctor/upcoming?hours=24"), api<Appointment[]>("/doctor/appointments"), api<Notif[]>("/doctor/notifications"),
      ]);
      setUpcoming(u); setToday(t); setFeed(f); setErr("");
      if (seen.current === null) seen.current = new Set(f.map((x) => x.id));  // don't pop alerts for old items
      else for (const n of f) {
        if (seen.current.has(n.id)) continue;
        seen.current.add(n.id);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(n.subject, { body: n.body });
      }
    } catch (e) { setErr((e as Error).message); }
  }, []);

  useEffect(() => {
    api<Doctor>("/doctor/me").then(setMe).catch((e) => setErr(e.message));
    load();
    const a = setInterval(load, 30000), b = setInterval(() => setNow(Date.now()), 15000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [load]);

  const act = async (a: Appointment, what: "complete" | "no-show") => {
    if (what === "no-show" && !confirm(`Mark ${a.patient?.full_name} as a no-show?`)) return;
    try { await api(`/doctor/appointments/${a.id}/${what}`, { method: "POST" }); load(); } catch (e) { setErr((e as Error).message); }
  };
  const readAll = async () => { await api("/doctor/notifications/read-all", { method: "POST" }); load(); };
  const enableAlerts = async () => setPerm(await Notification.requestPermission());

  const next = upcoming[0];
  const mins = next ? (Date.parse(next.start_at) - now) / 60000 : 0;
  const soon = !!next && mins <= 30;
  const unread = feed.filter((n) => !n.read_at).length;

  return (
    <>
      <PageHeader title={me ? `Good day, ${me.full_name}` : "My day"}>
        {typeof Notification !== "undefined" && perm === "default" && <Button variant="outline" onClick={enableAlerts}>Enable desktop alerts</Button>}
      </PageHeader>
      <ErrorText msg={err} />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className={soon ? "border-amber-300 bg-amber-50" : ""}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next patient</p>
            {next ? (
              <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold">{next.patient?.full_name}</p>
                  <p className="text-slate-600">{fmtTime(next.start_at)}–{fmtTime(next.end_at)} · {next.patient?.phone}</p>
                  {next.priority < 2 && <p className="mt-1 text-sm font-semibold text-red-600">{next.priority === 0 ? "EMERGENCY" : "HIGH PRIORITY"}</p>}
                </div>
                <p className={`text-3xl font-bold ${soon ? "text-amber-600" : "text-emerald-600"}`}>{countdown(mins)}</p>
              </div>
            ) : <p className="mt-2 text-slate-500">No more patients in the next 24 hours.</p>}
          </Card>

          <section>
            <h2 className="mb-3 font-semibold">Upcoming (next 24 hours)</h2>
            <Table head={["Time", "Patient", "Contact", "Priority"]} empty={!upcoming.length ? "Nothing scheduled." : undefined}>
              {upcoming.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{fmtDateTime(a.start_at)}</td>
                  <td className="px-4 py-3">{a.patient?.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.patient?.phone}</td>
                  <td className="px-4 py-3">{a.priority === 0 ? <span className="font-semibold text-red-600">Emergency</span> : a.priority === 1 ? <span className="font-semibold text-orange-600">High</span> : "Normal"}</td>
                </tr>
              ))}
            </Table>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Today’s clinic</h2>
            <Table head={["Time", "Patient", "Status", ""]} empty={!today.length ? "No appointments today." : undefined}>
              {today.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{fmtTime(a.start_at)}</td>
                  <td className="px-4 py-3">{a.patient?.full_name}</td>
                  <td className="px-4 py-3"><Badge value={a.status} /></td>
                  <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                    {a.status === "confirmed" && Date.parse(a.start_at) <= now && <>
                      <Button variant="outline" onClick={() => act(a, "complete")}>Seen</Button>
                      <Button variant="danger" onClick={() => act(a, "no-show")}>No-show</Button>
                    </>}
                  </td>
                </tr>
              ))}
            </Table>
          </section>
        </div>

        <Card className="h-fit">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Alerts {unread > 0 && <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}</h2>
            <Button variant="ghost" onClick={readAll} disabled={!unread}>Mark all read</Button>
          </div>
          <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {feed.map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-emerald-500"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{n.subject}</p>
                    <p className="text-sm text-slate-600">{n.body}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{fmtDateTime(n.created_at)}</p>
                  </div>
                </div>
              </li>
            ))}
            {!feed.length && <li className="py-6 text-center text-sm text-slate-500">No alerts yet. You’ll see each upcoming patient here up to 30 minutes before their slot.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}

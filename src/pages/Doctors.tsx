import { useCallback, useEffect, useState } from "react";
import { api, money, WEEKDAYS } from "../lib/api";
import type { Doctor, ScheduleWindow } from "../lib/types";
import { Badge, Button, Card, ErrorText, inputCls, Label, Modal, PageHeader, Table } from "../components";

export default function Doctors() {
  const [doctors, setDoctors] = useState<Doctor[] | null>(null);
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [adding, setAdding] = useState(false);
  const [accountFor, setAccountFor] = useState<Doctor | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api<Doctor[]>("/admin/doctors").then((d) => { setDoctors(d); setSelected((s) => d.find((x) => x.id === s?.id) ?? null); }).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  const toggle = async (d: Doctor, active: boolean) => {
    try { await api(`/admin/doctors/${d.id}/active?active=${active}`, { method: "POST" }); load(); }
    catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <PageHeader title="Doctors & schedules"><Button onClick={() => setAdding(true)}>+ Add doctor</Button></PageHeader>
      <ErrorText msg={err} />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Table head={["Doctor", "Fee", "Slot", "Max/day", "Visiting days", "Login", ""]} empty={doctors && !doctors.length ? "No doctors yet." : doctors ? undefined : "Loading…"}>
          {doctors?.map((d) => (
            <tr key={d.id} onClick={() => setSelected(d)} className={`cursor-pointer hover:bg-slate-50 ${selected?.id === d.id ? "bg-emerald-50/50" : ""}`}>
              <td className={`px-4 py-3 font-medium ${d.active ? "" : "text-slate-400"}`}>{d.full_name}{!d.active && <span className="ml-2 text-xs font-normal">(inactive)</span>}<div className="text-xs font-normal text-slate-500">{d.specialty} · {d.hospital_location}</div></td>
              <td className="px-4 py-3">{money(d.consultation_fee)}</td>
              <td className="px-4 py-3">{d.slot_minutes} min</td>
              <td className="px-4 py-3">{d.max_daily_appointments}</td>
              <td className="px-4 py-3 text-xs">{d.working_days.length ? d.working_days.map((w) => WEEKDAYS[w].slice(0, 3)).join(", ") : <Badge value="no schedule" />}</td>
              <td className="px-4 py-3 text-xs">{d.has_login ? <Badge value="confirmed" /> : <span className="text-slate-400">none</span>}</td>
              <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                {!d.has_login && <Button variant="outline" onClick={() => setAccountFor(d)}>Create login</Button>}
                <Button variant="outline" onClick={() => toggle(d, !d.active)}>{d.active ? "Deactivate" : "Activate"}</Button>
              </td>
            </tr>
          ))}
        </Table>
        {selected ? <SchedulePanel key={selected.id} doctor={selected} onChange={load} /> : <Card className="h-fit text-sm text-slate-500">Select a doctor to manage their visiting windows.</Card>}
      </div>
      {accountFor && <AccountModal doctor={accountFor} onClose={() => setAccountFor(null)} onDone={() => { setAccountFor(null); load(); }} />}
      {adding && <AddDoctor onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} />}
    </>
  );
}

function SchedulePanel({ doctor, onChange }: { doctor: Doctor; onChange: () => void }) {
  const [rows, setRows] = useState<ScheduleWindow[]>([]);
  const [weekday, setWeekday] = useState(0);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [err, setErr] = useState("");

  const load = useCallback(() => { api<ScheduleWindow[]>(`/admin/doctors/${doctor.id}/schedule`).then(setRows).catch((e) => setErr(e.message)); }, [doctor.id]);
  useEffect(load, [load]);

  const add = async () => {
    setErr("");
    try { await api(`/admin/doctors/${doctor.id}/schedule`, { body: { weekday, start_time: start, end_time: end } }); load(); onChange(); }
    catch (e) { setErr((e as Error).message); }
  };
  const remove = async (id: number) => {
    if (!confirm("Remove this window? Existing bookings are kept, but no new slots will be offered.")) return;
    try { await api(`/admin/schedule/${id}`, { method: "DELETE" }); load(); onChange(); } catch (e) { setErr((e as Error).message); }
  };

  return (
    <Card className="h-fit">
      <h2 className="font-semibold">{doctor.full_name}</h2>
      <p className="mb-4 text-xs text-slate-500">{doctor.slot_minutes}-minute slots, generated from these windows</p>
      <ErrorText msg={err} />
      <ul className="mb-5 divide-y divide-slate-100 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2">
            <span><b className="font-medium">{WEEKDAYS[r.weekday]}</b> · {r.start_time}–{r.end_time}</span>
            <button className="text-red-500 hover:text-red-700" onClick={() => remove(r.id)}>Remove</button>
          </li>
        ))}
        {!rows.length && <li className="py-2 text-slate-500">No windows yet — patients can’t book this doctor.</li>}
      </ul>
      <div className="grid grid-cols-3 gap-2">
        <select className={inputCls} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>{WEEKDAYS.map((w, i) => <option key={w} value={i}>{w.slice(0, 3)}</option>)}</select>
        <input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      <Button className="mt-3 w-full" variant="outline" onClick={add}>Add window</Button>
    </Card>
  );
}

function AddDoctor({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ full_name: "", specialty: "", hospital_location: "", slot_minutes: 20, consultation_fee: "", max_daily_appointments: 20, login_phone: "", login_email: "", login_password: "" });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f, v: string | number) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    try {
      const login = f.login_phone && f.login_password ? { login_phone: f.login_phone, login_email: f.login_email || null, login_password: f.login_password } : {};
      const { login_phone: _p, login_email: _e, login_password: _w, ...doc } = f;
      await api("/admin/doctors", { body: { ...doc, ...login, consultation_fee: Number(f.consultation_fee) } });
      onDone();
    }
    catch (e) { setErr((e as Error).message); }
  };
  return (
    <Modal title="Add visiting doctor" onClose={onClose}>
      <ErrorText msg={err} />
      <Label text="Full name"><input className={inputCls} value={f.full_name} onChange={(e) => set("full_name", e.target.value)} /></Label>
      <div className="grid grid-cols-2 gap-3">
        <Label text="Specialty"><input className={inputCls} value={f.specialty} onChange={(e) => set("specialty", e.target.value)} /></Label>
        <Label text="Hospital location"><input className={inputCls} value={f.hospital_location} onChange={(e) => set("hospital_location", e.target.value)} /></Label>
        <Label text="Slot length"><select className={inputCls} value={f.slot_minutes} onChange={(e) => set("slot_minutes", Number(e.target.value))}>{[20, 25, 30].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select></Label>
        <Label text="Consultation fee (KES)"><input type="number" min={1} className={inputCls} value={f.consultation_fee} onChange={(e) => set("consultation_fee", e.target.value)} /></Label>
        <Label text="Max appointments / day"><input type="number" min={1} className={inputCls} value={f.max_daily_appointments} onChange={(e) => set("max_daily_appointments", Number(e.target.value))} /></Label>
      </div>
      <p className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor dashboard login (optional)</p>
      <p className="mb-3 text-xs text-slate-500">The doctor signs in with this phone and password, and receives “next patient” alerts here, by email and by SMS.</p>
      <div className="grid grid-cols-2 gap-3">
        <Label text="Phone"><input className={inputCls} value={f.login_phone} onChange={(e) => set("login_phone", e.target.value)} /></Label>
        <Label text="Email"><input className={inputCls} value={f.login_email} onChange={(e) => set("login_email", e.target.value)} /></Label>
        <Label text="Password (8+ chars)"><input type="password" className={inputCls} value={f.login_password} onChange={(e) => set("login_password", e.target.value)} /></Label>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={!f.full_name || !f.specialty || !f.consultation_fee}>Add doctor</Button>
      </div>
    </Modal>
  );
}

function AccountModal({ doctor, onClose, onDone }: { doctor: Doctor; onClose: () => void; onDone: () => void }) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    try { await api(`/admin/doctors/${doctor.id}/account`, { body: { phone, email: email || null, password } }); onDone(); }
    catch (e) { setErr((e as Error).message); }
  };
  return (
    <Modal title={`Dashboard login for ${doctor.full_name}`} onClose={onClose}>
      <ErrorText msg={err} />
      <p className="mb-3 text-sm text-slate-500">Alerts for upcoming patients (up to 30 minutes before) go to this phone and email, and to the doctor’s dashboard.</p>
      <Label text="Phone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Label>
      <Label text="Email"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Label>
      <Label text="Password (8+ chars)"><input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></Label>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={phone.length < 9 || password.length < 8}>Create login</Button>
      </div>
    </Modal>
  );
}

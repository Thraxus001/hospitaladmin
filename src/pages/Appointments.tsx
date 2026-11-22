import { useCallback, useEffect, useState } from "react";
import { api, fmtDateTime, fmtTime, money, todayKey } from "../lib/api";
import type { Appointment, Doctor, SlotRow, User } from "../lib/types";
import { Badge, Button, ErrorText, inputCls, Label, Modal, PageHeader, Table } from "../components";

export default function Appointments() {
  const [day, setDay] = useState(todayKey());
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    api<Appointment[]>(`/admin/appointments?day=${day}${doctorId ? `&doctor_id=${doctorId}` : ""}`).then(setRows).catch((e) => { setErr(e.message); setRows([]); });
  }, [day, doctorId]);

  useEffect(() => { api<Doctor[]>("/admin/doctors").then(setDoctors).catch(() => {}); }, []);
  useEffect(load, [load]);

  const act = async (a: Appointment, what: "no-show" | "complete") => {
    if (what === "no-show" && !confirm(`Mark ${a.patient?.full_name} as a no-show? The fee is kept and they can rebook free.`)) return;
    try { await api(`/admin/appointments/${a.id}/${what}`, { method: "POST" }); setErr(""); load(); }
    catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <PageHeader title="Appointments">
        <input type="date" className={`${inputCls} w-auto`} value={day} onChange={(e) => setDay(e.target.value)} />
        <select className={`${inputCls} w-auto`} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">All doctors</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <Button onClick={() => setModal(true)}>+ Priority booking</Button>
      </PageHeader>
      <ErrorText msg={err} />
      <Table head={["Time", "Patient", "Doctor", "Status", "Priority", "Fee", ""]} empty={rows && !rows.length ? "No appointments for this day." : rows ? undefined : "Loading…"}>
        {rows?.map((a) => (
          <tr key={a.id}>
            <td className="px-4 py-3 font-medium">{fmtTime(a.start_at)}–{fmtTime(a.end_at)}</td>
            <td className="px-4 py-3">{a.patient?.full_name}<div className="text-xs text-slate-500">{a.patient?.phone}</div></td>
            <td className="px-4 py-3">{a.doctor.full_name}<div className="text-xs text-slate-500">{a.doctor.specialty}</div></td>
            <td className="px-4 py-3"><Badge value={a.status} />{a.rescheduled_from_id && <div className="mt-1 text-xs text-blue-600">rescheduled</div>}</td>
            <td className="px-4 py-3">{a.priority === 0 ? <span className="font-semibold text-red-600">Emergency</span> : a.priority === 1 ? <span className="font-semibold text-orange-600">High</span> : "Normal"}</td>
            <td className="px-4 py-3">{money(a.fee)}{a.amount_due > 0 && <div className="text-xs text-amber-600">{money(a.amount_due)} due</div>}</td>
            <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
              {a.status === "confirmed" && <>
                <Button variant="outline" onClick={() => act(a, "complete")}>Complete</Button>
                <Button variant="danger" onClick={() => act(a, "no-show")}>No-show</Button>
              </>}
            </td>
          </tr>
        ))}
      </Table>
      {modal && <PriorityModal doctors={doctors} defaultDay={day} onClose={() => setModal(false)} onDone={() => { setModal(false); load(); }} />}
    </>
  );
}

function PriorityModal({ doctors, defaultDay, onClose, onDone }: { doctors: Doctor[]; defaultDay: string; onClose: () => void; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<User[]>([]);
  const [patient, setPatient] = useState<User | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [slot, setSlot] = useState<SlotRow | null>(null);
  const [priority, setPriority] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      api<User[]>("/admin/patients").then(setFound).catch(() => {});
      return;
    }
    const t = setTimeout(() => api<User[]>(`/admin/patients?q=${encodeURIComponent(q)}`).then(setFound).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setSlot(null); setSlots([]);
    if (doctorId) api<SlotRow[]>(`/admin/doctors/${doctorId}/slots?day=${day}`).then(setSlots).catch((e) => setErr(e.message));
  }, [doctorId, day]);

  const submit = async () => {
    if (!patient) { setErr("Please select a patient."); return; }
    if (!slot) { setErr("Please select an available slot."); return; }
    setBusy(true); setErr("");
    try {
      const r = await api<{ displaced: Appointment | null }>("/admin/appointments/priority", {
        body: { patient_id: patient.id, doctor_id: Number(doctorId), start_at: slot.start_at, priority },
      });
      if (r.displaced) alert(`${r.displaced.patient?.full_name} was moved to ${fmtDateTime(r.displaced.start_at)}. Please notify them.`);
      onDone();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="Priority booking" onClose={onClose}>
      <ErrorText msg={err} />
      <Label text="Patient">
        {patient ? (
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
            <span>{patient.full_name} · {patient.phone}</span>
            <button className="text-slate-500 hover:text-slate-800" onClick={() => setPatient(null)}>change</button>
          </div>
        ) : (
          <>
            <input className={inputCls} placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
            {found.length > 0 && (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                {found.map((u) => <li key={u.id}><button className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => setPatient(u)}>{u.full_name} · {u.phone}</button></li>)}
              </ul>
            )}
          </>
        )}
      </Label>
      <div className="grid grid-cols-2 gap-3">
        <Label text="Doctor">
          <select className={inputCls} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Select…</option>
            {doctors.filter((d) => d.working_days.length).map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </Label>
        <Label text="Date"><input type="date" className={inputCls} value={day} onChange={(e) => setDay(e.target.value)} /></Label>
      </div>
      <Label text="Slot">
        {!doctorId ? <p className="text-sm text-slate-500">Pick a doctor to see slots.</p> : !slots.length ? <p className="text-sm text-slate-500">Doctor does not work this day.</p> : (
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s) => {
              const blocked = s.occupied && !s.bumpable;
              const on = slot?.start_at === s.start_at;
              return (
                <button key={s.start_at} disabled={blocked} onClick={() => setSlot(s)}
                  title={s.occupied ? `${s.patient}${s.bumpable ? " (rescheduled — will be moved)" : ""}` : "Free"}
                  className={`rounded-lg border px-2 py-2 text-sm ${on ? "border-emerald-600 bg-emerald-50 font-semibold" : blocked ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400 line-through" : s.bumpable ? "border-amber-300 bg-amber-50" : "border-slate-200 hover:border-emerald-400"}`}>
                  {fmtTime(s.start_at)}
                </button>
              );
            })}
          </div>
        )}
      </Label>
      {slot?.bumpable && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">This slot holds a rescheduled patient ({slot.patient}). They will be moved to the doctor's next free slot.</p>}
      <p className="mb-3 text-xs text-slate-500">Grey slots hold regular paid bookings and cannot be displaced.</p>
      <Label text="Priority">
        <select className={inputCls} value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
          <option value={0}>Emergency</option><option value={1}>High priority</option>
        </select>
      </Label>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={busy}>{busy ? "Booking…" : "Book now"}</Button>
      </div>
    </Modal>
  );
}

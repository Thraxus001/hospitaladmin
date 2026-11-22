import { useCallback, useEffect, useState } from "react";
import { api, fmtDateTime } from "../lib/api";
import type { Doctor, ReferralCode, User } from "../lib/types";
import { Badge, Button, ErrorText, inputCls, Label, Modal, PageHeader, Table } from "../components";

export default function Referrals() {
  const [rows, setRows] = useState<ReferralCode[] | null>(null);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(false);
  const [filterUsed, setFilterUsed] = useState<"" | "true" | "false">("");

  const load = useCallback(() => {
    setRows(null);
    const qs = filterUsed !== "" ? `?used=${filterUsed}` : "";
    api<ReferralCode[]>(`/admin/referral-codes${qs}`)
      .then(setRows)
      .catch((e) => { setErr(e.message); setRows([]); });
  }, [filterUsed]);

  useEffect(load, [load]);

  const revoke = async (id: number) => {
    if (!confirm("Revoke this referral code? The patient will no longer be able to use it.")) return;
    try {
      await api(`/admin/referral-codes/${id}`, { method: "DELETE" });
      setErr("");
      load();
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <PageHeader title="Referral Codes">
        <select
          className={`${inputCls} w-auto`}
          value={filterUsed}
          onChange={(e) => setFilterUsed(e.target.value as "" | "true" | "false")}
        >
          <option value="">All codes</option>
          <option value="false">Unused</option>
          <option value="true">Used</option>
        </select>
        <Button onClick={() => setModal(true)}>+ Issue code</Button>
      </PageHeader>
      <ErrorText msg={err} />
      <Table
        head={["Code", "Patient", "Doctor", "Status", "Issued", ""]}
        empty={rows && !rows.length ? "No referral codes found." : rows ? undefined : "Loading..."}
      >
        {rows?.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-mono font-bold tracking-widest text-slate-800">{r.code}</td>
            <td className="px-4 py-3">{r.patient_name}<div className="text-xs text-slate-500">ID {r.patient_id}</div></td>
            <td className="px-4 py-3">{r.doctor_name}</td>
            <td className="px-4 py-3">
              <Badge value={r.used ? "used" : "unused"} />
              {r.used_at && <div className="mt-1 text-xs text-slate-500">Used {fmtDateTime(r.used_at)}</div>}
            </td>
            <td className="px-4 py-3 text-sm text-slate-500">{fmtDateTime(r.created_at)}</td>
            <td className="px-4 py-3 text-right">
              {!r.used && (
                <Button variant="danger" onClick={() => revoke(r.id)}>Revoke</Button>
              )}
            </td>
          </tr>
        ))}
      </Table>
      {modal && (
        <IssueModal
          onClose={() => setModal(false)}
          onDone={() => { setModal(false); load(); }}
        />
      )}
    </>
  );
}

function IssueModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [patients, setPatients] = useState<User[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientFilter, setPatientFilter] = useState("");
  const [patient, setPatient] = useState<User | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Quick add patient state
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientEmail, setNewPatientEmail] = useState("");
  const [addingPatient, setAddingPatient] = useState(false);
  const [addPatientErr, setAddPatientErr] = useState("");

  const loadPatients = useCallback(() => {
    setLoadingPatients(true);
    api<User[]>("/admin/patients")
      .then((data) => {
        setPatients(data);
        setLoadingPatients(false);
      })
      .catch((e) => {
        setErr(e.message);
        setLoadingPatients(false);
      });
  }, []);

  useEffect(() => {
    api<Doctor[]>("/admin/doctors").then(setDoctors).catch(() => {});
    loadPatients();
  }, [loadPatients]);

  const filteredPatients = patients.filter((p) => {
    if (!patientFilter.trim()) return true;
    const term = patientFilter.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(term) ||
      p.phone.toLowerCase().includes(term) ||
      (p.email && p.email.toLowerCase().includes(term))
    );
  });

  const handleCreatePatient = async () => {
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      setAddPatientErr("Patient name and phone number are required.");
      return;
    }
    setAddingPatient(true);
    setAddPatientErr("");
    try {
      const created = await api<User>("/admin/patients", {
        method: "POST",
        body: {
          full_name: newPatientName.trim(),
          phone: newPatientPhone.trim(),
          email: newPatientEmail.trim() || null,
        },
      });
      setPatients((prev) => [created, ...prev]);
      setPatient(created);
      setShowAddPatient(false);
      setNewPatientName("");
      setNewPatientPhone("");
      setNewPatientEmail("");
      setErr("");
    } catch (e) {
      setAddPatientErr((e as Error).message);
    } finally {
      setAddingPatient(false);
    }
  };

  const submit = async () => {
    if (!patient) {
      setErr("Please select a patient from the dropdown menu, or use '+ Add new patient' below.");
      return;
    }
    if (!doctorId) {
      setErr("Please select a specialist doctor for this referral.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api("/admin/referral-codes", {
        body: { patient_id: patient.id, doctor_id: Number(doctorId) },
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Issue Referral Code" onClose={onClose}>
      <ErrorText msg={err} />
      <p className="mb-4 text-sm text-slate-600">
        Select the patient and the specialist they are being referred to.
        A unique 8-character code will be generated and linked to this patient.
      </p>

      {/* Patient selection */}
      <Label text="Patient">
        {patient ? (
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
            <div>
              <span className="font-semibold text-emerald-900">{patient.full_name}</span>
              <span className="text-emerald-700"> &middot; {patient.phone}</span>
              {patient.email && <span className="text-xs text-emerald-600"> ({patient.email})</span>}
            </div>
            <button
              className="text-xs font-semibold text-emerald-800 underline hover:text-emerald-950"
              onClick={() => setPatient(null)}
            >
              Change patient
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Dropdown Menu */}
            <select
              className={inputCls}
              value=""
              onChange={(e) => {
                const id = Number(e.target.value);
                const found = patients.find((p) => p.id === id);
                if (found) {
                  setPatient(found);
                  setErr("");
                }
              }}
              disabled={loadingPatients}
            >
              <option value="">
                {loadingPatients
                  ? "Loading patients..."
                  : patients.length === 0
                  ? "-- No registered patients in system --"
                  : `-- Select patient from dropdown (${filteredPatients.length} found) --`}
              </option>
              {filteredPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} &middot; {p.phone}
                </option>
              ))}
            </select>

            {/* Optional search/filter input */}
            {patients.length > 0 && (
              <input
                className={`${inputCls} text-xs`}
                placeholder="Type to filter dropdown by patient name, phone, or email..."
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
              />
            )}

            {/* If no patients exist or none match filter */}
            {patients.length === 0 && !loadingPatients && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                No patients exist in the system yet. Click below to add a patient and issue their code immediately.
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                {patients.length} patient{patients.length === 1 ? "" : "s"} registered
              </span>
              <button
                type="button"
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline"
                onClick={() => setShowAddPatient((p) => !p)}
              >
                {showAddPatient ? "Cancel new patient" : "+ Add new patient"}
              </button>
            </div>
          </div>
        )}
      </Label>

      {/* Quick Add Patient Collapsible Form */}
      {showAddPatient && !patient && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-sm">
          <p className="mb-2 font-semibold text-emerald-900">Add New Patient</p>
          <ErrorText msg={addPatientErr} />
          <div className="space-y-2">
            <input
              className={inputCls}
              placeholder="Patient Full Name *"
              value={newPatientName}
              onChange={(e) => setNewPatientName(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Phone Number (e.g. 0712345678) *"
              value={newPatientPhone}
              onChange={(e) => setNewPatientPhone(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Email address (optional)"
              value={newPatientEmail}
              onChange={(e) => setNewPatientEmail(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowAddPatient(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreatePatient}
                disabled={addingPatient}
              >
                {addingPatient ? "Adding..." : "Save & Select Patient"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Specialist Doctor selection */}
      <Label text="Specialist Doctor">
        <select
          className={inputCls}
          value={doctorId}
          onChange={(e) => {
            setDoctorId(e.target.value);
            if (e.target.value) setErr("");
          }}
        >
          <option value="">Select specialist doctor...</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.full_name} - {d.specialty}
            </option>
          ))}
        </select>
      </Label>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={busy}>
          {busy ? "Issuing code..." : "Issue code"}
        </Button>
      </div>
    </Modal>
  );
}

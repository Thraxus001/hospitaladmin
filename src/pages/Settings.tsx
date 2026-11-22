import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Department, HospitalSettings } from "../lib/types";
import { Button, Card, ErrorText, inputCls, Label, Modal, PageHeader } from "../components";

const ALL_METHODS = ["mpesa", "card", "insurance"];
const METHOD_LABELS: Record<string, string> = { mpesa: "M-Pesa", card: "Card / Bank", insurance: "Insurance" };

export default function Settings() {
  const [settings, setSettings] = useState<HospitalSettings | null>(null);
  const [methods, setMethods] = useState<string[]>([]);
  const [insurers, setInsurers] = useState<string[]>([]);
  const [newInsurer, setNewInsurer] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsErr, setSettingsErr] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [addingDept, setAddingDept] = useState(false);
  const [deptErr, setDeptErr] = useState("");

  // Load
  const loadSettings = useCallback(() => {
    api<HospitalSettings>("/admin/settings")
      .then((s) => { setSettings(s); setMethods(s.payment_methods); setInsurers(s.insurance_providers); })
      .catch((e) => setSettingsErr(e.message));
  }, []);

  const loadDepts = useCallback(() => {
    api<Department[]>("/admin/departments")
      .then(setDepartments)
      .catch((e) => setDeptErr(e.message));
  }, []);

  useEffect(() => { loadSettings(); loadDepts(); }, [loadSettings, loadDepts]);

  // Settings save
  const saveSettings = async () => {
    if (!methods.length) {
      setSettingsErr("Please select at least one accepted payment method.");
      return;
    }
    setSavingSettings(true);
    setSettingsErr("");
    setSavedMsg("");
    try {
      await api("/admin/settings", { method: "PUT", body: { payment_methods: methods, insurance_providers: insurers } });
      loadSettings();
      setSavedMsg("Hospital payment and billing settings saved successfully.");
      setTimeout(() => setSavedMsg(""), 4000);
    } catch (e) {
      setSettingsErr((e as Error).message);
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleMethod = (m: string) =>
    setMethods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  const addInsurer = () => {
    const v = newInsurer.trim();
    if (!v || insurers.includes(v)) return;
    setInsurers((p) => [...p, v]);
    setNewInsurer("");
  };

  const removeInsurer = (p: string) => setInsurers((prev) => prev.filter((x) => x !== p));

  // Dept delete
  const deleteDept = async (id: number, name: string) => {
    if (!confirm(`Remove department "${name}"?`)) return;
    try { await api(`/admin/departments/${id}`, { method: "DELETE" }); loadDepts(); }
    catch (e) { setDeptErr((e as Error).message); }
  };

  void settings; // suppress unused warning

  return (
    <>
      <PageHeader title="Hospital Settings" />

      {/* Payment Methods */}
      <Card className="mb-6">
        <h2 className="mb-4 text-base font-semibold text-slate-800">Accepted Payment Methods</h2>
        <p className="mb-4 text-sm text-slate-500">
          These are the payment options patients will see in the mobile app.
        </p>
        {savedMsg && (
          <p className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-800">
            ✓ {savedMsg}
          </p>
        )}
        <ErrorText msg={settingsErr} />
        <div className="mb-4 flex gap-3">
          {ALL_METHODS.map((m) => (
            <label key={m} className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={methods.includes(m)}
                onChange={() => toggleMethod(m)}
                className="h-4 w-4 rounded accent-emerald-600"
              />
              <span className="font-medium text-slate-700">{METHOD_LABELS[m]}</span>
            </label>
          ))}
        </div>

        {/* Insurance providers */}
        {methods.includes("insurance") && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Accepted Insurance Providers</h3>
            <p className="mb-3 text-xs text-slate-500">
              Patients will be able to select from these providers in their profile settings.
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {insurers.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
                >
                  {p}
                  <button
                    onClick={() => removeInsurer(p)}
                    className="ml-1 text-emerald-500 hover:text-red-500"
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
              {!insurers.length && (
                <span className="text-sm text-slate-400">No providers added yet.</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className={inputCls + " flex-1"}
                placeholder="Add insurance provider…"
                value={newInsurer}
                onChange={(e) => setNewInsurer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInsurer()}
              />
              <Button variant="outline" onClick={addInsurer} disabled={!newInsurer.trim()}>Add</Button>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {!methods.length ? "Select at least 1 method to enable booking" : `${methods.length} payment method(s) active`}
          </span>
          <Button onClick={saveSettings} disabled={savingSettings}>
            {savingSettings ? "Saving…" : "Save payment settings"}
          </Button>
        </div>
      </Card>

      {/* Departments */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Departments</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Patients browse by department. The name must match doctor specialties exactly.
            </p>
          </div>
          <Button onClick={() => setAddingDept(true)}>+ Add department</Button>
        </div>
        <ErrorText msg={deptErr} />
        {departments === null ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : departments.length === 0 ? (
          <p className="text-sm text-slate-400">No departments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Doctors</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{d.name}</td>
                  <td className="px-3 py-2 text-slate-500">{d.doctor_count}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-sm text-red-500 hover:text-red-700"
                      onClick={() => deleteDept(d.id, d.name)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {addingDept && (
        <AddDepartmentModal
          onClose={() => setAddingDept(false)}
          onDone={() => { setAddingDept(false); loadDepts(); }}
        />
      )}
    </>
  );
}

function AddDepartmentModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    setBusy(true); setErr("");
    try {
      await api("/admin/departments", { body: { name: name.trim(), icon: null } });
      onDone();
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <Modal title="Add Department" onClose={onClose}>
      <ErrorText msg={err} />
      <Label>Department name</Label>
      <input
        className={inputCls + " mb-3"}
        placeholder="e.g. Cardiology"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        autoFocus
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Add department"}</Button>
      </div>
    </Modal>
  );
}

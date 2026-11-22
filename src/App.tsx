import { ReactNode, useEffect, useState } from "react";
import { api, hasToken, setToken } from "./lib/api";
import type { User } from "./lib/types";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Appointments from "./pages/Appointments";
import Doctors from "./pages/Doctors";
import Payments from "./pages/Payments";
import NotificationLog from "./pages/NotificationLog";
import Audit from "./pages/Audit";
import DoctorHome from "./pages/DoctorHome";
import HospitalSettings from "./pages/Settings";
import Referrals from "./pages/Referrals";

type Page = { id: string; label: string; el: ReactNode };
const ADMIN_PAGES: Page[] = [
  { id: "overview", label: "Overview", el: <Overview /> },
  { id: "appointments", label: "Appointments", el: <Appointments /> },
  { id: "doctors", label: "Doctors & schedules", el: <Doctors /> },
  { id: "payments", label: "Payments", el: <Payments /> },
  { id: "referrals", label: "Referrals", el: <Referrals /> },
  { id: "notifications", label: "Notifications", el: <NotificationLog /> },
  { id: "audit", label: "Audit log", el: <Audit /> },
  { id: "settings", label: "Settings", el: <HospitalSettings /> },
];
const DOCTOR_PAGES: Page[] = [{ id: "today", label: "My day", el: <DoctorHome /> }];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(hasToken());
  const [page, setPage] = useState<string>(() => location.hash.slice(1));

  useEffect(() => {
    if (!hasToken()) return;
    api<User>("/auth/me")
      .then((u) => (u.role === "admin" || u.role === "doctor" ? setUser(u) : setToken(null)))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener("auth-expired", out);
    return () => window.removeEventListener("auth-expired", out);
  }, []);
  useEffect(() => { if (page) location.hash = page; }, [page]);

  if (checking) return <p className="p-10 text-slate-500">Loading…</p>;
  if (!user) return <Login onLogin={setUser} />;

  const pages = user.role === "doctor" ? DOCTOR_PAGES : ADMIN_PAGES;
  const current = pages.find((p) => p.id === page) ?? pages[0];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
        <div className="mb-6 px-2">
          <p className="text-lg font-bold text-emerald-700">{user.role === "doctor" ? "Doctor Dashboard" : "Clinic Admin"}</p>
          <p className="text-xs text-slate-500">Outsourced doctors</p>
        </div>
        <nav className="flex-1 space-y-1">
          {pages.map((p) => (
            <button key={p.id} onClick={() => setPage(p.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${current.id === p.id ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100"}`}>
              {p.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 pt-3 text-sm">
          <p className="truncate font-medium">{user.full_name}</p>
          <button className="text-slate-500 hover:text-slate-800" onClick={() => { setToken(null); setUser(null); }}>Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-8">{current.el}</main>
    </div>
  );
}

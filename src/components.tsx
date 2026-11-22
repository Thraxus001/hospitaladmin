import { ButtonHTMLAttributes, ReactNode } from "react";

export const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
);

export const PageHeader = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-2xl font-bold">{title}</h1>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "danger" | "ghost" };
export const Button = ({ variant = "primary", className = "", ...p }: BtnProps) => {
  const v = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border border-red-300 bg-white text-red-600 hover:bg-red-50",
    ghost: "text-slate-600 hover:bg-slate-100",
  }[variant];
  return <button {...p} className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`} />;
};

const BADGE: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800", confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-200 text-slate-700", no_show: "bg-red-100 text-red-700",
  rescheduled: "bg-blue-100 text-blue-700", cancelled: "bg-slate-100 text-slate-500",
  paid: "bg-emerald-100 text-emerald-800", pending: "bg-amber-100 text-amber-800", failed: "bg-red-100 text-red-700",
  refund_due: "bg-orange-100 text-orange-800", refunded: "bg-slate-200 text-slate-700",
  sent: "bg-emerald-100 text-emerald-800", dry_run: "bg-sky-100 text-sky-700",
  used: "bg-emerald-100 text-emerald-800", unused: "bg-slate-100 text-slate-600",
};
export const Badge = ({ value }: { value: string }) => (
  <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[value] ?? "bg-slate-100 text-slate-600"}`}>{value.replace("_", " ")}</span>
);

export const Table = ({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
    {empty && <p className="p-8 text-center text-sm text-slate-500">{empty}</p>}
  </div>
);

export const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-16" onClick={onClose}>
    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-600" aria-label="Close">×</button>
      </div>
      {children}
    </div>
  </div>
);

export const Label = ({ text, children }: { text?: string; children?: ReactNode }) => {
  if (text) {
    return (
      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-slate-600">{text}</span>
        {children}
      </label>
    );
  }
  return <label className="mb-1 block text-xs font-medium text-slate-600">{children}</label>;
};

export const Stat = ({ label, value, hint, tone = "" }: { label: string; value: string; hint?: string; tone?: string }) => (
  <Card>
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </Card>
);

export const Bars = ({ items, format = String }: { items: { label: string; value: number }[]; format?: (n: number) => string }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="text-sm text-slate-500">No data for this period.</p>;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-slate-600" title={i.label}>{i.label}</span>
          <div className="h-3 flex-1 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-emerald-500" style={{ width: `${(i.value / max) * 100}%` }} /></div>
          <span className="w-24 shrink-0 text-right font-medium">{format(i.value)}</span>
        </li>
      ))}
    </ul>
  );
};

export const ErrorText = ({ msg }: { msg: string }) => (msg ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p> : null);

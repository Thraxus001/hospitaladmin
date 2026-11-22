import { FormEvent, useState } from "react";
import { api, setToken } from "../lib/api";
import type { User } from "../lib/types";
import { Button, Card, ErrorText, inputCls, Label } from "../components";

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const { access_token } = await api<{ access_token: string }>("/auth/login", { body: { phone, password } });
      setToken(access_token);
      const me = await api<User>("/auth/me");
      if (me.role !== "admin" && me.role !== "doctor") { setToken(null); throw new Error("This account does not have dashboard access"); }
      onLogin(me);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-bold">Clinic Dashboard</h1>
        <p className="mb-5 text-sm text-slate-500">Sign in as hospital staff or as a visiting doctor.</p>
        <form onSubmit={submit}>
          <ErrorText msg={err} />
          <Label text="Phone"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus /></Label>
          <Label text="Password"><input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></Label>
          <Button className="w-full" disabled={busy || !phone || !password}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
      </Card>
    </div>
  );
}

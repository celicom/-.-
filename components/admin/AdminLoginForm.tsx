"use client";

import { Lock, LogIn } from "lucide-react";
import { useState } from "react";

export function AdminLoginForm({ locked }: { locked: boolean }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ login, password }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Не удалось войти");
      window.location.href = "/admin";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.25)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-white"><Lock className="h-5 w-5" /></div>
      <h1 className="mt-4 text-xl font-bold text-[#0F172A]">Командный пункт</h1>
      <p className="mt-1 text-sm text-slate-500">Вход для CEO и технического директора Сосед.ру</p>

      {locked ? (
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800 ring-1 ring-amber-200">
          Вход не настроен. Задайте на сервере переменные <code className="font-mono">ADMIN_LOGIN</code> и <code className="font-mono">ADMIN_PASSWORD</code> в файле <code className="font-mono">.env</code> и перезапустите сайт.
        </div>
      ) : (
        <>
          <label className="mt-5 block text-xs font-semibold text-slate-500">Логин
            <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" required className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0F172A] focus:bg-white" />
          </label>
          <label className="mt-3 block text-xs font-semibold text-slate-500">Пароль
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#0F172A] outline-none focus:border-[#0F172A] focus:bg-white" />
          </label>
          {error && <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <button disabled={busy || !login || !password} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F172A] py-3 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40">
            <LogIn className="h-4 w-4" /> {busy ? "Входим…" : "Войти"}
          </button>
        </>
      )}
    </form>
  );
}

"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/live";
import { ZHK, rub } from "@/lib/catalog";
import { Button, Spinner } from "@/components/ui";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";

const ROLES = [
  { id: "repair", label: "Мастер по ремонту", avg: 4200 },
  { id: "cleaning", label: "Клинер", avg: 4500 },
  { id: "junior", label: "Сосед.Джуниор (студент)", avg: 1100 },
] as const;

/** Калькулятор «Забирайте 85% от чека рядом с домом». */
export function EarningsCalculator() {
  const [role, setRole] = useState<(typeof ROLES)[number]["id"]>("repair");
  const [perWeek, setPerWeek] = useState(10);
  const avg = ROLES.find((r) => r.id === role)!.avg;
  const month = Math.round(perWeek * 4.3 * avg * 0.85);
  return (
    <div className="rounded-3xl bg-ink p-6 text-white shadow-lift sm:p-8">
      <div className="text-sm font-semibold text-emerald-300">Калькулятор заработка</div>
      <div className="mt-1 text-2xl font-bold">Забирайте 85% от чека рядом с домом</div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {ROLES.map((r) => (
          <button key={r.id} onClick={() => setRole(r.id)} className={`rounded-2xl px-2 py-2.5 text-xs font-semibold transition-all active:scale-95 sm:text-sm ${role === r.id ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-300 hover:bg-white/15"}`}>{r.label}</button>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between text-sm text-slate-300"><span>Заказов в неделю</span><b className="tabular text-white">{perWeek}</b></div>
      <input type="range" min={2} max={30} value={perWeek} onChange={(e) => setPerWeek(Number(e.target.value))} className="mt-2 w-full accent-emerald-500" />
      <div className="mt-1 text-xs text-slate-400">Средний чек: {rub(avg)}</div>
      <div className="mt-6 rounded-2xl bg-white/[0.07] p-5 ring-1 ring-white/10">
        <div className="text-xs text-slate-400">Ваш доход в месяц (85% от чека, до налога НПД)</div>
        <div className="tabular mt-1 text-4xl font-bold tracking-tight text-emerald-400">{rub(month)}</div>
        <div className="mt-1 text-xs text-slate-500">Расчёт ориентировочный, фактический доход зависит от спроса в вашем ЖК. Комиссия снижается до 10% после прохождения Академии.</div>
      </div>
    </div>
  );
}

export function PartnerForm() {
  const [f, setF] = useState<{ name: string; phone: string; role: string; district: string; experience: string; about: string }>({ name: "", phone: "", role: "repair", district: ZHK[0].name, experience: "2–5 лет", about: "" });
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      await api("/api/applications", "POST", { ...f, consent: true });
      setState("done");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  if (state === "done")
    return (
      <div className="flex flex-col items-center rounded-3xl border border-emerald-200/70 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <div className="mt-4 text-2xl font-bold text-ink">Анкета отправлена на модерацию</div>
        <p className="mt-2 max-w-md text-sm text-slate-600">Служба безопасности проверит данные, а менеджер позвонит вам в течение рабочего дня и пригласит на собеседование.</p>
      </div>
    );

  const input = "mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-ink outline-none transition focus:border-ink focus:bg-white";
  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft sm:p-8">
      <div className="text-xl font-bold text-ink">Анкета кандидата</div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-600">Имя и фамилия<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} placeholder="Иван Петров" /></label>
        <label className="text-sm font-medium text-slate-600">Телефон<input required inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={input} placeholder="+7 900 000-00-00" /></label>
        <label className="text-sm font-medium text-slate-600">Кем хотите работать
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={input}>{ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-600">Ваш ЖК или район
          <select value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} className={input}>{ZHK.map((z) => <option key={z.slug}>{z.name}</option>)}<option>Другой район</option></select>
        </label>
        <label className="text-sm font-medium text-slate-600 sm:col-span-2">Опыт
          <select value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} className={input}>{["Без опыта (студент)", "до 2 лет", "2–5 лет", "5–10 лет", "больше 10 лет"].map((x) => <option key={x}>{x}</option>)}</select>
        </label>
        <label className="text-sm font-medium text-slate-600 sm:col-span-2">Расскажите о себе
          <textarea rows={3} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} className={input} placeholder="С какой техникой работали, есть ли свой инструмент" />
        </label>
      </div>
      {error && <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
      <ConsentCheckbox offer="master" checked={consent} onChange={setConsent} className="mt-5" />
      <Button type="submit" disabled={state === "sending" || !consent} className="mt-4 w-full">{state === "sending" ? <Spinner /> : null} Отправить анкету</Button>

    </form>
  );
}

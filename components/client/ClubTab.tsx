"use client";

import { motion } from "framer-motion";
import { BookOpen, HandHeart, Heart, Plus } from "lucide-react";
import { useState } from "react";
import { api, type Live } from "@/lib/live";
import { rub } from "@/lib/catalog";
import { Card, Pill } from "@/components/ui";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";

const DEED_STATUS = { done: { label: "Сделано", tone: "green" }, in_progress: { label: "В работе", tone: "blue" }, planned: { label: "Собираем", tone: "amber" } } as const;
const FUND_GOAL = 30000;
const COVER: Record<string, string> = {
  "🟥": "from-rose-400 to-rose-600",
  "🟧": "from-orange-300 to-orange-500",
  "🟨": "from-amber-300 to-yellow-500",
  "🟩": "from-emerald-400 to-emerald-600",
  "🟦": "from-sky-400 to-indigo-600",
  "🟪": "from-violet-400 to-purple-600",
  "🟫": "from-amber-700 to-stone-800",
};

export function ClubTab({ state, toast }: { state: Live; toast: (t: string) => void }) {
  const [filter, setFilter] = useState<"all" | "selfdev" | "kids">("all");
  const [adding, setAdding] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", kind: "selfdev" as "selfdev" | "kids", ownerName: "", ownerApt: "" });

  const donate = async (amount: number) => {
    await api("/api/charity", "POST", { amount, source: "Пожертвование соседа из приложения" });
    toast(`Спасибо! ${rub(amount)} в Копилке добрых дел ❤️`);
  };

  const books = state.books.filter((b) => filter === "all" || b.kind === filter);
  const progress = Math.min(1, state.metrics.fund / FUND_GOAL);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden bg-gradient-to-br from-rose-50 via-white to-orange-50/40 p-5">
        <div className="flex items-center gap-2 font-semibold text-navy-900"><HandHeart className="h-5 w-5 text-rose-500" /> Копилка добрых дел ЖК</div>
        <p className="mt-1 text-sm text-slate-600">Бесплатный ремонт для одиноких пенсионеров нашего дома. Каждый рубль виден всем соседям.</p>
        <div className="mt-4 flex items-end justify-between">
          <div className="text-3xl font-bold text-navy-900">{rub(state.metrics.fund)}</div>
          <div className="text-xs text-slate-500">цель {rub(FUND_GOAL)}</div>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-rose-100">
          <motion.div className="h-full rounded-full bg-rose-500" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8 }} />
        </div>
        <div className="mt-3 flex gap-2">
          {[100, 300, 500].map((a) => (
            <button key={a} onClick={() => donate(a)} className="flex-1 rounded-2xl bg-ink py-2.5 text-sm font-semibold text-white transition-all active:scale-95">
              <Heart className="mr-1 inline h-3.5 w-3.5" />{a} ₽
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {state.deeds.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-200/60">
              <div>
                <div className="text-sm font-medium text-navy-900">{d.title}</div>
                <div className="text-xs text-slate-500">{d.beneficiary}{d.masterName ? ` • мастер ${d.masterName}` : ""}</div>
              </div>
              <div className="text-right">
                <Pill tone={DEED_STATUS[d.status as keyof typeof DEED_STATUS]?.tone ?? "gray"}>{DEED_STATUS[d.status as keyof typeof DEED_STATUS]?.label ?? d.status}</Pill>
                <div className="mt-1 text-xs text-slate-500">{rub(d.cost)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-navy-900"><BookOpen className="h-5 w-5 text-navy-600" /> Соседский буккроссинг</div>
          <button onClick={() => setAdding((a) => !a)} className="flex items-center gap-1 rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-700"><Plus className="h-3.5 w-3.5" /> Отдать книгу</button>
        </div>
        {adding && (
          <form
            className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/api/books", "POST", { ...form, consent: true });
                setConsent(false);
                setForm({ title: "", author: "", kind: "selfdev", ownerName: "", ownerApt: "" });
                setAdding(false);
                toast("Книга добавлена на полку соседей 📚");
              } catch (err) {
                toast((err as Error).message);
              }
            }}
          >
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Название" className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input required value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Автор" className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="Ваше имя" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.ownerApt} onChange={(e) => setForm({ ...form, ownerApt: e.target.value })} placeholder="кв. 14" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "selfdev" | "kids" })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="selfdev">Саморазвитие</option>
              <option value="kids">Детская</option>
            </select>
            <ConsentCheckbox checked={consent} onChange={setConsent} className="col-span-2" />
            <button disabled={!consent} className="col-span-2 rounded-lg bg-ink py-2.5 text-sm font-medium text-white disabled:opacity-40">Добавить</button>
          </form>
        )}
        <div className="mt-3 flex gap-2">
          {([["all", "Все"], ["selfdev", "Саморазвитие"], ["kids", "Детские"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === id ? "bg-ink text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>
          ))}
        </div>
        <div className="mt-3 divide-y divide-slate-100">
          {books.map((b) => (
            <div key={b.id} className="flex items-center gap-3 py-2.5">
              <div className={`flex h-12 w-9 shrink-0 items-end rounded-md rounded-l-sm bg-gradient-to-br p-1 shadow-md ${COVER[b.cover] ?? "from-slate-400 to-slate-600"}`}><span className="h-full w-0.5 rounded bg-white/30" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-navy-900">{b.title}</div>
                <div className="truncate text-xs text-slate-500">{b.author} • от {b.ownerName}, {b.ownerApt}</div>
              </div>
              {b.status === "available" ? (
                <button onClick={() => api(`/api/books/${b.id}`, "PATCH", { action: "take", apt: "кв. 14" }).then(() => toast(`Договоритесь с соседом из ${b.ownerApt} 📖`))} className="rounded-full bg-mint-50 px-3 py-1 text-xs font-medium text-mint-700 ring-1 ring-mint-100">Взять</button>
              ) : (
                <button onClick={() => api(`/api/books/${b.id}`, "PATCH", { action: "return" })} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500" title="Вернуть на полку">У {b.takenBy}</button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

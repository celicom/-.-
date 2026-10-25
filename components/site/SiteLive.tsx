"use client";

import { BookOpen, Heart, HandHeart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api, useLive } from "@/lib/live";
import { rub } from "@/lib/catalog";
import { GeoMap } from "@/components/GeoMap";
import { Avatar, Pill, Toast } from "@/components/ui";

const FUND_GOAL = 30000;
const DEED = { done: { label: "Сделано", tone: "green" }, in_progress: { label: "В работе", tone: "blue" }, planned: { label: "Собираем", tone: "amber" } } as const;
const COVER: Record<string, string> = {
  "🟥": "from-rose-400 to-rose-600", "🟧": "from-orange-300 to-orange-500", "🟨": "from-amber-300 to-yellow-500", "🟩": "from-emerald-400 to-emerald-600",
  "🟦": "from-sky-400 to-indigo-600", "🟪": "from-violet-400 to-purple-600", "🟫": "from-amber-700 to-stone-800",
};

/** Душа проекта: Копилка добрых дел и Соседский буккроссинг (живые данные из базы). */
export function ClubWidget() {
  const { state } = useLive();
  const [toast, setToast] = useState<string | null>(null);
  const donate = async (amount: number) => {
    try {
      await api("/api/charity", "POST", { amount, source: "Пожертвование с сайта" });
      setToast(`Спасибо! ${rub(amount)} уже в Копилке добрых дел ❤️`);
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast((e as Error).message);
    }
  };
  if (!state) return <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />;
  const progress = Math.min(1, state.metrics.fund / FUND_GOAL);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-orange-50/40 p-6 shadow-soft">
        <div className="flex items-center gap-2 text-lg font-bold text-ink"><HandHeart className="h-5 w-5 text-rose-500" /> Копилка добрых дел ЖК</div>
        <p className="mt-1 text-sm text-slate-600">Бесплатный ремонт и уборка для одиноких пенсионеров нашего дома. Каждый рубль виден всем соседям.</p>
        <div className="mt-5 flex items-end justify-between">
          <div className="tabular text-4xl font-bold tracking-tight text-ink">{rub(state.metrics.fund)}</div>
          <div className="text-xs text-slate-500">цель {rub(FUND_GOAL)}</div>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-rose-100"><div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-700" style={{ width: `${progress * 100}%` }} /></div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[100, 300, 500].map((a) => (
            <button key={a} onClick={() => donate(a)} className="flex items-center justify-center gap-1 rounded-2xl bg-ink py-3 text-sm font-semibold text-white transition-all hover:bg-ink-800 active:scale-95"><Heart className="h-3.5 w-3.5" />{a} ₽</button>
          ))}
        </div>
        <div className="mt-5 space-y-2">
          {state.deeds.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-200/60">
              <div>
                <div className="text-sm font-medium text-ink">{d.title}</div>
                <div className="text-xs text-slate-500">{d.beneficiary}{d.masterName ? ` • мастер ${d.masterName}` : ""}</div>
              </div>
              <div className="shrink-0 text-right">
                <Pill tone={DEED[d.status as keyof typeof DEED]?.tone ?? "gray"}>{DEED[d.status as keyof typeof DEED]?.label ?? d.status}</Pill>
                <div className="mt-1 text-xs text-slate-500">{rub(d.cost)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-2 text-lg font-bold text-ink"><BookOpen className="h-5 w-5 text-indigo-500" /> Соседский буккроссинг</div>
        <p className="mt-1 text-sm text-slate-600">Книги по саморазвитию и детская литература: возьмите у соседа и отдайте свою. Вся полка в приложении.</p>
        <div className="mt-4 grid gap-1 sm:grid-cols-2">
          {state.books.slice(0, 8).map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-slate-50">
              <div className={`flex h-14 w-10 shrink-0 items-end rounded-md bg-gradient-to-br p-1 shadow-md ${COVER[b.cover] ?? "from-slate-400 to-slate-600"}`}><span className="h-full w-0.5 rounded bg-white/30" /></div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{b.title}</div>
                <div className="truncate text-xs text-slate-500">{b.author}</div>
                <div className="text-[11px] text-slate-400">{b.status === "available" ? `у соседа, ${b.ownerApt}` : `взяли, ${b.takenBy}`}</div>
              </div>
            </div>
          ))}
        </div>
        <Link href="/client" className="mt-4 inline-flex rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-ink transition-all hover:bg-slate-200 active:scale-95">Открыть полку в приложении</Link>
      </div>
      <Toast text={toast} onClose={() => setToast(null)} />
    </div>
  );
}

/** Карта района с живыми мастерами + статистика Копилки конкретного ЖК. */
export function ZhkLive({ zhk }: { zhk: { name: string; homes: number; residents: string; lat: number; lon: number } }) {
  const { state } = useLive();
  if (!state) return <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />;
  const free = state.masters.filter((m) => m.status === "free" && !m.blocked).length;
  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="overflow-hidden rounded-3xl border border-slate-200/60 shadow-soft lg:col-span-3">
        <GeoMap center={zhk} masters={state.masters.filter((m) => !m.blocked)} />
      </div>
      <div className="space-y-4 lg:col-span-2">
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <Stat value={String(state.masters.filter((m) => !m.blocked).length)} label="мастера рядом" />
          <Stat value={String(free)} label="свободны сейчас" />
          <Stat value={`${state.metrics.sla} мин`} label="среднее прибытие" />
        </div>
        <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5">
          <div className="flex items-center gap-2 font-bold text-ink"><HandHeart className="h-5 w-5 text-rose-500" /> Копилка добрых дел: {zhk.name}</div>
          <div className="tabular mt-2 text-3xl font-bold text-ink">{rub(state.metrics.fund)}</div>
          <div className="text-xs text-slate-500">Помогли жителям: {state.deeds.filter((d) => d.status === "done").length} раза • в работе {state.deeds.filter((d) => d.status === "in_progress").length}</div>
        </div>
        <div className="space-y-2">
          {state.masters.filter((m) => !m.blocked).map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-200/60">
              <Avatar id={m.id} emoji={m.avatar} size={40} status={m.status} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink">{m.name} <span className="text-xs font-normal text-amber-500">★ {m.rating.toFixed(2)}</span></div>
                <div className="truncate text-xs text-slate-500">{m.specialty}</div>
              </div>
              <span className="text-xs font-medium text-slate-500">{m.etaMin} мин</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-slate-200/60">
      <div className="tabular text-xl font-bold text-ink">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

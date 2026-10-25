"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Clock, MapPin, ShieldCheck, Star, X } from "lucide-react";
import { GeoMap } from "@/components/GeoMap";
import { Avatar, Button, Spinner } from "@/components/ui";
import { orderAction, type Live, type LiveOrder } from "@/lib/live";
import { SKILL_BY_ORDER } from "./types";

const ACCUSATIVE: Record<string, string> = { Рафаэль: "Рафаэля", Алексей: "Алексея", Елена: "Елену", Даниил: "Даниила" };
const fmtDist = (m: number) => (m < 1000 ? `${m} м` : `${(m / 1000).toFixed(1)} км`);

/** Экран гео-матчинга «как в Яндекс Go»: радар и карточки ближайших мастеров. */
export function MatchScreen({ order, state, onCancel, toast, center }: { order: LiveOrder; state: Live; onCancel: () => void; toast: (t: string) => void; center?: { lat: number; lon: number } }) {
  const skill = SKILL_BY_ORDER(order);
  const declined = order.declinedBy.split(",").filter(Boolean);
  const masters = state.masters
    .map((m) => ({ ...m, fits: m.skills.split(",").includes(skill) && !m.blocked }))
    .sort((a, b) => Number(b.fits) - Number(a.fits) || a.distanceM - b.distanceM);
  const waitingFor = order.status === "assigned" ? state.masters.find((m) => m.id === order.masterId) : null;

  const pick = async (id: string) => {
    try {
      await orderAction(order.id, { action: "assign", masterId: id });
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <button onClick={onCancel} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-soft ring-1 ring-slate-200/60 transition-all active:scale-90" aria-label="Отменить"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-400">Заказ №{order.number}</div>
          <div className="truncate text-[15px] font-semibold text-ink">{order.diagnosis}</div>
        </div>
      </div>

      <div className="relative -mx-5 overflow-hidden border-y border-slate-200/60 sm:mx-0 sm:rounded-3xl sm:border">
        <GeoMap center={center} masters={state.masters.filter((m) => !m.blocked)} radar highlightId={waitingFor?.id} onSelect={(id) => masters.find((m) => m.id === id)?.fits && pick(id)} />
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-card backdrop-blur">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
          Ищем мастеров рядом…
        </div>
      </div>

      <AnimatePresence>
        {waitingFor && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 flex items-center gap-3 rounded-3xl bg-ink p-4 text-white shadow-lift">
            <Avatar id={waitingFor.id} emoji={waitingFor.avatar} size={40} />
            <div className="flex-1 text-sm">Вызов отправлен <b>{waitingFor.name}</b>. Ждём подтверждения до 30 сек…</div>
            <Spinner className="h-5 w-5 text-emerald-400" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 space-y-3">
        {masters.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: m.fits ? 1 : 0.55, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={`rounded-3xl border bg-white p-4 shadow-soft transition-all ${waitingFor?.id === m.id ? "border-emerald-400 ring-4 ring-emerald-500/10" : "border-slate-200/60"}`}
          >
            <div className="flex items-start gap-3">
              <Avatar id={m.id} emoji={m.avatar} size={56} status={m.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-bold text-ink">{m.name}</span>
                  <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-bold text-amber-600"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{m.rating.toFixed(2)}</span>
                  <span className="text-xs text-slate-400">{m.reviews} отз.</span>
                </div>
                <div className="truncate text-xs text-slate-500">{m.title} • {m.specialty}</div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400" />{m.id === "elena" ? "соседний подъезд" : fmtDist(m.distanceM)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-400" />{m.etaMin} мин</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><ShieldCheck className="h-3 w-3" />{m.badge}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{m.uniform}</span>
            </div>
            {m.fits ? (
              declined.includes(m.id) ? (
                <div className="mt-3 rounded-2xl bg-slate-50 py-2.5 text-center text-xs text-slate-500">Мастер сейчас не может принять вызов</div>
              ) : (
                <Button disabled={!!waitingFor} onClick={() => pick(m.id)} className="mt-3 w-full py-3">
                  Выбрать {ACCUSATIVE[m.name] ?? m.name}
                </Button>
              )
            ) : (
              <div className="mt-3 text-center text-xs text-slate-400">Другая специализация</div>
            )}
          </motion.div>
        ))}
      </div>

      <button onClick={onCancel} className="mt-4 flex w-full items-center justify-center gap-1 py-3 text-sm font-medium text-slate-500 transition-all active:scale-95"><X className="h-4 w-4" /> Отменить заказ</button>
    </div>
  );
}

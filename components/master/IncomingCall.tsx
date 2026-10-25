"use client";

import { motion } from "framer-motion";
import { Briefcase, MapPin, Phone, PhoneOff, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LiveMaster, LiveOrder } from "@/lib/live";
import { masterNet } from "@/lib/finance";
import { rub } from "@/lib/catalog";

const RING_SECONDS = 30;

/** Звонок «как в такси»: короткие двойные гудки через WebAudio. */
function useRingtone(active: boolean, enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!active || !enabled) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = ctxRef.current ?? new Ctx();
    ctxRef.current = ctx;
    ctx.resume().catch(() => {});
    const beep = (at: number, freq: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(at);
      o.stop(at + 0.3);
    };
    const ring = () => {
      const t = ctx.currentTime;
      beep(t, 880);
      beep(t + 0.32, 1175);
    };
    ring();
    const id = setInterval(ring, 1400);
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    return () => clearInterval(id);
  }, [active, enabled]);
}

export function IncomingCall({ order, master, sound, onAccept, onDecline }: { order: LiveOrder; master: LiveMaster; sound: boolean; onAccept: () => void; onDecline: () => void }) {
  const [left, setLeft] = useState(RING_SECONDS);
  const declined = useRef(false);
  useRingtone(true, sound);

  useEffect(() => {
    setLeft(RING_SECONDS);
    declined.current = false;
    const started = Date.now();
    const t = setInterval(() => {
      const l = Math.max(0, RING_SECONDS - Math.floor((Date.now() - started) / 1000));
      setLeft(l);
      if (l === 0 && !declined.current) {
        declined.current = true;
        onDecline();
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const netFrom = masterNet(order.priceWorkFrom, master.commissionRate);
  const netTo = masterNet(order.priceWorkTo, master.commissionRate);
  const pct = Math.round((1 - master.commissionRate) * 100);
  const R = 46;
  const C = 2 * Math.PI * R;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="absolute inset-0 z-[55] flex flex-col overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#111c33] to-[#052e2b] px-5 pb-8 pt-4 text-white sm:pt-[62px]"
    >
      <div className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-40 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">Входящий заказ №{order.number}</div>
      </div>

      {/* Таймер-кольцо */}
      <div className="relative my-5 flex justify-center">
        <div className="relative h-28 w-28">
          {[0, 1].map((i) => (
            <motion.span key={i} className="absolute inset-3 rounded-full bg-emerald-400/40" initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.8 }} />
          ))}
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <motion.circle cx="50" cy="50" r={R} fill="none" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - left / RING_SECONDS) }} transition={{ ease: "linear", duration: 0.25 }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="tabular text-3xl font-bold">{left}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">сек</div>
          </div>
        </div>
      </div>

      <div className="no-scrollbar relative flex-1 space-y-2.5 overflow-y-auto">
        <div className="rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10 backdrop-blur">
          <div className="text-[17px] font-bold leading-snug">{order.diagnosis}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-300"><MapPin className="h-4 w-4 text-emerald-400" />{order.address} • соседний дом</div>
          {order.details && <div className="mt-1 text-xs text-slate-400">{order.details}</div>}
        </div>
        {order.bagHint && (
          <div className="rounded-3xl bg-gradient-to-br from-indigo-500/25 to-violet-500/10 p-4 ring-1 ring-indigo-300/20">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-200"><Sparkles className="h-4 w-4" /> ИИ-подсказка: что положить в сумку</div>
            <div className="mt-1.5 flex gap-2 text-sm leading-snug text-white"><Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />Возьмите: {order.bagHint}</div>
          </div>
        )}
        <div className="rounded-3xl bg-white/[0.06] p-4 ring-1 ring-white/10">
          <div className="text-xs text-slate-400">Чистая выплата вам ({pct}% от работ)</div>
          <div className="tabular mt-0.5 text-[28px] font-bold tracking-tight text-emerald-400">{netFrom === netTo ? rub(netFrom) : `${rub(netFrom)} – ${rub(netTo)}`}</div>
          <div className="text-xs text-slate-400">+ запчасти по смете • на карту сразу после подтверждения клиента</div>
        </div>
      </div>

      {/* Кнопки как у звонка iOS */}
      <div className="relative mt-5 flex items-end justify-around">
        <button onClick={onDecline} className="flex flex-col items-center gap-2 transition-all active:scale-90">
          <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-rose-500 shadow-lg shadow-rose-500/40"><PhoneOff className="h-7 w-7" /></span>
          <span className="text-xs font-medium text-slate-300">Пропустить</span>
        </button>
        <button onClick={onAccept} className="flex flex-col items-center gap-2 transition-all active:scale-90">
          <motion.span animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"><Phone className="h-7 w-7" /></motion.span>
          <span className="text-xs font-semibold text-white">Принять заказ</span>
        </button>
      </div>
    </motion.div>
  );
}

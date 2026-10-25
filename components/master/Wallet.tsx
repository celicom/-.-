"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, CreditCard, Receipt, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { masterAction, type Live, type LiveMaster } from "@/lib/live";
import { DEPOSIT_TARGET } from "@/lib/finance";
import { rub } from "@/lib/catalog";
import { Card, SectionTitle } from "@/components/ui";

export function Wallet({ master, state, toast }: { master: LiveMaster; state: Live; toast: (t: string) => void }) {
  const [busy, setBusy] = useState(false);
  const payouts = state.payments.filter((p) => p.order.masterId === master.id).slice(0, 8);
  const fines = state.fines.filter((f) => f.masterId === master.id);
  const depositPct = Math.min(1, master.deposit / DEPOSIT_TARGET);

  const withdraw = async () => {
    setBusy(true);
    try {
      const r = await masterAction(master.id, { action: "withdraw" });
      toast(`${rub((r as { amount: number }).amount)} отправлены на карту •• 4417`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Карта в стиле премиальной банковской */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#065F46] p-5 text-white shadow-lift">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.06)_50%,transparent_65%)] bg-[length:200%_100%]" />
        <div className="relative flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Доступно к выводу</span>
          <span className="text-xs font-bold tracking-widest text-slate-300">СОСЕД.ПРО</span>
        </div>
        <div className="tabular relative mt-1 text-[34px] font-bold tracking-tight">{rub(master.balance)}</div>
        <div className="relative mt-1 text-xs tracking-[0.25em] text-slate-400">•••• •••• •••• 4417</div>
        <button disabled={busy || master.balance <= 0 || master.blocked} onClick={withdraw} className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-ink transition-all active:scale-95 disabled:opacity-40">
          <CreditCard className="h-4 w-4" /> Вывести на карту
        </button>
      </div>

      <Card className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50"><BadgeCheck className="h-5 w-5 text-emerald-600" /></span>
        <div>
          <div className="text-sm font-semibold text-ink">{master.npdStatus}</div>
          <div className="text-xs text-slate-500">ИНН {master.inn} • чеки «Мой налог» автоматически</div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-semibold text-ink">
            {master.deposit >= DEPOSIT_TARGET ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <ShieldAlert className="h-4 w-4 text-amber-500" />}
            Гарантийный депозит
          </span>
          <span className="tabular font-semibold text-ink">{rub(master.deposit)} <span className="font-normal text-slate-400">/ {rub(DEPOSIT_TARGET)}</span></span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div className={`h-full rounded-full ${depositPct >= 1 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-amber-300 to-amber-500"}`} initial={{ width: 0 }} animate={{ width: `${depositPct * 100}%` }} transition={{ duration: 0.8 }} />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {depositPct >= 1 ? "Неснижаемый депозит заморожен и защищает клиентов от брака." : `Пополняется 10% с каждой выплаты, осталось ${rub(DEPOSIT_TARGET - master.deposit)}.`}
        </div>
      </Card>

      {fines.length > 0 && (
        <div className="rounded-3xl border border-rose-200/70 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Штрафы</div>
          {fines.map((f) => (
            <div key={f.id} className="mt-1.5 flex justify-between gap-3 text-xs text-rose-600"><span>{f.reason}</span><span className="tabular font-semibold">−{rub(f.amount)}</span></div>
          ))}
        </div>
      )}

      <SectionTitle>История выплат</SectionTitle>
      <Card className="p-2">
        {payouts.length === 0 && <div className="p-3 text-xs text-slate-400">Пока нет выплат</div>}
        {payouts.map((p, i) => (
          <div key={p.id} className={`flex items-center gap-3 px-2 py-2.5 ${i ? "border-t border-slate-100" : ""}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50"><ArrowUpRight className="h-4 w-4 text-emerald-600" /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-ink">№{p.order.number} • {p.order.diagnosis}</div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400"><Receipt className="h-3 w-3" />чек НПД {p.receiptNo} • {new Date(p.createdAt).toLocaleDateString("ru-RU")}</div>
            </div>
            <div className="tabular shrink-0 text-sm font-bold text-emerald-600">+{rub(p.masterPayout)}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

"use client";

import { CheckCircle2, CreditCard, Lock, QrCode, RefreshCw, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";
import { Button, Spinner } from "@/components/ui";
import { api, type LiveOrder } from "@/lib/live";
import { rub } from "@/lib/catalog";
import { PAY_METHODS, type PayMethod } from "@/lib/pay-methods";

const ICON: Record<PayMethod, React.ElementType> = { card: CreditCard, sbp: Zap, escrow: Lock };

/** Демо-QR для СБП в тестовом режиме (не сканируется): стилизованный узор по номеру заказа. */
function DemoQr({ seed }: { seed: number }) {
  const cells = useMemo(() => {
    const n = 21;
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const finder = (x: number, y: number) => [[0, 0], [14, 0], [0, 14]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    return Array.from({ length: n * n }, (_, i) => ({ x: i % n, y: Math.floor(i / n) })).filter(({ x, y }) => !finder(x, y) && rnd() > 0.5);
  }, [seed]);
  const eye = (x: number, y: number) => (
    <g key={`${x}${y}`}><rect x={x} y={y} width="7" height="7" fill="#0F172A" /><rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" /><rect x={x + 2} y={y + 2} width="3" height="3" fill="#0F172A" /></g>
  );
  return (
    <svg viewBox="0 0 21 21" className="mx-auto h-40 w-40 rounded-2xl bg-white p-2 shadow-card" shapeRendering="crispEdges" aria-label="Демо QR-код СБП">
      {cells.map((c) => <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1" height="1" fill="#0F172A" />)}
      {eye(0, 0)}{eye(14, 0)}{eye(0, 14)}
    </svg>
  );
}

/** Оплата сметы: карта, СБП или Безопасная сделка. В тестовом режиме деньги не списываются. */
export function PayBlock({ order, total, toast, onApprove, busy }: { order: LiveOrder; total: number; toast: (t: string) => void; onApprove: () => void; busy: boolean }) {
  const [method, setMethod] = useState<PayMethod>((order.payMethod as PayMethod) ?? "escrow");
  const [consent, setConsent] = useState(false);
  const [working, setWorking] = useState(false);
  const paid = order.payStatus === "held" || order.payStatus === "paid";
  const pendingDemo = order.payStatus === "pending" && order.payMode === "mock";
  const pendingLive = order.payStatus === "pending" && order.payMode !== "mock";
  const m = (order.payMethod as PayMethod) ?? method;

  const start = async () => {
    setWorking(true);
    try {
      const r = await api<{ confirmationUrl: string | null }>("/api/payments", "POST", { orderId: order.id, method, consent: true });
      if (r.confirmationUrl) window.location.href = r.confirmationUrl;
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const confirmDemo = async () => {
    setWorking(true);
    try {
      await api(`/api/payments/${order.id}`, "POST", {});
      toast(m === "escrow" ? "Деньги заморожены в Безопасной сделке" : "Оплата прошла");
      onApprove(); // после оплаты смета согласуется автоматически
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const check = async () => {
    setWorking(true);
    try {
      const r = await fetch(`/api/payments/${order.id}`, { cache: "no-store" }).then((x) => x.json());
      toast(r.payStatus === "held" || r.payStatus === "paid" ? "Оплата получена" : "Оплата ещё не подтверждена банком");
    } finally {
      setWorking(false);
    }
  };

  if (paid)
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {order.payMethod === "escrow" || order.payStatus === "held" ? "Деньги заморожены в Безопасной сделке" : "Оплата получена"}</div>
        <Button variant="emerald" disabled={busy} onClick={onApprove} className="mt-3 w-full">Согласовать смету</Button>
      </div>
    );

  if (pendingLive)
    return (
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        Ожидаем подтверждение оплаты от банка. Если вы уже оплатили, нажмите «Проверить».
        <Button variant="soft" disabled={working} onClick={check} className="mt-3 w-full">{working ? <Spinner /> : <RefreshCw className="h-4 w-4" />} Проверить оплату</Button>
      </div>
    );

  if (pendingDemo)
    return (
      <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Тестовая оплата • деньги не списываются</div>
        {m === "sbp" ? (
          <div className="mt-3 text-center"><DemoQr seed={order.number} /><div className="mt-2 text-xs text-slate-500">Демо-QR. В боевом режиме здесь откроется QR СБП от банка.</div></div>
        ) : m === "card" ? (
          <div className="mt-3 space-y-2">
            <div className="rounded-xl bg-white px-3 py-2.5 text-sm tracking-wider text-slate-500 shadow-card">2200 0000 0000 0001</div>
            <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-white px-3 py-2.5 text-sm text-slate-500 shadow-card">12 / 30</div><div className="rounded-xl bg-white px-3 py-2.5 text-sm text-slate-500 shadow-card">•••</div></div>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{rub(total)} будут заблокированы на безопасном счёте и спишутся только после вашего подтверждения результата.</p>
        )}
        <Button variant="emerald" disabled={working || busy} onClick={confirmDemo} className="mt-3 w-full">
          {working ? <Spinner /> : null} {m === "sbp" ? "Я оплатил(а) в приложении банка" : m === "card" ? `Оплатить ${rub(total)}` : `Заморозить ${rub(total)}`}
        </Button>
      </div>
    );

  return (
    <div className="mt-4">
      <div className="text-sm font-semibold text-ink">Способ оплаты</div>
      <div className="mt-2 space-y-2">
        {PAY_METHODS.map((p) => {
          const Icon = ICON[p.id];
          const on = method === p.id;
          return (
            <button key={p.id} onClick={() => setMethod(p.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${on ? "border-ink bg-slate-50" : "border-slate-200/70 bg-white"}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? "bg-ink text-white" : "bg-slate-100 text-slate-500"}`}><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{p.label}</span><span className="block text-xs text-slate-500">{p.hint}</span></span>
              <span className={`h-5 w-5 shrink-0 rounded-full border-2 ${on ? "border-ink bg-ink ring-2 ring-white ring-inset" : "border-slate-300"}`} />
            </button>
          );
        })}
      </div>
      <ConsentCheckbox checked={consent} onChange={setConsent} className="mt-3" />
      <Button variant="emerald" disabled={!consent || working} onClick={start} className="mt-3 w-full">{working ? <Spinner /> : <Lock className="h-4 w-4" />} Оплатить {rub(total)}</Button>
      <div className="mt-2 text-center text-[11px] text-slate-400">Электронный чек по 54-ФЗ придёт после оплаты</div>
    </div>
  );
}

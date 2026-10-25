"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Heart, Lock, MessageCircle, Phone, Printer, ShieldCheck, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { GeoMap } from "@/components/GeoMap";
import { Avatar, Button, Card, Spinner, StatusPill } from "@/components/ui";
import { orderAction, type Live, type LiveOrder } from "@/lib/live";
import { rub } from "@/lib/catalog";
import { SERVICE_FEE_RATE } from "@/lib/finance";
import { PayBlock } from "./PayBlock";
import { ReceiptView } from "@/components/ReceiptView";

const STEPS = [
  { id: "accepted", label: "В пути" },
  { id: "onsite", label: "На месте" },
  { id: "estimate", label: "Смета" },
  { id: "in_progress", label: "Ремонт" },
  { id: "awaiting_confirm", label: "Приёмка" },
  { id: "done", label: "Гарантия" },
];
const DEMO_ROUTE_SECONDS = 60; // демо-ускорение: путь мастера за 1 минуту

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function TrackScreen({ order, state, onNew, toast, center }: { order: LiveOrder; state: Live; onNew: () => void; toast: (t: string) => void; center?: { lat: number; lon: number } }) {
  const master = state.masters.find((m) => m.id === order.masterId);
  const now = useNow();
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const stepIdx = order.status === "visit_only" ? 2 : STEPS.findIndex((s) => s.id === order.status);

  const elapsed = order.acceptedAt ? (now - new Date(order.acceptedAt).getTime()) / 1000 : 0;
  const progress = order.status === "accepted" ? Math.min(0.96, elapsed / DEMO_ROUTE_SECONDS) : 1;
  const etaLeft = master ? Math.max(1, Math.round(master.etaMin * (1 - progress))) : 0;

  const work = order.finalWork ?? order.priceWorkFrom;
  const parts = order.finalParts ?? 0;
  const serviceFee = Math.round((work + parts) * SERVICE_FEE_RATE);
  const total = work + parts + serviceFee + order.donation;
  const held = order.finalWork != null ? total : order.priceWorkTo + Math.round(order.priceWorkTo * SERVICE_FEE_RATE) + order.donation;

  const act = async (body: Record<string, unknown>, ok?: string) => {
    setBusy(true);
    try {
      await orderAction(order.id, body);
      if (ok) toast(ok);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!master) return null;
  const closed = order.status === "done" || order.status === "visit_only";

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-400">Заказ №{order.number}</div>
          <div className="text-[15px] font-semibold leading-snug text-ink">{order.diagnosis}</div>
        </div>
        <StatusPill status={order.status} />
      </div>

      {/* Статус-бар в реальном времени */}
      <Card className="px-4 py-3.5">
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div className={`h-full ${order.status === "visit_only" ? "bg-rose-400" : "bg-emerald-500"}`} initial={false} animate={{ width: i <= stepIdx ? "100%" : "0%" }} transition={{ duration: 0.5, delay: i * 0.05 }} />
              </div>
              <div className={`mt-1.5 text-center text-[10px] ${i === stepIdx ? "font-bold text-ink" : "font-medium text-slate-400"}`}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {!closed && (
        <div className="relative -mx-5 overflow-hidden border-y border-slate-200/60 sm:mx-0 sm:rounded-3xl sm:border">
          <GeoMap center={center} masters={[master]} highlightId={master.id} routeProgress={progress} />
          {order.status === "accepted" && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-2xl bg-ink/90 px-3 py-2 text-white shadow-lift backdrop-blur">
              <div className="leading-tight">
                <div className="tabular text-lg font-bold">{etaLeft} мин</div>
                <div className="text-[10px] text-slate-400">{master.name} в пути</div>
              </div>
            </div>
          )}
        </div>
      )}

      <Card className="flex items-center gap-3">
        <Avatar id={master.id} emoji={master.avatar} size={52} status={master.status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-bold text-ink">{master.name}<span className="flex items-center gap-0.5 text-xs font-bold text-amber-500"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{master.rating.toFixed(2)}</span></div>
          <div className="truncate text-xs text-slate-500">{master.title} • {master.uniform}</div>
        </div>
        <a href="tel:+70000000000" className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-all active:scale-90" aria-label="Позвонить"><Phone className="h-4 w-4" /></a>
        <button onClick={() => toast("Чат с мастером откроется в Telegram после подключения бота")} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-ink transition-all active:scale-90" aria-label="Чат"><MessageCircle className="h-4 w-4" /></button>
      </Card>

      {/* Эскроу */}
      {!closed && (
        <div className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-lift">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/25 blur-2xl" />
          <div className="relative flex items-center gap-2 text-sm font-semibold text-emerald-300"><Lock className="h-4 w-4" /> Безопасная сделка</div>
          <div className="tabular relative mt-1 text-[30px] font-bold tracking-tight">{rub(held)}</div>
          <p className="relative mt-1 text-xs leading-relaxed text-slate-400">Деньги заморожены на безопасном счёте и спишутся только после вашего подтверждения.</p>
          <label className="relative mt-4 flex cursor-pointer items-center gap-3 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10 transition-all active:scale-[0.98]">
            <input
              type="checkbox"
              className="h-5 w-5 accent-rose-500"
              checked={order.donation > 0}
              onChange={(e) => act({ action: "donation", value: e.target.checked ? 50 : 0 }, e.target.checked ? "Спасибо! +50 ₽ пойдут пенсионерам нашего ЖК ❤️" : undefined)}
            />
            <span className="text-[13px] leading-snug"><Heart className="mr-1 inline h-3.5 w-3.5 fill-rose-400 text-rose-400" />Округлить +50 ₽ в Копилку помощи пенсионерам нашего ЖК</span>
          </label>
        </div>
      )}

      {/* Фото от мастера */}
      {(order.photoBefore || order.photoAfter) && (
        <Card>
          <div className="mb-2.5 text-sm font-semibold text-ink">Фотоотчёт мастера</div>
          <div className="grid grid-cols-2 gap-2">
            {[["ДО", order.photoBefore], ["ПОСЛЕ", order.photoAfter]].map(([label, src]) => (
              <div key={label} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src ? <img src={src} alt={`Фото ${label}`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">ожидается</div>}
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">{label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {order.status === "onsite" && (
          <motion.div key="onsite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-3xl border border-sky-200/60 bg-sky-50 p-4 text-sm text-sky-800">
            <Spinner className="h-4 w-4 shrink-0" /> Мастер на месте: проходит чек-лист «Белые перчатки» и фотографирует технику «до».
          </motion.div>
        )}

        {order.status === "estimate" && (
          <motion.div key="estimate" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-violet-200 p-5 ring-4 ring-violet-500/5">
              <div className="text-base font-bold text-ink">Мастер прислал смету</div>
              {order.estimateNote && <p className="mt-1 text-sm text-slate-500">«{order.estimateNote}»</p>}
              <div className="mt-4 space-y-2 text-sm">
                <Row label="Работа мастера" value={rub(work)} />
                <Row label="Запчасти" value={rub(parts)} />
                <Row label="Сервисный сбор 4%" value={rub(serviceFee)} />
                {order.donation > 0 && <Row label="Копилка ЖК" value={rub(order.donation)} />}
                <div className="border-t border-dashed border-slate-200 pt-2 text-base"><Row label={<b className="text-ink">Итого</b>} value={<b className="text-ink">{rub(total)}</b>} /></div>
              </div>
              {work > order.priceWorkTo && <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-700">Работа дороже заявленной вилки ({rub(order.priceWorkTo)}) — вы вправе отказаться.</div>}
              <PayBlock order={order} total={total} toast={toast} busy={busy} onApprove={() => act({ action: "approveEstimate" }, "Смета согласована, мастер приступает")} />
              <button disabled={busy} onClick={() => act({ action: "refuse" })} className="mt-2 w-full rounded-2xl py-2.5 text-[13px] font-medium text-slate-500 transition-all active:scale-95">Отказаться от ремонта (оплатить только выезд {rub(order.visitFee)})</button>
            </Card>
          </motion.div>
        )}

        {order.status === "in_progress" && (
          <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 rounded-3xl border border-sky-200/60 bg-sky-50 p-4 text-sm text-sky-800">
            <Spinner className="h-4 w-4 shrink-0" /> Идёт ремонт. Мастер пришлёт фото «после», когда закончит.
          </motion.div>
        )}

        {order.status === "awaiting_confirm" && (
          <motion.div key="confirm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-emerald-200 p-5 ring-4 ring-emerald-500/5">
              <div className="text-base font-bold text-ink">Мастер завершил работу</div>
              <p className="mt-1 text-sm text-slate-500">Проверьте технику. После подтверждения {rub(total)} разморозятся и уйдут мастеру, а вы получите гарантию на 1 год.</p>
              <div className="mt-4 flex justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} aria-label={`${n} звёзд`} className="transition-all active:scale-75">
                    <Star className={`h-9 w-9 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                  </button>
                ))}
              </div>
              <Button variant="emerald" disabled={busy} onClick={() => act({ action: "confirm", rating }, "Оплата прошла, гарантийный талон готов 🛡")} className="mt-4 w-full">
                <Check className="h-4 w-4" /> Всё работает — подтвердить
              </Button>
            </Card>
          </motion.div>
        )}

        {order.status === "done" && <Warranty key="done" order={order} masterName={master.name} />}
        {order.status === "done" && order.payment?.receiptJson && <ReceiptView key="receipt" json={order.payment.receiptJson} />}

        {order.status === "visit_only" && (
          <motion.div key="visit" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <div className="font-bold text-ink">Ремонт отменён</div>
              <p className="mt-1 text-sm text-slate-500">С карты списан только выезд мастера — {rub(order.visitFee)}. Остальная сумма разморожена и вернулась на карту.</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {closed && (
        <Button onClick={onNew} className="w-full">Новый заказ</Button>
      )}
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

/** Цифровой гарантийный талон на 1 год. */
export function Warranty({ order, masterName, compact }: { order: LiveOrder; masterName: string; compact?: boolean }) {
  const done = new Date(order.completedAt ?? Date.now());
  const until = new Date(done);
  until.setFullYear(until.getFullYear() + 1);
  const p = order.payment;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="print-area relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#064E3B] p-5 text-white shadow-lift">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.06)_50%,transparent_70%)] bg-[length:200%_100%]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-5 w-5 text-emerald-400" /> Гарантийный талон</div>
          <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">Действует</span>
        </div>
        <div className="relative mt-4 font-mono text-xl font-semibold tracking-wider text-emerald-300">{order.warrantyCode}</div>
        <div className="relative mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
          <Field label="Работы" value={order.diagnosis} wide />
          <Field label="Мастер" value={masterName} />
          <Field label="Гарантия до" value={until.toLocaleDateString("ru-RU")} />
          {!compact && <Field label="Адрес" value={order.address} wide />}
          {p && <Field label="Оплачено" value={rub(p.clientPaid)} />}
          {p && <Field label="Чек НПД мастера" value={p.receiptNo} />}
        </div>
        {!compact && (
          <div className="relative mt-4 rounded-2xl bg-white/[0.07] p-3 text-xs leading-relaxed text-slate-300 ring-1 ring-white/10">
            Повторная неисправность того же узла в течение 12 месяцев устраняется бесплатно. Квартира застрахована на 100 000 ₽ на время работ.
          </div>
        )}
      </div>
      {!compact && (
        <button onClick={() => window.print()} className="no-print mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium text-slate-500 transition-all active:scale-95"><Printer className="h-4 w-4" /> Распечатать / сохранить PDF</button>
      )}
    </motion.div>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="font-medium leading-snug">{value}</div>
    </div>
  );
}

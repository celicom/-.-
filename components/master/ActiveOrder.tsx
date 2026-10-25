"use client";

import { Camera, Check, CheckCircle2, ImagePlus, Lock, MapPin, Navigation, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { compressImage, orderAction, type LiveMaster, type LiveOrder } from "@/lib/live";
import { masterNet } from "@/lib/finance";
import { rub } from "@/lib/catalog";
import { Button, SectionTitle } from "@/components/ui";

type Toast = (t: string) => void;

/** Рисует демо-снимок с водяным знаком — для показа на ПК без камеры. */
function demoPhoto(kind: "ДО" | "ПОСЛЕ", title: string) {
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 600;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 800, 600);
  grad.addColorStop(0, kind === "ДО" ? "#475569" : "#065f46");
  grad.addColorStop(1, kind === "ДО" ? "#0f172a" : "#10b981");
  g.fillStyle = grad;
  g.fillRect(0, 0, 800, 600);
  g.fillStyle = "rgba(255,255,255,0.12)";
  g.fillRect(250, 120, 300, 340);
  g.fillStyle = "#fff";
  g.font = "bold 64px sans-serif";
  g.fillText(`Фото ${kind}`, 40, 90);
  g.font = "28px sans-serif";
  g.fillText(title.slice(0, 48), 40, 520);
  g.font = "22px sans-serif";
  g.fillText(`Сосед.Про • ДЕМО • ${new Date().toLocaleString("ru-RU")}`, 40, 565);
  return c.toDataURL("image/jpeg", 0.8);
}

function Step({ n, title, done, disabled, children }: { n: number; title: string; done: boolean; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`rounded-3xl border bg-white p-4 shadow-soft transition-all ${done ? "border-emerald-200/80" : "border-slate-200/60"} ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${done ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-slate-100 text-slate-500"}`}>{done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}</span>
        <span className="text-sm font-semibold leading-snug text-ink">{title}</span>
        {disabled && <Lock className="ml-auto h-4 w-4 shrink-0 text-slate-300" />}
      </div>
      {children}
    </div>
  );
}

function PhotoStep({ n, title, src, disabled, onUpload, label }: { n: number; title: string; src: string | null; disabled: boolean; onUpload: (data: string) => Promise<void>; label: "ДО" | "ПОСЛЕ" }) {
  const input = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const handle = async (data: string | Promise<string>) => {
    setLoading(true);
    try {
      await onUpload(await data);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Step n={n} title={title} done={!!src} disabled={disabled}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Фото ${label}`} className="mt-3 aspect-[4/3] w-full rounded-2xl object-cover" />
      ) : (
        <div className="mt-3 grid grid-cols-[2fr_1fr] gap-2">
          <button disabled={disabled || loading} onClick={() => input.current?.click()} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-5 text-sm font-semibold text-ink transition-all hover:border-ink active:scale-95 disabled:pointer-events-none">
            <Camera className="h-6 w-6 text-slate-400" /> {loading ? "Загружаем…" : `Снять «${label}»`}
          </button>
          <button disabled={disabled || loading} onClick={() => handle(demoPhoto(label, title))} className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-slate-100 text-[11px] font-medium text-slate-500 transition-all active:scale-95 disabled:pointer-events-none" title="Для показа на компьютере без камеры">
            <ImagePlus className="h-5 w-5" /> Демо-снимок
          </button>
          <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && handle(compressImage(e.target.files[0]))} />
        </div>
      )}
    </Step>
  );
}

export function ActiveOrder({ order, master, toast }: { order: LiveOrder; master: LiveMaster; toast: Toast }) {
  const [work, setWork] = useState(String(order.finalWork ?? order.priceWorkFrom));
  const [parts, setParts] = useState(String(order.finalParts ?? 0));
  const [note, setNote] = useState(order.estimateNote ?? "");
  const [busy, setBusy] = useState(false);

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

  const onsite = order.status === "onsite";
  const afterEstimate = ["estimate", "in_progress", "awaiting_confirm"].includes(order.status);
  const canFinish = !!order.photoBefore && !!order.photoAfter && order.status === "in_progress";
  const pct = Math.round((1 - master.commissionRate) * 100);
  const net = masterNet(order.finalWork ?? (Number(work) || 0), master.commissionRate) + (order.finalParts ?? (Number(parts) || 0));

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-lift">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-500/25 blur-2xl" />
        <div className="relative text-xs font-medium text-slate-400">Активный заказ №{order.number}</div>
        <div className="relative mt-1 text-[17px] font-bold leading-snug">{order.diagnosis}</div>
        <div className="relative mt-2 flex items-center gap-1.5 text-sm text-slate-300"><MapPin className="h-4 w-4 text-emerald-400" />{order.address}</div>
        <div className="relative text-xs text-slate-400">{order.clientName}</div>
        {order.bagHint && <div className="relative mt-3 flex gap-1.5 rounded-2xl bg-white/[0.07] p-3 text-xs leading-snug text-indigo-100 ring-1 ring-white/10"><Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-300" />В сумке: {order.bagHint}</div>}
      </div>

      {order.status === "accepted" && (
        <div className="space-y-2">
          <a href={`https://yandex.ru/maps/?text=${encodeURIComponent("Москва, " + order.address)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-white py-3.5 text-sm font-semibold text-ink shadow-soft transition-all active:scale-95">
            <Navigation className="h-4 w-4" /> Маршрут в Яндекс Картах
          </a>
          <Button variant="emerald" disabled={busy} onClick={() => act({ action: "arrive" }, "Клиент видит, что вы на месте")} className="w-full py-4">Я на месте</Button>
        </div>
      )}

      {order.status !== "accepted" && (
        <>
          <SectionTitle>Антифрод чек-лист на объекте</SectionTitle>
          <Step n={1} title="Одет в чистую форму, бахилы надеты, коврик под инструмент расстелен" done={order.checklistUniform}>
            {onsite && !order.photoBefore && (
              <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-medium text-ink transition-all active:scale-[0.98]">
                <input type="checkbox" className="h-5 w-5 accent-emerald-500" checked={order.checklistUniform} onChange={(e) => act({ action: "checklist", value: e.target.checked })} />
                Подтверждаю стандарт «Белые перчатки»
              </label>
            )}
          </Step>

          <PhotoStep n={2} label="ДО" title="Фото «ДО»: техника и пол вокруг" src={order.photoBefore} disabled={!order.checklistUniform || !onsite} onUpload={(data) => act({ action: "photoBefore", data }, "Фото «ДО» загружено")} />

          <Step n={3} title="Согласование финальной сметы в приложении" done={afterEstimate && order.status !== "estimate"} disabled={!order.photoBefore}>
            {onsite && order.photoBefore && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-slate-500">Работа, ₽<input inputMode="numeric" value={work} onChange={(e) => setWork(e.target.value.replace(/\D/g, ""))} className="tabular mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-ink focus:bg-white" /></label>
                  <label className="text-xs font-medium text-slate-500">Запчасти, ₽<input inputMode="numeric" value={parts} onChange={(e) => setParts(e.target.value.replace(/\D/g, ""))} className="tabular mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-ink focus:bg-white" /></label>
                </div>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Комментарий клиенту: что меняем и почему" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-ink focus:bg-white" />
                <div className="text-xs text-slate-500">Вилка по диагностике: {rub(order.priceWorkFrom)}–{rub(order.priceWorkTo)} • ваша выплата {pct}% от работ</div>
                <Button disabled={busy || !Number(work)} onClick={() => act({ action: "estimate", work: Number(work), parts: Number(parts) || 0, note }, "Смета отправлена клиенту")} className="w-full py-3">Отправить смету клиенту</Button>
              </div>
            )}
            {order.status === "estimate" && <div className="mt-2 text-sm font-medium text-amber-600">⏳ Клиент смотрит смету {rub((order.finalWork ?? 0) + (order.finalParts ?? 0))}…</div>}
            {["in_progress", "awaiting_confirm"].includes(order.status) && <div className="mt-2 text-sm font-medium text-emerald-600">Смета {rub((order.finalWork ?? 0) + (order.finalParts ?? 0))} согласована клиентом</div>}
          </Step>

          <PhotoStep n={4} label="ПОСЛЕ" title="Фото «ПОСЛЕ»: результат и чистый пол" src={order.photoAfter} disabled={order.status !== "in_progress"} onUpload={(data) => act({ action: "photoAfter", data }, "Фото «ПОСЛЕ» загружено")} />

          {order.status === "awaiting_confirm" ? (
            <div className="flex items-center gap-3 rounded-3xl border border-emerald-200/70 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-5 w-5 shrink-0" /> Работа сдана. Деньги в эскроу — выплата {rub(net)} придёт на карту, как только клиент подтвердит.
            </div>
          ) : (
            <button
              disabled={!canFinish || busy}
              onClick={() => act({ action: "complete" }, "Заказ сдан клиенту на приёмку")}
              className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-[15px] font-bold text-white shadow-[0_10px_30px_-10px_rgb(16_185_129_/_0.7)] transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {canFinish ? `Завершить заказ и получить выплату ${pct}% на карту` : `🔒 Завершить заказ и получить выплату ${pct}% на карту`}
            </button>
          )}
          {!canFinish && order.status !== "awaiting_confirm" && <div className="text-center text-xs text-slate-400">Кнопка разблокируется после загрузки фото «ДО» и «ПОСЛЕ»</div>}
        </>
      )}
    </div>
  );
}

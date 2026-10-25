"use client";

import { ReceiptText, X } from "lucide-react";
import { rub } from "@/lib/catalog";

type Item = { name: string; qty: number; amount: number; vat: string };
type Receipt = {
  receiptNo: string;
  issuedAt: string;
  paymentMethod: string;
  paymentId: string;
  platform: { seller: string; inn: string; taxation: string; items: Item[] };
  performer: { kind: string; name: string; inn: string; items: Item[] };
  donation?: { name: string; amount: number };
  split: { masterPayout: number; platformFee: number };
  fiscal: { mode: string; fn: string; fd: number; fp: number };
};

export const PAY_METHOD_LABEL: Record<string, string> = { card: "Карта", sbp: "СБП", escrow: "Безопасная сделка" };

export function parseReceipt(json: string | null | undefined): Receipt | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Receipt;
  } catch {
    return null;
  }
}

/** Электронный чек (54-ФЗ): часть платформы и часть самозанятого Исполнителя. */
export function ReceiptView({ json, onClose }: { json: string; onClose?: () => void }) {
  const r = parseReceipt(json);
  if (!r) return null;
  const total = (items: Item[]) => items.reduce((s, i) => s + i.amount, 0);
  const Block = ({ title, sub, items }: { title: string; sub: string; items: Item[] }) => (
    <div className="border-t border-dashed border-slate-300 pt-3">
      <div className="text-xs font-semibold text-ink">{title}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
      {items.map((i) => (
        <div key={i.name} className="mt-1.5 flex justify-between gap-3 text-xs">
          <span className="text-slate-600">{i.name} <span className="text-slate-400">× {i.qty}, {i.vat}</span></span>
          <span className="tabular shrink-0 font-medium text-ink">{rub(i.amount)}</span>
        </div>
      ))}
      <div className="mt-1.5 flex justify-between text-xs font-semibold"><span>Итого</span><span className="tabular">{rub(total(items))}</span></div>
    </div>
  );
  return (
    <div className="print-area relative space-y-3 rounded-2xl bg-white p-4 font-mono text-ink shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200/60">
      {onClose && (
        <button onClick={onClose} aria-label="Закрыть" className="no-print absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      )}
      <div className="flex items-center gap-2 font-sans text-sm font-bold"><ReceiptText className="h-4 w-4 text-emerald-600" /> Электронный чек (54-ФЗ)</div>
      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">
        <span>№ {r.receiptNo}</span>
        <span className="text-right">{new Date(r.issuedAt).toLocaleString("ru-RU")}</span>
        <span>Оплата: {PAY_METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod}</span>
        <span className="truncate text-right" title={r.paymentId}>ID {r.paymentId || "—"}</span>
      </div>
      <Block title={r.performer.kind} sub={`${r.performer.name}, ИНН ${r.performer.inn}`} items={r.performer.items} />
      <Block title={r.platform.seller} sub={`ИНН ${r.platform.inn}, ${r.platform.taxation}`} items={r.platform.items} />
      {r.donation && (
        <div className="flex justify-between border-t border-dashed border-slate-300 pt-3 text-xs"><span>{r.donation.name}</span><span className="tabular">{rub(r.donation.amount)}</span></div>
      )}
      <div className="flex justify-between border-t border-slate-300 pt-2 text-sm font-bold">
        <span>Оплачено клиентом</span>
        <span className="tabular">{rub(total(r.performer.items) + total(r.platform.items) + (r.donation?.amount ?? 0))}</span>
      </div>
      <div className="rounded-xl bg-emerald-50 p-2.5 text-[11px] text-emerald-800">
        Сплит: Исполнителю {rub(r.split.masterPayout)} • Агентская комиссия платформы {rub(r.split.platformFee)} (удержана из суммы Исполнителя)
      </div>
      <div className="text-[10px] leading-relaxed text-slate-400">
        ФН {r.fiscal.fn} • ФД {r.fiscal.fd} • ФП {r.fiscal.fp}
        {r.fiscal.mode === "demo" && <span className="block font-sans text-amber-600">Демо-чек: в тестовом режиме фискальные данные не настоящие.</span>}
      </div>
    </div>
  );
}

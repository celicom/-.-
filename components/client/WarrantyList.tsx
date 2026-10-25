"use client";

import { ShieldCheck } from "lucide-react";
import type { Live } from "@/lib/live";
import { Warranty } from "./TrackScreen";

const DEMO_CLIENT = "Анастасия (демо-клиент)";

/** Все гарантийные талоны демо-клиента. */
export function WarrantyList({ state }: { state: Live }) {
  const mine = state.orders.filter((o) => o.clientName === DEMO_CLIENT && o.status === "done" && o.warrantyCode);
  return (
    <div>
      <h1 className="mt-1 text-[26px] font-bold tracking-tight text-ink">Гарантии</h1>
      <p className="mt-0.5 text-sm text-slate-500">12 месяцев на каждый ремонт и уборку</p>
      {mine.length === 0 ? (
        <div className="mt-10 flex flex-col items-center px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/60"><ShieldCheck className="h-7 w-7 text-slate-300" /></div>
          <div className="mt-4 font-semibold text-ink">Пока нет талонов</div>
          <p className="mt-1 text-sm text-slate-500">Талон появится здесь сразу после того, как вы подтвердите выполненный заказ.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {mine.map((o) => (
            <Warranty key={o.id} order={o} masterName={state.masters.find((m) => m.id === o.masterId)?.name ?? "—"} compact />
          ))}
        </div>
      )}
    </div>
  );
}

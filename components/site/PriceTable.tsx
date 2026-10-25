"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { Turnkey, Work, WorkRange } from "@/components/Prices";

export type PriceRowData =
  | { key: string; href?: string; name: string; sub: string; min: number; kind: "code"; w: [number, number]; p: [number, number] }
  | { key: string; href?: string; name: string; sub: string; min: number; kind: "fixed"; base: number };

/** Таблица цен: все суммы пересчитываются при смене города. */
export function PriceTable({ rows, workLabel = "Работа мастера", turnkeyLabel = "Под ключ с запчастями" }: { rows: PriceRowData[]; workLabel?: string; turnkeyLabel?: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-soft">
      <div className="thin-scroll overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3">Услуга</th>
              <th className="py-3 pr-4">{workLabel}</th>
              <th className="py-3 pr-4">{turnkeyLabel}</th>
              <th className="px-5 py-3">Время</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60">
                <td className="px-5 py-3.5">
                  {r.href ? <Link href={r.href} className="font-semibold text-ink underline-offset-2 hover:underline">{r.name}</Link> : <span className="font-semibold text-ink">{r.name}</span>}
                  <div className="text-xs text-slate-500">{r.sub}</div>
                </td>
                <td className="whitespace-nowrap py-3.5 pr-4 font-semibold text-ink">
                  {r.kind === "code" ? <WorkRange from={r.w[0]} to={r.w[1]} /> : <Work base={r.base} />}
                </td>
                <td className="whitespace-nowrap py-3.5 pr-4 text-slate-700">
                  {r.kind === "code" ? <Turnkey price={{ workFrom: r.w[0], workTo: r.w[1], partsFrom: r.p[0], partsTo: r.p[1] }} /> : <Work base={Math.round(r.base * 1.6)} prefix="до " />}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">{r.min ? <><Clock className="mr-1 inline h-3.5 w-3.5" />~{r.min} мин</> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
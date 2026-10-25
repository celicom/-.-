"use client";

import { BadgeCheck, Globe2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/live";
import { subscribeVersion } from "@/lib/sse";
import { minOrder, rubles, scaleWork, type ItemLite, type RegionLite } from "@/lib/pricing";
import { GROUP_LABEL } from "@/lib/data/services";
import { TIER_LABEL } from "@/lib/data/regions";
import { APPLIANCE_CATEGORIES } from "@/lib/catalog";

type CodeRow = { id: string; category: string; brand: string; code: string; title: string; priceWorkFrom: number; priceWorkTo: number; partsFrom: number; partsTo: number; source: string; verified: boolean };
type Data = { regions: RegionLite[]; items: ItemLite[]; codes: CodeRow[] };

const tabs = [
  { id: "regions", label: "Города и коэффициенты" },
  { id: "items", label: "Услуги и уборка" },
  { id: "codes", label: "Ремонт техники (коды)" },
] as const;

/** Число с сохранением по Enter или потере фокуса. Значение из базы подставляется после обновления. */
function NumInput({ value, onSave, step = 1, min = 0, className = "" }: { value: number; onSave: (n: number) => void; step?: number; min?: number; className?: string }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = () => {
    const n = Number(v.replace(",", "."));
    if (Number.isFinite(n) && n !== value) onSave(n);
    else setV(String(value));
  };
  return (
    <input
      type="number" inputMode="decimal" step={step} min={min} value={v}
      onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`tabular rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-sm font-medium text-ink outline-none transition focus:border-ink ${className}`}
    />
  );
}

export function PriceMatrix({ onDone }: { onDone: (t: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("regions");
  const [demo, setDemo] = useState("plumbing:mixer");
  const [group, setGroup] = useState("plumbing");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const load = useCallback(async () => {
    const res = await fetch("/api/pricing?codes=1", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => {
    load();
    return subscribeVersion(load);
  }, [load]);

  const save = async (kind: string, id: string, body: Record<string, number>, ok: string) => {
    try {
      await api(`/api/pricing/${kind}/${encodeURIComponent(id)}`, "PATCH", body);
      onDone(ok);
      load();
    } catch (e) {
      onDone((e as Error).message);
    }
  };

  const groups = useMemo(() => Object.keys(GROUP_LABEL), []);
  const demoItem = data?.items.find((i) => i.id === demo);
  const codes = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.codes ?? []).filter((c) => (cat === "all" || c.category === cat) && (!needle || `${c.brand} ${c.code} ${c.title}`.toLowerCase().includes(needle))).slice(0, 80);
  }, [data, q, cat]);

  return (
    <section id="regions" className="scroll-mt-24 rounded-2xl border border-slate-200/60 bg-white shadow-soft">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <Globe2 className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-ink">🌍 Регионы и Прайс-матрица</h2>
        <span className="text-xs text-slate-400">изменения сохраняются в базу и сразу пересчитывают цены на сайте и в приложении</span>
        <div className="ml-auto flex gap-1 rounded-xl bg-slate-100 p-0.5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${tab === t.id ? "bg-white text-ink shadow-card" : "text-slate-500"}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {!data ? (
          <div className="py-10 text-center text-sm text-slate-400">Загрузка…</div>
        ) : tab === "regions" ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>Пример пересчёта для услуги:</span>
              <select value={demo} onChange={(e) => setDemo(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
                {data.items.filter((i) => ["plumbing", "electric", "junior"].includes(i.groupKey)).map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
              </select>
              <span>база Москвы: <b className="text-ink">{demoItem ? rubles(demoItem.basePrice) : "—"}</b></span>
            </div>
            <div className="thin-scroll overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 pr-3">Город</th>
                    <th className="py-2.5 pr-3">Коэффициент</th>
                    <th className="py-2.5 pr-3">Ползунок</th>
                    <th className="py-2.5 pr-3 text-right">Пример</th>
                    <th className="py-2.5 text-right">Минимальный выезд</th>
                  </tr>
                </thead>
                <tbody>
                  {(["moscow", "tier1", "tier2", "tier3"] as const).map((tier) => (
                    <FragmentRows key={tier} title={TIER_LABEL[tier]}>
                      {data.regions.filter((r) => r.tier === tier).map((r) => (
                        <tr key={r.id} className="border-b border-slate-100/80 hover:bg-slate-50/60">
                          <td className="py-2 pr-3 font-medium text-ink">{r.name}</td>
                          <td className="py-2 pr-3"><NumInput value={r.multiplier} step={0.01} min={0.3} className="w-20" onSave={(n) => save("regions", r.id, { multiplier: n }, `${r.name}: коэффициент ${n.toFixed(2)}`)} /></td>
                          <td className="py-2 pr-3">
                            <input type="range" min={0.4} max={1.2} step={0.01} value={r.multiplier} onChange={(e) => setData({ ...data, regions: data.regions.map((x) => (x.id === r.id ? { ...x, multiplier: Number(e.target.value) } : x)) })} onPointerUp={(e) => save("regions", r.id, { multiplier: Number((e.target as HTMLInputElement).value) }, `${r.name}: коэффициент сохранён`)} onKeyUp={(e) => save("regions", r.id, { multiplier: Number((e.target as HTMLInputElement).value) }, `${r.name}: коэффициент сохранён`)} className="w-40 accent-emerald-500" />
                          </td>
                          <td className="tabular py-2 pr-3 text-right text-slate-700">{demoItem ? rubles(scaleWork(demoItem.basePrice, r.multiplier)) : "—"}</td>
                          <td className="tabular py-2 text-right text-slate-700">{rubles(minOrder(r.multiplier))}</td>
                        </tr>
                      ))}
                    </FragmentRows>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : tab === "items" ? (
          <>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {groups.map((g) => <button key={g} onClick={() => setGroup(g)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${group === g ? "bg-ink text-white" : "bg-slate-100 text-slate-600"}`}>{GROUP_LABEL[g]}</button>)}
            </div>
            <div className="thin-scroll max-h-[520px] overflow-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"><th className="py-2.5 pr-3">Позиция</th><th className="py-2.5 pr-3">Ед.</th><th className="py-2.5 pr-3 text-right">База Москвы, ₽</th><th className="py-2.5 text-right">Мин</th></tr></thead>
                <tbody>
                  {data.items.filter((i) => i.groupKey === group).map((i) => (
                    <tr key={i.id} className="border-b border-slate-100/80 hover:bg-slate-50/60">
                      <td className="py-2 pr-3 text-ink">{i.label}</td>
                      <td className="py-2 pr-3 text-slate-400">{i.unit || "услуга"}</td>
                      <td className="py-2 pr-3 text-right"><NumInput value={i.basePrice} step={50} className="w-24" onSave={(n) => save("items", i.id, { basePrice: n }, `«${i.label}»: ${rubles(n)}`)} /></td>
                      <td className="tabular py-2 text-right text-slate-400">{i.durationMin || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Бренд, код, симптом" className="w-52 bg-transparent text-sm outline-none" /></label>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <option value="all">Все категории</option>
                {APPLIANCE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <span className="text-xs text-slate-400">Показаны первые {codes.length} • «Под ключ» = работа × коэффициент + запчасти (запчасти не зависят от региона)</span>
            </div>
            <div className="thin-scroll max-h-[520px] overflow-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="sticky top-0 bg-white"><tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"><th className="py-2.5 pr-3">Код</th><th className="py-2.5 pr-3">Источник</th><th className="py-2.5 pr-2 text-right">Работа от</th><th className="py-2.5 pr-2 text-right">Работа до</th><th className="py-2.5 pr-2 text-right">Запчасти от</th><th className="py-2.5 text-right">Запчасти до</th></tr></thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100/80 hover:bg-slate-50/60">
                      <td className="py-2 pr-3"><div className="font-medium text-ink">{c.brand} {c.code}</div><div className="max-w-[300px] truncate text-xs text-slate-400">{c.title}</div></td>
                      <td className="py-2 pr-3">{c.verified ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><BadgeCheck className="h-3 w-3" />Рафаэль</span> : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">авто, не проверено</span>}</td>
                      {(["priceWorkFrom", "priceWorkTo", "partsFrom", "partsTo"] as const).map((k) => (
                        <td key={k} className="py-2 pr-2 text-right"><NumInput value={c[k]} step={100} className="w-20" onSave={(n) => save("codes", c.id, { [k]: n }, `${c.brand} ${c.code}: цена обновлена`)} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function FragmentRows({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <tr><td colSpan={5} className="bg-slate-50/70 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</td></tr>
      {children}
    </>
  );
}

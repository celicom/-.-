"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LocateFixed, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePricing } from "./PricingProvider";
import { TIER_LABEL } from "@/lib/data/regions";

/** Выбор города: поиск, автоопределение и мгновенный пересчёт всех цен. */
export function CitySelect({ variant = "light", align = "right" }: { variant?: "light" | "dark"; align?: "left" | "right" }) {
  const { regions, region, setRegionId, detect } = usePricing();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/ё/g, "е");
    const list = regions.filter((r) => !needle || r.name.toLowerCase().replace(/ё/g, "е").includes(needle));
    return (["moscow", "tier1", "tier2", "tier3"] as const).map((t) => ({ tier: t, list: list.filter((r) => r.tier === t) })).filter((g) => g.list.length);
  }, [regions, q]);

  const auto = async () => {
    setDetecting(true);
    setNote(null);
    const r = await detect();
    setDetecting(false);
    if (r) {
      setNote(`Определили: ${r.name}`);
      setOpen(false);
    } else setNote("Не удалось определить: выберите город вручную");
  };

  const btn = variant === "dark" ? "bg-white/10 text-white hover:bg-white/15" : "bg-white text-ink shadow-soft ring-1 ring-slate-200/60 hover:ring-slate-300";
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-semibold transition-all active:scale-95 ${btn}`} aria-haspopup="listbox" aria-expanded={open}>
        <MapPin className="h-4 w-4 text-emerald-500" />
        {region.name}
        <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className={`absolute z-[80] mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200/70 bg-white text-ink shadow-lift ${align === "right" ? "right-0" : "left-0"}`}>
            <div className="border-b border-slate-100 p-2.5">
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти город" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
              </label>
              <button onClick={auto} disabled={detecting} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50">
                <LocateFixed className="h-4 w-4" /> {detecting ? "Определяем…" : "Определить автоматически"}
              </button>
              {note && <div className="px-3 pb-1 text-xs text-slate-500">{note}</div>}
            </div>
            <div className="thin-scroll max-h-72 overflow-y-auto p-1.5">
              {groups.length === 0 && <div className="p-4 text-center text-sm text-slate-400">Город не найден</div>}
              {groups.map((g) => (
                <div key={g.tier} className="mb-1">
                  <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{TIER_LABEL[g.tier]}</div>
                  {g.list.map((r) => (
                    <button
                      key={r.id}
                      role="option"
                      aria-selected={r.id === region.id}
                      onClick={() => {
                        setRegionId(r.id);
                        setOpen(false);
                        setQ("");
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${r.id === region.id ? "bg-ink font-semibold text-white" : "hover:bg-slate-50"}`}
                    >
                      {r.name}
                      <span className={`text-xs ${r.id === region.id ? "text-slate-300" : "text-slate-400"}`}>×{r.multiplier.toFixed(2).replace(".", ",")}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

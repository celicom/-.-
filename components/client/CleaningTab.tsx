"use client";

import { animate, motion } from "framer-motion";
import { Building2, Check, Clock, Home, Leaf, Minus, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CLEAN_TYPE_LABELS } from "@/lib/data/services";
import { calcCleaning, calcCommercial, rubles } from "@/lib/pricing";
import { usePricing } from "@/components/PricingProvider";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";
import { Button, Card, SectionTitle } from "@/components/ui";
import type { Draft } from "./types";

const TYPES = Object.keys(CLEAN_TYPE_LABELS);
const AREA_TYPES = ["support", "general", "after-repair"];

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.4,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${Math.round(v).toLocaleString("ru-RU")}${suffix}`;
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, suffix]);
  return <span ref={ref}>{`${value.toLocaleString("ru-RU")}${suffix}`}</span>;
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-all active:scale-90 disabled:opacity-30" disabled={value === 0} aria-label="Меньше"><Minus className="h-4 w-4" /></button>
      <span className="tabular w-6 text-center text-sm font-bold text-ink">{value}</span>
      <button onClick={() => onChange(Math.min(20, value + 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white transition-all active:scale-90" aria-label="Больше"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

/** Конструктор уборки: квартиры (по комнатам или по площади), окна поштучно, опции и коммерческие помещения. Цены региональные. */
export function CleaningTab({ onCall, initialType = "support" }: { onCall: (d: Draft) => void; initialType?: string }) {
  const { group, multiplier } = usePricing();
  const [mode, setMode] = useState<"flat" | "business">("flat");
  const [type, setType] = useState<string>(TYPES.includes(initialType) ? initialType : "support");
  const [calcBy, setCalcBy] = useState<"rooms" | "area">("rooms");
  const [rooms, setRooms] = useState(2);
  const [area, setArea] = useState(55);
  const [extras, setExtras] = useState<Record<string, number>>({ "clean-extra:eco": 1, ...(initialType === "windows" ? { "clean-window:sash2": 2 } : {}) });
  const [bizId, setBizId] = useState("clean-commercial:retail");
  const [bizArea, setBizArea] = useState(40);
  const [consent, setConsent] = useState(false);

  const allItems = useMemo(() => [...group("clean-type"), ...group("clean-window"), ...group("clean-extra"), ...group("clean-commercial")], [group]);
  const windows = group("clean-window");
  const options = group("clean-extra");
  const commercial = group("clean-commercial");

  const setQty = (id: string, n: number) => setExtras((e) => ({ ...e, [id]: n }));
  const pickType = (t: string) => {
    setType(t);
    if (t === "windows" && !windows.some((w) => extras[w.id])) setQty("clean-window:sash2", 2);
    if (!AREA_TYPES.includes(t)) setCalcBy("rooms");
  };

  const calc = calcCleaning({ items: allItems, multiplier, type, mode: calcBy, rooms, area, extras });
  const biz = calcCommercial(allItems, multiplier, bizId, bizArea);
  const bizItem = commercial.find((c) => c.id === bizId);
  const hours = Math.floor(calc.minutes / 60);
  const mins = calc.minutes % 60;
  const onlyWindows = type === "windows";

  const orderFlat = () => {
    const names = calc.lines.slice(calc.lines.length && !onlyWindows ? 1 : 0).map((l) => l.label.toLowerCase());
    onCall({
      kind: "cleaning", skill: "cleaning", category: "cleaning", categoryLabel: "Уборка",
      diagnosis: `${CLEAN_TYPE_LABELS[type]} уборка${onlyWindows ? "" : calcBy === "area" ? `, ${area} м²` : `, ${rooms === 4 ? "4+к" : `${rooms}к`}`}${names.length ? " + " + names.join(", ") : ""}`,
      bagHint: `Набор для уборки (${CLEAN_TYPE_LABELS[type].toLowerCase()}), микрофибра x6, пароочиститель${extras["clean-extra:eco"] ? ", эко-химия" : ""}${windows.some((w) => extras[w.id]) ? ", стеклоочиститель и скребок" : ""}`,
      details: `~${calc.minutes} мин`, priceWorkFrom: calc.price, priceWorkTo: calc.price, priceTurnkeyTo: calc.price,
    });
  };

  const orderBiz = () =>
    onCall({
      kind: "cleaning", skill: "cleaning", category: "cleaning", categoryLabel: "Уборка",
      diagnosis: `${bizItem?.label ?? "Уборка помещения"}, ${bizArea} м²`,
      bagHint: "Профессиональный пылесос, поломоечный набор, микрофибра, химия для коммерческих помещений",
      details: bizItem?.symptoms ?? "", priceWorkFrom: biz.price, priceWorkTo: biz.price, priceTurnkeyTo: biz.price,
    });

  return (
    <div className="space-y-3">
      <SectionTitle>Калькулятор уборки</SectionTitle>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
        {([["flat", "Квартира", Home], ["business", "Коммерческие помещения", Building2]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setMode(id)} className={`relative flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all active:scale-95 sm:text-sm ${mode === id ? "text-ink" : "text-slate-400"}`}>
            {mode === id && <motion.span layoutId="clean-mode" className="absolute inset-0 rounded-xl bg-white shadow-card" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <Icon className="relative h-4 w-4" /><span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {mode === "flat" ? (
        <>
          <Card className="p-5">
            <div className="text-sm font-semibold text-ink">Тип уборки</div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TYPES.map((t) => (
                <button key={t} onClick={() => pickType(t)} className={`relative rounded-2xl px-3 py-3 text-sm font-semibold transition-all active:scale-95 ${type === t ? "text-white" : "bg-slate-100 text-ink"}`}>
                  {type === t && <motion.span layoutId="clean-type" className="absolute inset-0 rounded-2xl bg-ink shadow-lift" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <span className="relative">{CLEAN_TYPE_LABELS[t]}</span>
                </button>
              ))}
            </div>

            {!onlyWindows && (
              <>
                <div className="mt-5 flex items-center justify-between">
                  <div className="text-sm font-semibold text-ink">{calcBy === "rooms" ? "Квартира" : "Площадь"}</div>
                  {AREA_TYPES.includes(type) && (
                    <div className="flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold">
                      {([["rooms", "по комнатам"], ["area", "по площади"]] as const).map(([id, label]) => (
                        <button key={id} onClick={() => setCalcBy(id)} className={`rounded-full px-3 py-1 transition-all ${calcBy === id ? "bg-white text-ink shadow-card" : "text-slate-400"}`}>{label}</button>
                      ))}
                    </div>
                  )}
                </div>
                {calcBy === "rooms" ? (
                  <div className="mt-2.5 grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1">
                    {[1, 2, 3, 4].map((r) => (
                      <button key={r} onClick={() => setRooms(r)} className={`relative rounded-xl py-2.5 text-base font-bold transition-all active:scale-95 ${rooms === r ? "text-ink" : "text-slate-400"}`}>
                        {rooms === r && <motion.span layoutId="clean-rooms" className="absolute inset-0 rounded-xl bg-white shadow-card" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                        <span className="relative">{r === 4 ? "4к+" : `${r}к`}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between"><span className="tabular text-2xl font-bold text-ink">{area} м²</span><span className="text-xs text-slate-400">20 – 200 м²</span></div>
                    <input type="range" min={20} max={200} step={5} value={area} onChange={(e) => setArea(Number(e.target.value))} className="mt-1 w-full accent-emerald-500" />
                  </div>
                )}
              </>
            )}
          </Card>

          <Card className="p-4">
            <div className="px-1 pb-1 text-sm font-semibold text-ink">Мытьё окон и балконов {onlyWindows ? "" : <span className="font-normal text-slate-400">(по штукам)</span>}</div>
            {windows.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-1 py-2">
                <div className="min-w-0 flex-1"><div className="text-sm font-medium text-ink">{w.label}</div><div className="text-xs text-slate-400">{rubles(Math.round((w.basePrice * multiplier) / 50) * 50)} за {w.unit}</div></div>
                <Stepper value={extras[w.id] ?? 0} onChange={(n) => setQty(w.id, n)} />
              </div>
            ))}
          </Card>

          <Card className="p-2">
            <div className="px-3 pb-1 pt-2 text-sm font-semibold text-ink">Дополнительные опции</div>
            {options.map((o) => {
              const qty = extras[o.id] ?? 0;
              const price = Math.round((o.basePrice * multiplier) / 50) * 50;
              if (o.unit) {
                return (
                  <div key={o.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1"><div className="text-sm font-medium text-ink">{o.label}</div><div className="text-xs text-slate-400">{rubles(price)} за {o.unit}</div></div>
                    <Stepper value={qty} onChange={(n) => setQty(o.id, n)} />
                  </div>
                );
              }
              const on = qty > 0;
              return (
                <button key={o.id} onClick={() => setQty(o.id, on ? 0 : 1)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all hover:bg-slate-50 active:scale-[0.98]">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all ${on ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>{on && <Check className="h-4 w-4 text-white" strokeWidth={3} />}</span>
                  <span className="flex-1 text-sm font-medium text-ink">{o.id.endsWith("eco") && <Leaf className="mr-1 inline h-3.5 w-3.5 text-emerald-500" />}{o.label}</span>
                  <span className="tabular text-sm font-semibold text-slate-500">+{rubles(price)}</span>
                </button>
              );
            })}
          </Card>

          <div className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-lift">
            <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-emerald-500/25 blur-2xl" />
            <div className="relative flex items-end justify-between">
              <div>
                <div className="text-xs font-medium text-slate-400">Твёрдая цена, без доплат</div>
                <div className="tabular text-[34px] font-bold leading-tight tracking-tight"><AnimatedNumber value={calc.price} suffix=" ₽" /></div>
              </div>
              {calc.minutes > 0 && <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm text-slate-200"><Clock className="h-4 w-4" />{hours ? `${hours} ч ` : ""}{mins ? `${mins} мин` : ""}</div>}
            </div>
            {calc.lines.length > 0 && (
              <div className="relative mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-slate-300">
                {calc.lines.map((l) => <div key={l.label} className="flex justify-between gap-3"><span>{l.label}</span><span className="tabular shrink-0">{rubles(l.amount)}</span></div>)}
              </div>
            )}
            <ConsentCheckbox dark checked={consent} onChange={setConsent} className="relative mt-4" />
            <Button variant="emerald" disabled={calc.price <= 0 || !consent} className="relative mt-3 w-full" onClick={orderFlat}><Sparkles className="h-4 w-4" /> Заказать уборку</Button>
          </div>
        </>
      ) : (
        <>
          <Card className="p-5">
            <div className="text-sm font-semibold text-ink">Что нужно убрать</div>
            <div className="mt-2.5 space-y-2">
              {commercial.map((c) => (
                <button key={c.id} onClick={() => setBizId(c.id)} className={`w-full rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] ${bizId === c.id ? "border-ink bg-slate-50" : "border-slate-200/70"}`}>
                  <div className="text-sm font-semibold text-ink">{c.label}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{c.symptoms}</div>
                  <div className="mt-1 text-xs font-semibold text-emerald-600">{rubles(Math.round((c.basePrice * multiplier) / 50) * 50)} за {c.unit}</div>
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-baseline justify-between"><span className="text-sm font-semibold text-ink">Площадь</span><span className="tabular text-2xl font-bold text-ink">{bizArea} м²</span></div>
            <input type="range" min={10} max={300} step={5} value={bizArea} onChange={(e) => setBizArea(Number(e.target.value))} className="mt-1 w-full accent-emerald-500" />
          </Card>
          <div className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-lift">
            <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-emerald-500/25 blur-2xl" />
            <div className="relative text-xs font-medium text-slate-400">Цена за {bizArea} м² ({rubles(biz.unit)} за м²)</div>
            <div className="tabular relative text-[34px] font-bold leading-tight tracking-tight"><AnimatedNumber value={biz.price} suffix=" ₽" /></div>
            <ConsentCheckbox dark checked={consent} onChange={setConsent} className="relative mt-4" />
            <Button variant="emerald" disabled={!consent} className="relative mt-3 w-full" onClick={orderBiz}><Sparkles className="h-4 w-4" /> Заказать уборку</Button>
          </div>
        </>
      )}
    </div>
  );
}

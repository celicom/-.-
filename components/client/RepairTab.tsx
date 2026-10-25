"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, CheckCircle2, ChevronRight, Clock, Hammer, Lightbulb, Plug, Search, ShowerHead, Sparkles, Wrench, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { APPLIANCE_CATEGORIES, BRANDS, REPAIR_GROUPS, type FixedService } from "@/lib/catalog";
import { usePricing } from "@/components/PricingProvider";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";
import { Turnkey, WorkRange } from "@/components/Prices";
import { scaleCode, rubles } from "@/lib/pricing";
import type { Diagnosis } from "@/lib/diagnose";
import { Button, Card, Pill, SectionTitle, Spinner } from "@/components/ui";
import type { Draft } from "./types";

const FREQ = { often: { label: "часто", tone: "red" }, sometimes: { label: "иногда", tone: "amber" }, rare: { label: "редко", tone: "gray" } } as const;

const GROUP_STYLE: Record<string, { icon: React.ElementType; plate: string }> = {
  appliance: { icon: Plug, plate: "from-indigo-500 to-violet-600" },
  plumbing: { icon: ShowerHead, plate: "from-sky-400 to-blue-600" },
  electric: { icon: Zap, plate: "from-amber-400 to-orange-500" },
  junior: { icon: Hammer, plate: "from-emerald-400 to-teal-600" },
};

const slide = { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 }, transition: { duration: 0.22 } };

export function RepairTab({ onCall }: { onCall: (d: Draft) => void }) {
  const [group, setGroup] = useState<string | null>(null);
  const { group: itemsOf } = usePricing();
  const fixed = (key: string): FixedService[] => itemsOf(key).map((i) => ({ id: i.id, label: i.label, price: i.basePrice, durationMin: i.durationMin, bagHint: i.bagHint, symptoms: i.symptoms }));

  return (
    <AnimatePresence mode="wait">
      {!group && (
        <motion.div key="groups" {...slide}>
          <SectionTitle>Что нужно сделать</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5">
            {REPAIR_GROUPS.map((g) => {
              const st = GROUP_STYLE[g.id];
              return (
                <button key={g.id} onClick={() => setGroup(g.id)} className="group rounded-3xl border border-slate-200/60 bg-white p-4 text-left shadow-soft transition-all hover:shadow-lift active:scale-95">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${st.plate} shadow-md`}>
                    <st.icon className="h-5 w-5 text-white" />
                  </span>
                  <div className="mt-3 text-[15px] font-semibold text-ink">{g.label}</div>
                  <div className="mt-0.5 text-xs leading-snug text-slate-500">{g.hint}</div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
      {group === "appliance" && (
        <motion.div key="appliance" {...slide}>
          <DiagnosticPult onBack={() => setGroup(null)} onCall={onCall} />
        </motion.div>
      )}
      {(group === "plumbing" || group === "electric" || group === "junior") && (
        <motion.div key={group} {...slide}>
          <FixedList
            title={REPAIR_GROUPS.find((g) => g.id === group)!.label}
            items={fixed(group)}
            onBack={() => setGroup(null)}
            onPick={(s) =>
              onCall({
                kind: group === "junior" ? "junior" : "repair",
                skill: group,
                category: group,
                categoryLabel: REPAIR_GROUPS.find((g) => g.id === group)!.label,
                diagnosis: s.label,
                bagHint: s.bagHint,
                details: `~${s.durationMin} мин`,
                priceWorkFrom: s.price,
                priceWorkTo: s.price,
                priceTurnkeyTo: Math.round(s.price * 1.6),
              })
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FixedList({ title, items, onBack, onPick }: { title: string; items: FixedService[]; onBack: () => void; onPick: (s: FixedService) => void }) {
  const { work } = usePricing();
  const [consent, setConsent] = useState(false);
  return (
    <div>
      <BackRow onBack={onBack} title={title} />
      <div className="mb-3 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-soft">
        <ConsentCheckbox checked={consent} onChange={setConsent} />
        {!consent && <div className="mt-2 text-xs text-slate-400">Отметьте согласие, чтобы выбрать услугу и вызвать мастера.</div>}
      </div>
      <div className={`overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-soft transition-opacity ${consent ? "" : "pointer-events-none opacity-50"}`}>
        {items.map((s, i) => (
          <button key={s.id} disabled={!consent} onClick={() => consent && onPick({ ...s, price: work(s.price) })} className={`flex w-full items-center justify-between gap-3 p-4 text-left transition-all hover:bg-slate-50 active:scale-[0.98] ${i ? "border-t border-slate-100" : ""}`}>
            <div>
              <div className="text-[15px] font-medium text-ink">{s.label}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" /> ~{s.durationMin} мин • фиксированная цена</div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="tabular whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-ink">{rubles(work(s.price))}</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BackRow({ onBack, title, step }: { onBack: () => void; title: string; step?: number }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-soft ring-1 ring-slate-200/60 transition-all active:scale-90" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></button>
        <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
      </div>
      {step && (
        <div className="mt-3 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200/70">
              <motion.div className="h-full bg-ink" initial={false} animate={{ width: n <= step ? "100%" : "0%" }} transition={{ duration: 0.35 }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Интеллектуальный диагностический пульт: категория → бренд → код ошибки → результат. */
export function DiagnosticPult({ onBack, onCall, initialCategory = null, initialBrand = null, initialCode = "" }: { onBack?: () => void; onCall: (d: Draft) => void; initialCategory?: string | null; initialBrand?: string | null; initialCode?: string }) {
  const [category, setCategory] = useState<string | null>(initialCategory);
  const [brand, setBrand] = useState<string | null>(initialBrand);
  const [codes, setCodes] = useState<{ code: string; title: string }[]>([]);
  const [code, setCode] = useState(initialCode);
  const [symptom, setSymptom] = useState("");
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixedMyself, setFixedMyself] = useState(false);
  const [consent, setConsent] = useState(false);

  const cat = APPLIANCE_CATEGORIES.find((c) => c.id === category);
  const { multiplier } = usePricing();
  const scaled = result ? scaleCode({ workFrom: result.priceWorkFrom, workTo: result.priceWorkTo, partsFrom: result.partsFrom, partsTo: result.partsTo }, multiplier) : null;

  useEffect(() => {
    if (!category || !brand) return;
    fetch(`/api/ai-diagnostics?category=${category}&brand=${encodeURIComponent(brand)}`)
      .then((r) => r.json())
      .then(async (rows) => {
        if (rows.length) return setCodes(rows);
        const all = await fetch(`/api/ai-diagnostics?category=${category}`).then((r) => r.json());
        setCodes(all);
      });
  }, [category, brand]);

  const run = async (c = code) => {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/ai-diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, brand, code: c, symptom }),
    });
    await new Promise((r) => setTimeout(r, 700)); // даём анимации «анализа» отыграть
    setResult(await res.json());
    setLoading(false);
  };

  const back = () => {
    if (result) return setResult(null);
    if (brand) return setBrand(null);
    if (category) return setCategory(null);
    onBack?.();
  };

  if (!category)
    return (
      <div>
        <BackRow onBack={back} title="Что сломалось?" step={1} />
        <div className="grid grid-cols-3 gap-2.5">
          {APPLIANCE_CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)} className="rounded-3xl border border-slate-200/60 bg-white px-2 py-4 text-center shadow-soft transition-all hover:shadow-lift active:scale-95">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-2xl">{c.emoji}</div>
              <div className="mt-2 text-xs font-semibold text-ink">{c.label}</div>
            </button>
          ))}
        </div>
      </div>
    );

  if (!brand)
    return (
      <div>
        <BackRow onBack={back} title={`${cat?.label}: бренд`} step={2} />
        <div className="grid grid-cols-2 gap-2.5">
          {BRANDS[category].map((b) => (
            <button key={b} onClick={() => setBrand(b)} className="rounded-2xl border border-slate-200/60 bg-white px-3 py-4 text-[15px] font-bold tracking-tight text-ink shadow-soft transition-all hover:shadow-lift active:scale-95">{b}</button>
          ))}
        </div>
      </div>
    );

  if (!result)
    return (
      <div>
        <BackRow onBack={back} title={`${brand}: код ошибки`} step={3} />
        <Card className="p-5">
          <div className="text-sm text-slate-500">Что на дисплее? Выберите код или опишите симптом.</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {codes.map((c) => (
              <button
                key={c.code + c.title}
                onClick={() => {
                  setCode(c.code);
                  run(c.code);
                }}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-all active:scale-95 ${code === c.code ? "bg-ink text-white" : "bg-slate-100 text-ink hover:bg-slate-200"}`}
                title={c.title}
              >
                {c.code}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код, напр. Error 8 / E15" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-ink focus:bg-white" />
            <input value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="Или симптом: не сливает, течёт…" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-ink focus:bg-white" />
          </div>
          <Button onClick={() => run()} disabled={loading || (!code && !symptom)} className="mt-4 w-full">
            {loading ? <Spinner /> : <Bot className="h-4 w-4" />} {loading ? "ИИ анализирует…" : "Диагностировать"}
          </Button>
        </Card>
        {loading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Search className="h-4 w-4 animate-pulse" /> Сверяем с базой ремонтов remontkm.ru…
          </div>
        )}
      </div>
    );

  return (
    <div className="space-y-3">
      <BackRow onBack={back} title="Результат диагностики" />
      <div className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white shadow-lift">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-500/30 blur-2xl" />
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{brand} • {result.code}</div>
            <div className="mt-1 text-lg font-bold leading-snug">{result.title}</div>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-emerald-300"><Sparkles className="h-3 w-3" /> {Math.round(result.confidence * 100)}%</span>
        </div>
      </div>

      <Card>
        <div className="text-sm font-semibold text-ink">Вероятные причины</div>
        <ul className="mt-3 space-y-2.5">
          {result.causes.map((c) => (
            <li key={c.text} className="flex items-start justify-between gap-3 text-sm text-slate-600">
              <span>{c.text}</span>
              <Pill tone={FREQ[c.freq].tone}>{FREQ[c.freq].label}</Pill>
            </li>
          ))}
        </ul>
      </Card>

      <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-soft">
        <div className="flex items-center gap-2 font-semibold text-emerald-700"><Lightbulb className="h-4 w-4" /> Проверьте сами бесплатно</div>
        <ol className="mt-3 space-y-2 text-sm text-slate-600">
          {result.selfCheck.map((s, i) => (
            <li key={s} className="flex gap-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">{i + 1}</span>{s}</li>
          ))}
        </ol>
        {!fixedMyself ? (
          <button onClick={() => setFixedMyself(true)} className="mt-3 text-sm font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4">Помогло, мастер не нужен</button>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Отлично! Мы сэкономили вам вызов.</div>
        )}
      </div>

      <Card>
        <div className="text-sm font-semibold text-ink">Фиксированная вилка цен</div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Работа мастера</div>
            <div className="mt-1 font-bold text-ink"><WorkRange from={result.priceWorkFrom} to={result.priceWorkTo} /></div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Под ключ с запчастями</div>
            <div className="mt-1 font-bold text-ink"><Turnkey price={{ workFrom: result.priceWorkFrom, workTo: result.priceWorkTo, partsFrom: result.partsFrom, partsTo: result.partsTo }} /></div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" /> {result.durationMin ? `~${result.durationMin} мин на месте • ` : ""}диагностика бесплатно при ремонте • запчасти по всей России стоят одинаково</div>
        <div className={`mt-2 rounded-xl px-3 py-2 text-xs ${result.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {result.verified ? "Данные проверены мастером Рафаэлем." : "Расшифровка и цены составлены по типовым случаям: в вашей модели значение кода может отличаться. Точную смету мастер назовёт после диагностики."}
        </div>
      </Card>

      <ConsentCheckbox checked={consent} onChange={setConsent} className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200/60" />
      <Button
        variant="emerald"
        disabled={!consent}
        className="w-full py-4 text-base"
        onClick={() =>
          scaled &&
          onCall({
            kind: "repair",
            skill: category,
            category,
            categoryLabel: cat?.label ?? category,
            brand,
            errorCode: result.code,
            diagnosis: `${cat?.label.replace(/ые$/, "ая").replace(/ы$/, "а")} ${brand}, ${result.code}: ${result.title}`,
            bagHint: result.bagHint,
            details: symptom,
            priceWorkFrom: scaled.workFrom,
            priceWorkTo: scaled.workTo,
            priceTurnkeyTo: scaled.turnkeyTo,
          })
        }
      >
        <Wrench className="h-5 w-5" /> Вызвать мастера
      </Button>
    </div>
  );
}

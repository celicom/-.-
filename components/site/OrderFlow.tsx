"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, orderAction, useLive } from "@/lib/live";
import type { FixedService } from "@/lib/catalog";
import { usePricing } from "@/components/PricingProvider";
import { Spinner, Toast } from "@/components/ui";
import { DiagnosticPult, FixedList } from "@/components/client/RepairTab";
import { CleaningTab } from "@/components/client/CleaningTab";
import { MatchScreen } from "@/components/client/MatchScreen";
import { TrackScreen } from "@/components/client/TrackScreen";
import type { Draft } from "@/components/client/types";

export type CoreTab = "repair" | "home" | "cleaning" | "junior";

const TABS: { id: CoreTab; label: string }[] = [
  { id: "repair", label: "🔧 Ремонт техники" },
  { id: "home", label: "⚡ Сантехника и Электрика" },
  { id: "cleaning", label: "✨ Калькулятор Уборки" },
  { id: "junior", label: "🔩 Помощь по дому (Сосед.Джуниор)" },
];

const KEY = "sosed-active-order"; // тот же ключ, что у /client: заказ с сайта подхватится в мобильном режиме

function fixedDraft(kind: Draft["kind"], skill: string, label: string, s: FixedService): Draft {
  return {
    kind, skill, category: skill, categoryLabel: label, diagnosis: s.label, bagHint: s.bagHint, details: `~${s.durationMin} мин`,
    priceWorkFrom: s.price, priceWorkTo: s.price, priceTurnkeyTo: Math.round(s.price * 1.6),
  };
}

/**
 * Интерактивное ядро сайта: те же пульт, калькулятор и каталог, что в приложении.
 * «Вызвать мастера» создаёт заявку в общей базе: она сразу летит в /master и /admin,
 * а клиент видит живой трекинг прямо на странице.
 */
export function OrderFlow({
  tabs = ["repair", "home", "cleaning", "junior"], initialTab, initialCategory = null, initialBrand = null, initialCode = "", initialClean = "support", address = "ул. Маршала Соколовского, 14, кв. 14", center,
}: { tabs?: CoreTab[]; initialTab?: CoreTab; initialCategory?: string | null; initialBrand?: string | null; initialCode?: string; initialClean?: string; address?: string; center?: { lat: number; lon: number } }) {
  const { state } = useLive();
  const { group: itemsOf } = usePricing();
  const fx = (key: string): FixedService[] => itemsOf(key).map((i) => ({ id: i.id, label: i.label, price: i.basePrice, durationMin: i.durationMin, bagHint: i.bagHint, symptoms: i.symptoms }));
  const [tab, setTab] = useState<CoreTab>(initialTab ?? tabs[0]);
  const [home, setHome] = useState<"plumbing" | "electric" | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    try {
      setActiveId(localStorage.getItem(KEY));
    } catch {}
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const setActive = (id: string | null) => {
    setActiveId(id);
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {}
  };

  // Заказ мог быть удалён (сброс демо) или отменён.
  useEffect(() => {
    if (!state || restored.current) return;
    restored.current = true;
    const o = activeId ? state.orders.find((x) => x.id === activeId) : null;
    if (activeId && (!o || o.status === "cancelled")) setActive(null);
  }, [state, activeId]);

  const call = async (d: Draft) => {
    setCreating(true);
    try {
      const created = await api<{ id: string }>("/api/orders", "POST", { ...d, address, clientName: "Посетитель сайта (демо)", consent: true });
      setActive(created.id);
      setTimeout(() => document.getElementById("order-live")?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const cancel = async () => {
    if (order && ["searching", "assigned", "accepted"].includes(order.status)) await orderAction(order.id, { action: "cancel" }).catch(() => {});
    setActive(null);
  };

  const order = state?.orders.find((o) => o.id === activeId && o.status !== "cancelled") ?? null;

  return (
    <div id="order-live" className="overflow-hidden rounded-[28px] border border-slate-200/60 bg-white shadow-lift">
      <AnimatePresence mode="wait" initial={false}>
        {order && state ? (
          <motion.div key="live" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto max-w-lg px-5 py-6">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm">
              <span className="font-medium text-emerald-800">Заявка отправлена мастерам и в диспетчерскую</span>
              <Link href="/client" className="flex shrink-0 items-center gap-1 font-semibold text-emerald-700 underline-offset-2 hover:underline"><Smartphone className="h-4 w-4" /> В приложение</Link>
            </div>
            {["searching", "assigned"].includes(order.status) ? (
              <MatchScreen order={order} state={state} onCancel={cancel} toast={setToast} center={center} />
            ) : (
              <TrackScreen order={order} state={state} onNew={() => setActive(null)} toast={setToast} center={center} />
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
              <Link href="/master" target="_blank" className="flex items-center gap-1 hover:text-ink"><ExternalLink className="h-3 w-3" /> Окно мастера</Link>
              <Link href="/admin" target="_blank" className="flex items-center gap-1 hover:text-ink"><ExternalLink className="h-3 w-3" /> Админ-панель</Link>
            </div>
          </motion.div>
        ) : (
          <motion.div key="core" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {tabs.length > 1 && (
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50/70 p-2.5">
                {TABS.filter((t) => tabs.includes(t.id)).map((t) => (
                  <button key={t.id} onClick={() => { setTab(t.id); setHome(null); }} className={`relative shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-95 ${tab === t.id ? "text-white" : "text-slate-600 hover:bg-white"}`}>
                    {tab === t.id && <motion.span layoutId={`core-tab-${tabs.join("")}`} className="absolute inset-0 rounded-xl bg-ink shadow-lift" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <span className="relative whitespace-nowrap">{t.label}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
              {creating && <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 py-3 text-sm text-slate-600"><Spinner /> Создаём заявку и запускаем гео-матчинг…</div>}
              {tab === "repair" && <DiagnosticPult onCall={call} initialCategory={initialCategory} initialBrand={initialBrand} initialCode={initialCode} />}
              {tab === "home" && !home && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {([["plumbing", "🚰 Сантехника", "Смесители, протечки, засоры, подключение техники"], ["electric", "💡 Электрика", "Розетки, люстры, автоматы, подключение панелей"]] as const).map(([id, label, hint]) => (
                    <button key={id} onClick={() => setHome(id)} className="rounded-3xl border border-slate-200/60 bg-white p-5 text-left shadow-soft transition-all hover:shadow-lift active:scale-95">
                      <div className="text-lg font-bold text-ink">{label}</div>
                      <div className="mt-1 text-sm text-slate-500">{hint}</div>
                    </button>
                  ))}
                </div>
              )}
              {tab === "home" && home && (
                <FixedList title={home === "plumbing" ? "Сантехника" : "Электрика"} items={fx(home)} onBack={() => setHome(null)} onPick={(s) => call(fixedDraft("repair", home, home === "plumbing" ? "Сантехника" : "Электрика", s))} />
              )}
              {tab === "cleaning" && <CleaningTab onCall={call} initialType={initialClean} />}
              {tab === "junior" && <FixedList title="Сосед.Джуниор: помощь по дому" items={fx("junior")} onBack={() => setTab(tabs[0])} onPick={(s) => call(fixedDraft("junior", "junior", "Сосед.Джуниор", s))} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Toast text={toast} onClose={() => setToast(null)} />
    </div>
  );
}

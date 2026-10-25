"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HeartHandshake, Home, MapPin, Receipt, ShieldCheck, Sparkles, Wrench, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, useLive, orderAction } from "@/lib/live";
import { COMPLEXES } from "@/lib/catalog";
import { Toast, Spinner } from "@/components/ui";
import { ChatBot } from "@/src/components/ChatBot";
import { CitySelect } from "@/components/CitySelect";
import { PhoneFrame, TabBar } from "@/components/PhoneFrame";
import { RepairTab } from "./RepairTab";
import { CleaningTab } from "./CleaningTab";
import { ClubTab } from "./ClubTab";
import { MatchScreen } from "./MatchScreen";
import { TrackScreen } from "./TrackScreen";
import { WarrantyList } from "./WarrantyList";
import type { Draft } from "./types";

const SERVICES = [
  { id: "repair", label: "Ремонт и Мастера", sub: "техника, сантехника", icon: Wrench, plate: "from-indigo-500 via-indigo-600 to-slate-900", glow: "shadow-indigo-500/30" },
  { id: "cleaning", label: "Уборка и Помощь", sub: "от 1 500 ₽", icon: Sparkles, plate: "from-emerald-400 via-emerald-500 to-teal-600", glow: "shadow-emerald-500/30" },
  { id: "club", label: "Клуб ЖК и Добро", sub: "копилка, книги", icon: HeartHandshake, plate: "from-rose-400 via-rose-500 to-orange-400", glow: "shadow-rose-500/30" },
] as const;

type Tab = "home" | "order" | "warranty";
const KEY = "sosed-active-order";
export const DEMO_CLIENT = "Анастасия (демо-клиент)";

function greeting() {
  const h = new Date().getHours();
  return h < 6 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
}

export function ClientApp() {
  const { state, connected } = useLive();
  const [service, setService] = useState<(typeof SERVICES)[number]["id"]>("repair");
  const [tab, setTab] = useState<Tab>("home");
  const [complexIdx, setComplexIdx] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    try {
      const id = localStorage.getItem(KEY);
      if (id) {
        setActiveId(id);
        setTab("order");
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // При открытии: сохранённый заказ удалён (сброс демо) или отменён — возвращаемся на главную.
  const restored = useRef(false);
  useEffect(() => {
    if (!state || restored.current) return;
    restored.current = true;
    if (!activeId) return;
    const o = state.orders.find((x) => x.id === activeId);
    if (!o || o.status === "cancelled") {
      setActiveId(null);
      setTab("home");
      try {
        localStorage.removeItem(KEY);
      } catch {}
    }
  }, [state, activeId]);

  const complex = COMPLEXES[complexIdx];
  const order = state?.orders.find((o) => o.id === activeId && o.status !== "cancelled") ?? null;
  const live = !!order && !["done", "visit_only"].includes(order.status);

  const scrollTop = () => document.getElementById("phone-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  const go = (t: Tab) => {
    setTab(t);
    scrollTop();
  };

  const setActive = (id: string | null) => {
    setActiveId(id);
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {}
  };

  const call = async (d: Draft) => {
    setCreating(true);
    try {
      const created = await api<{ id: string }>("/api/orders", "POST", { ...d, address: `${complex.address}, кв. 14`, clientName: DEMO_CLIENT, consent: true });
      setActive(created.id);
      go("order");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const cancel = async () => {
    if (order && ["searching", "assigned", "accepted"].includes(order.status)) await orderAction(order.id, { action: "cancel" }).catch(() => {});
    setActive(null);
    go("home");
  };

  const tabBar = (
    <TabBar<Tab>
      value={tab}
      onChange={go}
      tabs={[
        { id: "home", label: "Главная", icon: Home },
        { id: "order", label: "Мой заказ", icon: Receipt, badge: live },
        { id: "warranty", label: "Гарантии", icon: ShieldCheck },
      ]}
    />
  );

  return (
    <PhoneFrame tabBar={tabBar} overlay={<><Toast text={toast} onClose={() => setToast(null)} inFrame /><ChatBot placement="absolute" bottomOffset={104} onOpenPult={() => { setService("repair"); go("home"); }} /></>}>
      {/* Шапка */}
      <header className="sticky top-0 z-30 bg-canvas/85 px-5 pb-3 pt-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <button onClick={() => setComplexIdx((i) => (i + 1) % COMPLEXES.length)} className="group flex items-center gap-2 text-left transition-all active:scale-95" title="Сменить ЖК">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-soft ring-1 ring-slate-200/60">
              <MapPin className="h-4 w-4 text-emerald-500" />
            </span>
            <span className="leading-tight">
              <span className="flex items-center gap-1 text-[15px] font-semibold text-ink">{complex.name}<ChevronDown className="h-3.5 w-3.5 text-slate-400" /></span>
              <span className="text-xs text-slate-500">{complex.address}</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
          <CitySelect />
          <span title={connected ? "Синхронизация в реальном времени" : "Переподключение…"} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${connected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
            {connected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />} {connected ? "Live" : "…"}
          </span>
          </div>
        </div>
      </header>

      <main className="px-5 pb-4">
        {!state ? (
          <div className="flex justify-center py-24 text-slate-300"><Spinner className="h-6 w-6" /></div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {tab === "home" && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight text-ink">{greeting()}, Анастасия</h1>
                <p className="mt-0.5 text-sm text-slate-500">Проверенные мастера из вашего дома</p>

                {/* Бейдж защиты */}
                <div className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-[0_12px_30px_-12px_rgb(16_185_129_/_0.6)]">
                  <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
                  <div className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-white/10" />
                  <div className="relative flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur"><ShieldCheck className="h-5 w-5" /></span>
                    <div className="text-[13px] font-medium leading-snug">🛡️ Гарантия 1 год • Квартира застрахована на 100 000 ₽ • Мастера в бахилах</div>
                  </div>
                </div>

                {/* Super-App Switcher */}
                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  {SERVICES.map((s) => {
                    const active = service === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setService(s.id)}
                        className={`relative rounded-3xl border bg-white p-3 text-left transition-all active:scale-95 ${active ? "border-ink shadow-lift" : "border-slate-200/60 shadow-soft"}`}
                      >
                        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${s.plate} shadow-lg ${s.glow}`}>
                          <s.icon className="h-5 w-5 text-white" />
                        </span>
                        <span className="mt-2.5 block text-[13px] font-semibold leading-tight text-ink">{s.label}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">{s.sub}</span>
                        {active && <motion.span layoutId="svc-dot" className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-500" />}
                      </button>
                    );
                  })}
                </div>

                {creating && (
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm text-slate-600 shadow-soft"><Spinner /> Создаём заявку и запускаем гео-матчинг…</div>
                )}
                {live && (
                  <button onClick={() => go("order")} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-ink p-3.5 text-left text-white shadow-lift transition-all active:scale-[0.98]">
                    <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400" /><span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
                    <span className="flex-1 truncate text-sm font-medium">Заказ №{order!.number} в работе</span>
                    <span className="text-xs text-slate-400">Открыть →</span>
                  </button>
                )}

                <div className="mt-6">
                  <AnimatePresence mode="wait">
                    <motion.div key={service} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                      {service === "repair" && <RepairTab onCall={call} />}
                      {service === "cleaning" && <CleaningTab onCall={call} />}
                      {service === "club" && <ClubTab state={state} toast={setToast} />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {tab === "order" && (
              <motion.div key={`order-${order?.status === "searching" || order?.status === "assigned" ? "match" : "track"}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
                {!order ? (
                  <div className="flex flex-col items-center px-6 py-20 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/60"><Receipt className="h-7 w-7 text-slate-300" /></div>
                    <div className="mt-4 text-lg font-semibold text-ink">Активных заказов нет</div>
                    <p className="mt-1 text-sm text-slate-500">Выберите услугу на главной — мастер из вашего дома приедет за 15–35 минут.</p>
                    <button onClick={() => go("home")} className="mt-5 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition-all active:scale-95">Выбрать услугу</button>
                  </div>
                ) : ["searching", "assigned"].includes(order.status) ? (
                  <MatchScreen order={order} state={state} onCancel={cancel} toast={setToast} center={complex} />
                ) : (
                  <TrackScreen
                    order={order}
                    state={state}
                    onNew={() => {
                      setActive(null);
                      go("home");
                    }}
                    toast={setToast}
                    center={complex}
                  />
                )}
              </motion.div>
            )}

            {tab === "warranty" && (
              <motion.div key="warranty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <WarrantyList state={state} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </PhoneFrame>
  );
}

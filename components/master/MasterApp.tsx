"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Ban, Bell, BellOff, ChevronDown, ClipboardList, GraduationCap, Radar, Star, Wallet as WalletIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { masterAction, orderAction, timeAgo, useLive } from "@/lib/live";
import { rub } from "@/lib/catalog";
import { SKILL_BY_ORDER } from "@/components/client/types";
import { Avatar, Card, SectionTitle, Spinner, Toast } from "@/components/ui";
import { PhoneFrame, TabBar } from "@/components/PhoneFrame";
import { IncomingCall } from "./IncomingCall";
import { ActiveOrder } from "./ActiveOrder";
import { Academy } from "./Academy";
import { Wallet } from "./Wallet";

type Tab = "orders" | "academy" | "wallet";
const WORKING = ["accepted", "onsite", "estimate", "in_progress", "awaiting_confirm"];

export function MasterApp() {
  const { state } = useLive();
  const [me, setMe] = useState("rafael");
  const [tab, setTab] = useState<Tab>("orders");
  const [sound, setSound] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sosed-master");
      if (saved) setMe(saved);
    } catch {}
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const master = state?.masters.find((m) => m.id === me);
  const active = state?.orders.find((o) => o.masterId === me && WORKING.includes(o.status));
  const incoming =
    state && master && !master.blocked
      ? state.orders.find(
          (o) =>
            (o.status === "assigned" && o.masterId === me) ||
            (o.status === "searching" &&
              !active &&
              master.status !== "busy" &&
              master.skills.split(",").includes(SKILL_BY_ORDER(o)) &&
              !o.declinedBy.split(",").includes(me) &&
              Date.now() - new Date(o.createdAt).getTime() < 30 * 60 * 1000),
        )
      : undefined;
  const history = state?.orders.filter((o) => o.masterId === me && ["done", "visit_only"].includes(o.status)).slice(0, 6) ?? [];
  const today = state?.payments.filter((p) => p.order.masterId === me && Date.now() - new Date(p.createdAt).getTime() < 7 * 86400000).reduce((s, p) => s + p.masterPayout, 0) ?? 0;

  const pickMaster = (id: string) => {
    setMe(id);
    try {
      localStorage.setItem("sosed-master", id);
    } catch {}
  };

  const accept = async () => {
    if (!incoming) return;
    try {
      await orderAction(incoming.id, { action: "accept", masterId: me });
      setTab("orders");
      setToast("Заказ принят! Клиент видит вас на карте 🚗");
    } catch (e) {
      setToast((e as Error).message);
    }
  };
  const decline = async () => {
    if (incoming) await orderAction(incoming.id, { action: "decline", masterId: me }).catch(() => {});
  };

  const tabBar = (
    <TabBar<Tab>
      value={tab}
      onChange={(t) => {
        setTab(t);
        document.getElementById("phone-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
      }}
      tabs={[
        { id: "orders", label: "Заказы", icon: ClipboardList, badge: !!active },
        { id: "academy", label: "Академия", icon: GraduationCap },
        { id: "wallet", label: "Кошелёк", icon: WalletIcon },
      ]}
    />
  );

  const overlay = (
    <>
      <AnimatePresence>{incoming && master && <IncomingCall key={incoming.id} order={incoming} master={master} sound={sound} onAccept={accept} onDecline={decline} />}</AnimatePresence>
      <Toast text={toast} onClose={() => setToast(null)} inFrame />
    </>
  );

  return (
    <div className="bg-gradient-to-br from-slate-100 via-canvas to-emerald-50/40">
      <PhoneFrame tabBar={tabBar} overlay={overlay} dark={!!incoming}>
        {!state || !master ? (
          <div className="flex justify-center py-32 text-slate-300"><Spinner className="h-6 w-6" /></div>
        ) : (
          <div className="px-5 pb-4">
            {/* Шапка мини-приложения */}
            <div className="flex items-center justify-between pt-2">
              <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-600">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M21.9 4.6 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.5 13.2 1.8 11.7c-1-.3-1-1 .2-1.5L20.6 3c.9-.3 1.6.2 1.3 1.6Z" /></svg>
                Сосед.Про • Mini App
              </span>
              <button onClick={() => setSound((s) => !s)} className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 ${sound ? "bg-ink text-white" : "bg-white text-slate-400 shadow-soft ring-1 ring-slate-200/60"}`} title={sound ? "Звук вызовов включён" : "Включить звук вызовов"}>
                {sound ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </button>
            </div>

            {/* Профиль мастера */}
            <div className="mt-4 flex items-center gap-3">
              <Avatar id={master.id} emoji={master.avatar} size={60} status={master.blocked ? "alert" : active ? "busy" : master.status} />
              <div className="min-w-0 flex-1">
                <label className="relative flex items-center gap-1">
                  <select value={me} onChange={(e) => pickMaster(e.target.value)} className="max-w-full cursor-pointer appearance-none truncate bg-transparent pr-5 text-[22px] font-bold tracking-tight text-ink outline-none">
                    {state.masters.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4 text-slate-400" />
                </label>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-0.5 font-bold text-amber-500"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{master.rating.toFixed(2)}</span>
                  <span className="truncate">{master.title}</span>
                </div>
              </div>
            </div>

            {/* Статус и сводка */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {master.blocked ? (
                <div className="col-span-2 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200/70"><Ban className="h-4 w-4" /> Аккаунт заблокирован</div>
              ) : (
                <button
                  onClick={() => masterAction(master.id, { action: "status", value: master.status === "busy" ? "free" : "busy" }).catch((e) => setToast(e.message))}
                  disabled={!!active}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-all active:scale-95 ${active ? "bg-sky-50 ring-1 ring-sky-200/70" : master.status === "busy" ? "bg-white shadow-soft ring-1 ring-slate-200/60" : "bg-emerald-500 text-white shadow-[0_10px_30px_-12px_rgb(16_185_129_/_0.8)]"}`}
                >
                  <span>
                    <span className={`block text-[11px] font-medium ${master.status === "busy" || active ? "text-slate-500" : "text-emerald-50"}`}>Статус</span>
                    <span className={`block text-sm font-bold ${active ? "text-sky-700" : master.status === "busy" ? "text-ink" : ""}`}>{active ? "На заказе" : master.status === "busy" ? "Не на линии" : "На линии"}</span>
                  </span>
                  {!active && <span className={`relative h-6 w-10 rounded-full transition-all ${master.status === "busy" ? "bg-slate-200" : "bg-white/30"}`}><motion.span layout className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${master.status === "busy" ? "left-0.5" : "right-0.5"}`} /></span>}
                </button>
              )}
              {!master.blocked && (
                <div className="rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-slate-200/60">
                  <div className="text-[11px] font-medium text-slate-500">За 7 дней</div>
                  <div className="tabular text-sm font-bold text-ink">{rub(today)}</div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  {tab === "orders" && (
                    <div className="space-y-3">
                      {!sound && (
                        <button onClick={() => setSound(true)} className="flex w-full items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-left text-xs font-medium text-sky-700 ring-1 ring-sky-200/60 transition-all active:scale-[0.98]">
                          <Bell className="h-4 w-4" /> Нажмите, чтобы включить звук входящих вызовов
                        </button>
                      )}
                      {master.blocked && (
                        <div className="rounded-3xl border border-rose-200/70 bg-rose-50 p-4 text-sm text-rose-700">Аккаунт заблокирован службой безопасности: подозрение на расчёты мимо кассы. Новые заказы недоступны.</div>
                      )}
                      {active ? (
                        <ActiveOrder key={active.id} order={active} master={master} toast={setToast} />
                      ) : (
                        !master.blocked && (
                          <Card className="flex flex-col items-center px-6 py-10 text-center">
                            <div className="relative mb-4 h-20 w-20">
                              <motion.span className="absolute inset-0 rounded-full bg-emerald-400/20" animate={{ scale: [1, 1.5], opacity: [0.6, 0] }} transition={{ duration: 1.8, repeat: Infinity }} />
                              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30"><Radar className="h-9 w-9 text-white" /></span>
                            </div>
                            <div className="text-base font-bold text-ink">{master.status === "busy" ? "Вы не на линии" : "Ждём заказы в вашем ЖК"}</div>
                            <div className="mt-1 text-xs leading-relaxed text-slate-500">Новые заявки от соседей придут сюда мгновенно — со звуком и таймером 30 секунд</div>
                          </Card>
                        )
                      )}
                      {history.length > 0 && (
                        <>
                          <SectionTitle>Последние заказы</SectionTitle>
                          <Card className="p-2">
                            {history.map((o, i) => (
                              <div key={o.id} className={`flex items-center justify-between gap-2 px-2 py-2.5 ${i ? "border-t border-slate-100" : ""}`}>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-ink">№{o.number} • {o.diagnosis}</div>
                                  <div className="text-[11px] text-slate-400">{timeAgo(o.completedAt ?? o.createdAt)} • {o.status === "visit_only" ? "только выезд" : `★ ${o.rating ?? 5}`}</div>
                                </div>
                                <div className={`tabular shrink-0 text-sm font-bold ${o.status === "visit_only" ? "text-rose-500" : "text-emerald-600"}`}>{o.payment ? `+${rub(o.payment.masterPayout)}` : ""}</div>
                              </div>
                            ))}
                          </Card>
                        </>
                      )}
                    </div>
                  )}
                  {tab === "academy" && <Academy master={master} lessons={state.lessons} toast={setToast} />}
                  {tab === "wallet" && <Wallet master={master} state={state} toast={setToast} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </PhoneFrame>
    </div>
  );
}

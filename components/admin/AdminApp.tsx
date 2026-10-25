"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Ban, Bot, Clock, Coins, HandHeart, LayoutDashboard, Map as MapIcon,
  Globe2, Headphones, LogOut, MessageSquareWarning, ReceiptText, Send, ShieldAlert, Star, Unlock, UserPlus, Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api, masterAction, timeAgo, useLive, type Live } from "@/lib/live";
import { rub } from "@/lib/catalog";
import { FRAUD_THRESHOLD } from "@/lib/finance";
import { GeoMap } from "@/components/GeoMap";
import { Avatar, Pill, Spinner, StatusPill, Toast } from "@/components/ui";
import { PriceMatrix } from "./PriceMatrix";
import { ChatPanel } from "./ChatPanel";
import { PAY_METHOD_LABEL, ReceiptView } from "@/components/ReceiptView";

const NAV = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "orders", label: "Заказы", icon: Activity },
  { id: "dispatch", label: "Диспетчерская", icon: MapIcon },
  { id: "finance", label: "Сплит-эквайринг", icon: ReceiptText },
  { id: "fraud", label: "ML-антифрод", icon: ShieldAlert },
  { id: "chats", label: "Живые чаты", icon: Headphones },
  { id: "regions", label: "🌍 Регионы и Прайс-матрица", icon: Globe2 },
  { id: "partners", label: "Анкеты партнёров", icon: UserPlus },
  { id: "telegram", label: "Telegram-бот", icon: Bot },
] as const;

const MAP_FILTERS = [
  { id: "all", label: "Все" },
  { id: "free", label: "🟢 Свободен" },
  { id: "busy", label: "🔵 На заказе" },
  { id: "alert", label: "🔴 Алерт / Просрочка" },
] as const;

function Growth({ value, invert }: { value: number; invert?: boolean }) {
  if (!Number.isFinite(value) || value === 0) return null;
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${good ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70" : "bg-rose-50 text-rose-700 ring-rose-200/70"}`}>
      <Icon className="h-3 w-3" />{up ? "+" : ""}{Math.round(value * 100)}%
    </span>
  );
}

function Panel({ id, title, icon: Icon, children, right, className = "" }: { id?: string; title: string; icon: React.ElementType; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-6 rounded-2xl border border-slate-200/60 bg-white shadow-soft ${className}`}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <Icon className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <div className="ml-auto">{right}</div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 100, 38 - (v / max) * 34] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-24 w-full">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#10B981" stopOpacity="0.35" />
          <stop offset="1" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L100 40 L0 40 Z`} fill="url(#spark)" />
      <motion.path d={line} fill="none" stroke="#10B981" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} />
    </svg>
  );
}

function Kpi({ label, value, hint, icon: Icon, growth, invert, children, className = "" }: { label: string; value: string; hint?: string; icon: React.ElementType; growth?: number; invert?: boolean; children?: React.ReactNode; className?: string }) {
  return (
    <motion.div layout className={`flex flex-col rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft ${className}`}>
      <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
        <Icon className="h-4 w-4 text-slate-400" />
        {label}
        <span className="ml-auto">{growth !== undefined && <Growth value={growth} invert={invert} />}</span>
      </div>
      <motion.div key={value} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} className="tabular mt-3 text-[28px] font-semibold tracking-tight text-ink">{value}</motion.div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
      {children}
    </motion.div>
  );
}

export function AdminApp({ canLogout = false }: { canLogout?: boolean }) {
  const { state, connected } = useLive();
  const [filter, setFilter] = useState<(typeof MAP_FILTERS)[number]["id"]>("all");
  const [nav, setNav] = useState<(typeof NAV)[number]["id"]>("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  // Заказы, которые уже были при открытии; новые подсвечиваем.
  useEffect(() => {
    if (state && !seen) setSeen(new Set(state.orders.map((o) => o.id)));
  }, [state, seen]);

  const goto = (id: (typeof NAV)[number]["id"]) => {
    setNav(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const run = async (id: string, body: Record<string, unknown>, ok: string) => {
    setBusy(id + body.action);
    try {
      await masterAction(id, body);
      setToast(ok);
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const flagged = state?.fraud.filter((f) => f.flagged).length ?? 0;

  return (
    <div className="flex min-h-[calc(100vh-2.75rem)] bg-canvas">
      {/* Сайдбар */}
      <aside className="sticky top-11 hidden h-[calc(100vh-2.75rem)] w-64 shrink-0 flex-col bg-[#0B1120] text-slate-300 lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-500/20">С</span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Сосед.ру</div>
            <div className="text-[11px] text-slate-500">Командный пункт</div>
          </div>
        </div>
        <div className="mx-3 mb-3 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/[0.06]">
          <div className="text-[11px] text-slate-500">Объект</div>
          <div className="text-[13px] font-medium text-white">ЖК Щукино, Соколовского 14</div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => goto(n.id)} className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all active:scale-[0.98] ${nav === n.id ? "text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}`}>
              {nav === n.id && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-white/[0.08] ring-1 ring-white/[0.08]" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
              <n.icon className="relative h-4 w-4" />
              <span className="relative">{n.label}</span>
              {n.id === "fraud" && flagged > 0 && <span className="relative ml-auto rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{flagged}</span>}
              {n.id === "chats" && state && state.chats.some((c) => c.status === "new") && <span className="relative ml-auto rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-ink">{state.chats.filter((c) => c.status === "new").length}</span>}
              {n.id === "partners" && state && state.applications.some((a) => a.status === "new") && <span className="relative ml-auto rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-ink">{state.applications.filter((a) => a.status === "new").length}</span>}
              {n.id === "orders" && state && state.metrics.active > 0 && <span className="relative ml-auto rounded-full bg-emerald-500/20 px-1.5 text-[10px] font-bold text-emerald-300">{state.metrics.active}</span>}
            </button>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/[0.06] p-4">
          {[
            { name: "Анастасия", role: "CEO", color: "from-fuchsia-400 to-rose-500" },
            { name: "Рафаэль", role: "CTO", color: "from-sky-400 to-indigo-500" },
          ].map((u) => (
            <div key={u.name} className="flex items-center gap-2.5">
              {u.name === "Рафаэль" ? <Avatar id="rafael" size={28} /> : <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${u.color} text-[11px] font-bold text-white`}>{u.name[0]}</span>}
              <div className="text-[12px] leading-tight"><div className="font-medium text-white">{u.name}</div><div className="text-slate-500">{u.role}</div></div>
            </div>
          ))}
          <div className={`mt-2 flex items-center gap-2 text-[11px] font-medium ${connected ? "text-emerald-400" : "text-slate-500"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? "animate-pulse bg-emerald-400" : "bg-slate-500"}`} /> {connected ? "Синхронизация в реальном времени" : "Переподключение…"}
          </div>
          {canLogout && (
            <button onClick={() => fetch("/api/admin/session", { method: "DELETE" }).then(() => (window.location.href = "/admin/login"))} className="mt-1 flex items-center gap-2 text-[12px] font-medium text-slate-400 transition-colors hover:text-white">
              <LogOut className="h-3.5 w-3.5" /> Выйти
            </button>
          )}
        </div>
      </aside>

      {/* Контент */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-11 z-20 flex flex-wrap items-center gap-3 border-b border-slate-200/60 bg-canvas/80 px-6 py-4 backdrop-blur-md">
          <div>
            <div className="text-[12px] font-medium text-slate-400">ЖК Щукино • ул. Маршала Соколовского, 14</div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">Обзор платформы</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-lg border border-slate-200/70 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-soft">Последние 30 дней</span>
            <span className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${connected ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70" : "bg-slate-100 text-slate-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} /> Live
            </span>
          </div>
          {/* Мобильная навигация */}
          <div className="no-scrollbar -mx-1 flex w-full gap-1.5 overflow-x-auto lg:hidden">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => goto(n.id)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${nav === n.id ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{n.label}</button>
            ))}
          </div>
        </header>

        {!state ? (
          <div className="flex justify-center py-32 text-slate-300"><Spinner className="h-6 w-6" /></div>
        ) : (
          <main className="mx-auto max-w-[1400px] space-y-5 px-6 py-6">
            {/* Bento-метрики */}
            <div id="overview" className="grid scroll-mt-24 grid-cols-2 gap-4 xl:grid-cols-4">
              <Kpi className="col-span-2 xl:row-span-2" label="Выручка (GMV)" value={rub(state.metrics.gmv)} hint="Оборот через эскроу • 14 дней к прошлым 14" icon={Wallet} growth={state.metrics.gmvGrowth}>
                <div className="mt-auto pt-4"><Sparkline data={state.metrics.gmvSeries} /></div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>14 дней назад</span><span>сегодня</span></div>
              </Kpi>
              <Kpi label="Чистая комиссия" value={rub(state.metrics.platformNet)} hint={`15–20% + сбор 4% • take rate ${(state.metrics.takeRate * 100).toFixed(1)}%`} icon={Coins} growth={state.metrics.feeGrowth} />
              <Kpi label="Фонд пенсионерам" value={rub(state.metrics.fund)} hint={`всего собрано ${rub(state.metrics.fundRaised)}`} icon={HandHeart} />
              <Kpi label="Среднее прибытие" value={`${state.metrics.sla} мин`} hint="цель SLA — 32 мин" icon={Clock}>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div className={`h-full rounded-full ${state.metrics.sla <= 32 ? "bg-emerald-500" : "bg-amber-500"}`} animate={{ width: `${Math.min(100, (state.metrics.sla / 32) * 100)}%` }} />
                </div>
              </Kpi>
              <Kpi label="Заказы" value={`${state.metrics.active} активных`} hint={`${state.metrics.ordersTotal} за период • ★ ${state.metrics.avgRating.toFixed(2)}`} icon={Star} growth={state.metrics.ordersGrowth} />
            </div>

            <div className="grid gap-5 2xl:grid-cols-5">
              {/* Живая лента заказов */}
              <Panel id="orders" title="Заказы в реальном времени" icon={Activity} className="2xl:col-span-3" right={<span className="text-xs text-slate-400">новые сверху</span>}>
                <div className="thin-scroll -mx-5 -my-5 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-2.5">№</th>
                        <th className="py-2.5 pr-3">Заявка</th>
                        <th className="py-2.5 pr-3">Мастер</th>
                        <th className="py-2.5 pr-3">Статус</th>
                        <th className="px-5 py-2.5 text-right">Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {state.orders.slice(0, 12).map((o) => {
                          const fresh = seen && !seen.has(o.id);
                          const m = state.masters.find((x) => x.id === o.masterId);
                          return (
                            <motion.tr
                              key={o.id}
                              layout
                              initial={{ opacity: 0, backgroundColor: "#D1FAE5" }}
                              animate={{ opacity: 1, backgroundColor: fresh ? "#F0FDF7" : "rgba(255,255,255,0)" }}
                              className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60"
                            >
                              <td className="tabular px-5 py-3 font-mono text-xs text-slate-400">{o.number}</td>
                              <td className="py-3 pr-3">
                                <div className="max-w-[300px] truncate font-medium text-ink">{o.diagnosis}</div>
                                <div className="text-xs text-slate-400">{o.clientName} • {timeAgo(o.createdAt)}</div>
                              </td>
                              <td className="py-3 pr-3">
                                {m ? <span className="flex items-center gap-2 text-slate-700"><Avatar id={m.id} emoji={m.avatar} size={22} />{m.name}</span> : <span className="text-slate-400">—</span>}
                              </td>
                              <td className="py-3 pr-3"><StatusPill status={o.status} /></td>
                              <td className="tabular px-5 py-3 text-right font-semibold text-ink">{o.payment ? rub(o.payment.clientPaid) : <span className="font-normal text-slate-400">{rub(o.priceWorkFrom)}+</span>}</td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </Panel>

              {/* Диспетчерская карта */}
              <Panel id="dispatch" title="Живая диспетчерская карта" icon={MapIcon} className="2xl:col-span-2">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {MAP_FILTERS.map((f) => (
                    <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${filter === f.id ? "bg-ink text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{f.label}</button>
                  ))}
                </div>
                <div className="overflow-hidden rounded-xl ring-1 ring-slate-200/60">
                  <GeoMap masters={state.masters.filter((x) => filter === "all" || x.status === filter)} dark />
                </div>
                <div className="mt-4 space-y-2.5">
                  {state.masters
                    .filter((x) => filter === "all" || x.status === filter)
                    .map((x) => {
                      const cur = state.orders.find((o) => o.masterId === x.id && ["accepted", "onsite", "estimate", "in_progress", "awaiting_confirm"].includes(o.status));
                      return (
                        <div key={x.id} className="flex items-center gap-3 text-sm">
                          <Avatar id={x.id} emoji={x.avatar} size={32} status={x.status} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-ink">{x.name}</div>
                            <div className="truncate text-xs text-slate-500">{cur ? `№${cur.number} • ${cur.diagnosis}` : x.blocked ? "заблокирован" : x.specialty}</div>
                          </div>
                          <Pill tone={x.status === "free" ? "green" : x.status === "busy" ? "blue" : "red"} dot>{x.status === "free" ? "Свободен" : x.status === "busy" ? "На заказе" : "Алерт"}</Pill>
                        </div>
                      );
                    })}
                </div>
              </Panel>
            </div>

            <div className="grid gap-5 2xl:grid-cols-5">
              <SplitTable state={state} />
              <Antifraud state={state} busy={busy} run={run} />
            </div>

            <ChatPanel state={state} onDone={setToast} />

            <PriceMatrix onDone={setToast} />

            <Applications state={state} onDone={setToast} />

            <Panel id="telegram" title="Telegram-бот и журнал уведомлений" icon={Bot} right={state.botConfigured ? <Pill tone="green" dot>бот подключён</Pill> : <Pill tone="amber" dot>BOT_TOKEN не задан — журнал</Pill>}>
              <div className="thin-scroll -my-2 max-h-72 space-y-0.5 overflow-y-auto pr-1">
                {state.notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-4 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                    <span className="w-24 shrink-0 text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                    <span className="w-28 shrink-0 truncate"><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{n.target}</span></span>
                    <span className="flex-1 whitespace-pre-line text-slate-700">{n.text}</span>
                    {n.delivered && n.channel === "telegram" && <Send className="h-3.5 w-3.5 shrink-0 text-sky-500" />}
                  </div>
                ))}
              </div>
            </Panel>
          </main>
        )}
      </div>
      <Toast text={toast} onClose={() => setToast(null)} />
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = { repair: "Мастер по ремонту", cleaning: "Клинер", junior: "Сосед.Джуниор" };

/** Анкеты мастеров и партнёров с публичного сайта (/partner). */
function Applications({ state, onDone }: { state: Live; onDone: (t: string) => void }) {
  const decide = async (id: string, action: "approve" | "reject") => {
    try {
      await api(`/api/applications/${id}`, "PATCH", { action });
      onDone(action === "approve" ? "Анкета одобрена" : "Анкета отклонена");
    } catch (e) {
      onDone((e as Error).message);
    }
  };
  const fresh = state.applications.filter((a) => a.status === "new").length;
  return (
    <Panel id="partners" title="Анкеты партнёров с сайта" icon={UserPlus} right={fresh ? <Pill tone="amber" dot>{fresh} на модерации</Pill> : <span className="text-xs text-slate-400">очередь пуста</span>}>
      <div className="-my-2 divide-y divide-slate-100">
        {state.applications.length === 0 && <div className="py-4 text-sm text-slate-400">Пока нет анкет. Форма находится на странице /partner.</div>}
        {state.applications.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-ink">{a.name} <span className="font-normal text-slate-400">• {a.phone}</span></div>
              <div className="text-xs text-slate-500">{ROLE_LABEL[a.role] ?? a.role} • {a.district}{a.experience ? ` • опыт ${a.experience}` : ""} • {timeAgo(a.createdAt)}</div>
              {a.about && <div className="mt-1 text-xs text-slate-600">{a.about}</div>}
            </div>
            {a.status === "new" ? (
              <div className="flex gap-2">
                <button onClick={() => decide(a.id, "approve")} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95">Одобрить</button>
                <button onClick={() => decide(a.id, "reject")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200 active:scale-95">Отклонить</button>
              </div>
            ) : (
              <Pill tone={a.status === "approved" ? "green" : "gray"} dot>{a.status === "approved" ? "Одобрена" : "Отклонена"}</Pill>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SplitTable({ state }: { state: Live }) {
  const nameOf = (id: string | null) => state.masters.find((x) => x.id === id)?.name ?? "—";
  const [receipt, setReceipt] = useState<string | null>(null);
  return (
    <>
    {receipt && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setReceipt(null)}>
        <div className="max-h-[90vh] w-full max-w-md overflow-auto" onClick={(e) => e.stopPropagation()}>
          <ReceiptView json={receipt} onClose={() => setReceipt(null)} />
        </div>
      </div>
    )}
    <Panel id="finance" title="Сплит-эквайринг и фискализация" icon={ReceiptText} className="2xl:col-span-3" right={<span className="text-xs text-slate-400">разбивка каждого платежа</span>}>
      <div className="thin-scroll -mx-5 -my-5 max-h-[460px] overflow-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-2.5">Заказ</th>
              <th className="py-2.5 pr-3 text-right">Оплатил клиент</th>
              <th className="py-2.5 pr-3">Способ</th>
              <th className="py-2.5 pr-3 text-right">Самозанятому</th>
              <th className="py-2.5 pr-3">Чек ФНС</th>
              <th className="py-2.5 pr-3 text-right">Комиссия</th>
              <th className="py-2.5 pr-3 text-right">Сбор 4%</th>
              <th className="py-2.5 pr-3 text-right">Эквайринг</th>
              <th className="px-5 py-2.5 text-right">Резерв</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {state.payments.map((p) => (
                <motion.tr key={p.id} layout initial={{ opacity: 0, backgroundColor: "#D1FAE5" }} animate={{ opacity: 1, backgroundColor: "rgba(255,255,255,0)" }} transition={{ duration: 1.2 }} className="border-b border-slate-100/80 hover:bg-slate-50/60">
                  <td className="px-5 py-2.5">
                    <div className="font-medium text-ink">№{p.order.number} <span className="font-normal text-slate-400">• {nameOf(p.order.masterId)}</span></div>
                    {p.order.status === "visit_only" && <span className="text-[11px] font-medium text-rose-500">только выезд</span>}
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right font-semibold text-ink">{rub(p.clientPaid)}</td>
                  <td className="py-2.5 pr-3 text-xs text-slate-600">{PAY_METHOD_LABEL[p.method] ?? p.method}</td>
                  <td className="tabular py-2.5 pr-3 text-right font-medium text-emerald-600">{rub(p.masterPayout)}</td>
                  <td className="py-2.5 pr-3">
                    {p.receiptJson ? (
                      <button onClick={() => setReceipt(p.receiptJson)} className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] text-emerald-700 underline decoration-dotted hover:bg-emerald-100" title="Открыть электронный чек">{p.receiptNo}</button>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600" title="Чек «Мой налог»">{p.receiptNo}</span>
                    )}
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right text-slate-700">{rub(p.platformFee)}</td>
                  <td className="tabular py-2.5 pr-3 text-right text-slate-700">{rub(p.serviceFee)}</td>
                  <td className="tabular py-2.5 pr-3 text-right text-slate-400">−{rub(p.acquiring)}</td>
                  <td className="tabular px-5 py-2.5 text-right text-amber-600">{p.reserve ? rub(p.reserve) : "—"}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </Panel>
    </>
  );
}

function Antifraud({ state, busy, run }: { state: Live; busy: string | null; run: (id: string, body: Record<string, unknown>, ok: string) => void }) {
  const rows = state.fraud.map((f) => ({ ...f, master: state.masters.find((x) => x.id === f.masterId)! })).sort((a, b) => b.ratio - a.ratio);
  const threats = rows.filter((r) => r.flagged).length;
  return (
    <section id="fraud" className="relative scroll-mt-24 overflow-hidden rounded-2xl bg-[#0B1120] p-[1px] shadow-lift 2xl:col-span-2">
      {/* Градиентная подсветка угроз */}
      <div className={`absolute inset-0 ${threats ? "bg-gradient-to-br from-rose-500/70 via-orange-400/30 to-indigo-500/40" : "bg-gradient-to-br from-emerald-500/40 to-indigo-500/30"}`} />
      <div className="relative h-full rounded-[15px] bg-[#0B1120] text-slate-200">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="relative flex items-center gap-2 border-b border-white/[0.06] px-5 py-3.5">
          <ShieldAlert className={`h-4 w-4 ${threats ? "text-rose-400" : "text-emerald-400"}`} />
          <h2 className="text-sm font-semibold text-white">ML Антифрод-монитор</h2>
          <span className="ml-auto rounded-md bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-400">порог {FRAUD_THRESHOLD * 100}%</span>
        </div>
        <div className="relative p-5">
          <p className="text-xs leading-relaxed text-slate-400">Доля заказов, закрытых со статусом «Клиент отказался от ремонта (оплачен только выезд)». Выше порога — признак сделки за наличные мимо кассы.</p>
          <div className="mt-4 space-y-3">
            {rows.map((r) => {
              const surveyed = state.orders.filter((o) => o.masterId === r.masterId && o.surveySent).length;
              const fines = state.fines.filter((f) => f.masterId === r.masterId).reduce((s, f) => s + f.amount, 0);
              return (
                <div key={r.masterId} className={`rounded-xl p-3.5 ${r.flagged ? "bg-gradient-to-br from-rose-500/15 to-orange-500/5 ring-1 ring-rose-400/30" : "bg-white/[0.03] ring-1 ring-white/[0.06]"}`}>
                  <div className="flex items-center gap-2.5 text-sm">
                    <Avatar id={r.master.id} emoji={r.master.avatar} size={28} />
                    <span className="font-medium text-white">{r.master.name}</span>
                    {r.master.blocked && <span className="rounded bg-rose-500/20 px-1.5 text-[10px] font-semibold text-rose-300">заблокирован</span>}
                    <span className={`tabular ml-auto font-semibold ${r.flagged ? "text-rose-300" : "text-slate-300"}`}>{Math.round(r.ratio * 100)}% <span className="text-xs font-normal text-slate-500">({r.visitOnly}/{r.closed})</span></span>
                  </div>
                  <div className="relative mt-2.5 h-1.5 rounded-full bg-white/[0.06]">
                    <motion.div className={`h-full rounded-full ${r.flagged ? "bg-gradient-to-r from-orange-400 to-rose-500" : "bg-emerald-500"}`} animate={{ width: `${Math.min(100, r.ratio * 100)}%` }} />
                    <span className="absolute -top-1 h-3.5 w-0.5 rounded bg-white/50" style={{ left: `${FRAUD_THRESHOLD * 100}%` }} />
                  </div>
                  {r.flagged && (
                    <div className="mt-3">
                      <div className="flex items-start gap-2 text-sm font-semibold text-rose-300"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Подозрение на сделку за наличные мимо кассы!</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-200/70"><MessageSquareWarning className="h-3.5 w-3.5" /> Авто-опрос клиентов в Telegram: отправлено {surveyed}{fines ? ` • штрафы ${rub(fines)}` : ""}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {r.master.blocked ? (
                          <button disabled={!!busy} onClick={() => run(r.masterId, { action: "unblock" }, "Аккаунт разблокирован")} className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 py-2 text-xs font-semibold text-white transition-all hover:bg-white/15 active:scale-95"><Unlock className="h-3.5 w-3.5" /> Разблокировать</button>
                        ) : (
                          <button disabled={!!busy} onClick={() => run(r.masterId, { action: "block" }, `Аккаунт мастера ${r.master.name} заблокирован`)} className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-500 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-500/30 transition-all hover:bg-rose-600 active:scale-95"><Ban className="h-3.5 w-3.5" /> Заблокировать аккаунт</button>
                        )}
                        <button disabled={!!busy || r.master.deposit <= 0} onClick={() => run(r.masterId, { action: "fine", amount: 3000 }, "Штраф 3 000 ₽ списан из депозита")} className="rounded-lg bg-white/10 px-2 py-2 text-xs font-semibold leading-tight text-rose-200 transition-all hover:bg-white/15 active:scale-95 disabled:opacity-40">Списать штраф из гарантийного депозита</button>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <button disabled={!!busy} onClick={() => run(r.masterId, { action: "survey" }, "Опрос отправлен")} className="text-rose-300 underline-offset-2 hover:underline">Повторить опрос в Telegram</button>
                        <span className="text-slate-500">Депозит: {rub(r.master.deposit)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

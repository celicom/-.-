"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Headphones, Send, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";
import { usePricing } from "@/components/PricingProvider";
import { Spinner } from "@/components/ui";
import { APPLIANCE_CATEGORIES, BRANDS, slugify } from "@/lib/catalog";
import type { Diagnosis } from "@/lib/diagnose";
import { api } from "@/lib/live";
import { rubles } from "@/lib/pricing";
import { subscribeVersion } from "@/lib/sse";

type Btn = { label: string; action: string; payload?: string };
type Lnk = { label: string; href: string; pult?: boolean };
type Msg = { id: number; from: "bot" | "user" | "agent"; text: string; at: string; buttons?: Btn[]; links?: Lnk[] };
type Flow = { step: "idle" | "brand" | "symptom" | "code" | "contact" | "live"; category?: string; brand?: string };

const KEY = "sosed-chat-v1";
const GREETING = "Здравствуйте! Я цифровой помощник сервиса Сосед.Про. Какая у вас задача на сегодня?";
const MAIN: Btn[] = [
  { label: "🔧 Поломалась техника / Код ошибки", action: "tech" },
  { label: "🚰 Сантехника или электрика", action: "plumb" },
  { label: "✨ Заказать уборку квартиры", action: "clean" },
  { label: "🤝 Стать мастером / партнером", action: "partner" },
];

/** Милый мастер-помощник в фирменной кепке «Сосед.Про». */
export function BotAvatar({ size = 44 }: { size?: number }) {
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} className="rounded-full bg-gradient-to-br from-emerald-200 to-teal-300" aria-hidden>
        <circle cx="32" cy="38" r="17" fill="#F6C9A1" />
        <path d="M13 62c2-10 10-14 19-14s17 4 19 14z" fill="#0F172A" />
        <circle cx="26" cy="36" r="2" fill="#0F172A" />
        <circle cx="38" cy="36" r="2" fill="#0F172A" />
        <path d="M26 43c3 3.5 9 3.5 12 0" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M14 29c0-11 8-17 18-17s18 6 18 17z" fill="#0F172A" />
        <path d="M10 30h26c4 0 6-1 6-3H14c-3 0-4 1-4 3z" fill="#10B981" />
        <text x="32" y="25" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff" fontFamily="Onest, sans-serif">СП</text>
      </svg>
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
    </span>
  );
}

const now = () => new Date().toISOString();
const time = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

/**
 * Плавающий чат-бот «Сосед-Бот»: сценарий с кнопками-подсказками, мини-опрос по технике (бренд → симптом) с прямой ссылкой
 * на страницу каталога или Диагностический пульт, история в сессии и передача диалога живой диспетчерской (/admin).
 */
export function ChatBot({ placement = "fixed", bottomOffset = 0, onOpenPult }: { placement?: "fixed" | "absolute"; bottomOffset?: number; onOpenPult?: () => void }) {
  const { work, group } = usePricing();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [flow, setFlow] = useState<Flow>({ step: "idle" });
  const [threadId, setThreadId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [consent, setConsent] = useState(false);
  const [unread, setUnread] = useState(0);
  const idRef = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  const push = useCallback((m: Omit<Msg, "id" | "at"> & { at?: string }) => {
    setMsgs((cur) => [...cur, { id: idRef.current++, at: m.at ?? now(), ...m }]);
  }, []);

  // история диалога сохраняется в сессии браузера
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      const s = raw ? (JSON.parse(raw) as { msgs: Msg[]; flow: Flow; threadId: string | null }) : null;
      if (s?.msgs?.length) {
        setMsgs(s.msgs);
        setFlow(s.flow);
        setThreadId(s.threadId);
        idRef.current = Math.max(0, ...s.msgs.map((m) => m.id)) + 1;
      } else setMsgs([{ id: idRef.current++, from: "bot", text: GREETING, at: now(), buttons: MAIN }]);
    } catch {
      setMsgs([{ id: idRef.current++, from: "bot", text: GREETING, at: now(), buttons: MAIN }]);
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    // пустой список не сохраняем: иначе первый проход эффектов затирает историю до загрузки
    if (!loaded.current || !msgs.length) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ msgs: msgs.slice(-80), flow, threadId }));
    } catch {}
  }, [msgs, flow, threadId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, open]);

  // ответы диспетчера приходят в реальном времени
  const pull = useCallback(async () => {
    if (!threadId) return;
    try {
      const r = await fetch(`/api/chat/${threadId}`, { cache: "no-store" });
      if (!r.ok) return;
      const t = (await r.json()) as { messages: { from: "user" | "bot" | "agent"; text: string; at: string }[] };
      setMsgs((cur) => {
        const known = new Set(cur.filter((m) => m.from === "agent").map((m) => m.at));
        const fresh = t.messages.filter((m) => m.from === "agent" && !known.has(m.at));
        if (!fresh.length) return cur;
        if (!open) setUnread((u) => u + fresh.length);
        return [...cur, ...fresh.map((m) => ({ id: idRef.current++, from: "agent" as const, text: m.text, at: m.at }))];
      });
    } catch {}
  }, [threadId, open]);
  useEffect(() => {
    if (!threadId) return;
    pull();
    return subscribeVersion(pull);
  }, [threadId, pull]);

  const bot = (t: string, extra: Partial<Msg> = {}) => push({ from: "bot", text: t, ...extra });

  const toDispatcher: Btn = { label: "👩‍💼 Позвать диспетчера", action: "handoff" };
  const menu: Btn = { label: "↩ В начало", action: "menu" };

  async function diagnose(category: string, brand: string, input: { code?: string; symptom?: string }) {
    setBusy(true);
    try {
      const d = await api<Diagnosis>("/api/ai-diagnostics", "POST", { category, brand, ...input });
      const cat = APPLIANCE_CATEGORIES.find((c) => c.id === category)!;
      const links: Lnk[] = [];
      if (d.matched) {
        links.push({ label: `Страница: ${d.rowBrand === "Любая марка" ? "" : d.rowBrand + " "}${d.code}`, href: `/codes/${slugify(d.rowBrand)}/${slugify(d.code)}` });
        bot(`Похоже на «${d.title}». Это вероятная причина, точный диагноз ставит мастер.\n\nПроверьте сами бесплатно: ${d.selfCheck[0]}`, { links: [...links, { label: "Открыть диагностический пульт", href: "/#pult", pult: true }, { label: `Все поломки: ${cat.label.toLowerCase()}`, href: `/remont/${cat.slug}` }], buttons: [toDispatcher, menu] });
      } else {
        bot(`Точного совпадения не нашлось, но мастер быстро найдёт причину. Загляните в каталог или откройте диагностический пульт.`, { links: [{ label: "Открыть диагностический пульт", href: "/#pult", pult: true }, { label: `Каталог: ${cat.seo.toLowerCase()}`, href: `/remont/${cat.slug}` }], buttons: [toDispatcher, menu] });
      }
    } catch {
      bot("Не получилось определить причину. Попробуйте ещё раз или позовите диспетчера.", { buttons: [toDispatcher, menu] });
    } finally {
      setBusy(false);
      setFlow({ step: "idle" });
    }
  }

  const act = async (btn: Btn) => {
    push({ from: "user", text: btn.label });
    // снять кнопки с предыдущих сообщений бота
    setMsgs((cur) => cur.map((m) => (m.buttons && m.id !== idRef.current ? { ...m, buttons: undefined } : m)));
    switch (btn.action) {
      case "menu":
        setFlow({ step: "idle" });
        return bot("Чем ещё помочь?", { buttons: MAIN });
      case "tech":
        setFlow({ step: "brand" });
        return bot("Какая техника сломалась?", { buttons: APPLIANCE_CATEGORIES.map((c) => ({ label: `${c.emoji} ${c.label}`, action: "cat", payload: c.id })) });
      case "cat": {
        const cat = APPLIANCE_CATEGORIES.find((c) => c.id === btn.payload)!;
        setFlow({ step: "brand", category: cat.id });
        return bot(`${cat.label}: выберите бренд.`, { buttons: [...BRANDS[cat.id].map((b) => ({ label: b, action: "brand", payload: b })), { label: "Другой бренд", action: "brand", payload: "" }] });
      }
      case "brand": {
        const cat = APPLIANCE_CATEGORIES.find((c) => c.id === flow.category)!;
        setFlow({ step: "symptom", category: cat.id, brand: btn.payload ?? "" });
        return bot("Что происходит с техникой?", { buttons: [...cat.symptoms.map((s) => ({ label: s, action: "symptom", payload: s })), { label: "⌨️ Знаю код ошибки", action: "enter-code" }] });
      }
      case "symptom":
        return diagnose(flow.category!, flow.brand ?? "", { symptom: btn.payload });
      case "enter-code":
        setFlow({ ...flow, step: "code" });
        return bot("Введите код с дисплея, например E15 или Error 8.");
      case "plumb": {
        const pick = [...group("plumbing").slice(0, 3), ...group("electric").slice(0, 2)];
        return bot(`Популярные работы (цены для вашего города, фиксированные):\n${pick.map((p) => `• ${p.label}: ${rubles(work(p.basePrice))}`).join("\n")}`, {
          links: [{ label: "Прайс сантехника", href: "/remont/santehnika" }, { label: "Прайс электрика", href: "/remont/elektrika" }, { label: "Вызвать мастера", href: "/#pult", pult: true }],
          buttons: [toDispatcher, menu],
        });
      }
      case "clean": {
        const p2 = group("clean-type").find((i) => i.id === "clean-type:support:2");
        const g2 = group("clean-type").find((i) => i.id === "clean-type:general:2");
        return bot(`Уборка двухкомнатной квартиры: поддерживающая от ${rubles(work(p2?.basePrice ?? 4500))}, генеральная от ${rubles(work(g2?.basePrice ?? 8900))}. Точную цену посчитает калькулятор: комнаты или площадь, окна, духовка, холодильник и другие опции.`, {
          links: [{ label: "Калькулятор уборки", href: "/uborka" }, { label: "Генеральная уборка", href: "/uborka/generalnaya" }, { label: "После ремонта", href: "/uborka/posle-remonta" }],
          buttons: [toDispatcher, menu],
        });
      }
      case "partner":
        return bot("Мы ищем мастеров по ремонту, клинеров и студентов для мелкой помощи по дому. Мастер получает 85% от чека и работает рядом с домом. Заполните анкету, она сразу попадёт на модерацию.", { links: [{ label: "Анкета и калькулятор заработка", href: "/partner" }], buttons: [toDispatcher, menu] });
      case "handoff":
        setFlow({ step: "contact" });
        return bot("Передам диалог живому диспетчеру. Оставьте имя и телефон, он ответит здесь и перезвонит.");
    }
  };

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    push({ from: "user", text: t });
    if (flow.step === "live" && threadId) {
      await api(`/api/chat/${threadId}`, "POST", { from: "user", text: t }).catch(() => bot("Не удалось отправить сообщение. Проверьте соединение."));
      return;
    }
    if (flow.step === "code" && flow.category) return diagnose(flow.category, flow.brand ?? "", { code: t });
    bot("Выберите вариант кнопкой ниже или позовите диспетчера.", { buttons: [...MAIN.slice(0, 2), toDispatcher] });
  };

  const submitContact = async () => {
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/chat", "POST", { ...contact, consent: true, messages: msgs.map(({ from, text, at }) => ({ from, text, at })) });
      setThreadId(r.id);
      setFlow({ step: "live" });
      bot("Готово! Диспетчер увидел ваш диалог. Пишите сюда: ответ придёт в этом окне.");
    } catch (e) {
      bot((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const last = msgs[msgs.length - 1];
  const pos = placement === "fixed" ? "fixed bottom-5 right-5 z-[95]" : "absolute right-4 z-[65]";
  const panelPos = placement === "fixed" ? "fixed bottom-24 right-5 z-[95] h-[min(560px,calc(100vh-8rem))] w-[min(380px,calc(100vw-2.5rem))]" : "absolute inset-x-3 top-14 z-[66] sm:top-[58px]";

  return (
    <>
      <button onClick={() => { setOpen((o) => !o); setUnread(0); }} className={`no-print ${pos} group flex items-center gap-2 rounded-full bg-ink p-1.5 pr-4 text-white shadow-lift transition-all hover:scale-105 active:scale-95`} style={placement === "absolute" ? { bottom: bottomOffset } : undefined} aria-label="Открыть чат с помощником">
        {open ? <span className="flex h-11 w-11 items-center justify-center"><X className="h-5 w-5" /></span> : <BotAvatar size={44} />}
        <span className="text-sm font-semibold">{open ? "Свернуть" : "Сосед-Бот"}</span>
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold">{unread}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} style={placement === "absolute" ? { bottom: bottomOffset + 64 } : undefined} className={`no-print ${panelPos} flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-lift`} role="dialog" aria-label="Чат с помощником">
            <div className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
              <BotAvatar size={40} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-sm font-bold">Сосед-Бот</div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {flow.step === "live" ? "Диспетчер на связи" : "Онлайн"}</div>
              </div>
              <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-all active:scale-90" aria-label="Закрыть"><X className="h-4 w-4" /></button>
            </div>

            <div className="thin-scroll flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-3 py-4">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[88%]">
                    <div className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${m.from === "user" ? "rounded-br-md bg-ink text-white" : m.from === "agent" ? "rounded-bl-md bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70" : "rounded-bl-md bg-white text-slate-700 shadow-soft ring-1 ring-slate-200/60"}`}>
                      {m.from === "agent" && <div className="mb-0.5 flex items-center gap-1 text-[11px] font-bold text-emerald-700"><Headphones className="h-3 w-3" /> Диспетчер</div>}
                      {m.text}
                    </div>
                    {m.links && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.links.map((l) =>
                          l.pult && onOpenPult ? (
                            <button key={l.label} onClick={() => { onOpenPult(); setOpen(false); }} className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95"><ExternalLink className="h-3 w-3" />{l.label}</button>
                          ) : (
                            <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95"><ExternalLink className="h-3 w-3" />{l.label}</Link>
                          ),
                        )}
                      </div>
                    )}
                    {m.buttons && m.id === last?.id && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.buttons.map((b) => <button key={b.label} disabled={busy} onClick={() => act(b)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-semibold text-ink shadow-soft transition-all hover:border-ink active:scale-95 disabled:opacity-50">{b.label}</button>)}
                      </div>
                    )}
                    <div className={`mt-0.5 px-1 text-[10px] text-slate-400 ${m.from === "user" ? "text-right" : ""}`}>{time(m.at)}</div>
                  </div>
                </div>
              ))}
              {busy && <div className="flex items-center gap-2 px-1 text-xs text-slate-400"><Spinner className="h-3 w-3" /> Бот печатает…</div>}
              <div ref={endRef} />
            </div>

            {flow.step === "contact" ? (
              <div className="space-y-2 border-t border-slate-100 bg-white p-3">
                <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Ваше имя" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-ink focus:bg-white" />
                <input value={contact.phone} inputMode="tel" onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="+7 (___) ___-__-__" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-ink focus:bg-white" />
                <ConsentCheckbox checked={consent} onChange={setConsent} />
                <button disabled={!consent || contact.phone.replace(/\D/g, "").length < 10 || busy} onClick={submitContact} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"><Headphones className="h-4 w-4" /> Передать диспетчеру</button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={flow.step === "code" ? "Код ошибки, например E15" : flow.step === "live" ? "Сообщение диспетчеру" : "Напишите сообщение"} className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-ink focus:bg-white" />
                <button type="submit" disabled={!text.trim() || busy} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-all active:scale-90 disabled:opacity-40" aria-label="Отправить"><Send className="h-4 w-4" /></button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

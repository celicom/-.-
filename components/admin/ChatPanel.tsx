"use client";

import { Headphones, MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, timeAgo, type Live } from "@/lib/live";
import { Pill } from "@/components/ui";

type Msg = { from: "user" | "bot" | "agent"; text: string; at: string };
const STATUS = { new: { label: "Новый", tone: "amber" }, taken: { label: "В работе", tone: "blue" }, closed: { label: "Закрыт", tone: "gray" } } as const;

/** Живая диспетчерская: диалоги, переданные клиентами из «Сосед-Бота». */
export function ChatPanel({ state, onDone }: { state: Live; onDone: (t: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const chats = state.chats;
  const current = chats.find((c) => c.id === selected) ?? chats[0];
  const msgs: Msg[] = current ? JSON.parse(current.messages) : [];
  const fresh = chats.filter((c) => c.status === "new").length;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [current?.id, msgs.length]);

  const send = async () => {
    if (!current || !text.trim()) return;
    try {
      await api(`/api/chat/${current.id}`, "POST", { from: "agent", text });
      setText("");
    } catch (e) {
      onDone((e as Error).message);
    }
  };
  const setStatus = (status: string) => current && api(`/api/chat/${current.id}`, "PATCH", { status }).then(() => onDone(status === "closed" ? "Чат закрыт" : "Чат взят в работу"));

  return (
    <section id="chats" className="scroll-mt-24 rounded-2xl border border-slate-200/60 bg-white shadow-soft">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <Headphones className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-ink">Живая диспетчерская: чаты клиентов</h2>
        <div className="ml-auto">{fresh ? <Pill tone="amber" dot>{fresh} новых</Pill> : <span className="text-xs text-slate-400">очередь пуста</span>}</div>
      </div>
      {chats.length === 0 ? (
        <div className="flex items-center gap-3 p-6 text-sm text-slate-400"><MessageSquare className="h-5 w-5" /> Диалоги появятся здесь, когда клиент нажмёт «Позвать диспетчера» в «Сосед-Боте».</div>
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr]">
          <div className="thin-scroll max-h-[420px] overflow-y-auto border-b border-slate-100 lg:border-b-0 lg:border-r">
            {chats.map((c) => (
              <button key={c.id} onClick={() => setSelected(c.id)} className={`block w-full border-b border-slate-100/80 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${current?.id === c.id ? "bg-slate-50" : ""}`}>
                <div className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-ink">{c.contact}</span><Pill tone={STATUS[c.status as keyof typeof STATUS]?.tone ?? "gray"}>{STATUS[c.status as keyof typeof STATUS]?.label ?? c.status}</Pill></div>
                <div className="mt-0.5 truncate text-xs text-slate-400">{timeAgo(c.updatedAt)}</div>
              </button>
            ))}
          </div>
          {current && (
            <div className="flex min-h-[320px] flex-col">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
                <div className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{current.contact}</div>
                {current.status !== "taken" && <button onClick={() => setStatus("taken")} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95">Взять в работу</button>}
                {current.status !== "closed" && <button onClick={() => setStatus("closed")} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all active:scale-95">Закрыть</button>}
              </div>
              <div className="thin-scroll max-h-[300px] flex-1 space-y-2 overflow-y-auto bg-slate-50/60 p-4">
                {msgs.map((m, i) => (
                  <div key={i} className={`flex ${m.from === "agent" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${m.from === "agent" ? "rounded-br-md bg-emerald-500 text-white" : m.from === "user" ? "rounded-bl-md bg-white text-ink shadow-soft ring-1 ring-slate-200/60" : "rounded-bl-md bg-slate-200/70 text-slate-600"}`}>
                      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wider opacity-60">{m.from === "agent" ? "Диспетчер" : m.from === "user" ? "Клиент" : "Бот"}</div>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-slate-100 p-3">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ответ клиенту" disabled={current.status === "closed"} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-ink focus:bg-white disabled:opacity-50" />
                <button disabled={!text.trim() || current.status === "closed"} className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40"><Send className="h-4 w-4" /> Отправить</button>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
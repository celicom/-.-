"use client";

import { motion } from "framer-motion";
import { CheckCircle2, GraduationCap, Headphones, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { masterAction, type Live, type LiveMaster } from "@/lib/live";
import { MIN_COMMISSION } from "@/lib/finance";

type Lesson = Live["lessons"][number];

const TOPIC_PLATE: Record<string, string> = {
  "Сервис": "from-sky-400 to-indigo-600",
  "Психология общения": "from-violet-400 to-fuchsia-600",
  "Финансовая грамотность": "from-emerald-400 to-teal-600",
  "Стандарты": "from-amber-400 to-orange-500",
};

/** Академия Мастера: аудио-саммари озвучиваются синтезом речи браузера (ru-RU). */
export function Academy({ master, lessons, toast }: { master: LiveMaster; lessons: Lesson[]; toast: (t: string) => void }) {
  const done = master.lessonsDone.split(",").filter(Boolean);
  const [playing, setPlaying] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [canSpeak, setCanSpeak] = useState(true);
  const [readTimer, setReadTimer] = useState<string | null>(null);
  const finishing = useRef(false);

  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const complete = async (l: Lesson) => {
    if (finishing.current) return;
    finishing.current = true;
    try {
      const r = await masterAction(master.id, { action: "lesson", lessonId: l.id });
      if (!(r as { already?: boolean }).already) toast(`+${l.points} баллов рейтинга, комиссия снижена 🎓`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      finishing.current = false;
    }
  };

  const play = (l: Lesson) => {
    if (!canSpeak) {
      setReadTimer(l.id);
      setTimeout(() => setReadTimer((id) => (id === l.id ? "ready:" + l.id : id)), 15000);
      return;
    }
    const synth = window.speechSynthesis;
    if (playing === l.id) {
      synth.cancel();
      setPlaying(null);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(`${l.title}. ${l.author}. ${l.summary}`);
    u.lang = "ru-RU";
    u.rate = 1.05;
    const voice = synth.getVoices().find((v) => v.lang.startsWith("ru"));
    if (voice) u.voice = voice;
    const total = u.text.length;
    u.onboundary = (e) => setProgress(Math.min(1, e.charIndex / total));
    u.onend = () => {
      setPlaying((p) => {
        if (p === l.id) {
          setProgress(1);
          complete(l);
        }
        return null;
      });
    };
    setProgress(0);
    setPlaying(l.id);
    synth.speak(u);
  };

  const commissionPct = Math.round(master.commissionRate * 1000) / 10;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-ink p-5 text-white shadow-lift">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-center gap-2 text-base font-bold"><GraduationCap className="h-5 w-5" /> Академия Мастера и Рост</div>
        <div className="relative mt-1 text-xs leading-relaxed text-indigo-100">Слушайте короткие саммари книг — получайте баллы рейтинга и снижайте комиссию платформы.</div>
        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/10 p-2.5 backdrop-blur"><div className="tabular text-xl font-bold">{master.academyPoints}</div><div className="text-[10px] text-indigo-100">баллов</div></div>
          <div className="rounded-2xl bg-white/10 p-2.5 backdrop-blur"><div className="tabular text-xl font-bold text-emerald-300">{commissionPct}%</div><div className="text-[10px] text-indigo-100">комиссия</div></div>
          <div className="rounded-2xl bg-white/10 p-2.5 backdrop-blur"><div className="tabular text-xl font-bold">{done.length}/{lessons.length}</div><div className="text-[10px] text-indigo-100">пройдено</div></div>
        </div>
        <div className="relative mt-2.5 text-[11px] text-indigo-200">Минимальная комиссия — {MIN_COMMISSION * 100}% после полного курса.</div>
      </div>

      {lessons.map((l) => {
        const isDone = done.includes(l.id);
        const isPlaying = playing === l.id;
        const ready = readTimer === "ready:" + l.id;
        return (
          <div key={l.id} className={`rounded-3xl border bg-white p-4 shadow-soft transition-all ${isPlaying ? "border-violet-300 ring-4 ring-violet-500/10" : "border-slate-200/60"}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => play(l)} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md transition-all active:scale-90 ${TOPIC_PLATE[l.topic] ?? "from-slate-500 to-slate-700"}`} aria-label="Слушать">
                {isPlaying ? <Pause className="h-5 w-5" /> : canSpeak ? <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" /> : <Headphones className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold leading-snug text-ink">{l.title}</div>
                <div className="truncate text-xs text-slate-500">{l.author} • {l.durationMin} мин</div>
                <div className="mt-1 flex gap-1.5">
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">+{l.points} баллов</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">−{Math.round(l.discount * 1000) / 10}% комиссии</span>
                </div>
              </div>
              {isDone && <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />}
            </div>
            {isPlaying && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" animate={{ width: `${progress * 100}%` }} />
              </div>
            )}
            {(readTimer === l.id || ready) && (
              <div className="mt-3 text-sm leading-relaxed text-slate-600">
                {l.summary}
                <button disabled={!ready} onClick={() => complete(l)} className="mt-3 w-full rounded-2xl bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-40">{ready ? "Прочитал(а)" : "Читайте…"}</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { ORDER_STATUS } from "@/lib/catalog";
import { masterPhoto } from "@/lib/avatars";

const TONES = {
  gray: "bg-slate-100 text-slate-600 ring-slate-200/70",
  blue: "bg-sky-50 text-sky-700 ring-sky-200/70",
  amber: "bg-amber-50 text-amber-700 ring-amber-200/70",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  red: "bg-rose-50 text-rose-700 ring-rose-200/70",
  violet: "bg-violet-50 text-violet-700 ring-violet-200/70",
} as const;

const DOTS = { gray: "bg-slate-400", blue: "bg-sky-500", amber: "bg-amber-500", green: "bg-emerald-500", red: "bg-rose-500", violet: "bg-violet-500" } as const;

export function Pill({ tone = "gray", children, className = "", dot }: { tone?: keyof typeof TONES; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONES[tone]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} />}
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, tone: "gray" as const };
  return <Pill tone={s.tone} dot>{s.label}</Pill>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200/60 bg-white p-4 shadow-soft ${className}`}>{children}</div>;
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

/** Фото мастера с точкой онлайн-статуса. */
export function Avatar({ id, emoji, size = 48, status, ring = false, className = "" }: { id: string; emoji?: string; size?: number; status?: string; ring?: boolean; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = masterPhoto(id, size * 2);
  const dot = status === "free" ? "bg-emerald-500" : status === "busy" ? "bg-sky-500" : status === "alert" ? "bg-rose-500" : null;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setFailed(true)} className={`h-full w-full rounded-full object-cover ${ring ? "ring-2 ring-white shadow-md" : ""}`} />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100" style={{ fontSize: size * 0.55 }}>{emoji ?? "👤"}</div>
      )}
      {dot && <span className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${dot}`} style={{ width: Math.max(10, size * 0.26), height: Math.max(10, size * 0.26) }} />}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "emerald" | "ghost" | "soft" | "danger" }) {
  const v = {
    primary: "bg-ink text-white shadow-lift hover:bg-ink-800",
    emerald: "bg-emerald-500 text-white shadow-[0_10px_30px_-10px_rgb(16_185_129_/_0.7)] hover:bg-emerald-600",
    ghost: "text-slate-500 hover:bg-slate-100",
    soft: "bg-slate-100 text-ink hover:bg-slate-200/80",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  }[variant];
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${v} ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-1 flex items-center justify-between px-1">
      <h3 className="text-[13px] font-semibold uppercase tracking-wider text-slate-400">{children}</h3>
      {action}
    </div>
  );
}

export function Toast({ text, onClose, inFrame }: { text: string | null; onClose: () => void; inFrame?: boolean }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16 }}
          onClick={onClose}
          className={`${inFrame ? "absolute top-14 sm:top-[60px]" : "fixed top-16"} left-1/2 z-[70] w-[min(92%,360px)] cursor-pointer rounded-2xl bg-ink/95 px-4 py-3 text-center text-sm font-medium text-white shadow-lift backdrop-blur`}
          style={{ x: "-50%" }}
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";

function StatusBar({ dark }: { dark?: boolean }) {
  const [time, setTime] = useState("9:41");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("ru-RU", { hour: "numeric", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);
  const c = dark ? "text-white" : "text-ink";
  return (
    <div className={`pointer-events-none absolute inset-x-0 top-0 z-[60] hidden h-[54px] items-center justify-between px-9 pt-1 text-[15px] font-semibold sm:flex ${c}`}>
      <span className="tabular w-14">{time}</span>
      <span className="flex items-center gap-1.5">
        {/* сигнал */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        {/* wi-fi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 .7 10.2 10.2 0 0 0 .9 3.5L2 4.7a8.6 8.6 0 0 1 6-2.4Zm0 3.3c1.4 0 2.6.5 3.6 1.4l1.1-1.2A6.9 6.9 0 0 0 8 4c-1.8 0-3.5.7-4.7 1.8L4.4 7c1-.9 2.2-1.4 3.6-1.4ZM8 9a2 2 0 0 0-1.3.5L8 11l1.3-1.5A2 2 0 0 0 8 9Z" /></svg>
        {/* батарея */}
        <span className="relative flex h-[13px] w-[27px] items-center rounded-[4px] border border-current opacity-90 p-[1.5px] opacity-90">
          <span className="h-full w-[80%] rounded-[2px] bg-current" />
          <span className="absolute -right-[3px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r bg-current" />
        </span>
      </span>
    </div>
  );
}

/**
 * Рамка iPhone 16 Pro на компьютере (Dynamic Island, Home Indicator).
 * На телефоне — обычный полноэкранный интерфейс без рамки.
 */
export function PhoneFrame({ children, tabBar, overlay, dark, background = "#F8FAFC" }: { children: ReactNode; tabBar?: ReactNode; overlay?: ReactNode; dark?: boolean; background?: string }) {
  return (
    <div className="flex min-h-[calc(100dvh-2.75rem)] items-start justify-center sm:items-center sm:py-6">
      {/* Корпус */}
      <div className="relative w-full sm:w-auto sm:rounded-[56px] sm:bg-gradient-to-b sm:from-[#3a3a3e] sm:via-[#1c1c1f] sm:to-[#2a2a2e] sm:p-[11px] sm:shadow-phone">
        {/* Кнопки корпуса */}
        <span className="absolute -left-[3px] top-[120px] hidden h-8 w-[3px] rounded-l bg-[#2a2a2e] sm:block" />
        <span className="absolute -left-[3px] top-[176px] hidden h-14 w-[3px] rounded-l bg-[#2a2a2e] sm:block" />
        <span className="absolute -left-[3px] top-[244px] hidden h-14 w-[3px] rounded-l bg-[#2a2a2e] sm:block" />
        <span className="absolute -right-[3px] top-[200px] hidden h-20 w-[3px] rounded-r bg-[#2a2a2e] sm:block" />

        {/* Экран */}
        <div
          className="relative isolate flex h-[calc(100dvh-2.75rem)] w-full flex-col overflow-hidden sm:h-[min(874px,calc(100vh-7rem))] sm:w-[402px] sm:rounded-[45px]"
          style={{ background }}
        >
          <StatusBar dark={dark} />
          <div className="pointer-events-none absolute left-1/2 top-[11px] z-[61] hidden h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black sm:block" />

          <div className="no-scrollbar relative flex-1 overflow-y-auto overscroll-contain scroll-smooth sm:pt-[50px]" id="phone-scroll">
            {children}
            {tabBar && <div className="h-28" />}
          </div>

          {tabBar && (
            <div className={`absolute inset-x-0 bottom-0 z-40 border-t pb-6 pt-2 backdrop-blur-md sm:pb-7 ${dark ? "border-white/10 bg-[#0F172A]/80" : "border-slate-200/60 bg-white/80"}`}>
              {tabBar}
            </div>
          )}
          {overlay}
          <div className={`pointer-events-none absolute bottom-2 left-1/2 z-50 hidden h-[5px] w-[134px] -translate-x-1/2 rounded-full sm:block ${dark ? "bg-white/80" : "bg-ink/90"}`} />
        </div>
      </div>
    </div>
  );
}

export function TabBar<T extends string>({ tabs, value, onChange, dark }: { tabs: { id: T; label: string; icon: React.ElementType; badge?: boolean }[]; value: T; onChange: (v: T) => void; dark?: boolean }) {
  return (
    <div className="grid px-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} className={`relative flex flex-col items-center gap-1 py-1 text-[10.5px] font-medium transition-all active:scale-90 ${active ? (dark ? "text-white" : "text-ink") : "text-slate-400"}`}>
            <span className="relative">
              <t.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.8} />
              {t.badge && <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

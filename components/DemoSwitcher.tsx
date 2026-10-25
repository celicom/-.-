"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Smartphone, Wrench, LayoutDashboard, MonitorUp, RotateCcw, Home } from "lucide-react";
import { useState } from "react";

const ROLES = [
  { href: "/client", label: "Клиент", icon: Smartphone },
  { href: "/master", label: "Мастер", icon: Wrench },
  { href: "/admin", label: "Админ", icon: LayoutDashboard },
];

/** Верхняя панель для показа инвесторам: переключение ролей в один клик. */
export function DemoSwitcher() {
  const path = usePathname();
  const [resetting, setResetting] = useState(false);
  const onSite = !ROLES.some((r) => path?.startsWith(r.href));

  const openAll = () => {
    const w = Math.floor(window.screen.availWidth / 3);
    const h = window.screen.availHeight;
    ROLES.forEach((r, i) => window.open(r.href, `sosed-${r.label}`, `width=${w},height=${h},left=${i * w},top=0`));
  };

  const reset = async () => {
    if (!confirm("Сбросить демо к исходным данным? Все новые заказы будут удалены.")) return;
    setResetting(true);
    await fetch("/api/demo/reset", { method: "POST" });
    try {
      localStorage.removeItem("sosed-active-order");
    } catch {}
    setResetting(false);
    location.reload();
  };

  return (
    <div className="no-print fixed inset-x-0 top-0 z-50 flex h-11 items-center gap-2 border-b border-white/10 bg-graphite-900/95 px-3 text-white backdrop-blur">
      <Link href="/" className="mr-1 flex items-center gap-1.5 text-sm font-semibold">
        <Home className="h-4 w-4 text-mint-400" />
        <span className="hidden sm:inline">Сосед.ру</span>
        <span className="hidden rounded bg-mint-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mint-400 md:inline">Demo</span>
      </Link>
      <div className="flex rounded-lg bg-white/5 p-0.5">
        <Link href="/" className="relative flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium">
          {onSite && <motion.span layoutId="demo-role" className="absolute inset-0 rounded-md bg-mint-500" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
          <span className="relative whitespace-nowrap">🌐 Сайт<span className="hidden md:inline"> (SEO-витрина)</span></span>
        </Link>
        {ROLES.map((r) => {
          const active = path?.startsWith(r.href);
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href} className="relative flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium">
              {active && <motion.span layoutId="demo-role" className="absolute inset-0 rounded-md bg-mint-500" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <Icon className="relative h-3.5 w-3.5" />
              <span className="relative">{r.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <button onClick={openAll} className="hidden items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10 sm:flex" title="Открыть три окна рядом">
          <MonitorUp className="h-3.5 w-3.5" /> 3 окна рядом
        </button>
        <button onClick={reset} disabled={resetting} className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-slate-300 hover:bg-white/10" title="Сбросить демо-данные">
          <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Сброс</span>
        </button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Menu, Phone, X } from "lucide-react";
import { useState } from "react";
import { CitySelect } from "@/components/CitySelect";
import { AuthButton } from "@/components/auth/AuthButton";
import { COMPANY } from "@/src/config/company-legal";

export const PHONE = COMPANY.phone;
export const PHONE_HREF = COMPANY.phoneHref;

const NAV = [
  { href: "/remont/kofemashiny", label: "Услуги" },
  { href: "/#pult", label: "Диагностический пульт" },
  { href: "/uborka", label: "Уборка" },
  { href: "/codes", label: "Коды ошибок" },
  { href: "/#masters", label: "Мастера" },
  { href: "/zhk/shchukino", label: "ЖК" },
  { href: "/#club", label: "Клуб соседей" },
  { href: "/about", label: "О компании" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-11 z-40 border-b border-slate-200/60 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-base font-bold text-white shadow-lg shadow-emerald-500/20">С</span>
          <span className="text-lg font-bold tracking-tight text-ink">Сосед<span className="text-emerald-500">.pro</span></span>
        </Link>
        <nav className="ml-4 hidden items-center gap-0.5 xl:flex">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href} className="whitespace-nowrap rounded-lg px-2 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink">{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <CitySelect />
          <AuthButton />
          <a href={PHONE_HREF} className="hidden items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-slate-100 2xl:flex">
            <Phone className="h-4 w-4 text-emerald-500" /> {PHONE}
          </a>
          <a href={PHONE_HREF} className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 2xl:hidden" aria-label={PHONE}><Phone className="h-4 w-4" /></a>
          <Link href="/#pult" className="hidden whitespace-nowrap rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lift transition-all hover:bg-ink-800 active:scale-95 sm:block">Вызвать мастера</Link>
          <button onClick={() => setOpen((o) => !o)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 xl:hidden" aria-label="Меню">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100 bg-white xl:hidden">
            <div className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:grid-cols-2 sm:px-6">
              {NAV.map((n) => (
                <Link key={n.label} href={n.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-ink hover:bg-slate-50">
                  {n.label} <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              ))}
              <a href={PHONE_HREF} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700"><Phone className="h-4 w-4" /> {PHONE}</a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

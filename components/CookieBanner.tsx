"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cookie } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "sosed-cookie-consent";

export function hasCookieConsent() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

/** Уведомление о cookie (152-ФЗ): согласие сохраняется в localStorage, Яндекс.Метрика подключается только после него. */
export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!hasCookieConsent());
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, acceptedAt: new Date().toISOString() }));
    } catch {}
    setShow(false);
    window.dispatchEvent(new Event("sosed-cookie"));
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} role="dialog" aria-label="Уведомление об использовании cookie" className="no-print fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-3xl border border-slate-200/70 bg-white/95 p-4 shadow-lift backdrop-blur-md sm:bottom-5 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 sm:flex"><Cookie className="h-5 w-5 text-amber-600" /></span>
            <p className="flex-1 text-[13px] leading-relaxed text-slate-600">
              Мы используем файлы cookie и российские сервисы аналитики (Яндекс.Метрика) для корректной работы сервиса Сосед.Про. Данные хранятся на территории РФ.{" "}
              <Link href="/legal/privacy" className="font-semibold text-emerald-700 underline underline-offset-2">Подробнее в Политике конфиденциальности</Link>.
            </p>
            <button onClick={accept} className="shrink-0 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lift transition-all hover:bg-ink-800 active:scale-95">Принять и продолжить</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

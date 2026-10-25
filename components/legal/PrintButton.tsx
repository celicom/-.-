"use client";

import { Printer } from "lucide-react";

/** «Скачать PDF / Распечатать»: в диалоге печати браузера выберите «Сохранить как PDF». */
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift transition-all hover:bg-ink-800 active:scale-95">
      <Printer className="h-4 w-4" /> Скачать PDF / Распечатать
    </button>
  );
}

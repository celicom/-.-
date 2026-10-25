"use client";

import { motion } from "framer-motion";
import { usePricing } from "./PricingProvider";
import { minOrder, rubles, scaleCode, smallRepair, type CodeBase } from "@/lib/pricing";

/** Число, которое подсвечивается при пересчёте цены после смены города. */
function Flash({ text, className = "" }: { text: string; className?: string }) {
  return (
    <motion.span key={text} initial={{ opacity: 0.25, y: -3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={`tabular inline-block ${className}`}>
      {text}
    </motion.span>
  );
}

/** Цена работы по базовой московской цене. */
export function Work({ base, prefix = "", className = "" }: { base: number; prefix?: string; className?: string }) {
  const { work } = usePricing();
  return <Flash className={className} text={`${prefix}${rubles(work(base))}`} />;
}

/** Диапазон цены работы (если границы равны, показывается «от …»). */
export function WorkRange({ from, to, className = "" }: { from: number; to: number; className?: string }) {
  const { work } = usePricing();
  const a = work(from);
  const b = work(to);
  return <Flash className={className} text={a === b ? `от ${rubles(a)}` : `${rubles(a)} – ${rubles(b)}`} />;
}

/** «Под ключ с запчастями»: работа × коэффициент региона + запчасти без изменений. */
export function Turnkey({ price, className = "", prefix = "" }: { price: CodeBase; className?: string; prefix?: string }) {
  const { multiplier } = usePricing();
  const s = scaleCode(price, multiplier);
  const text = s.turnkeyFrom === s.turnkeyTo ? `${prefix}${rubles(s.turnkeyFrom)}` : `${prefix}${rubles(s.turnkeyFrom)} – ${rubles(s.turnkeyTo)}`;
  return <Flash className={className} text={text} />;
}

/** Плашка «Минимальный заказ с выездом…» с региональными суммами. */
export function MinOrderNote() {
  const { multiplier } = usePricing();
  return (
    <Flash text={`Минимальный заказ с выездом — от ${rubles(minOrder(multiplier))}, мелкий ремонт от ${rubles(smallRepair(multiplier))} в мастерской. Гарантия 1 год`} />
  );
}

export function useScaleCode(p: CodeBase) {
  const { multiplier } = usePricing();
  return scaleCode(p, multiplier);
}

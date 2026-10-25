"use client";

import Link from "next/link";
import { useId } from "react";

/**
 * Обязательное согласие по 152-ФЗ. По умолчанию НЕ отмечено; кнопка отправки формы должна быть
 * disabled, пока галочка не поставлена пользователем лично. Ссылки открываются в новой вкладке,
 * чтобы не потерять заполненную форму.
 */
export function ConsentCheckbox({ checked, onChange, offer = "client", dark = false, className = "" }: { checked: boolean; onChange: (v: boolean) => void; offer?: "client" | "master"; dark?: boolean; className?: string }) {
  const id = useId();
  const link = `font-semibold underline underline-offset-2 ${dark ? "text-emerald-300 hover:text-emerald-200" : "text-emerald-700 hover:text-emerald-800"}`;
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-emerald-500" />
      <label htmlFor={id} className={`cursor-pointer text-[13px] leading-snug ${dark ? "text-slate-300" : "text-slate-600"}`}>
        Я даю{" "}
        <Link href="/legal/consent" target="_blank" className={link} onClick={(e) => e.stopPropagation()}>Согласие на обработку персональных данных</Link>{" "}
        и принимаю условия{" "}
        <Link href="/legal/privacy" target="_blank" className={link} onClick={(e) => e.stopPropagation()}>Политики конфиденциальности</Link>{" "}
        и{" "}
        <Link href={offer === "master" ? "/legal/offer-master" : "/legal/offer-client"} target="_blank" className={link} onClick={(e) => e.stopPropagation()}>Публичной оферты</Link>
      </label>
    </div>
  );
}

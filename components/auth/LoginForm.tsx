"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Phone, PhoneCall, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConsentCheckbox } from "@/components/ConsentCheckbox";
import { Button, Spinner } from "@/components/ui";
import { api } from "@/lib/live";

const ERRORS: Record<string, string> = {
  consent: "Для входа нужно согласие на обработку персональных данных",
  provider: "Неизвестный способ входа",
  state: "Сессия входа устарела, попробуйте ещё раз",
  token: "Сервис не подтвердил вход, попробуйте ещё раз",
  profile: "Не удалось получить профиль, попробуйте ещё раз",
  "not-configured": "Этот способ входа ещё не подключён на сервере",
  "not-implemented": "Вход через этот сервис требует регистрации приложения и находится в разработке",
};

/** Маска +7 (___) ___-__-__: цифры подставляются на места подчёркиваний. */
export function formatPhone(digits: string) {
  const d = digits.slice(0, 10);
  let i = 0;
  return "+7 (___) ___-__-__".replace(/_/g, () => d[i++] ?? "_");
}
const BRAND = {
  yandex: { label: "Войти через Яндекс ID", cls: "bg-[#FC3F1D] text-white hover:bg-[#e63a1a]", mark: "Я" },
  vk: { label: "Войти через VK ID", cls: "bg-[#0077FF] text-white hover:bg-[#006be6]", mark: "VK" },
  esia: { label: "Войти через Госуслуги (ЕСИА)", cls: "bg-[#0D4CD3] text-white hover:bg-[#0b43bb]", mark: "Г" },
} as const;

export function LoginForm({ onDone, next = "/", error }: { onDone?: () => void; next?: string; error?: string | null }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [channel, setChannel] = useState<"sms" | "call">("sms");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(error ? ERRORS[error] ?? "Не удалось войти" : null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const request = async (ch = channel) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ resendIn: number; demoCode?: string; channel: "sms" | "call" }>("/api/auth/request", "POST", { phone: digits, channel: ch, consent: true });
      setChannel(ch);
      setStep("code");
      setWait(r.resendIn);
      setDemoCode(r.demoCode ?? null);
      setCode("");
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/auth/verify", "POST", { phone: digits, code: value });
      window.dispatchEvent(new Event("sosed-auth"));
      onDone ? onDone() : (window.location.href = next);
    } catch (e) {
      setMsg((e as Error).message);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const oauth = (p: keyof typeof BRAND) => (window.location.href = `/api/auth/oauth/${p}?consent=1&next=${encodeURIComponent(next)}`);

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-lg font-bold text-white shadow-lg shadow-emerald-500/20">С</span>
        <div>
          <div className="text-xl font-bold tracking-tight text-ink">Вход в Сосед.Про</div>
          <div className="text-sm text-slate-500">Только российские сервисы авторизации</div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {step === "phone" ? (
          <motion.div key="phone" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="mt-6">
            <label className="text-sm font-medium text-slate-600">Номер телефона
              <input
                inputMode="tel" autoComplete="tel" value={digits ? formatPhone(digits) : ""} placeholder="+7 (___) ___-__-__"
                onChange={(e) => {
                  let d = e.target.value.replace(/\D/g, "");
                  if (d.startsWith("7") || d.startsWith("8")) d = d.slice(1);
                  setDigits(d.slice(0, 10));
                }}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-lg font-semibold tracking-wide text-ink outline-none transition focus:border-ink focus:bg-white"
              />
            </label>
            <ConsentCheckbox checked={consent} onChange={setConsent} className="mt-4" />
            <Button disabled={digits.length !== 10 || !consent || busy} onClick={() => request("sms")} className="mt-4 w-full">
              {busy ? <Spinner /> : <Phone className="h-4 w-4" />} Получить код по СМС
            </Button>
            <button disabled={digits.length !== 10 || !consent || busy} onClick={() => request("call")} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 active:scale-95 disabled:pointer-events-none disabled:opacity-40">
              <PhoneCall className="h-4 w-4" /> Позвонить вместо СМС (код — последние 4 цифры номера)
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />или<span className="h-px flex-1 bg-slate-200" /></div>
            <div className="space-y-2">
              {(Object.keys(BRAND) as (keyof typeof BRAND)[]).map((p) => (
                <button key={p} disabled={!consent} onClick={() => oauth(p)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${BRAND[p].cls}`}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold">{BRAND[p].mark}</span>
                  {BRAND[p].label}
                  {p === "esia" && <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">для мастеров</span>}
                </button>
              ))}
            </div>
            {!consent && <div className="mt-3 text-center text-xs text-slate-400">Отметьте согласие, чтобы войти любым способом.</div>}
          </motion.div>
        ) : (
          <motion.div key="code" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="mt-6">
            <button onClick={() => setStep("phone")} className="flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-ink"><ArrowLeft className="h-4 w-4" /> {formatPhone(digits)}</button>
            <div className="mt-3 text-sm text-slate-600">{channel === "call" ? "Мы позвоним на ваш номер. Введите последние 4 цифры входящего номера." : "Мы отправили СМС с 4-значным кодом."}</div>
            <input
              ref={codeRef} inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={code} placeholder="••••"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                setCode(v);
                if (v.length === 4) verify(v);
              }}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-3xl font-bold tracking-[0.6em] text-ink outline-none transition focus:border-ink focus:bg-white"
            />
            {demoCode && (
              <div className="mt-3 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <b>Демо-режим:</b> СМС-провайдер не подключён, ваш код: <button onClick={() => { setCode(demoCode); verify(demoCode); }} className="font-bold underline underline-offset-2">{demoCode}</button>
              </div>
            )}
            <Button disabled={code.length !== 4 || busy} onClick={() => verify(code)} className="mt-4 w-full">{busy ? <Spinner /> : <ShieldCheck className="h-4 w-4" />} Войти</Button>
            <button disabled={wait > 0 || busy} onClick={() => request()} className="mt-2 w-full rounded-2xl py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 active:scale-95 disabled:pointer-events-none disabled:opacity-50">
              {wait > 0 ? `Отправить код повторно через ${wait} сек` : "Отправить код повторно"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {msg && <div role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{msg}</div>}
    </div>
  );
}

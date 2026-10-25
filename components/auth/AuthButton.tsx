"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LogOut, User, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LoginForm } from "./LoginForm";

type Me = { id: string; name: string | null; phone: string | null; provider: string } | null;

/** Кнопка «Войти» в шапке сайта: открывает модальное окно входа; после входа показывает пользователя. */
export function AuthButton() {
  const [user, setUser] = useState<Me | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      setUser(((await r.json()) as { user: Me }).user);
    } catch {
      setUser(null);
    }
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("sosed-auth", load);
    return () => window.removeEventListener("sosed-auth", load);
  }, [load]);

  const logout = async () => {
    await fetch("/api/auth/me", { method: "DELETE" });
    setMenu(false);
    load();
  };

  return (
    <>
      {user ? (
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700 transition-all active:scale-95">
            <User className="h-4 w-4" /> {user.phone ?? user.name ?? "Профиль"}
          </button>
          {menu && (
            <div className="absolute right-0 z-[80] mt-2 w-52 rounded-2xl border border-slate-200/70 bg-white p-1.5 shadow-lift">
              <div className="px-3 py-2 text-xs text-slate-400">Вход: {user.provider === "phone" ? "по телефону" : user.provider}</div>
              <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"><LogOut className="h-4 w-4" /> Выйти</button>
            </div>
          )}
        </div>
      ) : (
        user === null && <button onClick={() => setOpen(true)} className="whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-semibold text-ink transition-all hover:bg-slate-100 active:scale-95">Войти</button>
      )}
      {mounted && createPortal(
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} onClick={(e) => e.stopPropagation()} className="relative my-auto w-full max-w-md rounded-[28px] bg-white p-6 shadow-lift sm:p-8" role="dialog" aria-modal="true" aria-label="Вход">
              <button onClick={() => setOpen(false)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 transition-all active:scale-90" aria-label="Закрыть"><X className="h-4 w-4" /></button>
              <LoginForm onDone={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </>
  );
}

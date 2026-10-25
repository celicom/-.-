import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Вход в админ-панель /admin по логину и паролю из переменных окружения (без внешних сервисов).
 *   ADMIN_LOGIN     логин (по умолчанию admin)
 *   ADMIN_PASSWORD  пароль; если задан — без входа админка и админские API недоступны
 * Режимы: на localhost без ADMIN_PASSWORD админка открыта (демо, «3 окна рядом»);
 * в продакшене без ADMIN_PASSWORD админка закрыта полностью.
 */
export const ADMIN_COOKIE = "sosed_admin";
const SESSION_HOURS = 12;

export type AdminMode = "open" | "password" | "locked";

export function adminMode(): AdminMode {
  if (process.env.ADMIN_PASSWORD) return "password";
  return process.env.NODE_ENV === "production" ? "locked" : "open";
}

const adminLogin = () => process.env.ADMIN_LOGIN || "admin";

// Ключ подписи зависит от пароля: смена ADMIN_PASSWORD завершает все открытые сессии.
const key = () => `${process.env.AUTH_SECRET || "dev-only-secret-change-me-before-production"}:${process.env.ADMIN_PASSWORD ?? ""}`;
const sign = (data: string) => createHmac("sha256", key()).update(data).digest("base64url");
const digest = (s: string) => createHash("sha256").update(s).digest();

export function checkCredentials(login: string, password: string) {
  if (adminMode() !== "password") return false;
  const okLogin = timingSafeEqual(digest(login.trim()), digest(adminLogin()));
  const okPass = timingSafeEqual(digest(password), digest(process.env.ADMIN_PASSWORD!));
  return okLogin && okPass;
}

export function setAdminCookie() {
  const exp = Date.now() + SESSION_HOURS * 3600_000;
  cookies().set(ADMIN_COOKIE, `${exp}.${sign(`admin:${exp}`)}`, {
    // Secure ставим, когда сайт открыт по https (за Nginx). Иначе до выпуска SSL вход по http://IP был бы невозможен.
    httpOnly: true, sameSite: "lax", secure: headers().get("x-forwarded-proto") === "https", path: "/", maxAge: SESSION_HOURS * 3600,
  });
}

export const clearAdminCookie = () => cookies().delete(ADMIN_COOKIE);

export function isAdmin() {
  const mode = adminMode();
  if (mode === "open") return true;
  if (mode === "locked") return false;
  const [exp, sig] = (cookies().get(ADMIN_COOKIE)?.value ?? "").split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(`admin:${exp}`));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Для API-маршрутов: null, если доступ есть, иначе готовый ответ 401. */
export function denyIfNotAdmin() {
  return isAdmin() ? null : NextResponse.json({ error: "Нужен вход в админ-панель" }, { status: 401 });
}

// Защита от перебора: после 5 неудачных попыток с одного IP вход закрыт на 15 минут.
const attempts = new Map<string, { n: number; until: number }>();
export function loginBlocked(ip: string) {
  const a = attempts.get(ip);
  return Boolean(a && a.until > Date.now());
}
export function registerFailure(ip: string) {
  const a = attempts.get(ip) ?? { n: 0, until: 0 };
  a.n += 1;
  if (a.n >= 5) {
    a.until = Date.now() + 15 * 60_000;
    a.n = 0;
  }
  attempts.set(ip, a);
}
export const resetFailures = (ip: string) => attempts.delete(ip);

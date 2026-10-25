import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "sosed_session";
const SESSION_DAYS = 30;

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET не задан: добавьте длинную случайную строку в переменные окружения");
  return "dev-only-secret-change-me-before-production";
};

/** Демо-режим (код показывается на экране, вход через Яндекс/VK/ЕСИА имитируется) выключен в продакшене, пока не задан AUTH_DEMO=1. */
export const demoAllowed = () => process.env.NODE_ENV !== "production" || process.env.AUTH_DEMO === "1";

const hmac = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && (d[0] === "8" || d[0] === "7")) d = d.slice(1);
  if (d.length !== 10) return null;
  return `+7${d}`;
}

export const newCode = () => String(randomInt(1000, 10000));
export const hashCode = (phone: string, code: string) => hmac(`code:${phone}:${code}`);
export function codeMatches(phone: string, code: string, hash: string) {
  const a = Buffer.from(hashCode(phone, code));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signSession(userId: string) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 86400000 })).toString("base64url");
  return `${payload}.${hmac(`session:${payload}`)}`;
}

export function readSession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || hmac(`session:${payload}`) !== sig) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: string; exp: number };
    return exp > Date.now() ? uid : null;
  } catch {
    return null;
  }
}

export function setSessionCookie(userId: string) {
  // Secure — когда сайт открыт по https (за Nginx); по http://IP до выпуска SSL вход тоже работает.
  cookies().set(SESSION_COOKIE, signSession(userId), { httpOnly: true, sameSite: "lax", secure: headers().get("x-forwarded-proto") === "https", path: "/", maxAge: SESSION_DAYS * 86400 });
}

export async function currentUser() {
  const uid = readSession(cookies().get(SESSION_COOKIE)?.value);
  return uid ? prisma.user.findUnique({ where: { id: uid } }) : null;
}

export const publicUser = (u: { id: string; phone: string | null; name: string | null; role: string; provider: string; esiaVerified: boolean }) => ({
  id: u.id, name: u.name, role: u.role, provider: u.provider, esiaVerified: u.esiaVerified,
  phone: u.phone ? `${u.phone.slice(0, 5)}•••${u.phone.slice(-4)}` : null,
});

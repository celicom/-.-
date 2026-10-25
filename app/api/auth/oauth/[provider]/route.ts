import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { demoAllowed, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Вход через российские сервисы: Яндекс ID, VK ID, Госуслуги (ЕСИА).
 *
 * • Яндекс ID — боевая реализация (OAuth 2.0): задайте YANDEX_CLIENT_ID и YANDEX_CLIENT_SECRET
 *   (приложение на https://oauth.yandex.ru, Redirect URI: <домен>/api/auth/oauth/yandex).
 * • VK ID и ЕСИА — требуют регистрации приложения и (для ЕСИА) подписи запросов квалифицированной
 *   электронной подписью (ГОСТ). Адаптеры подключаются здесь же, когда будут получены доступы.
 * • Пока ключей нет, в демо-режиме вход имитируется, чтобы показать сценарий на localhost.
 */
const PROVIDERS = {
  yandex: { label: "Яндекс ID", idEnv: "YANDEX_CLIENT_ID", secretEnv: "YANDEX_CLIENT_SECRET" },
  vk: { label: "VK ID", idEnv: "VK_CLIENT_ID", secretEnv: "VK_CLIENT_SECRET" },
  esia: { label: "Госуслуги (ЕСИА)", idEnv: "ESIA_CLIENT_ID", secretEnv: "ESIA_CLIENT_SECRET" },
} as const;
type Provider = keyof typeof PROVIDERS;

const back = (req: Request, path: string) => NextResponse.redirect(new URL(path, process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin));
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const url = new URL(req.url);
  if (!(params.provider in PROVIDERS)) return back(req, "/login?error=provider");
  const provider = params.provider as Provider;
  const cfg = PROVIDERS[provider];
  const clientId = process.env[cfg.idEnv];
  const clientSecret = process.env[cfg.secretEnv];
  const next = safeNext(url.searchParams.get("next"));
  const jar = cookies();

  // Шаг 2 боевого Яндекс ID: возврат с кодом
  if (provider === "yandex" && clientId && clientSecret && url.searchParams.get("code")) {
    const state = url.searchParams.get("state");
    if (!state || state !== jar.get("oauth_state")?.value || jar.get("oauth_consent")?.value !== "1") return back(req, "/login?error=state");
    jar.delete("oauth_state");
    jar.delete("oauth_consent");
    const tokenRes = await fetch("https://oauth.yandex.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code: url.searchParams.get("code")!, client_id: clientId, client_secret: clientSecret }),
    });
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) return back(req, "/login?error=token");
    const info = (await (await fetch("https://login.yandex.ru/info?format=json", { headers: { Authorization: `OAuth ${token.access_token}` } })).json()) as {
      id?: string; real_name?: string; display_name?: string; default_phone?: { number?: string };
    };
    if (!info.id) return back(req, "/login?error=profile");
    const phone = info.default_phone?.number?.replace(/[^\d+]/g, "") || null;
    const now = new Date();
    const existing = await prisma.user.findFirst({ where: { provider: "yandex", providerId: info.id } });
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: now } })
      : await prisma.user.create({ data: { provider: "yandex", providerId: info.id, name: info.real_name || info.display_name || null, phone: phone && !(await prisma.user.findUnique({ where: { phone } })) ? phone : null, consentAt: now, lastLoginAt: now } });
    setSessionCookie(user.id);
    return back(req, next);
  }

  // Шаг 1: согласие обязательно и здесь, на сервере
  if (url.searchParams.get("consent") !== "1") return back(req, "/login?error=consent");

  if (provider === "yandex" && clientId && clientSecret) {
    const state = randomBytes(16).toString("hex");
    const secure = process.env.NODE_ENV === "production";
    jar.set("oauth_state", state, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 600 });
    jar.set("oauth_consent", "1", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 600 });
    const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
    const auth = new URL("https://oauth.yandex.ru/authorize");
    auth.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: `${origin}/api/auth/oauth/yandex`, state, scope: "login:info login:default_phone" }).toString();
    return NextResponse.redirect(auth);
  }

  if (clientId && clientSecret) return back(req, `/login?error=not-implemented&provider=${provider}`);

  // Ключей нет: демо-вход на localhost
  if (!demoAllowed()) return back(req, `/login?error=not-configured&provider=${provider}`);
  const now = new Date();
  const providerId = `demo-${provider}`;
  const existing = await prisma.user.findFirst({ where: { provider, providerId } });
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: now } })
    : await prisma.user.create({ data: { provider, providerId, name: `Демо-пользователь (${cfg.label})`, esiaVerified: provider === "esia", consentAt: now, lastLoginAt: now } });
  setSessionCookie(user.id);
  return back(req, next);
}

import { NextResponse } from "next/server";
import { adminMode, checkCredentials, clearAdminCookie, loginBlocked, registerFailure, resetFailures, setAdminCookie } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ipOf = (req: Request) => req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

/** Вход в админ-панель. */
export async function POST(req: Request) {
  if (adminMode() === "locked") return NextResponse.json({ error: "Вход в админ-панель не настроен: задайте ADMIN_PASSWORD на сервере" }, { status: 503 });
  if (adminMode() === "open") return NextResponse.json({ ok: true });
  const ip = ipOf(req);
  if (loginBlocked(ip)) return NextResponse.json({ error: "Слишком много попыток. Попробуйте через 15 минут" }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { login?: string; password?: string };
  if (!checkCredentials(b.login ?? "", b.password ?? "")) {
    registerFailure(ip);
    return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
  }
  resetFailures(ip);
  setAdminCookie();
  return NextResponse.json({ ok: true });
}

/** Выход. */
export async function DELETE() {
  clearAdminCookie();
  return NextResponse.json({ ok: true });
}

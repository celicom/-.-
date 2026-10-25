import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { codeMatches, normalizePhone, publicUser, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

/** Шаг 2 входа: проверить код, создать пользователя при первом входе и выдать сессию. */
export async function POST(req: Request) {
  const b = (await req.json()) as { phone?: string; code?: string };
  const phone = normalizePhone(b.phone ?? "");
  const code = (b.code ?? "").replace(/\D/g, "");
  if (!phone || code.length !== 4) return NextResponse.json({ error: "Введите 4-значный код" }, { status: 400 });

  const rec = await prisma.authCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (!rec || rec.expiresAt < new Date()) return NextResponse.json({ error: "Код истёк. Запросите новый" }, { status: 400 });
  if (rec.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "Слишком много попыток. Запросите новый код" }, { status: 429 });
  if (!codeMatches(phone, code, rec.codeHash)) {
    await prisma.authCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } });
    return NextResponse.json({ error: `Неверный код. Осталось попыток: ${MAX_ATTEMPTS - rec.attempts - 1}` }, { status: 400 });
  }

  await prisma.authCode.deleteMany({ where: { phone } });
  const now = new Date();
  const user = await prisma.user.upsert({
    where: { phone },
    create: { phone, provider: "phone", consentAt: now, lastLoginAt: now },
    update: { lastLoginAt: now },
  });
  setSessionCookie(user.id);
  return NextResponse.json({ ok: true, user: publicUser(user) });
}

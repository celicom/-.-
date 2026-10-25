import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { demoAllowed, hashCode, newCode, normalizePhone } from "@/lib/auth";
import { sendCode } from "@/src/lib/sms";

export const dynamic = "force-dynamic";

const RESEND_SECONDS = 60;
const TTL_MINUTES = 5;

/** Шаг 1 входа: отправить 4-значный код на российский номер. */
export async function POST(req: Request) {
  const b = (await req.json()) as { phone?: string; channel?: "sms" | "call"; consent?: boolean };
  const phone = normalizePhone(b.phone ?? "");
  if (!phone) return NextResponse.json({ error: "Введите российский номер полностью: +7 (___) ___-__-__" }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: "Нужно согласие на обработку персональных данных" }, { status: 400 });
  const channel = b.channel === "call" ? "call" : "sms";

  const last = await prisma.authCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (last) {
    const wait = RESEND_SECONDS - Math.floor((Date.now() - last.createdAt.getTime()) / 1000);
    if (wait > 0) return NextResponse.json({ error: `Повторно запросить код можно через ${wait} сек`, wait }, { status: 429 });
  }
  await prisma.authCode.deleteMany({ where: { OR: [{ phone }, { expiresAt: { lt: new Date() } }] } });

  const code = newCode();
  await prisma.authCode.create({ data: { phone, channel, codeHash: hashCode(phone, code), expiresAt: new Date(Date.now() + TTL_MINUTES * 60000) } });

  const sent = await sendCode(phone, code, channel);
  if (!sent.ok) return NextResponse.json({ error: sent.error ?? "Не удалось отправить код" }, { status: 502 });
  if (sent.mode === "demo" && !demoAllowed()) return NextResponse.json({ error: "СМС-провайдер не подключён" }, { status: 503 });

  return NextResponse.json({ ok: true, mode: sent.mode, channel, resendIn: RESEND_SECONDS, ...(sent.mode === "demo" ? { demoCode: code } : {}) });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncOrderPayment } from "@/lib/payment-flow";
import { verifyTbankNotification } from "@/src/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Уведомления провайдера. ЮKassa: событие приходит без подписи, поэтому статус всегда перепроверяется запросом
 * к API провайдера. Т-Банк: проверяется подпись Token. Адрес указывается в личном кабинете провайдера:
 * https://sosed.pro/api/payments/webhook
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const externalId: string | undefined = body.object?.id ?? (body.PaymentId != null ? String(body.PaymentId) : undefined);
  if (!externalId) return NextResponse.json({ ok: true });
  if (body.TerminalKey && !verifyTbankNotification(body)) return NextResponse.json({ error: "Неверная подпись" }, { status: 403 });
  const order = await prisma.order.findFirst({ where: { payExternalId: externalId } });
  if (order) await syncOrderPayment(order.id);
  return NextResponse.json({ ok: true });
}

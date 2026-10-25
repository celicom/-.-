import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPayStatus, syncOrderPayment } from "@/lib/payment-flow";
import { paymentConfig } from "@/src/lib/payments";

export const dynamic = "force-dynamic";

/** Статус оплаты заказа. В боевом режиме сверяется с провайдером (возврат со страницы оплаты). */
export async function GET(_: Request, { params }: { params: { orderId: string } }) {
  const o = await syncOrderPayment(params.orderId);
  if (!o) return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  return NextResponse.json({ payStatus: o.payStatus, payMethod: o.payMethod, mode: o.payMode });
}

/** Мок-режим: «клиент оплатил» (на localhost). В боевом режиме подтверждение приходит только от провайдера. */
export async function POST(_: Request, { params }: { params: { orderId: string } }) {
  const cfg = paymentConfig();
  if (cfg.live || !cfg.mockAllowed) return NextResponse.json({ error: "Подтверждение оплаты вручную доступно только в тестовом режиме" }, { status: 403 });
  const o = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!o || o.payStatus !== "pending") return NextResponse.json({ error: "Нет платежа в ожидании" }, { status: 409 });
  await applyPayStatus(o.id, o.payMethod === "escrow" ? "held" : "paid");
  return NextResponse.json({ ok: true });
}

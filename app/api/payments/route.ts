import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { orderTotal } from "@/lib/payment-flow";
import { createPayment, paymentConfig, PAY_METHODS, type PayMethod } from "@/src/lib/payments";

export const dynamic = "force-dynamic";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** Создать платёж по заказу: после согласования сметы клиент выбирает способ оплаты. */
export async function POST(req: Request) {
  const b = (await req.json()) as { orderId?: string; method?: PayMethod; consent?: boolean };
  if (b.consent !== true) return fail("Нужно согласие на обработку персональных данных и принятие оферты");
  if (!PAY_METHODS.some((m) => m.id === b.method)) return fail("Выберите способ оплаты");
  const order = await prisma.order.findUnique({ where: { id: b.orderId ?? "" } });
  if (!order) return fail("Заказ не найден", 404);
  if (order.status !== "estimate") return fail("Оплатить можно после того, как мастер прислал смету", 409);
  if (order.payStatus === "held" || order.payStatus === "paid") return fail("Заказ уже оплачен", 409);

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const amount = orderTotal(order);
  try {
    const p = await createPayment({
      orderId: order.id, orderNumber: order.number, amountRub: amount, method: b.method!,
      description: `Заказ №${order.number}: ${order.diagnosis}`.slice(0, 120), customerPhone: null,
      returnUrl: `${origin}/client`, notifyUrl: `${origin}/api/payments/webhook`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { payMethod: b.method, payStatus: "pending", payExternalId: p.externalId, payMode: p.mode } });
    await bump();
    return NextResponse.json({ ok: true, amount, mode: p.mode, method: b.method, confirmationUrl: p.confirmationUrl ?? null, demo: p.mode === "mock", live: paymentConfig().live });
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}

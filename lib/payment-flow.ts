import { prisma, bump } from "./prisma";
import { pushNotification } from "./notify";
import { SERVICE_FEE_RATE } from "./finance";
import { getPaymentStatus, type PayMethod, type PayProvider, type PayStatus } from "../src/lib/payments";

export function orderTotal(o: { finalWork: number | null; finalParts: number | null; priceWorkFrom: number; donation: number }) {
  const work = o.finalWork ?? o.priceWorkFrom;
  const parts = o.finalParts ?? 0;
  return work + parts + Math.round((work + parts) * SERVICE_FEE_RATE) + o.donation;
}

export const METHOD_LABEL: Record<PayMethod, string> = { card: "банковская карта", sbp: "СБП", escrow: "Безопасная сделка" };

/** Записывает результат оплаты в заказ и сообщает мастеру в Telegram. */
export async function applyPayStatus(orderId: string, status: PayStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { master: true } });
  if (!order || order.payStatus === status) return order;
  const map = { pending: "pending", held: "held", paid: "paid", canceled: "refunded" } as const;
  const updated = await prisma.order.update({ where: { id: orderId }, data: { payStatus: map[status] } });
  await bump();
  if ((status === "held" || status === "paid") && order.master) {
    const how = order.payMethod === "escrow" || status === "held" ? "деньги заморожены в Безопасной сделке" : "заказ оплачен";
    await pushNotification(`мастер ${order.master.name}`, `💳 Заказ №${order.number}: ${how} (${METHOD_LABEL[(order.payMethod as PayMethod) ?? "card"]}). Выплата ${Math.round((1 - order.master.commissionRate) * 100)}% придёт после подтверждения клиентом.`, { chatId: order.master.telegramChatId });
  }
  return updated;
}

/** Сверяет статус с провайдером (для возврата со страницы оплаты и вебхуков). */
export async function syncOrderPayment(orderId: string) {
  const o = await prisma.order.findUnique({ where: { id: orderId } });
  if (!o?.payExternalId || !o.payMode || o.payMode === "mock") return o;
  const status = await getPaymentStatus(o.payMode as PayProvider, o.payExternalId);
  return applyPayStatus(orderId, status);
}

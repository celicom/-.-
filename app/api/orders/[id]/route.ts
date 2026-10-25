import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { pushNotification } from "@/lib/notify";
import { computeSplit, receiptNumber, warrantyCode } from "@/lib/finance";
import { ORDER_STATUS } from "@/lib/catalog";
import { computeFraud } from "@/lib/state";
import { templates, surveyButtons } from "@/telegram-bot";
import { buildReceipt, capturePayment, type PayMethod, type PayProvider } from "@/src/lib/payments";

export const dynamic = "force-dynamic";

type Body =
  | { action: "assign"; masterId: string }
  | { action: "accept"; masterId: string }
  | { action: "decline"; masterId: string }
  | { action: "arrive" }
  | { action: "checklist"; value: boolean }
  | { action: "photoBefore"; data: string }
  | { action: "estimate"; work: number; parts: number; note?: string }
  | { action: "approveEstimate" }
  | { action: "refuse" }
  | { action: "photoAfter"; data: string }
  | { action: "complete" }
  | { action: "confirm"; rating?: number }
  | { action: "donation"; value: number }
  | { action: "cancel" };

const fail = (error: string, status = 409) => NextResponse.json({ error }, { status });
const MAX_PHOTO = 3_000_000;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = (await req.json()) as Body;
  const order = await prisma.order.findUnique({ where: { id: params.id }, include: { master: true } });
  if (!order) return fail("Заказ не найден", 404);

  const now = new Date();
  let note: string | null = null;

  switch (b.action) {
    case "assign": {
      if (!["searching", "assigned"].includes(order.status)) return fail("Мастер уже назначен");
      const m = await prisma.master.findUnique({ where: { id: b.masterId } });
      if (!m || m.blocked) return fail("Мастер недоступен");
      await prisma.order.update({ where: { id: order.id }, data: { masterId: m.id, status: "assigned", assignedAt: now } });
      note = `📲 Заказ №${order.number}: клиент выбрал мастера ${m.name}, ждём подтверждения.`;
      break;
    }
    case "accept": {
      if (!["searching", "assigned"].includes(order.status)) return fail("Заказ уже принят другим мастером");
      if (order.status === "assigned" && order.masterId !== b.masterId) return fail("Заказ назначен другому мастеру");
      const m = await prisma.master.findUnique({ where: { id: b.masterId } });
      if (!m || m.blocked) return fail("Аккаунт мастера заблокирован", 403);
      await prisma.order.update({ where: { id: order.id }, data: { masterId: m.id, status: "accepted", acceptedAt: now, assignedAt: order.assignedAt ?? now } });
      await prisma.master.update({ where: { id: m.id }, data: { status: "busy" } });
      note = templates.accepted(order, m.name, m.etaMin);
      break;
    }
    case "decline": {
      const declined = Array.from(new Set([...order.declinedBy.split(",").filter(Boolean), b.masterId])).join(",");
      const release = order.status === "assigned" && order.masterId === b.masterId;
      await prisma.order.update({
        where: { id: order.id },
        data: { declinedBy: declined, ...(release ? { status: "searching", masterId: null, assignedAt: null } : {}) },
      });
      if (release) note = `↩️ Заказ №${order.number}: мастер не принял вызов, ищем следующего.`;
      break;
    }
    case "arrive": {
      if (order.status !== "accepted") return fail("Сначала примите заказ");
      await prisma.order.update({ where: { id: order.id }, data: { status: "onsite", arrivedAt: now } });
      note = templates.status(order, "мастер на месте, начинает чек-лист «Белые перчатки».");
      break;
    }
    case "checklist": {
      if (order.status !== "onsite") return fail("Чек-лист доступен на объекте");
      await prisma.order.update({ where: { id: order.id }, data: { checklistUniform: b.value } });
      break;
    }
    case "photoBefore": {
      if (order.status !== "onsite" || !order.checklistUniform) return fail("Сначала подтвердите форму, бахилы и коврик");
      if (!b.data?.startsWith("data:image/") || b.data.length > MAX_PHOTO) return fail("Нужна фотография (JPEG/PNG до 2 МБ)", 400);
      await prisma.order.update({ where: { id: order.id }, data: { photoBefore: b.data } });
      break;
    }
    case "estimate": {
      if (order.status !== "onsite" || !order.photoBefore) return fail("Сначала загрузите фото «ДО»");
      const work = Math.max(0, Math.round(b.work));
      const parts = Math.max(0, Math.round(b.parts));
      if (!work) return fail("Укажите стоимость работ", 400);
      await prisma.order.update({ where: { id: order.id }, data: { status: "estimate", finalWork: work, finalParts: parts, estimateNote: b.note ?? null } });
      note = templates.status(order, `смета ${(work + parts).toLocaleString("ru-RU")} ₽ отправлена клиенту на согласование.`);
      break;
    }
    case "approveEstimate": {
      if (order.status !== "estimate") return fail("Нет сметы на согласовании");
      if (!["held", "paid"].includes(order.payStatus)) return fail("Сначала оплатите заказ: выберите способ оплаты", 402);
      await prisma.order.update({ where: { id: order.id }, data: { status: "in_progress" } });
      note = templates.status(order, "клиент согласовал смету, работа началась.");
      break;
    }
    case "refuse": {
      if (!["estimate", "onsite"].includes(order.status) || !order.master) return fail("Отказ возможен только на этапе сметы");
      const split = computeSplit({ work: order.visitFee, parts: 0, donation: 0, commissionRate: order.master.commissionRate, deposit: order.master.deposit });
      await prisma.order.update({ where: { id: order.id }, data: { status: "visit_only", finalWork: order.visitFee, finalParts: 0, donation: 0, completedAt: now } });
      await prisma.payment.create({ data: { orderId: order.id, receiptNo: receiptNumber(), ...split } });
      await prisma.master.update({
        where: { id: order.master.id },
        data: { status: order.master.blocked ? "alert" : "free", balance: { increment: split.masterPayout }, deposit: { increment: split.reserve } },
      });
      note = templates.status(order, `клиент отказался от ремонта, оплачен только выезд ${order.visitFee} ₽.`);
      // ML-антифрод: при превышении порога сразу запускаем авто-опрос клиента в Telegram.
      const fraud = (await computeFraud()).find((f) => f.masterId === order.master!.id);
      if (fraud?.flagged) {
        await pushNotification("антифрод", templates.fraud(order.master.name, fraud.ratio));
        await pushNotification(`клиент ${order.clientName}`, templates.survey(order), { buttons: surveyButtons(order.id) });
        await prisma.order.update({ where: { id: order.id }, data: { surveySent: true } });
      }
      break;
    }
    case "photoAfter": {
      if (order.status !== "in_progress") return fail("Фото «ПОСЛЕ» загружается после согласования сметы");
      if (!b.data?.startsWith("data:image/") || b.data.length > MAX_PHOTO) return fail("Нужна фотография (JPEG/PNG до 2 МБ)", 400);
      await prisma.order.update({ where: { id: order.id }, data: { photoAfter: b.data } });
      break;
    }
    case "complete": {
      // Критическое правило: без фото ДО и ПОСЛЕ заказ не закрывается — проверка и на сервере.
      if (order.status !== "in_progress") return fail("Заказ не в работе");
      if (!order.photoBefore || !order.photoAfter) return fail("Загрузите фото «ДО» и «ПОСЛЕ»", 422);
      await prisma.order.update({ where: { id: order.id }, data: { status: "awaiting_confirm" } });
      note = templates.status(order, "мастер завершил работу. Подтвердите в приложении, чтобы разморозить оплату.");
      break;
    }
    case "confirm": {
      if (order.status !== "awaiting_confirm" || !order.master) return fail("Нечего подтверждать");
      if (!["held", "paid"].includes(order.payStatus)) return fail("Заказ не оплачен", 402);
      const m = order.master;
      const split = computeSplit({ work: order.finalWork ?? order.priceWorkFrom, parts: order.finalParts ?? 0, donation: order.donation, commissionRate: m.commissionRate, deposit: m.deposit });
      const code = warrantyCode(order.number);
      await prisma.order.update({ where: { id: order.id }, data: { status: "done", completedAt: now, warrantyCode: code, rating: b.rating ?? 5 } });
      // Безопасная сделка: списываем заблокированные средства только после подтверждения клиентом.
      if (order.payStatus === "held" && order.payExternalId) {
        try {
          await capturePayment((order.payMode as PayProvider) ?? "mock", order.payExternalId, split.clientPaid);
        } catch (e) {
          return fail(`Не удалось списать оплату: ${(e as Error).message}`, 502);
        }
      }
      const receiptNo = receiptNumber();
      const receipt = buildReceipt({
        orderNumber: order.number, work: split.work, parts: split.parts, serviceFee: split.serviceFee, donation: split.donation,
        masterName: m.name, masterInn: m.inn, platformFee: split.platformFee, masterPayout: split.masterPayout,
        method: (order.payMethod as PayMethod) ?? "card", externalId: order.payExternalId ?? "", receiptNo,
      });
      await prisma.order.update({ where: { id: order.id }, data: { payStatus: "paid" } });
      await prisma.payment.create({ data: { orderId: order.id, receiptNo, method: order.payMethod ?? "card", receiptJson: JSON.stringify(receipt), payoutStatus: "sent", ...split } });
      await pushNotification(`мастер ${m.name}`, `💳 Заказ №${order.number}: выплата ${split.masterPayout.toLocaleString("ru-RU")} ₽ отправлена (${100 - Math.round(m.commissionRate * 100)}% от работ и запчасти). Комиссия платформы ${split.platformFee.toLocaleString("ru-RU")} ₽. Чек: ${receiptNo}.`, { chatId: m.telegramChatId });
      await prisma.master.update({
        where: { id: m.id },
        data: {
          status: m.blocked ? "alert" : "free",
          balance: { increment: split.masterPayout },
          deposit: { increment: split.reserve },
          reviews: { increment: 1 },
        },
      });
      if (order.donation > 0) await prisma.donation.create({ data: { amount: order.donation, source: `Округление в заказе №${order.number}` } });
      note = templates.done(order, split.clientPaid, code);
      break;
    }
    case "donation": {
      if (["done", "visit_only", "cancelled"].includes(order.status)) return fail("Заказ уже закрыт");
      if (["pending", "held", "paid"].includes(order.payStatus)) return fail("Сумма уже зафиксирована оплатой");
      await prisma.order.update({ where: { id: order.id }, data: { donation: Math.max(0, Math.min(1000, Math.round(b.value))) } });
      break;
    }
    case "cancel": {
      if (!["searching", "assigned", "accepted"].includes(order.status)) return fail("Отменить можно только до прибытия мастера");
      await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
      if (order.masterId) await prisma.master.update({ where: { id: order.masterId }, data: { status: "free" } });
      note = templates.status(order, ORDER_STATUS.cancelled.label.toLowerCase());
      break;
    }
    default:
      return fail("Неизвестное действие", 400);
  }

  await bump();
  if (note) await pushNotification(`заказ №${order.number}`, note);
  const updated = await prisma.order.findUnique({ where: { id: order.id } });
  return NextResponse.json(updated);
}

import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { pushNotification } from "@/lib/notify";
import { denyIfNotAdmin } from "@/lib/admin-auth";
import { BASE_COMMISSION, MIN_COMMISSION } from "@/lib/finance";
import { computeFraud } from "@/lib/state";
import { templates, surveyButtons } from "@/telegram-bot";

export const dynamic = "force-dynamic";

type Body =
  | { action: "status"; value: "free" | "busy" | "alert" }
  | { action: "lesson"; lessonId: string }
  | { action: "block" }
  | { action: "unblock" }
  | { action: "fine"; amount?: number }
  | { action: "survey" }
  | { action: "withdraw" };

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = (await req.json()) as Body;
  // Блокировка, штрафы и опрос клиентов — только из админ-панели.
  if (["block", "unblock", "fine", "survey"].includes(b.action)) {
    const denied = denyIfNotAdmin();
    if (denied) return denied;
  }
  const m = await prisma.master.findUnique({ where: { id: params.id } });
  if (!m) return NextResponse.json({ error: "Мастер не найден" }, { status: 404 });
  let result: Record<string, unknown> = {};

  switch (b.action) {
    case "status":
      if (m.blocked) return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
      await prisma.master.update({ where: { id: m.id }, data: { status: b.value } });
      break;
    case "lesson": {
      const lesson = await prisma.lesson.findUnique({ where: { id: b.lessonId } });
      if (!lesson) return NextResponse.json({ error: "Урок не найден" }, { status: 404 });
      const done = m.lessonsDone.split(",").filter(Boolean);
      if (done.includes(lesson.id)) return NextResponse.json({ already: true });
      done.push(lesson.id);
      const all = await prisma.lesson.findMany({ where: { id: { in: done } } });
      const rate = Math.max(MIN_COMMISSION, BASE_COMMISSION - all.reduce((s, l) => s + l.discount, 0));
      await prisma.master.update({
        where: { id: m.id },
        data: { lessonsDone: done.join(","), academyPoints: { increment: lesson.points }, commissionRate: Math.round(rate * 1000) / 1000 },
      });
      result = { points: lesson.points, commissionRate: rate };
      break;
    }
    case "block":
      await prisma.master.update({ where: { id: m.id }, data: { blocked: true, status: "alert" } });
      await pushNotification("антифрод", `⛔ Аккаунт мастера ${m.name} заблокирован CEO по подозрению в расчётах мимо кассы.`);
      break;
    case "unblock":
      await prisma.master.update({ where: { id: m.id }, data: { blocked: false, status: "free" } });
      await pushNotification("антифрод", `✅ Аккаунт мастера ${m.name} разблокирован.`);
      break;
    case "fine": {
      const amount = Math.min(m.deposit, Math.max(500, Math.round(b.amount ?? 3000)));
      await prisma.master.update({ where: { id: m.id }, data: { deposit: { decrement: amount } } });
      await prisma.fine.create({ data: { masterId: m.id, amount, reason: "Подозрение на расчёт наличными мимо кассы (ML-антифрод)" } });
      await pushNotification("антифрод", `💸 Штраф ${amount.toLocaleString("ru-RU")} ₽ списан из гарантийного депозита мастера ${m.name}.`);
      result = { amount };
      break;
    }
    case "survey": {
      const fraud = (await computeFraud()).find((f) => f.masterId === m.id);
      const suspicious = await prisma.order.findMany({ where: { masterId: m.id, status: "visit_only", surveySent: false }, orderBy: { createdAt: "desc" }, take: 3 });
      await pushNotification("антифрод", templates.fraud(m.name, fraud?.ratio ?? 0));
      for (const o of suspicious) {
        await pushNotification(`клиент ${o.clientName}`, templates.survey(o), { buttons: surveyButtons(o.id) });
        await prisma.order.update({ where: { id: o.id }, data: { surveySent: true } });
      }
      result = { sent: suspicious.length };
      break;
    }
    case "withdraw": {
      if (m.blocked) return NextResponse.json({ error: "Выплаты заморожены: аккаунт заблокирован" }, { status: 403 });
      if (m.balance <= 0) return NextResponse.json({ error: "Нет средств к выводу" }, { status: 409 });
      await prisma.master.update({ where: { id: m.id }, data: { balance: 0 } });
      await pushNotification(`мастер ${m.name}`, `💳 Выплата ${m.balance.toLocaleString("ru-RU")} ₽ отправлена на карту мастера ${m.name}. Чек НПД сформирован.`);
      result = { amount: m.balance };
      break;
    }
    default:
      return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  }

  await bump();
  return NextResponse.json({ ok: true, ...result });
}

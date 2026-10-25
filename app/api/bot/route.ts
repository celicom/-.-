import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { botConfigured, handleUpdate, callTelegram } from "@/telegram-bot";

export const dynamic = "force-dynamic";

const SURVEY_ANSWERS: Record<string, string> = {
  ok: "клиент подтвердил честный отказ",
  cash: "клиент сообщил: мастер предложил оплату наличными!",
  offline: "клиент сообщил: ремонт сделан мимо приложения!",
};

async function recordSurvey(data: string) {
  const [, orderId, answer] = data.split(":");
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { master: true } });
  if (!order) return;
  await prisma.notification.create({
    data: {
      channel: "telegram",
      target: "антифрод",
      text: `Опрос по заказу №${order.number} (${order.master?.name ?? "—"}): ${SURVEY_ANSWERS[answer] ?? answer}`,
      delivered: true,
    },
  });
  if (answer !== "ok" && order.masterId) await prisma.master.update({ where: { id: order.masterId }, data: { status: "alert" } });
  await bump();
}

/** Статус бота: настроен ли токен и под каким именем он работает. */
export async function GET() {
  if (!botConfigured()) return NextResponse.json({ configured: false, hint: "Вставьте BOT_TOKEN в .env и перезапустите сервер" });
  try {
    const me = await callTelegram<{ username: string }>("getMe", {});
    return NextResponse.json({ configured: true, username: me.username, chatId: process.env.TELEGRAM_CHAT_ID || null });
  } catch (e) {
    return NextResponse.json({ configured: false, error: (e as Error).message });
  }
}

/** Вебхук Telegram (для продакшена: setWebhook на https://<домен>/api/bot) и внутренние события от `npm run bot`. */
export async function POST(req: Request) {
  const body = await req.json();
  if (body?.internal === "survey" && typeof body.data === "string") {
    await recordSurvey(body.data);
    return NextResponse.json({ ok: true });
  }
  if (!botConfigured()) return NextResponse.json({ ok: false, error: "BOT_TOKEN не задан" }, { status: 503 });
  await handleUpdate(body, async (e) => {
    if (e.type === "callback" && e.data?.startsWith("survey:")) await recordSurvey(e.data);
  });
  return NextResponse.json({ ok: true });
}

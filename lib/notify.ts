import { prisma } from "./prisma";
import { notify, botConfigured, type InlineButton } from "../telegram-bot";

/** Пишет уведомление в журнал и, если бот настроен, отправляет его в Telegram. */
export async function pushNotification(target: string, text: string, opts: { chatId?: string | null; buttons?: InlineButton[][] } = {}) {
  const delivered = await notify(text, opts);
  await prisma.notification.create({
    data: { channel: botConfigured() ? "telegram" : "system", target, text: text.replace(/<[^>]+>/g, ""), delivered },
  });
  return delivered;
}

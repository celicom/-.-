/**
 * Telegram-бот уведомлений Сосед.ру (нативный fetch к Telegram Bot API, без зависимостей).
 *
 * 1. Создайте бота у @BotFather и вставьте токен в .env:  BOT_TOKEN="123456:ABC..."
 * 2. Запустите `npm run bot` и напишите боту /start — он ответит вашим chat id.
 * 3. Вставьте его в .env: TELEGRAM_CHAT_ID="..." и перезапустите `npm run dev`.
 *
 * Пока BOT_TOKEN пуст, все уведомления сохраняются в журнал (видно в Админ-панели).
 */

const API = "https://api.telegram.org";

export type InlineButton = { text: string; callback_data?: string; url?: string };

export function botConfigured() {
  return Boolean(process.env.BOT_TOKEN);
}

export async function callTelegram<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = process.env.BOT_TOKEN;
  if (!token) throw new Error("BOT_TOKEN не задан в .env");
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result;
}

export async function sendTelegram(chatId: string | number, text: string, buttons?: InlineButton[][]) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

/**
 * Отправляет уведомление, если бот настроен. Возвращает true, если сообщение доставлено.
 * chatId по умолчанию — TELEGRAM_CHAT_ID (ваш личный чат / чат CEO).
 */
export async function notify(text: string, opts: { chatId?: string | null; buttons?: InlineButton[][] } = {}) {
  const chatId = opts.chatId || process.env.TELEGRAM_CHAT_ID;
  if (!botConfigured() || !chatId) return false;
  try {
    await sendTelegram(chatId, text, opts.buttons);
    return true;
  } catch (e) {
    console.error("[telegram]", (e as Error).message);
    return false;
  }
}

// ── Шаблоны сообщений ──

export const templates = {
  newOrder: (o: { number: number; diagnosis: string; address: string; priceWorkFrom: number; priceWorkTo: number }) =>
    `🔔 <b>Новый заказ №${o.number}</b>\n${o.diagnosis}\n📍 ${o.address}\n💰 ${o.priceWorkFrom.toLocaleString("ru-RU")}–${o.priceWorkTo.toLocaleString("ru-RU")} ₽`,
  accepted: (o: { number: number }, master: string, eta: number) => `🚗 Заказ №${o.number}: мастер ${master} принял вызов, прибудет через ~${eta} мин.`,
  status: (o: { number: number }, label: string) => `ℹ️ Заказ №${o.number}: ${label}`,
  done: (o: { number: number }, total: number, warranty: string) =>
    `✅ Заказ №${o.number} закрыт. Оплачено ${total.toLocaleString("ru-RU")} ₽ через эскроу.\n🛡 Гарантийный талон: <code>${warranty}</code>`,
  fraud: (master: string, ratio: number) =>
    `🚨 <b>Антифрод:</b> у мастера ${master} ${Math.round(ratio * 100)}% заказов закрыты «Клиент отказался от ремонта». Подозрение на сделку за наличные мимо кассы!`,
  survey: (o: { number: number; diagnosis: string }) =>
    `Здравствуйте! Это служба качества Сосед.ру 🛡\nПо заказу №${o.number} (${o.diagnosis}) мастер отметил, что вы отказались от ремонта.\nПодскажите, пожалуйста, как всё было?`,
};

export const surveyButtons = (orderId: string): InlineButton[][] => [
  [{ text: "Отказался сам, всё честно", callback_data: `survey:${orderId}:ok` }],
  [{ text: "Мастер предложил наличными", callback_data: `survey:${orderId}:cash` }],
  [{ text: "Ремонт сделан, но без приложения", callback_data: `survey:${orderId}:offline` }],
];

// ── Обработка входящих обновлений (используется и вебхуком /api/bot, и long polling) ──

type Update = {
  update_id: number;
  message?: { chat: { id: number; first_name?: string }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number } } };
};

export async function handleUpdate(update: Update, onEvent?: (e: { type: string; chatId: number; data?: string }) => Promise<void>) {
  if (update.message?.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    if (text.startsWith("/start")) {
      await sendTelegram(
        chatId,
        `Привет, ${update.message.chat.first_name ?? "сосед"}! 👋\nЯ бот уведомлений <b>Сосед.ру</b>.\n\nВаш chat id: <code>${chatId}</code>\nВставьте его в .env как TELEGRAM_CHAT_ID, и уведомления о заказах начнут приходить сюда.`,
      );
    } else if (text.startsWith("/status")) {
      await sendTelegram(chatId, "Платформа Сосед.ру на связи ✅. Откройте Командный пункт: http://localhost:3000/admin");
    } else {
      await sendTelegram(chatId, "Команды: /start — получить chat id, /status — проверить связь.");
    }
    await onEvent?.({ type: "message", chatId, data: text });
  }
  if (update.callback_query) {
    const q = update.callback_query;
    await callTelegram("answerCallbackQuery", { callback_query_id: q.id, text: "Спасибо! Ответ передан в службу качества." });
    if (q.message) await onEvent?.({ type: "callback", chatId: q.message.chat.id, data: q.data });
  }
}

export async function pollUpdates(onEvent?: (e: { type: string; chatId: number; data?: string }) => Promise<void>) {
  let offset = 0;
  const me = await callTelegram<{ username: string }>("getMe", {});
  console.log(`🤖 Бот @${me.username} запущен (long polling). Напишите ему /start. Ctrl+C — остановить.`);
  await callTelegram("deleteWebhook", {});
  for (;;) {
    try {
      const updates = await callTelegram<Update[]>("getUpdates", { offset, timeout: 30 });
      for (const u of updates) {
        offset = u.update_id + 1;
        await handleUpdate(u, onEvent);
      }
    } catch (e) {
      console.error("[telegram]", (e as Error).message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

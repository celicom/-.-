// Локальный запуск Telegram-бота в режиме long polling: `npm run bot`.
// Ответы на опрос качества пересылаются в API платформы.
import "dotenv/config";
import { pollUpdates } from "../telegram-bot";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

pollUpdates(async (e) => {
  if (e.type === "callback" && e.data?.startsWith("survey:")) {
    await fetch(`${APP_URL}/api/bot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internal: "survey", data: e.data, chatId: e.chatId }),
    }).catch(() => console.error("Платформа недоступна по адресу", APP_URL));
  }
}).catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});

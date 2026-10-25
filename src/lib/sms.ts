import { prisma } from "@/lib/prisma";

/**
 * Отправка кода подтверждения. Только российские провайдеры.
 *
 * Боевой режим: задайте SMSRU_API_ID (сервис sms.ru, ключ в личном кабинете) — код уйдёт СМС.
 * Без ключа работает демо-режим: сообщение пишется в журнал админки, а код показывается на экране
 * (в продакшене демо отключено, пока не задан AUTH_DEMO=1).
 *
 * Звонок-сброс («последние 4 цифры номера»): у sms.ru есть отдельный метод авторизации звонком;
 * подключите его здесь же, когда выберете провайдера, пока канал «звонок» работает только в демо-режиме.
 */
export type SmsResult = { mode: "sms" | "demo"; ok: boolean; error?: string };

export async function sendCode(phone: string, code: string, channel: "sms" | "call"): Promise<SmsResult> {
  const apiId = process.env.SMSRU_API_ID;
  if (apiId && channel === "sms") {
    try {
      const url = new URL("https://sms.ru/sms/send");
      url.search = new URLSearchParams({ api_id: apiId, to: phone.replace("+", ""), msg: `Сосед.Про: код ${code}. Никому его не сообщайте.`, json: "1" }).toString();
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as { status?: string; status_code?: number; status_text?: string };
      return data.status === "OK" ? { mode: "sms", ok: true } : { mode: "sms", ok: false, error: data.status_text ?? "Провайдер СМС вернул ошибку" };
    } catch {
      return { mode: "sms", ok: false, error: "Не удалось связаться с провайдером СМС" };
    }
  }
  await prisma.notification.create({ data: { channel: "system", target: "вход", text: `${channel === "call" ? "Звонок-сброс" : "СМС"} на ${phone.slice(0, 5)}•••${phone.slice(-4)}: код ${code} (демо-режим)`, delivered: false } });
  return { mode: "demo", ok: true };
}

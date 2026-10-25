import { createHash, randomUUID } from "node:crypto";
import { COMPANY } from "../config/company-legal";
import { PAY_METHODS, type PayMethod } from "../../lib/pay-methods";

export { PAY_METHODS };
export type { PayMethod };

/**
 * Платёжный модуль: ЮKassa и Т-Банк (Тинькофф Касса) + мок-режим для localhost.
 *
 * Боевой режим включается переменными окружения:
 *   PAYMENT_PROVIDER    yookassa (по умолчанию) | tbank
 *   PAYMENT_SHOP_ID     ЮKassa: shopId магазина;  Т-Банк: TerminalKey терминала
 *   PAYMENT_SECRET_KEY  ЮKassa: секретный ключ;  Т-Банк: Password терминала
 * Без PAYMENT_SHOP_ID и PAYMENT_SECRET_KEY работает мок: деньги не списываются, оплата подтверждается кнопкой.
 * В продакшене мок выключен, пока не задан PAYMENT_ALLOW_MOCK=1.
 *
 * Важно: приём платежей по 54-ФЗ требует онлайн-кассы (в ЮKassa и Т-Банке есть решения «чеки из коробки»),
 * а настоящий сплит и «Безопасная сделка» подключаются отдельным договором с платёжным оператором.
 * Здесь «Безопасная сделка» реализована как двухстадийный платёж: средства блокируются на карте и списываются
 * только после подтверждения заказчиком; выплата исполнителю (85%) и удержание комиссии учитываются в базе Платформы.
 */
export type PayProvider = "mock" | "yookassa" | "tbank";
export type PayStatus = "pending" | "held" | "paid" | "canceled";


export function paymentConfig() {
  const shop = process.env.PAYMENT_SHOP_ID;
  const secret = process.env.PAYMENT_SECRET_KEY;
  const live = Boolean(shop && secret);
  const provider: PayProvider = live ? (process.env.PAYMENT_PROVIDER === "tbank" ? "tbank" : "yookassa") : "mock";
  const mockAllowed = process.env.NODE_ENV !== "production" || process.env.PAYMENT_ALLOW_MOCK === "1";
  return { provider, shop: shop ?? "", secret: secret ?? "", live, mockAllowed };
}

export type CreateInput = {
  orderId: string;
  orderNumber: number;
  amountRub: number;
  method: PayMethod;
  description: string;
  customerPhone?: string | null;
  returnUrl: string;
  notifyUrl: string;
};
export type CreateResult = { externalId: string; status: PayStatus; mode: PayProvider; confirmationUrl?: string };

const rub2 = (n: number) => n.toFixed(2);

async function yk(path: string, method: "GET" | "POST", body?: unknown, idem?: string) {
  const { shop, secret } = paymentConfig();
  const res = await fetch(`https://api.yookassa.ru/v3${path}`, {
    method,
    headers: { Authorization: `Basic ${Buffer.from(`${shop}:${secret}`).toString("base64")}`, "Content-Type": "application/json", ...(idem ? { "Idempotence-Key": idem } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!res.ok) throw new Error(`ЮKassa: ${data.description ?? res.status}`);
  return data;
}

/** Т-Банк: подпись запроса (Token) — SHA-256 от значений параметров по алфавиту ключей + Password. */
function tbankToken(params: Record<string, string | number | boolean>, password: string) {
  const all: Record<string, string> = { ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), Password: password };
  return createHash("sha256").update(Object.keys(all).sort().map((k) => all[k]).join("")).digest("hex");
}
async function tb(path: string, params: Record<string, string | number | boolean>) {
  const { shop, secret } = paymentConfig();
  const body = { TerminalKey: shop, ...params };
  const res = await fetch(`https://securepay.tinkoff.ru/v2/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, Token: tbankToken(body, secret) }), cache: "no-store" });
  const data = (await res.json()) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!data.Success) throw new Error(`Т-Банк: ${data.Message ?? data.Details ?? "ошибка"}`);
  return data;
}

export function verifyTbankNotification(body: Record<string, unknown>) {
  const { secret } = paymentConfig();
  const { Token, ...rest } = body;
  const flat = Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "object")) as Record<string, string | number | boolean>;
  return typeof Token === "string" && tbankToken(flat, secret) === Token;
}

export async function createPayment(i: CreateInput): Promise<CreateResult> {
  const cfg = paymentConfig();
  if (!cfg.live) {
    if (!cfg.mockAllowed) throw new Error("Платёжный провайдер не настроен: задайте PAYMENT_SHOP_ID и PAYMENT_SECRET_KEY");
    return { externalId: `mock_${randomUUID()}`, status: "pending", mode: "mock" };
  }
  const hold = i.method === "escrow";
  if (cfg.provider === "yookassa") {
    const phone = i.customerPhone?.replace(/\D/g, "");
    const data = await yk(
      "/payments", "POST",
      {
        amount: { value: rub2(i.amountRub), currency: "RUB" },
        capture: !hold, // «Безопасная сделка»: средства блокируются, списание после подтверждения заказчиком
        confirmation: { type: "redirect", return_url: i.returnUrl },
        description: i.description,
        metadata: { orderId: i.orderId, orderNumber: i.orderNumber },
        ...(i.method === "sbp" ? { payment_method_data: { type: "sbp" } } : i.method === "card" ? { payment_method_data: { type: "bank_card" } } : {}),
        ...(phone ? { receipt: { customer: { phone }, items: [{ description: i.description.slice(0, 128), quantity: "1.00", amount: { value: rub2(i.amountRub), currency: "RUB" }, vat_code: 1, payment_mode: "full_payment", payment_subject: "service" }] } } : {}),
      },
      randomUUID(),
    );
    return { externalId: data.id, status: "pending", mode: "yookassa", confirmationUrl: data.confirmation?.confirmation_url };
  }
  const data = await tb("Init", {
    Amount: Math.round(i.amountRub * 100), OrderId: `${i.orderNumber}-${Date.now()}`, Description: i.description.slice(0, 140),
    PayType: hold ? "T" : "O", // T — двухстадийная оплата (блокировка), O — одностадийная
    SuccessURL: i.returnUrl, FailURL: i.returnUrl, NotificationURL: i.notifyUrl,
  });
  return { externalId: String(data.PaymentId), status: "pending", mode: "tbank", confirmationUrl: data.PaymentURL };
}

/** Текущий статус платежа у провайдера (источник правды для вебхука и возврата с оплаты). */
export async function getPaymentStatus(provider: PayProvider, externalId: string, mockStatus?: PayStatus): Promise<PayStatus> {
  if (provider === "mock") return mockStatus ?? "pending";
  if (provider === "yookassa") {
    const d = await yk(`/payments/${externalId}`, "GET");
    return d.status === "succeeded" ? "paid" : d.status === "waiting_for_capture" ? "held" : d.status === "canceled" ? "canceled" : "pending";
  }
  const d = await tb("GetState", { PaymentId: externalId });
  return d.Status === "CONFIRMED" ? "paid" : d.Status === "AUTHORIZED" ? "held" : ["CANCELED", "REJECTED", "REVERSED", "REFUNDED"].includes(d.Status) ? "canceled" : "pending";
}

/** Списать заблокированные средства (заказчик подтвердил работу). */
export async function capturePayment(provider: PayProvider, externalId: string, amountRub: number) {
  if (provider === "mock") return;
  if (provider === "yookassa") await yk(`/payments/${externalId}/capture`, "POST", { amount: { value: rub2(amountRub), currency: "RUB" } }, randomUUID());
  else await tb("Confirm", { PaymentId: externalId, Amount: Math.round(amountRub * 100) });
}

/** Снять блокировку или вернуть деньги заказчику. */
export async function cancelPayment(provider: PayProvider, externalId: string) {
  if (provider === "mock") return;
  if (provider === "yookassa") await yk(`/payments/${externalId}/cancel`, "POST", {}, randomUUID());
  else await tb("Cancel", { PaymentId: externalId });
}

// ── Электронный чек (54-ФЗ) и выплата ──

export type ReceiptInput = {
  orderNumber: number;
  clientPhone?: string | null;
  work: number;
  parts: number;
  serviceFee: number;
  donation: number;
  masterName: string;
  masterInn: string;
  platformFee: number;
  masterPayout: number;
  method: PayMethod;
  externalId: string;
  receiptNo: string;
};

/**
 * Виртуальный электронный чек. Платформа формирует чек на своё вознаграждение (сервисный сбор и агентская комиссия),
 * а чек за работы и запчасти формирует самозанятый Исполнитель в «Мой налог» (ИП — через кассу). В боевом режиме
 * реальные фискальные данные (ФН, ФД, ФП) приходят от онлайн-кассы платёжного оператора.
 */
export function buildReceipt(r: ReceiptInput) {
  const issuedAt = new Date().toISOString();
  const rub = (n: number) => Math.round(n * 100) / 100;
  return {
    receiptNo: r.receiptNo,
    law: "54-ФЗ",
    type: "income",
    issuedAt,
    paymentMethod: r.method,
    paymentId: r.externalId,
    customer: r.clientPhone ? { phone: r.clientPhone } : undefined,
    platform: {
      seller: COMPANY.legalName, inn: COMPANY.inn, taxation: "УСН",
      // Клиенту пробивается только сервисный сбор. Агентская комиссия уже входит в сумму чека Исполнителя
      // и удерживается из его выплаты, поэтому отдельной позицией в чек клиента не попадает (иначе сумма задвоится).
      items: [
        { name: `Сервисный сбор, заказ №${r.orderNumber}`, qty: 1, amount: rub(r.serviceFee), vat: "Без НДС", paymentSubject: "service", paymentMode: "full_payment" },
      ],
    },
    performer: {
      kind: "Чек самозанятого (НПД, 422-ФЗ)", name: r.masterName, inn: r.masterInn,
      items: [
        { name: `Работы, заказ №${r.orderNumber}`, qty: 1, amount: rub(r.work), vat: "Без НДС", paymentSubject: "service" },
        ...(r.parts ? [{ name: "Запчасти и материалы", qty: 1, amount: rub(r.parts), vat: "Без НДС", paymentSubject: "commodity" }] : []),
      ],
    },
    donation: r.donation ? { name: "Добровольный взнос в Копилку добрых дел ЖК", amount: r.donation } : undefined,
    split: { masterPayout: r.masterPayout, platformFee: r.platformFee },
    fiscal: { mode: paymentConfig().live ? "online-kassa" : "demo", fn: "9999078900000000", fd: Math.floor(Math.random() * 90000 + 10000), fp: Math.floor(Math.random() * 9e9 + 1e9) },
  };
}

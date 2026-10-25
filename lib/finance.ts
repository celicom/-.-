// Сплит-эквайринг: разбивка каждого платежа клиента.

export const SERVICE_FEE_RATE = 0.04; // сервисный сбор с клиента
export const ACQUIRING_RATE = 0.018; // эквайринг банка
export const DEPOSIT_TARGET = 10000; // неснижаемый гарантийный депозит мастера
export const RESERVE_RATE = 0.1; // доля выплаты в резерв, пока депозит не заполнен
export const BASE_COMMISSION = 0.15;
export const MIN_COMMISSION = 0.1;
export const FRAUD_THRESHOLD = 0.3; // доля «отказ, оплачен только выезд», после которой вешаем флаг
export const FRAUD_MIN_ORDERS = 5;

export type Split = {
  clientPaid: number;
  work: number;
  parts: number;
  masterPayout: number;
  platformFee: number;
  serviceFee: number;
  acquiring: number;
  reserve: number;
  donation: number;
};

export function computeSplit(p: { work: number; parts: number; donation: number; commissionRate: number; deposit: number }): Split {
  const serviceFee = Math.round((p.work + p.parts) * SERVICE_FEE_RATE);
  const clientPaid = p.work + p.parts + serviceFee + p.donation;
  const platformFee = Math.round(p.work * p.commissionRate);
  const gross = p.work - platformFee + p.parts;
  const reserve = p.deposit < DEPOSIT_TARGET ? Math.min(DEPOSIT_TARGET - p.deposit, Math.round(gross * RESERVE_RATE)) : 0;
  const masterPayout = gross - reserve;
  const acquiring = Math.round(clientPaid * ACQUIRING_RATE);
  return { clientPaid, work: p.work, parts: p.parts, masterPayout, platformFee, serviceFee, acquiring, reserve, donation: p.donation };
}

/** Чистая выплата мастеру за работы (без запчастей). */
export function masterNet(work: number, commissionRate: number) {
  return Math.round(work * (1 - commissionRate));
}

export function receiptNumber() {
  // Формат номера чека «Мой налог»: 10 символов
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 10; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export function warrantyCode(orderNumber: number) {
  return `SOS-${new Date().getFullYear()}-${String(orderNumber).padStart(5, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

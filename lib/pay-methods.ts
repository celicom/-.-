// Способы оплаты: файл без серверных зависимостей, чтобы его можно было использовать в браузерных компонентах.
export type PayMethod = "card" | "sbp" | "escrow";

export const PAY_METHODS: { id: PayMethod; label: string; hint: string }[] = [
  { id: "card", label: "Банковская карта", hint: "Мир, Visa, Mastercard" },
  { id: "sbp", label: "СБП", hint: "Мгновенно по QR-коду в приложении банка" },
  { id: "escrow", label: "Безопасная сделка", hint: "Деньги заморожены и спишутся после вашего подтверждения" },
];
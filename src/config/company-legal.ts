/**
 * ЕДИНЫЙ БЛОК РЕКВИЗИТОВ КОМПАНИИ.
 *
 * После регистрации ООО впишите свои данные ТОЛЬКО В ЭТОМ ФАЙЛЕ: они автоматически
 * подставятся в подвал сайта, страницу «О компании», формы согласия и во все 4 документа
 * (/legal/privacy, /legal/consent, /legal/offer-client, /legal/offer-master).
 *
 * Значения в [квадратных скобках] — заглушки. Пока они остались, на страницах документов
 * показывается предупреждение, а заглушки подсвечены.
 */
export const COMPANY = {
  brand: "Сосед.Про",
  domain: "sosed.pro",
  siteUrl: "https://sosed.pro",

  // ── Реквизиты юридического лица ──
  legalName: "[Полное наименование ООО]",
  shortName: "[Сокращённое наименование ООО]",
  inn: "[ИНН]",
  kpp: "[КПП]",
  ogrn: "[ОГРН]",
  legalAddress: "[Юридический адрес: г. Москва, …]",
  director: "[Генеральный директор: ФИО]",

  // ── Контакты ──
  supportEmail: "support@sosed.pro",
  privacyEmail: "privacy@sosed.pro", // обращения субъектов персональных данных и отзыв согласия
  phone: "+7 (495) 000-00-00",
  phoneHref: "tel:+74950000000",
  supportHours: "ежедневно с 8:00 до 23:00 по московскому времени",

  // ── Хранение данных (152-ФЗ, локализация) ──
  hosting: "облачная инфраструктура на территории Российской Федерации (ЦОД г. Москва), управляемая БД PostgreSQL",
  roskomnadzorRegNumber: "[Регистрационный номер оператора в реестре Роскомнадзора]",

  // ── Версии документов ──
  docsDate: "25 октября 2026 г.",
  docsVersion: "1.0",

  // ── Коммерческие параметры, на которые ссылаются оферты ──
  agentFeeFrom: 15, // % агентского вознаграждения Платформы
  agentFeeTo: 20,
  serviceFeeClient: 4, // % сервисный сбор с Заказчика
  depositRub: 10000, // неснижаемый гарантийный депозит Исполнителя
  guaranteeMonths: 12,
  insuranceRub: 100000,
  finePerCircumventionRub: 3000,
  escrowAutoConfirmHours: 24,
};

export type Company = typeof COMPANY;

/** Все ли обязательные реквизиты заполнены. */
export function companyFilled(c: Company = COMPANY) {
  return ![c.legalName, c.shortName, c.inn, c.kpp, c.ogrn, c.legalAddress, c.director, c.roskomnadzorRegNumber].some((v) => v.startsWith("["));
}

export function companyLine(c: Company = COMPANY) {
  return `${c.legalName}, ИНН ${c.inn}, ОГРН ${c.ogrn}, ${c.legalAddress}`;
}

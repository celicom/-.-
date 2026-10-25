import type { EC } from "../seed-data";
import { slugify } from "../catalog";
import { GENERATED_CODES } from "./codes-generated";
import rafael from "./rafael-codes.json";

export const GENERIC_BAG: Record<string, string> = {
  coffee: "Ремкомплект заварочного блока, смазка, помпа, мультиметр, набор отвёрток",
  washer: "Сливной насос, ТЭН, щётки двигателя, мультиметр, ветошь, тазик",
  dryer: "Ремень, ролики, термопредохранитель, мультиметр, пылесос",
  dishwasher: "Сливной насос, поплавок Аквастоп, уплотнитель двери, мультиметр",
  hob: "Мультиметр, термопаста, сенсорный модуль, присоска для стекла",
  oven: "ТЭН, термопредохранитель, датчик температуры, мультиметр, Torx",
};

export type DbCode = {
  category: string; brand: string; code: string; title: string; keywords: string;
  causes: string; selfCheck: string; priceWorkFrom: number; priceWorkTo: number; priceTurnkeyTo: number;
  durationMin: number; bagHint: string; source: string; verified: boolean;
  partsFrom: number; partsTo: number; meaning: string; masterSteps: string; whenMaster: string; faq: string;
};

// Ранние ручные карточки, которые дублируют или противоречат настоящим данным Рафаэля, не берём.
const SKIP = new Set([
  "Jura:Error 8", "Jura:Error 2", "Jura:Error 5", "DeLonghi:Общая тревога", "DeLonghi:Добавьте молотый кофе", "Philips:E03", "Philips:E01",
  "Nivona:Error 11", "Samsung:4E", "Bosch:E24", "Miele:F70", "Miele:F11", "Siemens:F70", "Neff:E0510", "Smeg:Er22", "Bosch:E2",
  "Siemens:U400", "Electrolux:E6", "Bosch:E115", "Bosch:E18", "LG:OE", "Electrolux:E4",
]);

type Rafael = (typeof rafael)[number];

const fromRafael = (r: Rafael): DbCode => ({
  category: r.category, brand: r.brand, code: r.code, title: r.title,
  keywords: `${r.brand} ${r.code} ${r.title}`.toLowerCase(),
  causes: JSON.stringify(r.causes.map(([text, freq]) => ({ text, freq }))),
  selfCheck: JSON.stringify(r.selfCheck),
  priceWorkFrom: r.workFrom, priceWorkTo: r.workTo, priceTurnkeyTo: r.workTo + r.partsTo,
  durationMin: r.minutes, bagHint: GENERIC_BAG[r.category] ?? "", source: "rafael", verified: true,
  partsFrom: r.partsFrom, partsTo: r.partsTo, meaning: r.meaning,
  masterSteps: JSON.stringify(r.masterSteps), whenMaster: JSON.stringify(r.whenMaster), faq: JSON.stringify(r.faq),
});

const fromLegacy = (e: EC, verified = false): DbCode => {
  const partsTo = e.partsTo ?? Math.max(0, e.turnkeyTo - e.work[1]);
  const partsFrom = e.partsFrom ?? Math.round((partsTo * 0.4) / 100) * 100;
  return {
    category: e.category, brand: e.brand, code: e.code, title: e.title, keywords: e.keywords,
    causes: JSON.stringify(e.causes.map(([text, freq]) => ({ text, freq }))),
    selfCheck: JSON.stringify(e.selfCheck),
    priceWorkFrom: e.work[0], priceWorkTo: e.work[1], priceTurnkeyTo: e.work[1] + partsTo,
    durationMin: e.durationMin, bagHint: e.bagHint || GENERIC_BAG[e.category] || "", source: "generated", verified,
    partsFrom, partsTo, meaning: "", masterSteps: "[]", whenMaster: "[]", faq: "[]",
  };
};

/** Итоговая база: сначала настоящие данные Рафаэля, затем сгенерированные, затем ранние карточки. */
export function assembleCodes(legacy: EC[]): DbCode[] {
  const seen = new Set<string>();
  const out: DbCode[] = [];
  const add = (c: DbCode) => {
    const key = `${slugify(c.brand)}:${slugify(c.code)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };
  rafael.forEach((r) => add(fromRafael(r)));
  GENERATED_CODES.forEach((e) => add(fromLegacy(e)));
  legacy.filter((e) => !SKIP.has(`${e.brand}:${e.code}`)).forEach((e) => add(fromLegacy(e)));
  return out;
}

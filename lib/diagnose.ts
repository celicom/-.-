import { prisma } from "./prisma";

export type Diagnosis = {
  matched: boolean;
  confidence: number;
  category: string;
  brand: string;
  code: string;
  title: string;
  causes: { text: string; freq: "often" | "sometimes" | "rare" }[];
  selfCheck: string[];
  priceWorkFrom: number;
  priceWorkTo: number;
  partsFrom: number;
  partsTo: number;
  durationMin: number;
  bagHint: string;
  source: string;
  verified: boolean;
  kind: string;
  meaning: string;
  rowBrand: string;
};

const GENERIC: Record<string, Omit<Diagnosis, "matched" | "confidence" | "category" | "brand" | "code">> = {
  default: {
    title: "Требуется выездная диагностика",
    causes: [
      { text: "Сбой электроники после скачка напряжения", freq: "sometimes" },
      { text: "Износ расходных узлов (уплотнители, щётки, ТЭН)", freq: "sometimes" },
      { text: "Засор фильтров или магистралей", freq: "often" },
    ],
    selfCheck: [
      "Обесточьте технику на 10–15 минут и включите снова.",
      "Проверьте фильтры и шланги на засор и перегибы.",
      "Сфотографируйте дисплей с ошибкой — мастер подготовит запчасти заранее.",
    ],
    priceWorkFrom: 1500,
    priceWorkTo: 3000,
    partsFrom: 1000,
    partsTo: 4000,
    durationMin: 0,
    bagHint: "Мультиметр, универсальный набор отвёрток Torx/PH, контакт-спрей, бахилы и коврик",
    source: "generated",
    verified: false,
    kind: "symptom",
    meaning: "",
    rowBrand: "",
  },
};

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const compact = (s: string) => norm(s).replace(/\s|error|err|ошибка|код/g, "");

/**
 * Экспертная модель диагностики: точное совпадение кода → совпадение по бренду и симптомам
 * → поиск по ключевым словам во всей категории → общий план выезда.
 */
export async function diagnose(input: { category: string; brand?: string; code?: string; symptom?: string }): Promise<Diagnosis> {
  const rows = await prisma.errorCode.findMany({ where: { category: input.category } });
  const code = compact(input.code ?? "");
  const words = norm(`${input.code ?? ""} ${input.symptom ?? ""}`).split(" ").filter((w) => w.length > 2);

  let best: { row: (typeof rows)[number]; score: number } | null = null;
  for (const row of rows) {
    let score = 0;
    if (code && row.code.split("/").some((part) => compact(part) === code)) score += 10;
    if (input.brand && row.brand.toLowerCase() === input.brand.toLowerCase()) score += 3;
    else if (row.brand === "Любая марка") score += 1;
    const hay = norm(`${row.title} ${row.keywords} ${row.code}`);
    for (const w of words) if (hay.includes(w)) score += 2;
    if (!best || score > best.score) best = { row, score };
  }

  if (best && best.score >= 4) {
    const r = best.row;
    return {
      matched: true,
      confidence: Math.min(0.99, 0.55 + best.score / 30),
      category: r.category,
      brand: input.brand || r.brand,
      code: r.code,
      title: r.title,
      causes: JSON.parse(r.causes),
      selfCheck: JSON.parse(r.selfCheck),
      priceWorkFrom: r.priceWorkFrom,
      priceWorkTo: r.priceWorkTo,
      partsFrom: r.partsFrom,
      partsTo: r.partsTo,
      durationMin: r.durationMin,
      source: r.source,
      verified: r.verified,
      kind: "code",
      meaning: r.meaning,
      rowBrand: r.brand,
      bagHint: input.brand && input.brand !== r.brand ? r.bagHint.replace(new RegExp(r.brand, "g"), input.brand) : r.bagHint,
    };
  }

  const g = GENERIC.default;
  return { matched: false, confidence: 0.4, category: input.category, brand: input.brand ?? "", code: input.code || "Симптом", ...g };
}

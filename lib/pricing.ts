// Движок региональных цен. Все базовые цены в базе — московские (коэффициент 1.0).

export type RegionLite = { id: string; name: string; tier: "moscow" | "tier1" | "tier2" | "tier3"; multiplier: number; lat: number; lon: number };
export type ItemLite = { id: string; groupKey: string; label: string; basePrice: number; unit: string; durationMin: number; bagHint: string; symptoms: string; meta: string; sort: number };

export const BASE_MIN_ORDER = 5000; // минимальный выезд в Москве
export const BASE_SMALL_REPAIR = 1000; // мелкий ремонт в мастерской в Москве

/** Округление до красивых значений, кратных 50 ₽. */
export const round50 = (n: number) => Math.round(n / 50) * 50;

/** FinalWorkPrice = round((BaseWorkPrice × multiplier) / 50) × 50 */
export const scaleWork = (base: number, multiplier: number) => (base <= 0 ? 0 : round50(base * multiplier));

/** Минимальный чек выезда: 5 000 ₽ в Москве → 3 500 ₽ (×0,70) → 3 000 ₽ (×0,60). */
export const minOrder = (multiplier: number) => round50(BASE_MIN_ORDER * multiplier);
export const smallRepair = (multiplier: number) => round50(BASE_SMALL_REPAIR * multiplier);

export type CodeBase = { workFrom: number; workTo: number; partsFrom: number; partsTo: number };

/**
 * Ремонт техники «под ключ»: работа умножается на коэффициент региона,
 * оригинальная запчасть остаётся фиксированной (FinalTotal = FinalWorkPrice + BasePartsPrice).
 */
export function scaleCode(p: CodeBase, multiplier: number) {
  const workFrom = scaleWork(p.workFrom, multiplier);
  const workTo = scaleWork(p.workTo, multiplier);
  return { workFrom, workTo, partsFrom: p.partsFrom, partsTo: p.partsTo, turnkeyFrom: workFrom + p.partsFrom, turnkeyTo: workTo + p.partsTo };
}

export function nearestRegion(regions: RegionLite[], lat: number, lon: number) {
  const d = (r: RegionLite) => (r.lat - lat) ** 2 + ((r.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
  return regions.reduce((best, r) => (d(r) < d(best) ? r : best), regions[0]);
}

// ── Уборка ──

export type CleaningInput = {
  items: ItemLite[];
  multiplier: number;
  type: string;
  mode: "rooms" | "area";
  rooms: number; // 1..4
  area: number; // м²
  extras: Record<string, number>; // id позиции → количество
};

const byId = (items: ItemLite[], id: string) => items.find((i) => i.id === id);

export function calcCleaning(i: CleaningInput) {
  const lines: { label: string; amount: number }[] = [];
  let minutes = 0;
  const baseItem = i.mode === "area" ? byId(i.items, `clean-type:${i.type}:sqm`) : byId(i.items, `clean-type:${i.type}:${i.rooms}`);
  if (baseItem && baseItem.basePrice > 0) {
    const qty = i.mode === "area" ? i.area : 1;
    const unit = scaleWork(baseItem.basePrice, i.multiplier);
    lines.push({ label: i.mode === "area" ? `${baseItem.label.split(",")[0]}, ${i.area} м²` : baseItem.label, amount: unit * qty });
    minutes += i.mode === "area" ? Math.round(i.area * 4) : baseItem.durationMin;
  }
  for (const [id, qty] of Object.entries(i.extras)) {
    if (!qty) continue;
    const it = byId(i.items, id);
    if (!it) continue;
    lines.push({ label: qty > 1 ? `${it.label} × ${qty}` : it.label, amount: scaleWork(it.basePrice, i.multiplier) * qty });
    minutes += it.durationMin * qty;
  }
  return { lines, price: lines.reduce((s, l) => s + l.amount, 0), minutes };
}

export function calcCommercial(items: ItemLite[], multiplier: number, id: string, area: number) {
  const it = byId(items, id);
  if (!it) return { price: 0, unit: 0 };
  const unit = scaleWork(it.basePrice, multiplier);
  return { price: unit * area, unit };
}

export const rubles = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

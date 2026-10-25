import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { pushNotification } from "@/lib/notify";
import { denyIfNotAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const int = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : NaN);

/** Правка прайс-матрицы из админки: коэффициент города, базовая цена услуги, цены кода ошибки. */
export async function PATCH(req: Request, { params }: { params: { kind: string; id: string } }) {
  const denied = denyIfNotAdmin();
  if (denied) return denied;
  const b = (await req.json()) as Record<string, unknown>;
  const id = decodeURIComponent(params.id);

  if (params.kind === "regions") {
    const m = Number(b.multiplier);
    if (!Number.isFinite(m) || m < 0.3 || m > 2) return bad("Коэффициент должен быть от 0,30 до 2,00");
    const rounded = Math.round(m * 100) / 100;
    const r = await prisma.region.findUnique({ where: { id } });
    if (!r) return bad("Город не найден", 404);
    await prisma.region.update({ where: { id }, data: { multiplier: rounded } });
    await bump();
    await pushNotification("прайс", `🌍 ${r.name}: коэффициент ${r.multiplier.toFixed(2)} → ${rounded.toFixed(2)}`);
    return NextResponse.json({ ok: true });
  }

  if (params.kind === "items") {
    const price = int(b.basePrice);
    if (!(price >= 0 && price <= 1_000_000)) return bad("Укажите цену от 0 до 1 000 000 ₽");
    const it = await prisma.priceItem.findUnique({ where: { id } });
    if (!it) return bad("Позиция не найдена", 404);
    await prisma.priceItem.update({ where: { id }, data: { basePrice: price } });
    await bump();
    await pushNotification("прайс", `💰 «${it.label}»: ${it.basePrice} ₽ → ${price} ₽ (база Москвы)`);
    return NextResponse.json({ ok: true });
  }

  if (params.kind === "codes") {
    const data: Record<string, number> = {};
    for (const k of ["priceWorkFrom", "priceWorkTo", "partsFrom", "partsTo"]) {
      if (b[k] === undefined) continue;
      const v = int(b[k]);
      if (!(v >= 0 && v <= 1_000_000)) return bad("Некорректная цена");
      data[k] = v;
    }
    const c = await prisma.errorCode.findUnique({ where: { id } });
    if (!c) return bad("Код не найден", 404);
    const wf = data.priceWorkFrom ?? c.priceWorkFrom;
    const wt = Math.max(wf, data.priceWorkTo ?? c.priceWorkTo);
    const pt = data.partsTo ?? c.partsTo;
    await prisma.errorCode.update({ where: { id }, data: { ...data, priceWorkTo: wt, priceTurnkeyTo: wt + pt } });
    await bump();
    return NextResponse.json({ ok: true });
  }

  return bad("Неизвестный раздел", 404);
}

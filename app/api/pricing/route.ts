import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Города с коэффициентами и прайс-позиции (базовые московские цены). Публичный справочник. */
export async function GET(req: Request) {
  const full = new URL(req.url).searchParams.get("codes") === "1";
  const [regions, items, codes] = await Promise.all([
    prisma.region.findMany({ orderBy: { sort: "asc" } }),
    prisma.priceItem.findMany({ orderBy: { sort: "asc" } }),
    full
      ? prisma.errorCode.findMany({ orderBy: [{ category: "asc" }, { brand: "asc" }, { code: "asc" }], select: { id: true, category: true, brand: true, code: true, title: true, priceWorkFrom: true, priceWorkTo: true, partsFrom: true, partsTo: true, source: true, verified: true } })
      : Promise.resolve([]),
  ]);
  return NextResponse.json({ regions, items, ...(full ? { codes } : {}) });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { diagnose } from "@/lib/diagnose";

export const dynamic = "force-dynamic";

/** Справочник кодов ошибок для выбранной категории и бренда. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category") ?? "coffee";
  const brand = url.searchParams.get("brand");
  const rows = await prisma.errorCode.findMany({
    where: { category, ...(brand ? { brand: { in: [brand, "Любая марка"] } } : {}) },
    select: { code: true, title: true, brand: true },
    orderBy: { code: "asc" },
  });
  return NextResponse.json(rows);
}

/** ИИ-диагностика: категория + бренд + код ошибки или описание симптома. */
export async function POST(req: Request) {
  const body = (await req.json()) as { category: string; brand?: string; code?: string; symptom?: string };
  if (!body.category) return NextResponse.json({ error: "Укажите категорию техники" }, { status: 400 });
  return NextResponse.json(await diagnose(body));
}

import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { pushNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Пожертвование в «Копилку добрых дел ЖК». */
export async function POST(req: Request) {
  const b = (await req.json()) as { amount: number; source?: string };
  const amount = Math.round(Number(b.amount));
  if (!amount || amount < 10 || amount > 100000) return NextResponse.json({ error: "Сумма от 10 до 100 000 ₽" }, { status: 400 });
  await prisma.donation.create({ data: { amount, source: b.source || "Пожертвование соседа" } });
  await bump();
  await pushNotification("копилка", `❤️ В Копилку добрых дел ЖК поступило ${amount.toLocaleString("ru-RU")} ₽`);
  return NextResponse.json({ ok: true });
}

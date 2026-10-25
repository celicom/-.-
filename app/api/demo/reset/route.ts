import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/seed-data";
import { denyIfNotAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Сброс демо к исходным данным (перед показом инвесторам). Стирает все заказы и платежи, поэтому на сервере
 * (NODE_ENV=production) работает только при DEMO_MODE=1.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "1") {
    return NextResponse.json({ error: "Сброс демо отключён на боевом сервере (включается DEMO_MODE=1)" }, { status: 403 });
  }
  const denied = denyIfNotAdmin();
  if (denied) return denied;
  await seedDatabase(prisma);
  return NextResponse.json({ ok: true });
}

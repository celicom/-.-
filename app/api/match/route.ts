import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Гео-матчинг: подбирает мастеров ЖК под задачу.
 * Скор = навык (обязателен) + близость + рейтинг + свободен ли мастер.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const skill = url.searchParams.get("skill") ?? "coffee";
  const masters = await prisma.master.findMany({ where: { blocked: false } });
  const ranked = masters
    .map((m) => {
      const skills = m.skills.split(",");
      const fits = skills.includes(skill);
      const score = (fits ? 100 : 0) + (m.status === "free" ? 30 : 0) + m.rating * 10 - m.distanceM / 100;
      return { ...m, fits, score };
    })
    .sort((a, b) => b.score - a.score);
  return NextResponse.json(ranked);
}

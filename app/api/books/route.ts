import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COVERS = ["🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫"];

export async function POST(req: Request) {
  const b = (await req.json()) as { title: string; author: string; kind: "selfdev" | "kids"; ownerName: string; ownerApt: string; consent?: boolean };
  if (!b.title?.trim() || !b.author?.trim()) return NextResponse.json({ error: "Укажите название и автора" }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: "Нужно согласие на обработку персональных данных" }, { status: 400 });
  const book = await prisma.book.create({
    data: {
      title: b.title.trim(),
      author: b.author.trim(),
      kind: b.kind === "kids" ? "kids" : "selfdev",
      ownerName: b.ownerName?.trim() || "Сосед",
      ownerApt: b.ownerApt?.trim() || "кв. —",
      cover: COVERS[Math.floor(Math.random() * COVERS.length)],
    },
  });
  await bump();
  return NextResponse.json(book);
}

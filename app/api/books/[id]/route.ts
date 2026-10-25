import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = (await req.json()) as { action: "take" | "return"; apt?: string };
  const book = await prisma.book.findUnique({ where: { id: params.id } });
  if (!book) return NextResponse.json({ error: "Книга не найдена" }, { status: 404 });
  if (b.action === "take") {
    if (book.status === "taken") return NextResponse.json({ error: "Книгу уже взяли" }, { status: 409 });
    await prisma.book.update({ where: { id: book.id }, data: { status: "taken", takenBy: b.apt || "кв. 14" } });
  } else {
    await prisma.book.update({ where: { id: book.id }, data: { status: "available", takenBy: null } });
  }
  await bump();
  return NextResponse.json({ ok: true });
}

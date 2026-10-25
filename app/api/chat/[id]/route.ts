import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { denyIfNotAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type Msg = { from: "user" | "bot" | "agent"; text: string; at: string };
const parse = (s: string) => JSON.parse(s) as Msg[];

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const t = await prisma.chatThread.findUnique({ where: { id: params.id } });
  if (!t) return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
  return NextResponse.json({ id: t.id, status: t.status, messages: parse(t.messages) });
}

/** Новое сообщение в чате: from = user (клиент) или agent (диспетчер из админки). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const b = (await req.json()) as { from?: string; text?: string };
  const text = (b.text ?? "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  const t = await prisma.chatThread.findUnique({ where: { id: params.id } });
  if (!t) return NextResponse.json({ error: "Чат не найден" }, { status: 404 });
  const from = b.from === "agent" ? "agent" : "user";
  // Отвечать от имени диспетчера можно только из админ-панели.
  if (from === "agent") {
    const denied = denyIfNotAdmin();
    if (denied) return denied;
  }
  const msgs = [...parse(t.messages), { from, text, at: new Date().toISOString() } as Msg].slice(-200);
  await prisma.chatThread.update({ where: { id: t.id }, data: { messages: JSON.stringify(msgs), status: from === "agent" ? "taken" : t.status === "closed" ? "new" : t.status } });
  await bump();
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = denyIfNotAdmin();
  if (denied) return denied;
  const b = (await req.json()) as { status?: string };
  if (!["new", "taken", "closed"].includes(b.status ?? "")) return NextResponse.json({ error: "Неизвестный статус" }, { status: 400 });
  await prisma.chatThread.update({ where: { id: params.id }, data: { status: b.status } });
  await bump();
  return NextResponse.json({ ok: true });
}
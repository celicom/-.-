import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { pushNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

type Msg = { from: "user" | "bot" | "agent"; text: string; at: string };

/** Передача диалога с «Сосед-Ботом» живой диспетчерской: создаётся чат, который появляется в /admin. */
export async function POST(req: Request) {
  const b = (await req.json()) as { name?: string; phone?: string; messages?: Msg[]; consent?: boolean };
  if (b.consent !== true) return NextResponse.json({ error: "Нужно согласие на обработку персональных данных" }, { status: 400 });
  const phone = (b.phone ?? "").replace(/[^\d+]/g, "");
  if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Укажите телефон полностью" }, { status: 400 });
  const history = (Array.isArray(b.messages) ? b.messages : []).slice(-40).map((m) => ({ from: m.from === "user" ? "user" : "bot", text: String(m.text ?? "").slice(0, 1000), at: m.at }));
  const contact = `${(b.name ?? "").trim().slice(0, 60) || "Без имени"} • ${phone}`;
  const t = await prisma.chatThread.create({ data: { contact, messages: JSON.stringify([...history, { from: "bot", text: "Передаю диалог диспетчеру. Он ответит здесь и позвонит вам.", at: new Date().toISOString() }]), consentAt: new Date() } });
  await bump();
  await pushNotification("диспетчерская", `💬 Новый чат от клиента: ${contact}`);
  return NextResponse.json({ ok: true, id: t.id });
}
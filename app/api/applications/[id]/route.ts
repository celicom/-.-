import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { pushNotification } from "@/lib/notify";
import { denyIfNotAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Модерация анкеты из админ-панели. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const denied = denyIfNotAdmin();
  if (denied) return denied;
  const { action } = (await req.json()) as { action: "approve" | "reject" };
  if (action !== "approve" && action !== "reject") return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  const app = await prisma.application.findUnique({ where: { id: params.id } });
  if (!app) return NextResponse.json({ error: "Анкета не найдена" }, { status: 404 });
  await prisma.application.update({ where: { id: app.id }, data: { status: action === "approve" ? "approved" : "rejected" } });
  await bump();
  await pushNotification("партнёры", action === "approve" ? `✅ Анкета ${app.name} одобрена: кандидат приглашён на собеседование.` : `Анкета ${app.name} отклонена.`);
  return NextResponse.json({ ok: true });
}

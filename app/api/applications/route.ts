import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { pushNotification } from "@/lib/notify";

export const dynamic = "force-dynamic";

const ROLES: Record<string, string> = { repair: "Мастер по ремонту", cleaning: "Клинер", junior: "Сосед.Джуниор" };

/** Анкета мастера или партнёра с сайта: сразу попадает на модерацию в /admin. */
export async function POST(req: Request) {
  const b = (await req.json()) as { name?: string; phone?: string; role?: string; district?: string; experience?: string; about?: string; consent?: boolean };
  const name = b.name?.trim() ?? "";
  const phone = (b.phone ?? "").replace(/[^\d+]/g, "");
  if (name.length < 2) return NextResponse.json({ error: "Укажите имя" }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10) return NextResponse.json({ error: "Укажите телефон полностью" }, { status: 400 });
  if (b.consent !== true) return NextResponse.json({ error: "Нужно согласие на обработку персональных данных" }, { status: 400 });
  const role = ROLES[b.role ?? ""] ? (b.role as string) : "repair";

  const app = await prisma.application.create({
    data: { name, phone, role, district: b.district?.trim() || "ЖК Щукино", experience: (b.experience ?? "").slice(0, 80), about: (b.about ?? "").slice(0, 600), consentAt: new Date() },
  });
  await bump();
  await pushNotification("партнёры", `🧰 Новая анкета: ${app.name} • ${ROLES[role]} • ${app.district}`);
  return NextResponse.json({ ok: true, id: app.id });
}

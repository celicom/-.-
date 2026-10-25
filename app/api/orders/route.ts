import { NextResponse } from "next/server";
import { prisma, bump } from "@/lib/prisma";
import { pushNotification } from "@/lib/notify";
import { templates } from "@/telegram-bot";

export const dynamic = "force-dynamic";

type Body = {
  kind: "repair" | "cleaning" | "junior";
  category: string;
  categoryLabel: string;
  brand?: string;
  errorCode?: string;
  diagnosis: string;
  bagHint?: string;
  details?: string;
  address: string;
  clientName?: string;
  priceWorkFrom: number;
  priceWorkTo: number;
  priceTurnkeyTo: number;
  masterId?: string;
  consent?: boolean;
};

export async function POST(req: Request) {
  const b = (await req.json()) as Body;
  if (!b.diagnosis || !b.address || !b.category) return NextResponse.json({ error: "Не хватает данных заявки" }, { status: 400 });
  // 152-ФЗ: без явного согласия на обработку персональных данных заявку не принимаем.
  if (b.consent !== true) return NextResponse.json({ error: "Нужно согласие на обработку персональных данных" }, { status: 400 });

  const last = await prisma.order.aggregate({ _max: { number: true } });
  const order = await prisma.order.create({
    data: {
      number: (last._max.number ?? 1000) + 1,
      kind: b.kind,
      category: b.category,
      categoryLabel: b.categoryLabel,
      brand: b.brand || null,
      errorCode: b.errorCode || null,
      diagnosis: b.diagnosis,
      bagHint: b.bagHint || null,
      details: b.details ?? "",
      address: b.address,
      clientName: b.clientName || "Анастасия (демо-клиент)",
      priceWorkFrom: Math.round(b.priceWorkFrom),
      priceWorkTo: Math.round(b.priceWorkTo),
      priceTurnkeyTo: Math.round(b.priceTurnkeyTo),
      status: b.masterId ? "assigned" : "searching",
      masterId: b.masterId || null,
      assignedAt: b.masterId ? new Date() : null,
      consentAt: new Date(),
    },
  });
  await bump();
  await pushNotification("admin", templates.newOrder(order));
  return NextResponse.json(order);
}

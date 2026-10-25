// Одноразовое наполнение каталогов в боевой PostgreSQL: города, прайс, коды ошибок, уроки Академии.
// Безопасно для продакшена: ничего не удаляет и пропускает уже заполненные таблицы.
// Демо-данные (мастера, заказы, платежи) здесь НЕ создаются: для них есть prisma/seed.ts (только локально).
import { PrismaClient } from "@prisma/client";
import { ERROR_CODES, LESSONS } from "../lib/seed-data";
import { REGIONS } from "../lib/data/regions";
import { PRICE_ITEMS } from "../lib/data/services";

const prisma = new PrismaClient();

async function fillIfEmpty(name: string, count: () => Promise<number>, fill: () => Promise<unknown>) {
  if ((await count()) > 0) return console.log(`• ${name}: уже заполнено, пропускаю`);
  await fill();
  console.log(`✓ ${name}: загружено`);
}

async function main() {
  await fillIfEmpty("города и коэффициенты", () => prisma.region.count(), () => prisma.region.createMany({ data: REGIONS }));
  await fillIfEmpty("прайс-позиции", () => prisma.priceItem.count(), () => prisma.priceItem.createMany({ data: PRICE_ITEMS }));
  await fillIfEmpty("коды ошибок", () => prisma.errorCode.count(), () => prisma.errorCode.createMany({ data: ERROR_CODES }));
  await fillIfEmpty("уроки Академии", () => prisma.lesson.count(), () => prisma.lesson.createMany({ data: LESSONS }));
  await prisma.syncState.upsert({ where: { id: 1 }, create: { id: 1, version: 1 }, update: {} });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

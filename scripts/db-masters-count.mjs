// Для деплоя: сколько мастеров в базе (0 — база пустая, можно загрузить демо). При ошибке печатает -1.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  console.log(await prisma.master.count());
} catch {
  console.log(-1);
} finally {
  await prisma.$disconnect();
}

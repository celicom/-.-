import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../lib/seed-data";

const prisma = new PrismaClient();

seedDatabase(prisma)
  .then(() => console.log("✅ База Сосед.ру заполнена демо-данными"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

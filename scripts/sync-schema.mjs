// Создаёт prisma/schema.local.prisma (SQLite) из боевой схемы prisma/schema.prisma (PostgreSQL).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "prisma");
const src = fs.readFileSync(path.join(dir, "schema.prisma"), "utf8");
if (!src.includes('provider = "postgresql"')) throw new Error("В prisma/schema.prisma ожидается provider = \"postgresql\"");
const local = "// АВТОМАТИЧЕСКИ СОЗДАНО из schema.prisma: не редактируйте (npm run schema:local).\n" + src.replace('provider = "postgresql"', 'provider = "sqlite"');
fs.writeFileSync(path.join(dir, "schema.local.prisma"), local, "utf8");
console.log("prisma/schema.local.prisma обновлён (SQLite для локальной разработки)");

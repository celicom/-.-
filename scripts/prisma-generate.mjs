// postinstall: генерирует Prisma Client. Локально — для SQLite, в Docker/на сервере (SOSED_DB=postgres) — для PostgreSQL.
import { execSync } from "node:child_process";
import "./sync-schema.mjs";

const postgres = process.env.SOSED_DB === "postgres";
const schema = postgres ? "prisma/schema.prisma" : "prisma/schema.local.prisma";
execSync(`npx prisma generate --schema ${schema}`, { stdio: "inherit", shell: true });

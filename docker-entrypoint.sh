#!/bin/sh
set -e
# Первый запуск: создать таблицы в PostgreSQL (RUN_DB_PUSH=1) и один раз наполнить каталоги (RUN_CATALOG_SEED=1).
if [ "$RUN_DB_PUSH" = "1" ]; then
  npx prisma db push --schema prisma/schema.prisma --skip-generate
fi
if [ "$RUN_CATALOG_SEED" = "1" ]; then
  npx tsx prisma/seed-catalog.ts
fi
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
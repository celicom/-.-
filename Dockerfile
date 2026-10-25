FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV SOSED_DB=postgres NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY scripts ./scripts
# postinstall генерирует Prisma Client для PostgreSQL (SOSED_DB=postgres)
RUN npm ci --no-audit --no-fund
COPY . .
# NEXT_PUBLIC_* вшиваются в клиентский код при сборке — передавайте их как build-args (см. DEPLOY_RU.md)
ARG NEXT_PUBLIC_SITE_URL=https://sosed.pro
ARG NEXT_PUBLIC_METRIKA_ID=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_METRIKA_ID=$NEXT_PUBLIC_METRIKA_ID
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production SOSED_DB=postgres NEXT_TELEMETRY_DISABLED=1 PORT=3000
COPY --from=builder /app ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]

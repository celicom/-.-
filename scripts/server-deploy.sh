#!/usr/bin/env bash
# Серверная часть авто-деплоя Сосед.ру. Запускается deploy.ps1 на сервере от root из распакованного архива.
# Повторный запуск обновляет сайт: .env (и AUTH_SECRET) сохраняются, база не стирается.
set -euo pipefail

RELEASE="$(cd "$(dirname "$0")/.." && pwd)"
APP_USER=sosed
APP_HOME=/home/$APP_USER
APP=$APP_HOME/app
PM2_NAME=sosed-pro

step() { echo; echo "==> $*"; }
warn() { echo "!!  $*"; }

# shellcheck disable=SC1091
. "$RELEASE/deploy-vars.env"
# Файл с секретами удаляется при любом исходе
trap 'rm -f "$RELEASE/deploy-vars.env"' EXIT
: "${DATABASE_URL:?нет DATABASE_URL}" "${ADMIN_LOGIN:?нет ADMIN_LOGIN}" "${ADMIN_PASSWORD:?нет ADMIN_PASSWORD}"
DOMAIN=${DOMAIN:-sosed.pro}
SERVER_IP=${SERVER_IP:-}
CERT_EMAIL=${CERT_EMAIL:-}
DEMO=${DEMO:-1}

export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a

step "1/8 Пакеты: Node.js 20, PM2, Nginx"
apt-get update -qq
apt-get install -y -qq curl ca-certificates openssl git nginx ufw >/dev/null
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
command -v pm2 >/dev/null || npm install -g pm2 --silent
echo "node $(node -v), pm2 $(pm2 -v)"

step "2/8 Память для сборки"
if [ "$(swapon --show --noheadings | wc -l)" = "0" ] && [ "$(awk '/MemTotal/ {print $2}' /proc/meminfo)" -lt 3000000 ]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "добавлен swap 2 ГБ"
else
  echo "ок"
fi

step "3/8 Пользователь $APP_USER и файлы проекта"
id "$APP_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$APP_USER" >/dev/null
mkdir -p "$APP"
# Старый код удаляем, .env оставляем
find "$APP" -mindepth 1 -maxdepth 1 ! -name .env -exec rm -rf {} +
tar -C "$RELEASE" --exclude=./deploy-vars.env -cf - . | tar -C "$APP" -xf -
chown -R "$APP_USER:$APP_USER" "$APP"

step "4/8 Файл .env"
ENV_FILE=$APP/.env
AUTH_SECRET=""
[ -f "$ENV_FILE" ] && AUTH_SECRET=$(grep -E '^AUTH_SECRET=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"' || true)
[ -n "$AUTH_SECRET" ] || AUTH_SECRET=$(openssl rand -hex 32)
MANAGED='^(DATABASE_URL|SOSED_DB|AUTH_SECRET|NEXT_PUBLIC_SITE_URL|ADMIN_LOGIN|ADMIN_PASSWORD|AUTH_DEMO|PAYMENT_ALLOW_MOCK|DEMO_MODE)='
KEEP=""
[ -f "$ENV_FILE" ] && KEEP=$(grep -Ev "$MANAGED" "$ENV_FILE" || true)
DEMO_FLAG=""; [ "$DEMO" = "1" ] && DEMO_FLAG=1
{
  echo "# Создано deploy.ps1. Строки ниже обновляются при каждом деплое; свои переменные добавляйте в конец."
  echo "DATABASE_URL=\"$DATABASE_URL\""
  echo "SOSED_DB=postgres"
  echo "AUTH_SECRET=\"$AUTH_SECRET\""
  echo "NEXT_PUBLIC_SITE_URL=\"https://$DOMAIN\""
  echo "ADMIN_LOGIN=\"$ADMIN_LOGIN\""
  echo "ADMIN_PASSWORD=\"$ADMIN_PASSWORD\""
  echo "AUTH_DEMO=$DEMO_FLAG"
  echo "PAYMENT_ALLOW_MOCK=$DEMO_FLAG"
  echo "DEMO_MODE=$DEMO_FLAG"
  [ -n "$KEEP" ] && echo "$KEEP" | grep -v '^# Создано deploy.ps1' || true
} > "$ENV_FILE.new"
mv "$ENV_FILE.new" "$ENV_FILE"
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "ок (AUTH_SECRET сохранён между деплоями)"

as_app() { runuser -u "$APP_USER" -- env HOME="$APP_HOME" bash -c "cd '$APP' && export SOSED_DB=postgres NEXT_TELEMETRY_DISABLED=1 && $1"; }

step "5/8 Зависимости и база данных"
as_app "npm ci --no-audit --no-fund --loglevel=error"
as_app "npm run --silent db:push:prod"
as_app "npx tsx prisma/seed-catalog.ts"
if [ "$DEMO" = "1" ]; then
  MASTERS=$(as_app "node scripts/db-masters-count.mjs" | tail -n1)
  if [ "$MASTERS" = "0" ]; then
    echo "база пустая: загружаю демо-мастеров и заказы"
    as_app "npx prisma db seed"
  else
    echo "мастера уже есть ($MASTERS), демо не загружаю"
  fi
fi

step "6/8 Сборка"
as_app "npm run build"

step "7/8 Запуск через PM2"
as_app "pm2 describe $PM2_NAME >/dev/null 2>&1 && pm2 reload $PM2_NAME --update-env || pm2 start npm --name $PM2_NAME -- start"
as_app "pm2 save --force >/dev/null"
pm2 startup systemd -u "$APP_USER" --hp "$APP_HOME" >/dev/null
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)
  [ "$code" = "200" ] && break
  sleep 2
done
[ "${code:-}" = "200" ] && echo "сайт отвечает на порту 3000" || { warn "сайт не отвечает (код ${code:-нет}). Логи: su - $APP_USER -c 'pm2 logs $PM2_NAME'"; exit 1; }

step "8/8 Nginx, брандмауэр, HTTPS"
cat > /etc/nginx/sites-available/sosed <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN www.$DOMAIN $SERVER_IP _;
    client_max_body_size 10m;

    location /api/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 1h;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/sosed /etc/nginx/sites-enabled/sosed
rm -f /etc/nginx/sites-enabled/default
nginx -t -q && systemctl reload nginx

# Не отрезать себе SSH: открываем порт из deploy.env и все порты, которые реально слушает sshd.
SSH_PORTS="${SSH_PORT:-22} $(ss -tlnpH 2>/dev/null | awk '/sshd/ {n=split($4,a,":"); print a[n]}' | sort -u | tr '\n' ' ' || true)"
for p in $SSH_PORTS; do ufw allow "$p/tcp" >/dev/null; done
ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
if ufw status | grep -q inactive; then
  # Включаем брандмауэр, только если правило для SSH точно есть
  if ufw show added | grep -q "${SSH_PORT:-22}/tcp"; then ufw --force enable >/dev/null; else warn "брандмауэр не включён: нет правила для SSH"; fi
fi
echo "открыты порты: SSH ${SSH_PORTS}, 80, 443"

HTTPS=0
resolved=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1 {print $1}' || true)
if [ -n "$SERVER_IP" ] && [ "$resolved" = "$SERVER_IP" ]; then
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  DOMAINS=(-d "$DOMAIN")
  [ "$(getent ahostsv4 "www.$DOMAIN" | awk 'NR==1 {print $1}' || true)" = "$SERVER_IP" ] && DOMAINS+=(-d "www.$DOMAIN")
  if [ -n "$CERT_EMAIL" ]; then MAIL=(-m "$CERT_EMAIL"); else MAIL=(--register-unsafely-without-email); fi
  if certbot --nginx "${DOMAINS[@]}" "${MAIL[@]}" --agree-tos --redirect --keep-until-expiring -n -q; then
    HTTPS=1
  else
    warn "сертификат выпустить не удалось, сайт работает по http"
  fi
else
  warn "домен $DOMAIN ещё не указывает на $SERVER_IP (сейчас: ${resolved:-нет записи}). HTTPS настроится при следующем запуске deploy.ps1 после правки DNS."
fi

rm -rf "$RELEASE"
echo
echo "================ ГОТОВО ================"
if [ "$HTTPS" = "1" ]; then
  echo "Сайт:     https://$DOMAIN"
  echo "Админка:  https://$DOMAIN/admin"
else
  echo "Сайт:     http://$SERVER_IP"
  echo "Админка:  http://$SERVER_IP/admin"
fi
echo "Логи:     ssh -p ${SSH_PORT:-22} root@$SERVER_IP \"su - $APP_USER -c 'pm2 logs $PM2_NAME'\""

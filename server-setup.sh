#!/usr/bin/env bash
sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null; sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null
# ↑ IPv6 отключён: на сервере зарубежные узлы зависают по IPv6.
#
# Установка Сосед.ру на сервер БЕЗ SSH — запускается в веб-консоли Timeweb Cloud из распакованного sosed-bundle.tar.gz:
#   bash /root/sosed-release/server-setup.sh
# Node.js берётся из стандартного репозитория Ubuntu 24.04 (apt), а не с deb.nodesource.com.
# Секретов в архиве нет: DATABASE_URL, логин и пароль админки скрипт спросит в консоли
# (при повторном запуске возьмёт их из уже созданного /home/sosed/app/.env и ничего не спросит).
# Повторный запуск обновляет сайт: .env и AUTH_SECRET сохраняются, база не стирается.
set -euo pipefail

# ── Настройки (те же, что в deploy.env) ──
DOMAIN=${DOMAIN:-sosed.pro}
SERVER_IP=${SERVER_IP:-5.42.115.41}
SSH_PORT=${SSH_PORT:-2222}
CERT_EMAIL=${CERT_EMAIL:-}
DEMO=${DEMO:-1}          # 1 — демо для показа (демо-мастера в пустую базу, тестовая оплата); 0 — боевой режим
# Зеркало npm, если registry.npmjs.org недоступен (например NPM_REGISTRY=https://registry.npmmirror.com)
NPM_REGISTRY=${NPM_REGISTRY:-}

RELEASE="$(cd "$(dirname "$0")" && pwd)"
APP_USER=sosed
APP_HOME=/home/$APP_USER
APP=$APP_HOME/app
ENV_FILE=$APP/.env
PM2_NAME=sosed-pro

step() { echo; echo "==> $*"; }
warn() { echo "!!  $*"; }
env_get() { [ -f "$ENV_FILE" ] && grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"' || true; }
BAD_RE=$'[[:space:]$"`\\\']'
bad_chars() { [[ "$1" =~ $BAD_RE ]]; }

[ "$(id -u)" = "0" ] || { echo "Запустите от root"; exit 1; }
[ -f "$RELEASE/package.json" ] || { echo "Рядом со скриптом нет файлов проекта: распакуйте sosed-bundle.tar.gz"; exit 1; }

# IPv6 выключен и после перезагрузки; apt ходит только по IPv4
cat > /etc/sysctl.d/99-sosed-no-ipv6.conf <<'EOF'
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
EOF
echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4

step "0/8 Настройки входа"
DATABASE_URL=$(env_get DATABASE_URL); ADMIN_LOGIN=$(env_get ADMIN_LOGIN); ADMIN_PASSWORD=$(env_get ADMIN_PASSWORD)
if [ -z "$DATABASE_URL" ]; then
  echo "Строка подключения к PostgreSQL (панель Timeweb → Базы данных → ваша база → Подключение)."
  echo "Спецсимволы в пароле закодируйте: @ → %40, # → %23, \$ → %24"
  read -r -p "DATABASE_URL: " DATABASE_URL
fi
[ -n "$ADMIN_LOGIN" ] || read -r -p "Логин для админки /admin: " ADMIN_LOGIN
if [ -z "$ADMIN_PASSWORD" ]; then read -r -s -p "Пароль для админки /admin (от 10 символов): " ADMIN_PASSWORD; echo; fi
[[ "$DATABASE_URL" =~ ^postgres(ql)?:// ]] || { echo "DATABASE_URL должна начинаться с postgresql://"; exit 1; }
for v in "$DATABASE_URL" "$ADMIN_LOGIN" "$ADMIN_PASSWORD"; do
  if bad_chars "$v"; then echo "Значения не должны содержать пробелы и символы \$ \" ' \\ \`"; exit 1; fi
done
[ "${#ADMIN_PASSWORD}" -ge 10 ] || { echo "Пароль админки короче 10 символов"; exit 1; }
[ -n "$ADMIN_LOGIN" ] || { echo "Пустой логин админки"; exit 1; }
echo "ок"

export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a

step "1/8 Пакеты из репозитория Ubuntu: Node.js, npm, Nginx"
apt-get update -qq
apt-get install -y -qq curl ca-certificates openssl nginx ufw nodejs npm >/dev/null
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
NODE_MINOR=$(node -p 'process.versions.node.split(".")[1]')
if [ "$NODE_MAJOR" -lt 18 ] || { [ "$NODE_MAJOR" = "18" ] && [ "$NODE_MINOR" -lt 17 ]; }; then
  echo "Нужен Node.js 18.17 или новее, установлен $(node -v). Нужна Ubuntu 24.04."; exit 1
fi
npm config set fund false >/dev/null; npm config set audit false >/dev/null
[ -n "$NPM_REGISTRY" ] && npm config set registry "$NPM_REGISTRY" --location=global
command -v pm2 >/dev/null || npm install -g pm2 --silent
echo "node $(node -v), npm $(npm -v), pm2 $(pm2 -v)"

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
find "$APP" -mindepth 1 -maxdepth 1 ! -name .env -exec rm -rf {} +
tar -C "$RELEASE" -cf - . | tar -C "$APP" -xf -
[ -n "$NPM_REGISTRY" ] && echo "registry=$NPM_REGISTRY" > "$APP/.npmrc"
chown -R "$APP_USER:$APP_USER" "$APP"

step "4/8 Файл .env"
AUTH_SECRET=$(env_get AUTH_SECRET)
[ -n "$AUTH_SECRET" ] || AUTH_SECRET=$(openssl rand -hex 32)
MANAGED='^(DATABASE_URL|SOSED_DB|AUTH_SECRET|NEXT_PUBLIC_SITE_URL|ADMIN_LOGIN|ADMIN_PASSWORD|AUTH_DEMO|PAYMENT_ALLOW_MOCK|DEMO_MODE)='
KEEP=""
[ -f "$ENV_FILE" ] && KEEP=$(grep -Ev "$MANAGED" "$ENV_FILE" | grep -v '^# Создано' || true)
DEMO_FLAG=""; [ "$DEMO" = "1" ] && DEMO_FLAG=1
{
  echo "# Создано server-setup.sh. Строки ниже обновляются при каждой установке; свои переменные добавляйте в конец."
  echo "DATABASE_URL=\"$DATABASE_URL\""
  echo "SOSED_DB=postgres"
  echo "AUTH_SECRET=\"$AUTH_SECRET\""
  echo "NEXT_PUBLIC_SITE_URL=\"https://$DOMAIN\""
  echo "ADMIN_LOGIN=\"$ADMIN_LOGIN\""
  echo "ADMIN_PASSWORD=\"$ADMIN_PASSWORD\""
  echo "AUTH_DEMO=$DEMO_FLAG"
  echo "PAYMENT_ALLOW_MOCK=$DEMO_FLAG"
  echo "DEMO_MODE=$DEMO_FLAG"
  if [ -n "$KEEP" ]; then echo "$KEEP"; fi
} > "$ENV_FILE.new"
mv "$ENV_FILE.new" "$ENV_FILE"
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "ок (AUTH_SECRET сохранён между установками)"

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
code=""
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)
  [ "$code" = "200" ] && break
  sleep 2
done
if [ "$code" = "200" ]; then echo "сайт отвечает на порту 3000"; else warn "сайт не отвечает (код ${code:-нет}). Логи: su - $APP_USER -c 'pm2 logs $PM2_NAME'"; exit 1; fi

step "8/8 Nginx, брандмауэр, HTTPS"
cat > /etc/nginx/sites-available/sosed <<EOF
server {
    listen 80 default_server;
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

# Не отрезать SSH: открываем порт из настроек и все порты, которые реально слушает sshd.
SSH_PORTS="$SSH_PORT $(ss -tlnpH 2>/dev/null | awk '/sshd/ {n=split($4,a,":"); print a[n]}' | sort -u | tr '\n' ' ' || true)"
for p in $SSH_PORTS; do ufw allow "$p/tcp" >/dev/null; done
ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
if ufw status | grep -q inactive; then
  if ufw show added | grep -q "$SSH_PORT/tcp"; then ufw --force enable >/dev/null; else warn "брандмауэр не включён: нет правила для SSH"; fi
fi
echo "открыты порты: SSH $SSH_PORTS, 80, 443"

HTTPS=0
resolved=$(getent ahostsv4 "$DOMAIN" | awk 'NR==1 {print $1}' || true)
if [ "$resolved" = "$SERVER_IP" ]; then
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
  warn "домен $DOMAIN ещё не указывает на $SERVER_IP (сейчас: ${resolved:-нет записи}). HTTPS настроится при следующем запуске после правки DNS."
fi

echo
echo "================ ГОТОВО ================"
if [ "$HTTPS" = "1" ]; then
  echo "Сайт:     https://$DOMAIN"
  echo "Админка:  https://$DOMAIN/admin"
else
  echo "Сайт:     http://$SERVER_IP"
  echo "Админка:  http://$SERVER_IP/admin"
fi
echo "Логи:     su - $APP_USER -c 'pm2 logs $PM2_NAME'"
echo "Архив больше не нужен: rm -rf /root/sosed-bundle.tar.gz $RELEASE"

# Деплой Сосед.Про: GitHub → сервер Ubuntu (Timeweb Cloud, 5.42.115.41) → PM2 → Nginx + SSL

Пошаговая инструкция для запуска без Docker: Node.js + PM2 на вашем VPS, база в облачном PostgreSQL Timeweb.
Вместо секретов стоят плейсхолдеры в угловых скобках: `<ВАШ_ЛОГИН_GITHUB>`, `<ПАРОЛЬ_БД>` и т. п. Подставьте свои значения, скобки уберите.

> Другой вариант (Timeweb Cloud Apps + Dockerfile) описан в `DEPLOY_RU.md`. Эта инструкция про собственный сервер.

---

## Что проверено в проекте

**В репозиторий не попадают** (`.gitignore`): `.env`, `.env.local`, `.env.production`, `.env.*.local`, `node_modules`, `.next`, `.next-check`, локальные базы `*.db`, `*.db-journal`, `*.sqlite`, `*.sqlite3` (в том числе `prisma/dev.db`), `prisma/schema.local.prisma`, `*.tsbuildinfo`, `*.log`.
**Попадает** `.env.example`: в нём только пустые шаблоны, секретов нет. Поиск по коду не нашёл зашитых токенов, паролей или строк подключения.

**Переменные окружения, которые реально читает код:**

| Переменная | Где используется | Нужна? |
|---|---|---|
| `DATABASE_URL` | `prisma/schema.prisma` | **обязательна** |
| `AUTH_SECRET` | `lib/auth.ts` (подпись сессий; без неё сайт в продакшене падает с ошибкой) | **обязательна**, от 32 символов |
| `NEXT_PUBLIC_SITE_URL` | sitemap, robots, OAuth, платежи, подвал | **обязательна**: `https://sosed.pro` |
| `SOSED_DB` | `scripts/prisma-generate.mjs` (postinstall) | **обязательна при `npm ci`**: `postgres` (иначе соберётся клиент для SQLite) |
| `SMSRU_API_ID` | `src/lib/sms.ts` | для входа по СМС |
| `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET` | вход через Яндекс ID | по желанию |
| `VK_CLIENT_ID`, `VK_CLIENT_SECRET` | вход через VK ID | по желанию |
| `ESIA_CLIENT_ID`, `ESIA_CLIENT_SECRET` | вход через Госуслуги | по желанию |
| `PAYMENT_PROVIDER`, `PAYMENT_SHOP_ID`, `PAYMENT_SECRET_KEY` | `src/lib/payments.ts` (`yookassa` или `tbank`) | для приёма оплаты |
| `PAYMENT_ALLOW_MOCK` | `1` разрешает тестовую оплату в продакшене | оставьте пустым |
| `ADMIN_LOGIN`, `ADMIN_PASSWORD` | `lib/admin-auth.ts`: вход в админ-панель `/admin` | **обязательны**: без `ADMIN_PASSWORD` админка на сервере закрыта полностью |
| `AUTH_DEMO` | `1` включает демо-вход в продакшене | оставьте пустым |
| `DEMO_MODE` | `1` разрешает кнопку «Сброс» демо-данных (стирает все заказы; только после входа в админку) | оставьте пустым |
| `NEXT_PUBLIC_METRIKA_ID` | Яндекс.Метрика | по желанию |
| `NEXT_PUBLIC_YANDEX_MAPS_KEY` | `components/YandexMap.tsx` | по желанию |
| `BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Telegram-бот | по желанию |
| `APP_URL` | `scripts/bot.ts` (куда бот шлёт ответы) | только для бота: `http://127.0.0.1:3000` |

Переменные `NEXT_PUBLIC_*` вшиваются в сайт **при сборке**: после их изменения нужно заново выполнить `npm run build`.

**Команды из `package.json`, которые нужны на сервере:**

| Команда | Что делает |
|---|---|
| `npm ci` | ставит зависимости; postinstall генерирует Prisma Client (при `SOSED_DB=postgres` для PostgreSQL) |
| `npm run db:push:prod` | `prisma db push --schema prisma/schema.prisma --skip-generate`: создаёт/обновляет таблицы в PostgreSQL |
| `npx tsx prisma/seed-catalog.ts` | один раз заполняет каталоги (города, прайс, коды ошибок, уроки). Ничего не удаляет, заполненные таблицы пропускает |
| `npm run build` | `next build` |
| `npm start` | `next start -p 3000` |
| `npm run bot` | Telegram-бот (long polling), по желанию |

Не запускайте на сервере `npm run setup`, `npm run db:push` и `npm run db:seed`: они для локальной SQLite, а `db:seed` создаёт демо-мастеров и демо-заказы. Папки `prisma/migrations` в проекте нет, поэтому схема применяется через `db push`, а не `migrate deploy`.

---

## Часть 1. Первый коммит и отправка на GitHub (на вашем компьютере, Windows)

### 1.1. Установить Git (на компьютере его сейчас нет)

В PowerShell:

```powershell
winget install --id Git.Git -e
```

Закройте и заново откройте PowerShell, проверьте: `git --version`.

Один раз представьтесь Git (имя и почта попадут в историю коммитов):

```powershell
git config --global user.name "<ВАШЕ_ИМЯ>"
git config --global user.email "<ВАША_ПОЧТА>"
git config --global init.defaultBranch main
```

### 1.2. Создать пустой репозиторий на GitHub

github.com → **New repository** → имя `<ИМЯ_РЕПОЗИТОРИЯ>` → **Private** → **не** ставьте галочки README, .gitignore и license (репозиторий должен быть пустым) → **Create repository**.

### 1.3. Первый коммит

```powershell
cd C:\Users\a7050\Desktop\sosed-platform\sosed-ecosystem
git init
git add .
git status
```

**Проверьте вывод `git status` перед коммитом.** В списке не должно быть `.env`, `node_modules`, `.next`, `prisma/dev.db`. Для уверенности:

```powershell
git check-ignore -v .env prisma/dev.db node_modules .next
```

Каждая из четырёх строк должна показать правило из `.gitignore`. Если какой-то файл не показан, остановитесь и не коммитьте.

```powershell
git commit -m "Сосед.Про: первый коммит"
git branch -M main
git remote add origin https://github.com/<ВАШ_ЛОГИН_GITHUB>/<ИМЯ_РЕПОЗИТОРИЯ>.git
git push -u origin main
```

При первом `push` откроется окно входа в GitHub (Git Credential Manager): войдите через браузер. Пароль от GitHub в командной строке не принимается.

Дальнейшие изменения отправляйте так:

```powershell
git add .
git commit -m "<что изменили>"
git push
```

---

## Часть 2. Подготовка облачной базы PostgreSQL (панель Timeweb)

1. **Облачные базы данных** → ваша PostgreSQL → запомните хост, порт (обычно 5432), имя БД, пользователя, пароль.
2. В настройках доступа разрешите подключение с IP сервера **5.42.115.41** (или подключите сервер и БД к одной приватной сети и используйте внутренний хост).
3. Строка подключения:

```
postgresql://<ПОЛЬЗОВАТЕЛЬ_БД>:<ПАРОЛЬ_БД>@<ХОСТ_БД>:5432/<ИМЯ_БД>?sslmode=require
```

Спецсимволы в пароле кодируются: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`, `?` → `%3F`, `&` → `%26`.

---

## Часть 3. Сервер Ubuntu 5.42.115.41

### 3.1. Подключиться

С компьютера (PowerShell):

```powershell
ssh -p 2222 root@5.42.115.41
```

Пароль root придёт в письме Timeweb или виден в панели сервера. Все команды ниже выполняются **на сервере**.

### 3.2. Обновить систему и поставить базовые пакеты

```bash
apt update && apt upgrade -y
apt install -y git curl ca-certificates openssl build-essential ufw
```

### 3.3. Swap (если у сервера 1–2 ГБ памяти)

`next build` может упасть по нехватке памяти. Проверьте `free -h`; если swap нет:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 3.4. Node.js 22 LTS, npm, PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v      # v22.x
npm -v
npm install -g pm2
```

### 3.5. Отдельный пользователь для сайта

Запускать сайт от root небезопасно. Создайте пользователя `sosed`:

```bash
adduser --disabled-password --gecos "" sosed
su - sosed
```

Дальше до шага 3.10 команды выполняются от пользователя `sosed` (приглашение `sosed@...$`).

### 3.6. Доступ сервера к приватному репозиторию (deploy key)

```bash
ssh-keygen -t ed25519 -C "sosed-server" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Скопируйте выведенную строку → GitHub → ваш репозиторий → **Settings → Deploy keys → Add deploy key** → вставьте, галочку «Allow write access» **не** ставьте → **Add key**.

Проверка:

```bash
ssh -T git@github.com
```

На вопрос `Are you sure you want to continue connecting` ответьте `yes`. Ответ `Hi <ВАШ_ЛОГИН_GITHUB>/<ИМЯ_РЕПОЗИТОРИЯ>! You've successfully authenticated` значит, всё в порядке.

### 3.7. Клонировать проект

```bash
cd ~
git clone git@github.com:<ВАШ_ЛОГИН_GITHUB>/<ИМЯ_РЕПОЗИТОРИЯ>.git sosed
cd ~/sosed
```

### 3.8. Создать `.env`

Сгенерируйте секрет для сессий и скопируйте вывод:

```bash
openssl rand -base64 48
```

Откройте редактор:

```bash
nano .env
```

Вставьте и заполните (значения в одинарных кавычках, тогда `$`, `&` и прочие символы не испортятся):

```dotenv
DATABASE_URL='postgresql://<ПОЛЬЗОВАТЕЛЬ_БД>:<ПАРОЛЬ_БД>@<ХОСТ_БД>:5432/<ИМЯ_БД>?sslmode=require'
AUTH_SECRET='<ВЫВОД_OPENSSL_RAND>'
NEXT_PUBLIC_SITE_URL='https://sosed.pro'
SOSED_DB='postgres'

# Вход в админ-панель /admin (логин любой, пароль длинный: openssl rand -base64 18)
ADMIN_LOGIN='<ЛОГИН_АДМИНКИ>'
ADMIN_PASSWORD='<ПАРОЛЬ_АДМИНКИ>'

# Оставить пустыми в продакшене
AUTH_DEMO=''
PAYMENT_ALLOW_MOCK=''
DEMO_MODE=''

# По мере подключения сервисов
SMSRU_API_ID=''
YANDEX_CLIENT_ID=''
YANDEX_CLIENT_SECRET=''
VK_CLIENT_ID=''
VK_CLIENT_SECRET=''
ESIA_CLIENT_ID=''
ESIA_CLIENT_SECRET=''
PAYMENT_PROVIDER=''
PAYMENT_SHOP_ID=''
PAYMENT_SECRET_KEY=''
NEXT_PUBLIC_METRIKA_ID=''
NEXT_PUBLIC_YANDEX_MAPS_KEY=''
BOT_TOKEN=''
TELEGRAM_CHAT_ID=''
APP_URL='http://127.0.0.1:3000'
```

Сохранить: `Ctrl+O`, `Enter`, выйти: `Ctrl+X`. Закройте файл от чужих глаз:

```bash
chmod 600 .env
```

### 3.9. Установка, база, сборка

Загрузите переменные из `.env` в текущую сессию (postinstall читает `SOSED_DB` из окружения, а не из файла):

```bash
cd ~/sosed
set -a; . ./.env; set +a
```

Установка зависимостей и генерация Prisma Client для PostgreSQL:

```bash
npm ci --no-audit --no-fund
```

В конце должно быть `Generated Prisma Client ... to ./node_modules/@prisma/client` (и строка про `schema.local.prisma`, это нормально).

Создать таблицы в облачной базе:

```bash
npm run db:push:prod
```

Ожидаемо: `Your database is now in sync with your Prisma schema`.
Если ошибка `Can't reach database server`, проверьте хост, порт и что IP 5.42.115.41 разрешён в настройках БД.

Один раз заполнить каталоги (города, прайс, коды ошибок, уроки):

```bash
npx tsx prisma/seed-catalog.ts
```

Сборка:

```bash
npm run build
```

### 3.10. Запуск через PM2 и автозапуск

Всё ещё от пользователя `sosed`, в папке `~/sosed`:

```bash
pm2 start npm --name sosed-pro -- start
pm2 save
pm2 status
curl -I http://127.0.0.1:3000
```

`pm2 status` должен показать `sosed-pro` в статусе `online`, а `curl` вернуть `HTTP/1.1 200 OK`.

Автозапуск после перезагрузки сервера: выйдите в root и создайте службу для пользователя `sosed`:

```bash
exit
pm2 startup systemd -u sosed --hp /home/sosed
systemctl status pm2-sosed
```

Статус должен быть `active`. Список процессов служба берёт из `pm2 save`, который вы уже выполнили. Проверить можно перезагрузкой: `reboot`, затем через минуту `ssh -p 2222 root@5.42.115.41` и `su - sosed -c "pm2 status"`.

**Telegram-бот (по желанию),** когда заполнены `BOT_TOKEN` и `TELEGRAM_CHAT_ID`:

```bash
su - sosed
cd ~/sosed
pm2 start npm --name sosed-bot -- run bot
pm2 save
exit
```

Полезное: `pm2 logs sosed-pro` (логи), `pm2 restart sosed-pro`, `pm2 monit`.

---

## Часть 4. Домен sosed.pro: Nginx и SSL

Команды от root.

### 4.1. DNS

В NIC.RU (или там, куда делегирован домен; проверьте NS) создайте записи:

- `A`, имя `@`, значение `5.42.115.41`
- `A`, имя `www`, значение `5.42.115.41`

Проверка с сервера: `getent hosts sosed.pro` должен показать `5.42.115.41`. Обновление DNS занимает от минут до суток; SSL на шаге 4.4 получится только после этого.

### 4.2. Firewall

```bash
ufw allow 2222/tcp   # порт SSH; без этой строки ufw отрежет доступ к серверу
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

Порт 3000 наружу не открываем: сайт доступен только через Nginx.

### 4.3. Nginx

```bash
apt install -y nginx
nano /etc/nginx/sites-available/sosed.pro
```

Содержимое:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name sosed.pro www.sosed.pro;

    client_max_body_size 6m;   # serverActions bodySizeLimit = 5mb

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }

    # Живая синхронизация окон (SSE): без буферизации и с долгим таймаутом
    location /api/stream {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_read_timeout 1h;
    }
}
```

Включить:

```bash
ln -s /etc/nginx/sites-available/sosed.pro /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Теперь `http://sosed.pro` открывает сайт. Вход по СМС на http работать не будет (cookie сессии помечена `Secure`), это исправит следующий шаг.

### 4.4. Бесплатный SSL Let's Encrypt

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d sosed.pro -d www.sosed.pro --redirect -m <ВАША_ПОЧТА> --agree-tos --no-eff-email
```

Certbot сам допишет HTTPS в конфиг Nginx и включит редирект с http на https. Продление автоматическое; проверка:

```bash
certbot renew --dry-run
```

### 4.5. Финальная проверка

- `https://sosed.pro/admin` перебрасывает на страницу входа, после ввода `ADMIN_LOGIN` и `ADMIN_PASSWORD` открывается Командный пункт (сессия 12 часов, кнопка «Выйти» внизу сайдбара). После 5 неверных паролей вход с этого IP закрывается на 15 минут. Чтобы завершить все сессии, смените `ADMIN_PASSWORD` и выполните `pm2 restart sosed-pro`.

- `https://sosed.pro` открывается с замком.
- `https://sosed.pro/api/pricing` отдаёт города и прайс (значит, база и каталоги на месте).
- `https://sosed.pro/legal/privacy` открывается.
- `/login` присылает СМС-код (если задан `SMSRU_API_ID`).

---

## Часть 5. Обновление сайта после новых коммитов

На компьютере: `git add .`, `git commit -m "..."`, `git push`. Затем на сервере:

```bash
ssh -p 2222 root@5.42.115.41
su - sosed
cd ~/sosed
git pull
set -a; . ./.env; set +a
npm ci --no-audit --no-fund
npm run db:push:prod
npm run build
pm2 reload sosed-pro
```

`db:push:prod` можно пропускать, если `prisma/schema.prisma` не менялась. Если `db push` предупреждает о потере данных (удаление столбца или таблицы), остановитесь и не подтверждайте, пока не сделаете резервную копию БД в панели Timeweb.

---

## Частые проблемы

| Симптом | Причина и решение |
|---|---|
| `AUTH_SECRET не задан` в `pm2 logs` | нет или короткий `AUTH_SECRET` в `.env`; исправьте и `pm2 restart sosed-pro` |
| `the URL must start with the protocol file:` | Prisma Client собран для SQLite: выполните `set -a; . ./.env; set +a` и снова `npm ci` |
| `next build` убит (`Killed`) | мало памяти: добавьте swap (шаг 3.3) |
| 502 Bad Gateway | сайт не запущен: `pm2 status`, `pm2 logs sosed-pro` |
| Не входит в аккаунт | сайт открыт по http: настройте SSL (шаг 4.4) |
| Изменили `NEXT_PUBLIC_*`, а на сайте старое значение | пересоберите: `npm run build` и `pm2 reload sosed-pro` |

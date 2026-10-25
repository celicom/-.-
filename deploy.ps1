# Авто-деплой Сосед.ру на сервер одной командой:
#   powershell -ExecutionPolicy Bypass -File deploy.ps1
# Упаковывает проект (без node_modules, .next, .env и локальной базы), передаёт на сервер одним SSH-соединением
# (пароль сервера спрашивается один раз) и запускает там scripts/server-deploy.sh.
# Настройки и секреты берутся из deploy.env (не попадает в git). Если его нет, скрипт спросит и сохранит.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root
$envPath = Join-Path $root "deploy.env"

function Read-DeployEnv {
  $vars = [ordered]@{}
  if (Test-Path $envPath) {
    foreach ($line in [IO.File]::ReadAllLines($envPath)) {
      if ($line -match '^\s*([A-Z_]+)\s*=(.*)$') { $vars[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'") }
    }
  }
  return $vars
}

$cfg = Read-DeployEnv
# Порт SSH сервера (у Timeweb открыт 2222). Можно переопределить строкой SSH_PORT=... в deploy.env.
$defaults = [ordered]@{ SERVER = "root@5.42.115.41"; SSH_PORT = "2222"; SERVER_IP = "5.42.115.41"; DOMAIN = "sosed.pro"; CERT_EMAIL = ""; DEMO = "1" }
foreach ($k in $defaults.Keys) { if (-not $cfg.Contains($k) -or ($cfg[$k] -eq "" -and $k -ne "CERT_EMAIL")) { $cfg[$k] = $defaults[$k] } }

$changed = $false
if (-not $cfg["DATABASE_URL"] -or $cfg["DATABASE_URL"] -match "USER:PASSWORD@HOST") {
  Write-Host "Строка подключения к PostgreSQL (панель Timeweb -> База данных -> Подключение):"
  $cfg["DATABASE_URL"] = (Read-Host "DATABASE_URL").Trim()
  $changed = $true
}
if (-not $cfg["ADMIN_LOGIN"]) { $cfg["ADMIN_LOGIN"] = (Read-Host "Логин для админки /admin").Trim(); $changed = $true }
if (-not $cfg["ADMIN_PASSWORD"]) {
  $sec = Read-Host "Пароль для админки /admin (не менее 10 символов)" -AsSecureString
  $cfg["ADMIN_PASSWORD"] = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
  $changed = $true
}

# Проверки, чтобы не отправить на сервер заведомо нерабочие значения
if ($cfg["DATABASE_URL"] -notmatch '^postgres(ql)?://') { throw "DATABASE_URL должна начинаться с postgresql://" }
foreach ($k in "DATABASE_URL", "ADMIN_LOGIN", "ADMIN_PASSWORD") {
  if ($cfg[$k] -match '[\s"''\\$`]') { throw "$k не должна содержать пробелы и символы `$ `" ' \ (в пароле БД закодируйте их: `$ -> %24)" }
}
if ($cfg["ADMIN_PASSWORD"].Length -lt 10) { throw "Пароль админки короче 10 символов" }

if ($changed) {
  $lines = foreach ($k in $cfg.Keys) { "$k=$($cfg[$k])" }
  [IO.File]::WriteAllText($envPath, ($lines -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))
  Write-Host "Настройки сохранены в deploy.env (файл не попадает в git и в архив)."
}

# 1. Архив проекта
$work = Join-Path $root ".deploy"
New-Item -ItemType Directory -Force $work | Out-Null
$vars = foreach ($k in "DATABASE_URL", "ADMIN_LOGIN", "ADMIN_PASSWORD", "DOMAIN", "SERVER_IP", "SSH_PORT", "CERT_EMAIL", "DEMO") { "$k='$($cfg[$k])'" }
[IO.File]::WriteAllText((Join-Path $work "deploy-vars.env"), ($vars -join "`n") + "`n", (New-Object Text.UTF8Encoding $false))
$archive = Join-Path $work "release.tgz"
if (Test-Path $archive) { Remove-Item $archive -Force }

Write-Host "==> Упаковываю проект..."
$excludes = @("node_modules", ".next", ".next-check", ".deploy", ".git", ".env", ".env.local", ".env.production", "deploy.env", "*.db", "*.db-journal", "*.log", "prisma/schema.local.prisma")
$tarArgs = @("-czf", $archive)
foreach ($e in $excludes) { $tarArgs += "--exclude=$e" }
$tarArgs += @("-C", $root, ".", "-C", $work, "deploy-vars.env")
& tar.exe @tarArgs
if ($LASTEXITCODE -ne 0) { throw "Не удалось упаковать проект" }
Remove-Item (Join-Path $work "deploy-vars.env") -Force
Write-Host ("    архив: {0:N1} МБ" -f ((Get-Item $archive).Length / 1MB))

# 2-3. Одно SSH-соединение: передать архив и запустить установку. Пароль сервера спрашивается один раз.
$remote = "rm -rf /tmp/sosed-release && mkdir -p /tmp/sosed-release && tar -xzf - -C /tmp/sosed-release --warning=no-unknown-keyword && sed -i 's/\r$//' /tmp/sosed-release/scripts/server-deploy.sh /tmp/sosed-release/deploy-vars.env && bash /tmp/sosed-release/scripts/server-deploy.sh"
$cmdFile = Join-Path $work "upload.cmd"
# cmd-конвейер передаёт архив байт в байт (конвейер PowerShell 5.1 испортил бы двоичные данные)
[IO.File]::WriteAllText($cmdFile, "@type `"$archive`" | ssh -p $($cfg['SSH_PORT']) -o ConnectTimeout=20 -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 $($cfg['SERVER']) `"$remote`"`r`n", [Text.Encoding]::ASCII)

Write-Host "==> Подключаюсь к $($cfg['SERVER']) (порт $($cfg['SSH_PORT'])). Введите пароль сервера, когда спросят."
& cmd.exe /c $cmdFile
$code = $LASTEXITCODE
Remove-Item $archive, $cmdFile -Force -ErrorAction SilentlyContinue
if ($code -ne 0) { Write-Host ""; Write-Host "Деплой завершился с ошибкой (код $code). Пришлите последние строки вывода выше." -ForegroundColor Red; exit $code }
Write-Host ""
Write-Host "Деплой завершён." -ForegroundColor Green

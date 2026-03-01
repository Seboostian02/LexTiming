param(
    [switch]$quick
)

Write-Host "=== LexTiming - Employee Time Tracking ===" -ForegroundColor Cyan
if ($quick) {
    Write-Host "    Mode: QUICK (skip lint, tests, fresh seed)" -ForegroundColor DarkGray
} else {
    Write-Host "    Mode: FULL (lint + test + fresh seed)" -ForegroundColor DarkGray
}
Write-Host ""

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker is not installed. Please install Docker Desktop from https://docker.com" -ForegroundColor Red
    exit 1
}

# Check Docker is running
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Desktop is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

$nodeVersion = (node --version)
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Gray

if ($quick) {
    # ── QUICK MODE: skip lint, tests, DB setup ──
    Write-Host ""
    Write-Host "[1/2] Starting Prisma Studio (database UI)..." -ForegroundColor Yellow
    Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npx prisma studio"
    Write-Host "  Prisma Studio: http://localhost:5555" -ForegroundColor Green

    Write-Host "[2/2] Starting development server..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Application ready at: http://localhost:3000" -ForegroundColor Green
    Write-Host "Database UI at:       http://localhost:5555" -ForegroundColor Green
    Write-Host ""
    npm run dev:quick
    exit
}

# ── FULL MODE: lint → test → fresh seed → dev ──

$step = 1
$total = 9

Write-Host "[$step/$total] Installing dependencies..." -ForegroundColor Yellow
npm install
$step++

Write-Host "[$step/$total] Running linter..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "LINT FAILED. Fix errors before starting." -ForegroundColor Red
    exit 1
}
Write-Host "  Lint passed." -ForegroundColor Green
$step++

Write-Host "[$step/$total] Running tests..." -ForegroundColor Yellow
npm run test
if ($LASTEXITCODE -ne 0) {
    Write-Host "TESTS FAILED. Fix errors before starting." -ForegroundColor Red
    exit 1
}
Write-Host "  All tests passed." -ForegroundColor Green
$step++

Write-Host "[$step/$total] Starting PostgreSQL container..." -ForegroundColor Yellow
docker compose up -d
Write-Host "  Waiting for PostgreSQL to be healthy..." -ForegroundColor Gray
$retries = 0
while ($retries -lt 30) {
    $health = docker inspect --format='{{.State.Health.Status}}' lextiming-db-1 2>$null
    if ($health -eq "healthy") { break }
    Start-Sleep -Seconds 1
    $retries++
}
if ($retries -ge 30) {
    Write-Host "ERROR: PostgreSQL failed to start. Run 'docker compose logs db' for details." -ForegroundColor Red
    exit 1
}
Write-Host "  PostgreSQL is ready." -ForegroundColor Green
$step++

Write-Host "[$step/$total] Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate
$step++

Write-Host "[$step/$total] Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy
$step++

Write-Host "[$step/$total] Fresh seeding database..." -ForegroundColor Yellow
npx prisma db seed -- --force
$step++

Write-Host ""
Write-Host "[$step/$total] Starting Prisma Studio (database UI)..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npx prisma studio"
Write-Host "  Prisma Studio: http://localhost:5555" -ForegroundColor Green
$step++

Write-Host "[$step/$total] Starting development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Application ready at: http://localhost:3000" -ForegroundColor Green
Write-Host "Database UI at:       http://localhost:5555" -ForegroundColor Green
Write-Host ""
Write-Host "Demo accounts:" -ForegroundColor Cyan
Write-Host "  Admin:    admin@lextiming.com      / admin123"
Write-Host "  Manager:  maria@lextiming.com      / manager123"
Write-Host "  Manager:  andrei@lextiming.com     / manager123"
Write-Host "  Employee: ion@lextiming.com        / employee123"
Write-Host "  Employee: elena@lextiming.com      / employee123"
Write-Host "  Employee: george@lextiming.com     / employee123"
Write-Host "  Employee: ana@lextiming.com        / employee123"
Write-Host "  Employee: mihai@lextiming.com      / employee123"
Write-Host "  Employee: diana@lextiming.com      / employee123"
Write-Host ""
Write-Host "Schedules:" -ForegroundColor Cyan
Write-Host "  Fix 9-17:               Admin, HR (Maria, Ion, Elena, George)"
Write-Host "  Fereastra 8-10 > 16-18: Engineering (Andrei, Ana, Mihai)"
Write-Host "  Flexibil (min 6h):      Diana (remote)"
Write-Host ""

npm run dev:quick

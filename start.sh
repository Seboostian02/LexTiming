#!/bin/bash

# Parse arguments
QUICK=false
for arg in "$@"; do
    case $arg in
        --quick|-q) QUICK=true ;;
    esac
done

echo -e "\033[36m=== LexTiming - Employee Time Tracking ===\033[0m"
if [ "$QUICK" = true ]; then
    echo -e "\033[90m    Mode: QUICK (skip lint, tests, fresh seed)\033[0m"
else
    echo -e "\033[90m    Mode: FULL (lint + test + fresh seed)\033[0m"
fi
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "\033[31mERROR: Docker is not installed. Please install Docker Desktop from https://docker.com\033[0m"
    exit 1
fi

# Check Docker is running
if ! docker info &> /dev/null; then
    echo -e "\033[31mERROR: Docker Desktop is not running. Please start Docker Desktop and try again.\033[0m"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "\033[31mERROR: Node.js is not installed. Please install Node.js 18+ from https://nodejs.org\033[0m"
    exit 1
fi

echo -e "\033[90mNode.js version: $(node --version)\033[0m"

if [ "$QUICK" = true ]; then
    # ── QUICK MODE: skip lint, tests, DB setup ──
    echo ""
    echo -e "\033[33m[1/2] Starting Prisma Studio (database UI)...\033[0m"
    npx prisma studio &
    echo -e "\033[32m  Prisma Studio: http://localhost:5555\033[0m"

    echo -e "\033[33m[2/2] Starting development server...\033[0m"
    echo ""
    echo -e "\033[32mApplication ready at: http://localhost:3000\033[0m"
    echo -e "\033[32mDatabase UI at:       http://localhost:5555\033[0m"
    echo ""
    npm run dev:quick
    exit
fi

# ── FULL MODE: lint → test → fresh seed → dev ──

step=1
total=9

echo -e "\033[33m[$step/$total] Installing dependencies...\033[0m"
npm install
step=$((step + 1))

echo -e "\033[33m[$step/$total] Running linter...\033[0m"
npm run lint
if [ $? -ne 0 ]; then
    echo -e "\033[31mLINT FAILED. Fix errors before starting.\033[0m"
    exit 1
fi
echo -e "\033[32m  Lint passed.\033[0m"
step=$((step + 1))

echo -e "\033[33m[$step/$total] Running tests...\033[0m"
npm run test
if [ $? -ne 0 ]; then
    echo -e "\033[31mTESTS FAILED. Fix errors before starting.\033[0m"
    exit 1
fi
echo -e "\033[32m  All tests passed.\033[0m"
step=$((step + 1))

echo -e "\033[33m[$step/$total] Starting PostgreSQL container...\033[0m"
docker compose up -d
echo -e "\033[90m  Waiting for PostgreSQL to be healthy...\033[0m"
retries=0
while [ $retries -lt 30 ]; do
    health=$(docker inspect --format='{{.State.Health.Status}}' lextiming-db-1 2>/dev/null)
    if [ "$health" = "healthy" ]; then break; fi
    sleep 1
    retries=$((retries + 1))
done
if [ $retries -ge 30 ]; then
    echo -e "\033[31mERROR: PostgreSQL failed to start. Run 'docker compose logs db' for details.\033[0m"
    exit 1
fi
echo -e "\033[32m  PostgreSQL is ready.\033[0m"
step=$((step + 1))

echo -e "\033[33m[$step/$total] Generating Prisma client...\033[0m"
npx prisma generate
step=$((step + 1))

echo -e "\033[33m[$step/$total] Running database migrations...\033[0m"
npx prisma migrate deploy
step=$((step + 1))

echo -e "\033[33m[$step/$total] Fresh seeding database...\033[0m"
npx prisma db seed -- --force
step=$((step + 1))

echo ""
echo -e "\033[33m[$step/$total] Starting Prisma Studio (database UI)...\033[0m"
npx prisma studio &
echo -e "\033[32m  Prisma Studio: http://localhost:5555\033[0m"
step=$((step + 1))

echo -e "\033[33m[$step/$total] Starting development server...\033[0m"
echo ""
echo -e "\033[32mApplication ready at: http://localhost:3000\033[0m"
echo -e "\033[32mDatabase UI at:       http://localhost:5555\033[0m"
echo ""
echo -e "\033[36mDemo accounts:\033[0m"
echo "  Admin:    admin@lextiming.com      / admin123"
echo "  Manager:  maria@lextiming.com      / manager123"
echo "  Manager:  andrei@lextiming.com     / manager123"
echo "  Employee: ion@lextiming.com        / employee123"
echo "  Employee: elena@lextiming.com      / employee123"
echo "  Employee: george@lextiming.com     / employee123"
echo "  Employee: ana@lextiming.com        / employee123"
echo "  Employee: mihai@lextiming.com      / employee123"
echo "  Employee: diana@lextiming.com      / employee123"
echo ""
echo -e "\033[36mSchedules:\033[0m"
echo "  Fix 9-17:               Admin, HR (Maria, Ion, Elena, George)"
echo "  Fereastra 8-10 > 16-18: Engineering (Andrei, Ana, Mihai)"
echo "  Flexibil (min 6h):      Diana (remote)"
echo ""

npm run dev:quick

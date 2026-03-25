@echo off
REM ============================================================
REM  VyManager Development Start Script
REM  Starts: PostgreSQL (Docker) + Backend (uvicorn) + Frontend (Next.js)
REM ============================================================

echo ============================================
echo   VyManager Dev Environment
echo ============================================

REM --- Resolve project root (handles spaces in path) ---
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
set "VENV_ACTIVATE=%PROJECT_ROOT%\.venv\Scripts\activate.bat"

REM --- Activate Python virtual environment ---
echo.
echo [0/4] Activating Python virtual environment...
if exist "%VENV_ACTIVATE%" (
    call "%VENV_ACTIVATE%"
    echo       Activated .venv
) else (
    echo       WARNING: .venv not found at %PROJECT_ROOT%\.venv
    echo       Backend may fail if dependencies are not installed globally.
)

REM --- PostgreSQL via Docker ---
echo.
echo [1/4] Starting PostgreSQL...
docker container inspect vymanager-postgres-dev >nul 2>&1
if %errorlevel% equ 0 (
    echo       Container exists, ensuring it is running...
    docker start vymanager-postgres-dev >nul 2>&1
) else (
    echo       Creating new PostgreSQL container...
    docker run -d --name vymanager-postgres-dev ^
        -e POSTGRES_USER=vymanager ^
        -e POSTGRES_PASSWORD=vymanager_secure_password ^
        -e POSTGRES_DB=vymanager_auth ^
        -p 5432:5432 ^
        postgres:16-alpine
)

echo       Waiting for PostgreSQL to accept connections...
:wait_pg
docker exec vymanager-postgres-dev pg_isready -U vymanager -d vymanager_auth >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 2 /nobreak >nul
    goto wait_pg
)
echo       PostgreSQL is ready.

REM --- Prisma migrations ---
echo.
echo [2/4] Running Prisma migrations...
pushd frontend
set DATABASE_URL=postgresql://vymanager:vymanager_secure_password@localhost:5432/vymanager_auth
call npx prisma migrate deploy
call npx prisma generate
popd

REM --- Override Docker-internal hostnames for local dev ---
set "DATABASE_URL=postgresql://vymanager:vymanager_secure_password@localhost:5432/vymanager_auth"
set "FRONTEND_URL=http://192.168.20.219:3000"
set "BACKEND_URL=http://localhost:8000"

REM --- Load backend secrets from backend\.env ---
REM The backend does NOT use python-dotenv, so we must pass these as env vars.
for /f "usebackq tokens=1,* delims==" %%A in ("%PROJECT_ROOT%\backend\.env") do (
    if not "%%A"=="" if not "%%A:~0,1%"=="#" (
        set "%%A=%%B"
    )
)
REM Re-apply local dev overrides (backend\.env has Docker hostnames)
set "DATABASE_URL=postgresql://vymanager:vymanager_secure_password@localhost:5432/vymanager_auth"
set "FRONTEND_URL=http://192.168.20.219:3000"
set "TRUSTED_ORIGINS=http://*:3000,http://localhost:3001"

REM --- Backend ---
echo.
echo [3/4] Starting Backend (FastAPI on :8000)...
start "VyManager Backend" cmd /k "call "%VENV_ACTIVATE%" && set "DATABASE_URL=postgresql://vymanager:vymanager_secure_password@localhost:5432/vymanager_auth" && set "FRONTEND_URL=http://localhost:3000" && set "TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3001" && set "BETTER_AUTH_SECRET=%BETTER_AUTH_SECRET%" && set "SSH_ENCRYPTION_KEY=%SSH_ENCRYPTION_KEY%" && cd /d "%PROJECT_ROOT%\backend" && python -m uvicorn app:app --host 0.0.0.0 --port 8000 --proxy-headers --reload"

REM Give the backend a moment to bind before the frontend starts
timeout /t 3 /nobreak >nul

REM --- Frontend ---
echo.
echo [4/4] Starting Frontend (Next.js on :3000)...
start "VyManager Frontend" cmd /k "set "DATABASE_URL=postgresql://vymanager:vymanager_secure_password@localhost:5432/vymanager_auth" && set "BACKEND_URL=http://localhost:8000" && set "BETTER_AUTH_SECRET=%BETTER_AUTH_SECRET%" && cd /d "%PROJECT_ROOT%\frontend" && npm run dev"

echo.
echo ============================================
echo   All services started
echo.
echo   PostgreSQL : localhost:5432
echo   Backend    : http://localhost:8000
echo   Frontend   : http://localhost:3000
echo ============================================
echo.
echo   Stop: close the Backend / Frontend windows,
echo         then run: docker stop vymanager-postgres-dev
echo.

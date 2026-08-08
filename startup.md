# Hiring Platform Startup Guide (Step by Step)

This guide explains exactly how to start both backend and frontend locally on Windows PowerShell.

## 1) Open terminal in project root

Make sure your terminal is at:

```powershell
cd C:\Users\gupta\Hiring_platform
```

## 2) Start the backend (port 5001)

Open a new terminal tab/window and run:

```powershell
cd C:\Users\gupta\Hiring_platform\backend
npm install
if (-Not (Test-Path .env)) { Copy-Item .env.example .env }
npm run dev
```

Expected backend URL:
- http://localhost:5001

Health check:
- http://localhost:5001/api/v1/health

## 3) Start the frontend (port 3000)

Open another new terminal tab/window and run:

```powershell
cd C:\Users\gupta\Hiring_platform\frontend
npm install
npm run dev
```

Expected frontend URL:
- http://localhost:3000

## 4) Verify both are running

From any terminal, run:

```powershell
Get-NetTCPConnection -LocalPort 3000,5001 -State Listen |
  Select-Object LocalPort, OwningProcess, State |
  Sort-Object LocalPort
```

You should see both ports in `Listen` state.

## 5) Optional: database initialization

If your PostgreSQL is running and you want to initialize schema:

```powershell
cd C:\Users\gupta\Hiring_platform\backend
npm run db:init
```

## 6) Stop services

In the terminal where each app is running, press:

```text
Ctrl + C
```

## Notes

- If Redis/Postgres are not running locally, backend may log warnings depending on `.env` values.
- If port 3000 or 5001 is already in use, stop the existing process or change the app port in environment/config.

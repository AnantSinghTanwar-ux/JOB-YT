# Run Hiring Platform (Frontend + Backend)

Date verified: 2026-03-17
OS: Windows (PowerShell)

## 1. Open two PowerShell terminals

Open Terminal A for backend and Terminal B for frontend.

## 2. Start backend (Terminal A)

```powershell
cd C:\Users\gupta\Hiring_platform\backend
npm install
npm run dev
```

Backend runs on:
- http://localhost:5001

Backend health endpoint:
- http://localhost:5001/api/v1/health

## 3. Start frontend (Terminal B)

```powershell
cd C:\Users\gupta\Hiring_platform\frontend
npm install
npm run dev
```

Frontend runs on:
- http://localhost:3000

## 4. Verify both services are up

Open a third terminal and run:

```powershell
Get-NetTCPConnection -LocalPort 3000,5001 -State Listen |
  Select-Object LocalPort, OwningProcess, State |
  Sort-Object LocalPort
```

Expected:
- Port 3000 in Listen state
- Port 5001 in Listen state

## 5. Verify by HTTP requests

```powershell
Invoke-WebRequest http://localhost:5001/api/v1/health -UseBasicParsing | Select-Object StatusCode
Invoke-WebRequest http://localhost:3000 -UseBasicParsing | Select-Object StatusCode
```

Expected:
- StatusCode 200 for both commands

## 6. Stop both apps

In each running terminal, press:

```text
Ctrl + C
```

## Notes

- Backend may show Redis connection warnings if Redis is not running locally. The API can still start with current config (REQUIRE_DB=false in backend/.env).
- If you use Docker for infra, start services from backend folder with:

```powershell
cd C:\Users\gupta\Hiring_platform\backend
docker-compose up --build
```

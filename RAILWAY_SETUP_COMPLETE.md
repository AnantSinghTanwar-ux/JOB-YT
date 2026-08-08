# Railway Database Setup - Completion Guide

**Status:** Environment variables configured. Network connectivity pending.

## What Has Been Done

✅ Backend dependencies installed  
✅ Railway CLI installed and authenticated  
✅ Backend folder linked to Railway project: `heartfelt-trust`  
✅ Environment variables updated in `backend/.env`:
   - DATABASE_URL configured with Railway Postgres public endpoint
   - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD set to Railway values

## Current Blocker

The terminal environment cannot reach `postgres-production-1e0a.up.railway.app:5432`. This is temporary and likely due to:
- Public networking not fully enabled in Railway
- Network restrictions in this particular execution environment

## Final Steps to Complete Setup

### Option 1: Complete in Your Terminal (Recommended)

Run these commands from your Mac terminal in the `backend` folder:

```bash
cd /Users/sushant/Downloads/Hiring_platform/backend

# Run Prisma migrations
DATABASE_URL="postgresql://postgres:OZnoDHCFrsgQXKkTgPDrQBHvwdNBZAzn@postgres-production-1e0a.up.railway.app:5432/railway?sslmode=require" npx prisma migrate deploy

# Verify connection (optional)
DATABASE_URL="postgresql://postgres:OZnoDHCFrsgQXKkTgPDrQBHvwdNBZAzn@postgres-production-1e0a.up.railway.app:5432/railway?sslmode=require" npx prisma db execute --stdin < src/config/schema.sql
```

### Option 2: Use Railway CLI Tunnel (If public networking remains blocked)

In one terminal:
```bash
railway connect Postgres
```

In another terminal:
```bash
cd /Users/sushant/Downloads/Hiring_platform/backend
PGPASSWORD=OZnoDHCFrsgQXKkTgPDrQBHvwdNBZAzn psql -h localhost -U postgres -p 5432 -d railway -f create-extension.sql
DATABASE_URL="postgresql://postgres:OZnoDHCFrsgQXKkTgPDrQBHvwdNBZAzn@localhost:5432/railway" npx prisma migrate deploy
```

## Verification Checklist

Once migrations complete, verify with:

```bash
# Check if tables exist
PGPASSWORD=OZnoDHCFrsgQXKkTgPDrQBHvwdNBZAzn psql -h postgres-production-1e0a.up.railway.app -U postgres -p 5432 -d railway -c "\dt"

# Start backend (it should connect successfully)
npm run dev
```

## Railway Postgres Credentials

- **Host:** postgres-production-1e0a.up.railway.app
- **Port:** 5432
- **Database:** railway
- **User:** postgres
- **Password:** OZnoDHCFrsgQXKkTgPDrQBHvwdNBZAzn
- **Connection URL:** `postgresql://postgres:OZnoDHCFrsgQXKkTgPDrQBHvwdNBZAzn@postgres-production-1e0a.up.railway.app:5432/railway?sslmode=require`

## Pending Items

- [ ] Run `npx prisma migrate deploy` successfully
- [ ] Verify tables created in Railway Postgres
- [ ] Start backend and test API connection
- [ ] Rotate password after confirming everything works (optional but recommended for security)

---

**Generated:** 31 March 2026  
**Project:** heartfelt-trust  
**Environment:** Production

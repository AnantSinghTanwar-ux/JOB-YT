# Hiring Platform

A cloud-based two-sided hiring marketplace connecting job applicants with recruiters, featuring a built-in roadmap ingestion system.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, TypeScript, TailwindCSS |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL (primary), Redis (cache/sessions) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Storage | AWS S3 + CloudFront CDN |
| Payments | Stripe |
| Email | SendGrid |
| Real-time | Socket.io |

## Project Structure

```
Hiring_platform/
├── frontend/              # Next.js app (port 3000)
├── backend/               # Express REST API (port 5001)
│   ├── src/
│   │   ├── config/        # Database, Redis, Socket.io, migrations
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/     # Auth, error handling
│   │   ├── models/        # Database query models
│   │   ├── routes/        # API route definitions
│   │   ├── scripts/       # DB init, ingestion CLI, tests
│   │   ├── services/      # Business logic
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Shared utilities
│   ├── prisma/            # Prisma schema
│   ├── roadmap-api-collection.json  # Postman collection
│   └── ROADMAP_SYSTEM.md  # Roadmap system docs
├── Docs/                  # Project documentation
└── README.md
```

---

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 15+ (running locally or via Docker)
- **Redis** 7+ (optional — backend starts without it)

---

## Getting Started

### 1. Clone & Install

```bash
git clone <repo-url>
cd Hiring_platform
```

Install dependencies for both backend and frontend:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Configure Environment

#### Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
# Required
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hiring_platform
DB_USER=your_db_user
DB_PASSWORD=your_db_password
PORT=5001

# Required for auth
JWT_SECRET=your_jwt_secret_key_min_32_chars

# Optional (features degrade gracefully without these)
REDIS_HOST=localhost
REDIS_PORT=6379
SENDGRID_API_KEY=your_sendgrid_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
STRIPE_SECRET_KEY=your_stripe_secret_key
FRONTEND_URL=http://localhost:3000
# AI: Resume Builder (Grok / xAI)
# Set XAI_API_KEY to enable Grok forResume Builder AI features only.
# Example:
# XAI_API_KEY=your_xai_api_key
# XAI_MODEL=grok-1
```

#### Frontend

```bash
cd frontend
# Create .env.local if needed
echo "NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1" > .env.local
```

### 3. Initialize the Database

Make sure PostgreSQL is running, then create the database and run schemas:

```bash
# Create the database (if it doesn't exist)
createdb hiring_platform

# Initialize core tables
cd backend
npm run db:init
```

#### Run Roadmap System Migration

```bash
psql -h localhost -U your_db_user -d hiring_platform \
  -f src/config/migrations/004_create_roadmap_tables.sql
```

### 4. Seed Data (Optional)

```bash
cd backend
npm run db:seed
```

### 5. Start the Application

Open **two terminal windows**:

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
```

Backend starts at: **http://localhost:5001**

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Frontend starts at: **http://localhost:3000**

### 6. Verify

- Health check: http://localhost:5001/api/v1/health
- Frontend: http://localhost:3000

---

## Docker Compose (Alternative)

Run everything without local Node/Postgres/Redis:

```bash
cd backend
cp .env.example .env
docker-compose up --build
```

- Backend: http://localhost:5001
- Postgres and Redis start automatically
- Run `npm run db:init` once to apply the schema

### Resume Analyzer Service Integration

This repo supports integrating the FastAPI-based resume parser from [AI-Resume-Analyzer-main/AI-Resume-Analyzer-main](AI-Resume-Analyzer-main/AI-Resume-Analyzer-main).

1. Configure backend env values:

```env
PYTHON_RESUME_PARSER_URL=http://localhost:8000/parse
PYTHON_RESUME_PARSER_TIMEOUT_MS=8000
PYTHON_RESUME_PARSER_API_KEY=your_shared_parser_secret
```

2. Configure parser service env values (from [AI-Resume-Analyzer-main/AI-Resume-Analyzer-main/.env.example](AI-Resume-Analyzer-main/AI-Resume-Analyzer-main/.env.example)):

```env
RESUME_PARSER_API_KEY=your_shared_parser_secret
RESUME_PARSER_MAX_FILE_SIZE_BYTES=10485760
RESUME_PARSER_ALLOW_ONLY_PDF=true
```

3. Run parser locally:

```bash
cd AI-Resume-Analyzer-main/AI-Resume-Analyzer-main
pip install -r requirements-parser.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

4. Or run via docker-compose from [backend/docker-compose.yml](backend/docker-compose.yml), which now includes `resume-parser` and wires backend to it automatically.

### Kubernetes Deployment (Production)

Production manifests were added for the parser service:

1. Parser Deployment + Service + Secret:
  [backend/deploy/k8s/resume-parser.yaml](backend/deploy/k8s/resume-parser.yaml)
2. Backend deployment env patch for parser integration:
  [backend/deploy/k8s/backend-resume-parser-env.patch.yaml](backend/deploy/k8s/backend-resume-parser-env.patch.yaml)

Apply in order:

```bash
kubectl apply -f backend/deploy/k8s/resume-parser.yaml
kubectl apply -f backend/deploy/k8s/backend-resume-parser-env.patch.yaml
```

---

## Roadmap Ingestion System

The platform includes a roadmap ingestion pipeline that fetches developer roadmaps from [roadmap.sh](https://roadmap.sh), parses them, and stores them in the database.

### Run Ingestion

**Via CLI:**

```bash
cd backend

# Full ingestion (fetches & stores all roadmaps)
npm run roadmap:ingest

# Dry run (parse only, no DB writes)
npm run roadmap:ingest -- --dry-run
```

**Via API:**

```bash
# Full ingestion
curl -X POST http://localhost:5001/api/v1/roadmaps/ingest \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'

# Dry run
curl -X POST http://localhost:5001/api/v1/roadmaps/ingest \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

### Viewing Roadmaps in the Frontend
Once ingestion is complete, you can view the interactive roadmaps directly in the browser:
1. Ensure the frontend is running (`cd frontend && npm run dev`)
2. Log in (or just visit directly if placed in a public route)
3. Navigate to **Roadmaps** in the sidebar navigation or go to `http://localhost:3000/roadmaps`.
4. Click on any topic to see the interactive Zoom/Pan graph powered by React Flow.

### Intelligent Features (Skill Integration)
The system automatically maps an applicant's `skills` array to roadmap nodes.
- **Progress Tracking**: Completed nodes are visually highlighted in green on the Roadmap graph view.
- **Next-Skill Recommendation**: Features a Directed Acyclic Graph (DAG) traversal engine to recommend the most optimal next skill based on satisfied prerequisites and unlockable dependencies.
- **Idempotent Matcher**: Uses flexible formatting to match user skills against node titles dynamically.

### Roadmap API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/roadmaps` | List all roadmaps (paginated) |
| `GET` | `/api/v1/roadmaps/:id` | Get roadmap by UUID or slug |
| `GET` | `/api/v1/roadmaps/:id/nodes` | Get nodes and edges for a roadmap |
| `GET` | `/api/v1/users/:userId/roadmaps/:roadmapId/progress` | **[NEW]** Current user roadmap progress |
| `GET` | `/api/v1/users/:userId/roadmaps/:roadmapId/recommend-next-skill` | **[NEW]** Recommended next skill |
| `POST` | `/api/v1/roadmaps/ingest` | Trigger ingestion pipeline |
| `GET` | `/api/v1/roadmaps/ingestion/:id` | Get ingestion run status |

---

## API Reference

**Base URL:** `http://localhost:5001/api/v1`

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login |
| `GET` | `/users/me` | Current user profile |
| `GET` | `/jobs` | List jobs |
| `POST` | `/jobs` | Create job (recruiter) |
| `GET` | `/applications` | List applications |
| `POST` | `/applications` | Submit application |
| `GET` | `/credits/balance` | Credit balance |
| `GET` | `/notifications` | User notifications |
| `GET` | `/messages` | Conversations |

### Postman Collection

Import `backend/roadmap-api-collection.json` into Postman for ready-to-use requests with automated test scripts.

1. Open Postman → **Import** → Upload `roadmap-api-collection.json`
2. Set the `baseUrl` variable to `http://localhost:5001/api/v1`
3. Run the collection — all tests should pass

---

## Available Scripts

### Backend (`cd backend`)

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start with hot-reload |
| Build | `npm run build` | Compile TypeScript |
| Start | `npm run start` | Run compiled JS |
| DB Init | `npm run db:init` | Run core schema |
| DB Seed | `npm run db:seed` | Seed sample data |
| Roadmap Ingest | `npm run roadmap:ingest` | Run roadmap ingestion |
| Lint | `npm run lint` | Run ESLint |
| Format | `npm run format` | Run Prettier |
| Type Check | `npm run type-check` | TypeScript type check |

### Frontend (`cd frontend`)

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start Next.js dev server |
| Build | `npm run build` | Production build |
| Start | `npm run start` | Start production server |

---

## Delivery Roadmap

| Phase | Focus |
|-------|-------|
| Phase 1 | Infrastructure, Auth, RBAC, Credit ledger |
| Phase 2 | Profiles, Jobs, Payments, Referrals |
| Phase 3 | Applications, Messaging, Search, Notifications |
| Phase 4 | AI Matching, Analytics, Admin Dashboard |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend won't start | Check `.env` values, ensure PostgreSQL is running |
| Redis warnings | Redis is optional — backend runs without it |
| Port already in use | Change `PORT` in `.env` or kill existing process |
| DB tables missing | Run `npm run db:init` and the migration SQL files |
| Ingestion fails | Check network connectivity; loader retries automatically |

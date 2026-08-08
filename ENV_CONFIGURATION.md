# Environment Configuration Guide

## Frontend Configuration

The frontend uses environment variables for the backend API connection. This removes any hardcoded URLs from the source code.

### Files
- `.env.local` - Local development environment (used by `npm run dev`)
- `.env.development` - Development environment configuration template
- `.env.production` - Production environment configuration
- `.env.example` - Example file for reference

### Available Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | http://localhost:5001/api/v1 |
| `NEXT_PUBLIC_APP_URL` | Frontend application URL | http://localhost:3001 |

### Setup Instructions

1. **Development (Next.js will automatically load `.env.local`):**
   ```bash
   # Update .env.local with your backend URL
   NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
   ```

2. **Using Environment-Specific Files:**
   ```bash
   # For development
   npm run dev  # Uses .env.local or .env.development

   # For production build
   npm run build  # Reads .env.production
   ```

3. **Environment Variables are Injected at Build Time:**
   - All `NEXT_PUBLIC_*` variables are available in the browser
   - Build must be run after changing environment variables
   - Do not commit `.env.local` to version control

### Access in Code

Environment variables are accessed via the constants file:

```typescript
// frontend/src/constants/index.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
```

All API calls use this constant:
```typescript
// Example: frontend/src/lib/api.ts
const response = await fetch(`${API_BASE}/endpoint`);
```

---

## Backend Configuration

The backend also uses environment variables for database, Redis, JWT, and OAuth configuration.

### Files
- `.env` - Active environment file (used by Node.js)
- `.env.development` - Development configuration template
- `.env.production` - Production configuration template
- `.env.example` - Example file for reference

### Critical Variables for Development

```env
NODE_ENV=development
PORT=5001

# Database
DATABASE_URL="postgresql://postgres:subhro2004@localhost:5432/hiring_platform?sslmode=disable"

# Frontend URL (for CORS, redirects)
FRONTEND_URL=http://localhost:3001

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_chars

# OAuth (fill in with provider credentials)
GOOGLE_CLIENT_ID=
GOOGLE_AUTH_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:5001/auth/github/callback
```

### Setup Instructions

1. **Development Setup:**
   - Copy `.env.development` to `.env`
   - Update database credentials if needed
   - Add OAuth credentials (optional for initial testing)

2. **Production Setup:**
   - Copy `.env.production` to `.env`
   - Update all credentials and URLs
   - Use strong JWT_SECRET
   - Enable database SSL (`sslmode=require`)
   - Use production database host/credentials

### Loading Environment Variables

Node.js automatically loads `.env` file using a dotenv package. Ensure `process.env.VARIABLE_NAME` is used throughout the application.

---

## Full Stack Setup Checklist

- [ ] Frontend `.env.local` is created with correct `NEXT_PUBLIC_API_URL`
- [ ] Backend `.env` is created with database and JWT configuration
- [ ] Frontend dev server is running on port 3001
- [ ] Backend server is running on port 5001
- [ ] Database is accessible and migrations are run
- [ ] OAuth variables are configured (if using OAuth features)
- [ ] CORS is configured to accept requests from `FRONTEND_URL`
- [ ] `.env` and `.env.local` files are in `.gitignore` (not committed to version control)

---

## Common Issues

### API Returns 404 / CORS Error
- Check if `NEXT_PUBLIC_API_URL` matches the backend URL
- Verify backend CORS middleware includes `FRONTEND_URL` in allowed origins
- Ensure backend server is running

### Environment Variables Not Loading
- **Frontend:** Run `npm run dev` after creating `.env.local`
- **Backend:** Ensure `.env` file exists in the root directory
- **Next.js:** Build must be rerun after changing `NEXT_PUBLIC_*` variables

### Wrong URL in Production
- Verify `.env.production` has correct URLs before building
- Check that environment is set correctly during deployment
- Use `NEXT_PUBLIC_API_URL=your-prod-api-url npm run build`


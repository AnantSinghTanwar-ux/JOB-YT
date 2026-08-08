import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import learningRoutes from './routes/learning.routes';
import { errorHandler, notFound } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger.middleware';
import { apiActivityLogger } from './middleware/apiActivity';

const app = express();

// Required when running behind a reverse proxy (e.g. Railway) so client IPs are resolved correctly.
app.set('trust proxy', 1);

// Disable ETag-based caching in development to prevent 304 responses with stale data.
if (process.env.NODE_ENV !== 'production') {
  app.set('etag', false);
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  });
}

const allowedOrigins = new Set(
  [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://jobyt.in',
    'https://www.jobyt.in',
    process.env.FRONTEND_URL,
  ].filter((origin): origin is string => Boolean(origin && origin.trim()))
);

const isAllowedOrigin = (origin: string): boolean => {
  if (allowedOrigins.has(origin)) return true;

  // Allow Vercel deployments (preview + production domains).
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  // Allow Railway deployments
  if (/^https:\/\/[a-z0-9-]+\.up\.railway\.app$/i.test(origin)) {
    return true;
  }

  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser/server-to-server calls with no Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    // Do NOT throw an error. Returning false tells the cors middleware to not set the header, 
    // allowing the browser to handle the CORS failure naturally.
    callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

// Local resume/photo storage (STORAGE_TYPE=local); S3 URLs are absolute and do not use this
const storageType = (process.env.STORAGE_TYPE || 'local').toLowerCase();
if (storageType !== 's3') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Razorpay webhook requires raw request body for signature verification.
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// Body parsing for everything else
const jsonParser = express.json({ limit: '10mb' });
const urlencodedParser = express.urlencoded({ extended: true });

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/v1/payments/webhook')) {
    return next();
  }
  return jsonParser(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/v1/payments/webhook')) {
    return next();
  }
  return urlencodedParser(req, res, next);
});

// Structured request logging
app.use(requestLogger);
app.use(apiActivityLogger);

// Root welcome route
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Jobyt API Server',
    version: '1.0.0',
    status: 'running',
    docs: '/api/v1',
    health: '/api/v1/health',
  });
});

// API routes
app.use('/api/learning', learningRoutes);
app.use('/api/v1', routes);
app.use('/', routes);

// 404 & error handlers
app.use(notFound);
app.use(errorHandler);

export default app;

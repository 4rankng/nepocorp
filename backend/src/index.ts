import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initEnforcer } from './casbin/enforcer';
import { authMiddleware } from './middleware/auth';
import { casbinAuthz } from './middleware/casbin';
import { auditLogMiddleware } from './middleware/audit';
import { globalErrorHandler } from './middleware/errorHandler';
import { initAuditService } from './services/audit.service';
import authRoutes from './routes/auth';
import configRoutes, { auditLogRouter } from './routes/config';
import tripRoutes from './routes/trips';
import financialRoutes from './routes/financial';
import expenseRoutes from './routes/expense';
import driverRoutes from './routes/driver';
import { uploadRouter, photosRouter } from './routes/upload';
import mapsRoutes from './routes/maps';

await initAuditService();
await initEnforcer();

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: config.corsOrigin
    ? config.corsOrigin.split(',').map(s => s.trim())
    : config.nodeEnv === 'development'
      ? 'http://localhost:7173'
      : false,
}));
app.use(express.json());
app.use('/uploads', express.static(config.uploadDir));

// Inlined request logger (was middleware/logger.ts — too shallow for its own module)
const LOG_SKIP_PATHS = ['/api/health', '/uploads', '/favicon.ico'];
app.use((req, res, next) => {
  if (LOG_SKIP_PATHS.some(p => req.path.startsWith(p))) return next();
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.use(auditLogMiddleware);

// ── Public routes ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes: login is public, /me and /users use their own authMiddleware
app.use('/api/auth', authRoutes);

// ── Protected routes (auth + Casbin) — specific paths first, catch-all /api last
app.use('/api/driver/me', authMiddleware, casbinAuthz('driver_portal'), driverRoutes);
app.use('/api/maps', authMiddleware, casbinAuthz('maps'), mapsRoutes);
app.use('/api/photos', authMiddleware, casbinAuthz('photos'), photosRouter);
app.use('/api/upload', authMiddleware, casbinAuthz('upload'), uploadRouter);
app.use('/api/trips', authMiddleware, casbinAuthz('trips'), tripRoutes);
app.use('/api', authMiddleware, casbinAuthz('financial'), financialRoutes);
app.use('/api/expenses', authMiddleware, casbinAuthz('financial'), expenseRoutes);
app.use('/api/audit-logs', authMiddleware, casbinAuthz('audit_logs'), auditLogRouter);
app.use('/api', authMiddleware, casbinAuthz('config'), configRoutes);

// ── Global error handler (MUST be last) ────────────────────────────────────
app.use(globalErrorHandler);

app.listen(config.port, () => {
  console.log(`NEPO API running on port ${config.port} [${config.nodeEnv}]`);
});

export default app;

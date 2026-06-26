import express from 'express';
import cors from 'cors';
import { config } from './config';
import { client as dbClient } from './db';
import { disconnectRedis } from './lib/redis';
import { initEnforcer } from './casbin/enforcer';
import { authMiddleware, assetAuthMiddleware } from './middleware/auth';
import { casbinAuthz } from './middleware/casbin';
import { auditLogMiddleware } from './middleware/audit';
import { globalErrorHandler } from './middleware/errorHandler';
import { initAuditService } from './services/audit.service';
import { initNotificationService } from './services/notification.service';
import { initPushService } from './services/push.service';
import authRoutes from './routes/auth';
import configRoutes, { auditLogRouter, catalogBootstrapRouter, salaryPeriodsRouter, salaryPeriodsAdminRouter, tireLifecycleRouter } from './routes/config';
import tripRoutes from './routes/trips';
import { agentRoutes } from './routes/agent';
import { initAgentSocket } from './agentSocket';
import financialRoutes from './routes/financial';
import expenseRoutes from './routes/expense';
import driverRoutes from './routes/driver';
import forwarderRoutes from './routes/forwarder';
import forwarderAdminRoutes from './routes/forwarder-admin';
import adminGpsRoutes from './routes/admin-gps';
import { uploadRouter, photosRouter } from './routes/upload';
import ocrRoutes from './routes/ocr';
import mapsRoutes from './routes/maps';
import notificationRoutes from './routes/notifications';
import salaryRoutes from './routes/salary';

await initAuditService();
await initNotificationService();
await initPushService();
await initEnforcer();

// Enable unaccent extension
try {
  await dbClient`CREATE EXTENSION IF NOT EXISTS unaccent;`;
  console.log('PostgreSQL unaccent extension initialized successfully.');
} catch (e) {
  console.error('Failed to initialize unaccent extension:', e);
}

const app = express();

// Honour X-Forwarded-For from the reverse proxy in front of us (nginx in
// prod). Without this, `req.ip` returns the Docker bridge IP (e.g.
// 172.18.0.1) and audit logs capture that instead of the real client IP.
// Configurable via TRUST_PROXY env (number of hops, or true/false); defaults
// to 1 in production, false in dev. MUST be set before any middleware that
// reads `req.ip`.
app.set('trust proxy', config.trustProxy);

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
// Resolve endpoint for salary periods (defaults, overrides) — accessible to all authenticated users
app.use('/api/salary-periods', authMiddleware, salaryPeriodsRouter);
// Admin CRUD for salary periods (defaults, overrides) — config authz
app.use('/api/salary-periods', authMiddleware, casbinAuthz('config'), salaryPeriodsAdminRouter);
app.use('/api/driver/me', authMiddleware, casbinAuthz('driver_portal'), driverRoutes);
app.use('/api/forwarder/me', authMiddleware, casbinAuthz('forwarder_portal'), forwarderRoutes);
app.use('/api/forwarder-expenses', authMiddleware, casbinAuthz('financial'), forwarderAdminRoutes);
// GPS route-DB admin (backfill + recapture) — MANAGER/ADMIN only (gps-admin action).
app.use('/api/admin/gps', authMiddleware, casbinAuthz('gps-admin'), adminGpsRoutes);
app.use('/api/maps', authMiddleware, casbinAuthz('maps'), mapsRoutes);
app.use('/api/photos', assetAuthMiddleware, casbinAuthz('photos'), photosRouter);
app.use('/api/upload', authMiddleware, casbinAuthz('upload'), uploadRouter);
// OCR (container/seal recognition) — must mount before the catch-all /api
app.use('/api/ocr', authMiddleware, casbinAuthz('ocr'), ocrRoutes);
app.use('/api/notifications', authMiddleware, casbinAuthz('notifications'), notificationRoutes);
app.use('/api/trips', authMiddleware, casbinAuthz('trips'), tripRoutes);
// Command-and-insight assistant (bot). Acts as the caller; office roles only.
// 503 while BOT_ENABLE is off. Mounts before the catch-all /api.
app.use('/api/agent', authMiddleware, casbinAuthz('agent'), agentRoutes);
// Catalog bootstrap is used by both office pages and portal forms. The router
// trims sensitive catalogs for DRIVER/FORWARDER before responding.
app.use('/api', authMiddleware, catalogBootstrapRouter);
// Config must mount before the generic /api financial catch-all,
// otherwise financial Casbin gate blocks FORWARDER from /catalogs/bootstrap etc.
app.use('/api', authMiddleware, casbinAuthz('config'), configRoutes);
app.use('/api', authMiddleware, casbinAuthz('financial'), financialRoutes);
app.use('/api/expenses', authMiddleware, casbinAuthz('financial'), expenseRoutes);
app.use('/api/audit-logs', authMiddleware, casbinAuthz('audit_logs'), auditLogRouter);
// N1 — tire lifecycle (install/remove). CRUD lives under the config catch-all
// at /api/fleet/tires; these dedicated endpoints need the same auth + config
// gating + MANAGER/ADMIN role (enforced inside the router).
app.use('/api/fleet/tires', authMiddleware, casbinAuthz('config'), tireLifecycleRouter);
app.use('/api/salary', authMiddleware, casbinAuthz('salary'), salaryRoutes);

// ── 404 catch-all (before error handler so unmatched API routes get 404, not 500) ──
app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy API' }));

// ── Global error handler (MUST be last) ────────────────────────────────────
app.use(globalErrorHandler);

const server = app.listen(config.port, () => {
  console.log(`NEPO API running on port ${config.port} [${config.nodeEnv}]`);
});

// Command-and-insight assistant real-time transport. Attached to the same
// http.Server Express uses; returns null when the bot is disabled.
const agentIo = initAgentSocket(server);

// ── Graceful shutdown (tsx watch sends SIGTERM on restart) ─────────────────
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} received — shutting down…`);

  agentIo?.close();              // stop the assistant socket.io server
  server.close();                // stop accepting new connections
  await dbClient.end();          // drain Postgres pool
  await disconnectRedis();       // close Redis connection
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export default app;

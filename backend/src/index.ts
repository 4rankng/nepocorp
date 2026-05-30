import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initEnforcer } from './casbin/enforcer';
import { requestLogger } from './middleware/logger';
import { authMiddleware } from './middleware/auth';
import { casbinAuthz } from './middleware/casbin';
import { auditLogMiddleware } from './middleware/audit';
import { globalErrorHandler } from './middleware/errorHandler';
import { initAuditService } from './services/audit.service';
import authRoutes from './routes/auth';
import configRoutes from './routes/config';
import tripRoutes from './routes/trips';
import financialRoutes from './routes/financial';
import driverRoutes from './routes/driver';
import { uploadRouter, photosRouter } from './routes/upload';
import mapsRoutes from './routes/maps';

await initAuditService();
await initEnforcer();

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: config.nodeEnv === 'development' ? 'http://localhost:7173' : false,
}));
app.use(express.json());
app.use('/uploads', express.static(config.uploadDir));
app.use(requestLogger);
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
app.use('/api', authMiddleware, casbinAuthz('config'), configRoutes);

// ── Global error handler (MUST be last) ────────────────────────────────────
app.use(globalErrorHandler);

app.listen(config.port, () => {
  console.log(`NEPO API running on port ${config.port} [${config.nodeEnv}]`);
});

export default app;

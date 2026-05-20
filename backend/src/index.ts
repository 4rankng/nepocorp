import express from 'express';
import cors from 'cors';
import { config } from './config';
import { auditLogMiddleware } from './middleware/audit';
import { initAuditService } from './services/audit.service';
import authRoutes from './routes/auth';
import configRoutes from './routes/config';
import tripRoutes from './routes/trips';
import financialRoutes from './routes/financial';
import driverRoutes from './routes/driver';
import uploadRoutes from './routes/upload';

initAuditService();

const app = express();

app.use(cors({
  origin: config.nodeEnv === 'development' ? 'http://localhost:7173' : false,
}));
app.use(express.json());
app.use('/uploads', express.static(config.uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Audit logging (must be before routes to intercept res.end)
app.use(auditLogMiddleware);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api', configRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api', financialRoutes);
app.use('/api/driver/me', driverRoutes);
app.use('/api/upload', uploadRoutes);

app.listen(config.port, () => {
  console.log(`NEPO API running on port ${config.port} [${config.nodeEnv}]`);
});

export default app;

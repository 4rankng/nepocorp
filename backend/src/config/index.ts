import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const configSchema = z.object({
  port: z.coerce.number().int().positive().default(3001),
  databaseUrl: z.string().url().min(1),
  redisUrl: z.string().min(1),
  jwtSecret: z.string().min(isProd ? 32 : 1),
  jwtExpiresIn: z.string().default('7d'),
  uploadDir: z.string().default('./uploads'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  googleMapsApiKey: z.string().default(''),
  corsOrigin: z.string().default(''),
});

const raw = {
  port: process.env.PORT,
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  uploadDir: process.env.UPLOAD_DIR,
  nodeEnv: process.env.NODE_ENV,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  corsOrigin: process.env.CORS_ORIGIN,
};

// Provide dev-only defaults for values not marked as required in production
const withDefaults = {
  ...raw,
  port: raw.port || '3001',
  databaseUrl: raw.databaseUrl || (isProd ? undefined : 'postgres://postgres:postgres@localhost:5432/nepocorp'),
  redisUrl: raw.redisUrl || (isProd ? undefined : 'redis://localhost:6390'),
  jwtSecret: raw.jwtSecret || (isProd ? undefined : 'dev-secret-change-in-production'),
  jwtExpiresIn: raw.jwtExpiresIn || '7d',
  uploadDir: raw.uploadDir || './uploads',
  nodeEnv: raw.nodeEnv || 'development',
  googleMapsApiKey: raw.googleMapsApiKey || '',
  corsOrigin: raw.corsOrigin || '',
};

const result = configSchema.safeParse(withDefaults);

if (!result.success) {
  console.error('❌ Invalid configuration:');
  for (const issue of result.error.issues) {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  }
  if (isProd) {
    console.error('\nMissing or invalid environment variables. Exiting.');
    process.exit(1);
  }
  // In development, log warnings but continue with defaults
  console.warn('⚠️  Running with defaults — fix before deploying!');
}

export const config = result.success ? result.data : configSchema.parse({
  port: 3001,
  databaseUrl: 'postgres://postgres:postgres@localhost:5432/nepocorp',
  redisUrl: 'redis://localhost:6390',
  jwtSecret: 'dev-secret-change-in-production',
  jwtExpiresIn: '7d',
  uploadDir: './uploads',
  nodeEnv: 'development',
  googleMapsApiKey: '',
  corsOrigin: '',
});

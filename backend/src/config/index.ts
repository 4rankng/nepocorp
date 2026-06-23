import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ override: true });

const isProd = process.env.NODE_ENV === 'production';

// Default VAPID subject (RFC 8030 "from" contact). Single source — referenced
// by the schema default, the dev fallback, and the parse-failure recovery below.
const VAPID_SUBJECT_DEFAULT = 'mailto:admin@tingting.vip';

// Express `trust proxy` setting — controls how `req.ip` reads X-Forwarded-For.
// Number = hop count (typical: 1 when a single reverse proxy like nginx sits
// in front), boolean = trust all / trust none. Default 1 in production, false
// in dev. WITHOUT THIS, `req.ip` returns the Docker bridge address (e.g.
// 172.18.0.1) instead of the real client IP, which breaks audit logging.
const trustProxySchema = z.union([z.boolean(), z.number().int().nonnegative()]);

function parseTrustProxy(raw: string | undefined): boolean | number {
  if (raw === undefined || raw === '') return isProd ? 1 : false;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 0) return n;
  // Fall back to safe default if the env value is bogus.
  return isProd ? 1 : false;
}

const configSchema = z.object({
  port: z.coerce.number().int().positive().default(3001),
  databaseUrl: z.string().url().min(1),
  redisUrl: z.string().min(1),
  jwtSecret: z.string().min(isProd ? 32 : 1),
  jwtExpiresIn: z.string().default('7d'),
  uploadDir: z.string().default('./uploads'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  googleMapsApiKey: z.string().default(''),
  geminiApiKey: z.string().default(''),
  // Bách Khoa GPS provider (dvbk.vn) — live vehicle positions. Optional; the
  // live-fleet endpoint degrades to an empty result when these are unset.
  // HTTPS base avoids sending credentials over plaintext (host redirects HTTP→HTTPS).
  bachKhoaApiUrl: z.string().url().default('https://dvbk.vn/BachKhoaAPI/'),
  bachKhoaUsername: z.string().default(''),
  bachKhoaPassword: z.string().default(''),
  bachKhoaTimeoutMs: z.coerce.number().int().positive().default(8000),
  // Which source to read live positions from:
  //  - 'auto'   : try the public API; on empty/access-denied, fall back to the portal (default)
  //  - 'api'    : documented /BachKhoaAPI/GetInfoCar only (needs vendor API-gateway access)
  //  - 'portal' : web-portal /Home/get_AllTIBase only (session-cookie login)
  bachKhoaProvider: z.enum(['auto', 'api', 'portal']).default('auto'),
  corsOrigin: z.string().default(''),
  trustProxy: trustProxySchema.default(isProd ? 1 : false),
  // Web Push (VAPID). Optional — push silently no-ops when these are empty.
  vapidPublicKey: z.string().default(''),
  vapidPrivateKey: z.string().default(''),
  vapidSubject: z.string().default(VAPID_SUBJECT_DEFAULT),
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
  geminiApiKey: process.env.GEMINI_API_KEY,
  bachKhoaApiUrl: process.env.BACH_KHOA_API_URL,
  bachKhoaUsername: process.env.BACH_KHOA_USERNAME,
  bachKhoaPassword: process.env.BACH_KHOA_PASSWORD,
  bachKhoaTimeoutMs: process.env.BACH_KHOA_TIMEOUT_MS,
  bachKhoaProvider: process.env.BACH_KHOA_PROVIDER,
  corsOrigin: process.env.CORS_ORIGIN,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: process.env.VAPID_SUBJECT,
};

// Provide dev-only defaults for values not marked as required in production
const withDefaults = {
  ...raw,
  port: raw.port || '3001',
  databaseUrl: raw.databaseUrl || (isProd ? undefined : 'postgres://postgres:postgres@localhost:5432/tingting'),
  redisUrl: raw.redisUrl || (isProd ? undefined : 'redis://localhost:6390'),
  jwtSecret: raw.jwtSecret || (isProd ? undefined : 'dev-secret-change-in-production'),
  jwtExpiresIn: raw.jwtExpiresIn || '7d',
  uploadDir: raw.uploadDir || './uploads',
  nodeEnv: raw.nodeEnv || 'development',
  googleMapsApiKey: raw.googleMapsApiKey || '',
  geminiApiKey: raw.geminiApiKey || '',
  bachKhoaApiUrl: raw.bachKhoaApiUrl || 'https://dvbk.vn/BachKhoaAPI/',
  bachKhoaUsername: raw.bachKhoaUsername || '',
  bachKhoaPassword: raw.bachKhoaPassword || '',
  bachKhoaTimeoutMs: raw.bachKhoaTimeoutMs || 8000,
  bachKhoaProvider: raw.bachKhoaProvider || 'auto',
  corsOrigin: raw.corsOrigin || '',
  trustProxy: raw.trustProxy,
  vapidPublicKey: raw.vapidPublicKey || '',
  vapidPrivateKey: raw.vapidPrivateKey || '',
  vapidSubject: raw.vapidSubject || VAPID_SUBJECT_DEFAULT,
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
  databaseUrl: 'postgres://postgres:postgres@localhost:5432/tingting',
  redisUrl: 'redis://localhost:6390',
  jwtSecret: 'dev-secret-change-in-production',
  jwtExpiresIn: '7d',
  uploadDir: './uploads',
  nodeEnv: 'development',
  googleMapsApiKey: '',
  geminiApiKey: '',
  bachKhoaApiUrl: 'https://dvbk.vn/BachKhoaAPI/',
  bachKhoaUsername: '',
  bachKhoaPassword: '',
  bachKhoaTimeoutMs: 8000,
  bachKhoaProvider: 'auto',
  corsOrigin: '',
  trustProxy: false,
  vapidPublicKey: '',
  vapidPrivateKey: '',
  vapidSubject: VAPID_SUBJECT_DEFAULT,
});

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nepocorp',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6390',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  nodeEnv: process.env.NODE_ENV || 'development',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '',
};

import { z } from 'zod';
import { BaseEntitySchema, UserRoleSchema, ApiResponseSchema } from './common.schemas';

// User schema
export const UserSchema = BaseEntitySchema.extend({
  username: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: UserRoleSchema,
  is_active: z.boolean(),
});

// Request schemas
export const LoginRequestSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

// Response schemas
export const LoginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: UserSchema,
});

export const RefreshTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
});

// API response schemas
export const LoginApiResponseSchema = ApiResponseSchema(LoginResponseSchema);
export const RefreshTokenApiResponseSchema = ApiResponseSchema(RefreshTokenResponseSchema);
export const ProfileApiResponseSchema = ApiResponseSchema(UserSchema);

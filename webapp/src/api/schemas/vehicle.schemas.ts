import { z } from 'zod';
import { AuditableEntitySchema, ApiResponseSchema } from './common.schemas';

// Vehicle schemas
export const TractorSchema = AuditableEntitySchema.extend({
  license_plate: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean(),
});

export const TrailerSchema = AuditableEntitySchema.extend({
  license_plate: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean(),
});

export const ContainerSchema = AuditableEntitySchema.extend({
  container_number: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean(),
});

// Request schemas
export const CreateTractorRequestSchema = z.object({
  license_plate: z.string().min(1, 'License plate is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const UpdateTractorRequestSchema = CreateTractorRequestSchema.partial();

export const CreateTrailerRequestSchema = z.object({
  license_plate: z.string().min(1, 'License plate is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const UpdateTrailerRequestSchema = CreateTrailerRequestSchema.partial();

export const CreateContainerRequestSchema = z.object({
  container_number: z.string().min(1, 'Container number is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const UpdateContainerRequestSchema = CreateContainerRequestSchema.partial();

// API response schemas
export const TractorsApiResponseSchema = ApiResponseSchema(z.array(TractorSchema));
export const TractorApiResponseSchema = ApiResponseSchema(TractorSchema);
export const TrailersApiResponseSchema = ApiResponseSchema(z.array(TrailerSchema));
export const TrailerApiResponseSchema = ApiResponseSchema(TrailerSchema);
export const ContainersApiResponseSchema = ApiResponseSchema(z.array(ContainerSchema));
export const ContainerApiResponseSchema = ApiResponseSchema(ContainerSchema);
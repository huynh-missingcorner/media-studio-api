import { registerAs } from '@nestjs/config';
import { z } from 'zod';

export const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRATION: z.string().regex(/^\d+[smhd]$/),
  JWT_REFRESH_EXPIRATION: z.string().regex(/^\d+[smhd]$/),
  JWT_REFRESH_SECRET: z.string().min(32),
  INVITE_CODE: z.string(),

  // GOOGLE VERTEX AI
  VERTEX_AI_LOCATION: z.string(),
  VERTEX_AI_PROJECT_ID: z.string(),
  VERTEX_AI_MODEL_ID: z.string(),
  VERTEX_AI_STORAGE_URI: z.string().url(),

  // GOOGLE CLOUD STORAGE
  GCS_SIGNED_URL_EXPIRATION_HOURS: z.coerce.number().default(24),

  // REDIS
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number(),
  REDIS_PASSWORD: z.string(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export default registerAs('env', () => {
  const config = envSchema.parse(process.env);
  return config;
});

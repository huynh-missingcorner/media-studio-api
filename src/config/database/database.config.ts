import { registerAs } from '@nestjs/config';
import { z } from 'zod';

export const databaseConfigSchema = z.object({
  pool: z.object({
    min: z.number().min(0).default(5),
    max: z.number().min(1).default(20),
    idleTimeoutMillis: z.number().min(0).default(60000),
  }),
  retry: z.object({
    maxAttempts: z.number().min(1).default(3),
    backoff: z.number().min(0).default(1000),
  }),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

const defaultConfig: DatabaseConfig = {
  pool: {
    min: 5,
    max: 20,
    idleTimeoutMillis: 60000,
  },
  retry: {
    maxAttempts: 3,
    backoff: 1000,
  },
};

export default registerAs('database', () => {
  const config = databaseConfigSchema.parse(defaultConfig);
  return config;
});

import { ValidationPipeOptions } from '@nestjs/common';
import { registerAs } from '@nestjs/config';
import { z } from 'zod';

export const validationConfigSchema = z.object({
  transform: z.boolean().default(true),
  whitelist: z.boolean().default(true),
  forbidNonWhitelisted: z.boolean().default(true),
  forbidUnknownValues: z.boolean().default(true),
  validationError: z.object({
    target: z.boolean().default(false),
    value: z.boolean().default(false),
  }),
});

export type ValidationConfig = z.infer<typeof validationConfigSchema>;

const defaultConfig: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  validationError: {
    target: false,
    value: false,
  },
};

export default registerAs('validation', () => {
  const config = validationConfigSchema.parse(defaultConfig);
  return config;
});

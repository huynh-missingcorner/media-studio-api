import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { envSchema } from './env/env.config';
import env from './env/env.config';
import database from './database/database.config';
import validation from './validation/validation.config';
import { ZodError } from 'zod';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [env, database, validation],
      validate: (config) => {
        try {
          return envSchema.parse(config);
        } catch (error: unknown) {
          if (error instanceof ZodError) {
            throw new Error(`Configuration validation failed: ${error.message}`);
          }
          throw new Error(`Configuration validation failed: ${String(error)}`);
        }
      },
    }),
  ],
})
export class ConfigModule {}

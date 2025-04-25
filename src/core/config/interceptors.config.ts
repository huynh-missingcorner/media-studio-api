import { INestApplication } from '@nestjs/common';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';

export function setupGlobalInterceptors(app: INestApplication): void {
  app.useGlobalInterceptors(new LoggingInterceptor());
}

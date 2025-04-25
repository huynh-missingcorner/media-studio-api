import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import validationConfig from './config/validation/validation.config';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { setupGlobalInterceptors } from './core/config/interceptors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for REST API and WebSockets
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Apply global validation pipe
  app.useGlobalPipes(new ValidationPipe(validationConfig()));

  // Apply global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Apply global interceptors
  setupGlobalInterceptors(app);

  // Set up Swagger documentation
  const configSwagger = new DocumentBuilder()
    .setTitle('Vertex AI Media Generation API')
    .setDescription('API for the Vertex AI Media Generation wrapper')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API documentation available at: http://localhost:${port}/api/docs`);
  console.log(`🔌 WebSocket server is running on: ws://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap the application:', error);
  process.exit(1);
});

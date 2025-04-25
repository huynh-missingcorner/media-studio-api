import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Express } from 'express';
import { PrismaTestService } from '../prisma-test.service';
import { GoogleCloudService } from '../../src/shared/infrastructure/google-cloud/google-cloud.service';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

interface TestAppContext {
  app: INestApplication<Express>;
  prismaService: PrismaService;
  jwtService: JwtService;
  configService: ConfigService;
}

interface TestUser {
  user: User;
  accessToken: string;
}

export const createTestApp = async (overrides = {}): Promise<TestAppContext> => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
    providers: [
      {
        provide: PrismaService,
        useClass: PrismaTestService,
      },
    ],
  })
    .overrideProvider(GoogleCloudService)
    .useValue({
      getAccessToken: jest.fn().mockImplementation((projectId) => {
        if (projectId === 'valid-google-project-id' || projectId === 'test-google-project-id') {
          return Promise.resolve('valid-token');
        }
        return Promise.reject(new Error('Authentication failed'));
      }),
      ...overrides,
    })
    .compile();

  const app: INestApplication<Express> = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Add global prefix if needed
  app.setGlobalPrefix('api');

  await app.init();

  const prismaService = moduleFixture.get<PrismaService>(PrismaService);
  const jwtService = moduleFixture.get<JwtService>(JwtService);
  const configService = moduleFixture.get<ConfigService>(ConfigService);

  return { app, prismaService, jwtService, configService };
};

export const createTestUser = async (
  prismaService: PrismaService,
  jwtService: JwtService,
  userData = {
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    firstName: 'Test',
    lastName: 'User',
  },
  secret?: string,
): Promise<TestUser> => {
  // Create a test user
  const user = await prismaService.user.create({
    data: userData,
  });

  // Generate JWT token with the same configuration as in the auth module
  const accessToken = jwtService.sign(
    {
      sub: user.id,
      email: user.email,
    },
    { secret: secret || process.env.JWT_SECRET },
  );

  return { user, accessToken };
};

export const cleanupTestData = async (prismaService: PrismaService): Promise<void> => {
  // Add all your models here in the correct order based on foreign key relationships
  await prismaService.mediaGeneration.deleteMany();
  await prismaService.project.deleteMany();
  await prismaService.user.deleteMany();
};

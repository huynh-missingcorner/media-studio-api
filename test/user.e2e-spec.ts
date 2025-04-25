import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Express } from 'express';
import { createTestApp, createTestUser, cleanupTestData } from './utils/test-helpers';
import { ConfigService } from '@nestjs/config';

describe('User Controller (e2e)', () => {
  let app: INestApplication<Express>;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let token: string;

  beforeAll(async () => {
    // Set up test application
    const testContext = await createTestApp();
    app = testContext.app;
    prismaService = testContext.prismaService;
    jwtService = testContext.jwtService;
    configService = testContext.configService;

    // Get JWT secret from config
    const jwtSecret = configService.get<string>('JWT_SECRET');

    console.log('[DEBUG] jwtSecret', jwtSecret);

    // Create test user with token
    const { accessToken } = await createTestUser(
      prismaService,
      jwtService,
      {
        email: 'test-user@example.com',
        passwordHash: 'hashedPassword',
        firstName: 'Test',
        lastName: 'User',
      },
      jwtSecret,
    );

    token = accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(prismaService);
    await app.close();
  });

  describe('/api/users/profile (GET)', () => {
    it('should return 401 if no token is provided', () => {
      return request(app.getHttpServer()).get('/api/users/profile').expect(401);
    });

    it('should return the user profile when token is provided', async () => {
      console.log('[DEBUG] users', await prismaService.user.findMany());
      return request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email', 'test-user@example.com');
          expect(res.body).toHaveProperty('firstName', 'Test');
          expect(res.body).toHaveProperty('lastName', 'User');
        });
    });
  });

  describe('/api/users/profile (PATCH)', () => {
    it('should return 401 if no token is provided', () => {
      return request(app.getHttpServer())
        .patch('/api/users/profile')
        .send({ firstName: 'Updated' })
        .expect(401);
    });

    it('should update user profile when token is provided', () => {
      return request(app.getHttpServer())
        .patch('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Updated' })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email', 'test-user@example.com');
          expect(res.body).toHaveProperty('firstName', 'Updated');
          expect(res.body).toHaveProperty('lastName', 'User');
        });
    });
  });
});

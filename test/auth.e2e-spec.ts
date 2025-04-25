import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Express } from 'express';
import { createTestApp, cleanupTestData } from './utils/test-helpers';
import { ConfigService } from '@nestjs/config';

describe('AuthController (e2e)', () => {
  let app: INestApplication<Express>;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let jwtSecret: string;

  beforeAll(async () => {
    // Set up test application
    const testContext = await createTestApp();
    app = testContext.app;
    prismaService = testContext.prismaService;
    jwtService = testContext.jwtService;
    configService = testContext.configService;

    // Get JWT secret from config
    jwtSecret = configService.get<string>('JWT_SECRET') || '';
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(prismaService);
    await app.close();
  });

  beforeEach(async () => {
    // Clear users before each test
    await prismaService.user.deleteMany();
  });

  describe('/api/auth/register (POST)', () => {
    it('should register a new user', async () => {
      const newUser = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('expiresIn');

      // Verify user was created in database
      const createdUser = await prismaService.user.findUnique({
        where: { email: newUser.email },
      });

      expect(createdUser).toBeTruthy();
      expect(createdUser?.email).toBe(newUser.email);
      expect(createdUser?.firstName).toBe(newUser.firstName);
      expect(createdUser?.lastName).toBe(newUser.lastName);

      // Password should be hashed
      expect(createdUser?.passwordHash).not.toBe(newUser.password);
    });

    it('should reject registration with invalid data', async () => {
      // Missing required fields
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      // Invalid email format
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });

    it('should reject duplicate email registrations', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        firstName: 'Duplicate',
        lastName: 'User',
      };

      // First registration should succeed
      await request(app.getHttpServer()).post('/api/auth/register').send(userData).expect(201);

      // Second registration with same email should fail
      await request(app.getHttpServer()).post('/api/auth/register').send(userData).expect(409); // Conflict
    });
  });

  describe('/api/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create a test user with known credentials
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await prismaService.user.create({
        data: {
          email: 'login-test@example.com',
          passwordHash: hashedPassword,
          firstName: 'Login',
          lastName: 'Test',
        },
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'Password123!',
        })
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('expiresIn');
    });

    it('should reject login with invalid credentials', async () => {
      // Wrong password
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      // Non-existent user
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        })
        .expect(401);
    });
  });

  describe('/api/auth/refresh (POST)', () => {
    let userId: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Create a test user
      const user = await prismaService.user.create({
        data: {
          email: 'refresh-test@example.com',
          passwordHash: 'hashed_password',
          firstName: 'Refresh',
          lastName: 'Test',
        },
      });

      userId = user.id;

      // Generate refresh token with the correct secret
      refreshToken = jwtService.sign(
        { sub: userId, email: user.email },
        {
          expiresIn: '7d',
          secret: jwtSecret,
        },
      );
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      const responseBody = response.body as {
        accessToken: string;
        refreshToken: string;
        userId: string;
        expiresIn: number;
      };

      // Verify response structure
      expect(responseBody).toHaveProperty('accessToken');
      expect(responseBody).toHaveProperty('refreshToken');
      expect(responseBody).toHaveProperty('userId');
      expect(responseBody).toHaveProperty('expiresIn');

      // Verify user ID matches
      expect(responseBody.userId).toBe(userId);
    });

    it('should reject invalid refresh tokens', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Express } from 'express';
import { createTestApp, createTestUser, cleanupTestData } from './utils/test-helpers';
import { ConfigService } from '@nestjs/config';

describe('ProjectController (e2e)', () => {
  let app: INestApplication<Express>;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let accessToken: string;
  let projectId: string;

  beforeAll(async () => {
    // Set up test application
    const testContext = await createTestApp();
    app = testContext.app;
    prismaService = testContext.prismaService;
    jwtService = testContext.jwtService;
    configService = testContext.configService;

    // Get JWT secret from config
    const jwtSecret = configService.get<string>('JWT_SECRET');

    // Create test user with token
    const userTest = await createTestUser(prismaService, jwtService, undefined, jwtSecret);
    accessToken = userTest.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(prismaService);
    await app.close();
  });

  describe('/api/projects (POST)', () => {
    it('should create a new project', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test Project',
          description: 'Project for testing',
          googleProjectId: 'test-google-project-id',
        })
        .expect(201);

      const responseBody = response.body as { id: string; name: string; description: string };

      expect(responseBody).toHaveProperty('id');
      expect(responseBody.name).toBe('Test Project');
      expect(responseBody.description).toBe('Project for testing');

      projectId = responseBody.id; // Save for later tests
    });

    it('should validate request body', async () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          // Missing required name field
          description: 'Invalid project',
        })
        .expect(400);
    });
  });

  describe('/api/projects (GET)', () => {
    it('should return all projects', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const responseBody = response.body as { id: string; name: string; description: string }[];

      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBeGreaterThan(0);
      expect(responseBody[0]).toHaveProperty('id');
      expect(responseBody[0]).toHaveProperty('name');
    });
  });

  describe('/api/projects/:id (GET)', () => {
    it('should return a project by id', async () => {
      await request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          const responseBody = res.body as { id: string; name: string; description: string };
          expect(responseBody.id).toBe(projectId);
          expect(responseBody.name).toBe('Test Project');
        });
    });

    it('should return 404 for non-existent project', async () => {
      await request(app.getHttpServer())
        .get('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('/api/projects/:id (PATCH)', () => {
    it('should update a project', async () => {
      await request(app.getHttpServer())
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Project Name',
        })
        .expect(200)
        .expect((res: request.Response) => {
          const responseBody = res.body as { id: string; name: string; description: string };
          expect(responseBody.id).toBe(projectId);
          expect(responseBody.name).toBe('Updated Project Name');
          expect(responseBody.description).toBe('Project for testing');
        });
    });

    it('should return 404 for non-existent project', async () => {
      await request(app.getHttpServer())
        .patch('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Will Not Update',
        })
        .expect(404);
    });
  });

  describe('/api/projects/:id (DELETE)', () => {
    it('should delete a project', async () => {
      await request(app.getHttpServer())
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: request.Response) => {
          const responseBody = res.body as { id: string; name: string; description: string };
          expect(responseBody.id).toBe(projectId);
        });

      // Verify project is deleted
      await request(app.getHttpServer())
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent project', async () => {
      await request(app.getHttpServer())
        .delete('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});

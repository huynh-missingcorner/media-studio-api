import { INestApplication } from '@nestjs/common';
import request from 'supertest';

interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  googleProjectId: string;
}

export async function createProject(app: INestApplication, authToken: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/projects')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      name: `Test Project ${Date.now()}`,
      description: 'A test project for media generation',
      googleProjectId: 'test-google-project-id',
    });

  const projectData = response.body as ProjectResponse;
  return projectData.id;
}

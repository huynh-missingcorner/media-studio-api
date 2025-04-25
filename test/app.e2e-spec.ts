import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { Express } from 'express';

describe('AppController (e2e)', () => {
  let app: INestApplication<Express>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    const responseBody = response.body as { status: string; timestamp: string };
    expect(responseBody).toHaveProperty('status');
    expect(responseBody.status).toEqual('ok');
    expect(responseBody).toHaveProperty('timestamp');
  });
});

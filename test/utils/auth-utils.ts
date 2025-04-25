import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface AuthData {
  accessToken: string;
  userId: string;
}

interface RegisterResponse {
  email: string;
  id: string;
}

interface LoginResponse {
  accessToken: string;
  userId: string;
}

export async function createUserAndLogin(app: INestApplication): Promise<AuthData> {
  // Register a new user
  const registerResponse = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({
      email: `test-${Date.now()}@example.com`,
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
    });

  const registerData = registerResponse.body as RegisterResponse;

  // Login with the created user
  const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
    email: registerData.email,
    password: 'Password123!',
  });

  const loginData = loginResponse.body as LoginResponse;

  return {
    accessToken: loginData.accessToken,
    userId: loginData.userId,
  };
}

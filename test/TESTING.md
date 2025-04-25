# End-to-End Testing Guide

This guide explains how to write and run end-to-end tests for the Media Studio API.

## Testing Setup

Our e2e tests use:

- NestJS Testing utilities
- Jest as the test runner
- Supertest for HTTP assertions
- A dedicated test database with Prisma

## Test Structure

Each API feature has its dedicated e2e test file:

- `auth.e2e-spec.ts` - Authentication endpoints
- `user.e2e-spec.ts` - User endpoints
- `project.e2e-spec.ts` - Project endpoints

## Test Helpers

We've created reusable test utility functions in `utils/test-helpers.ts`:

- `createTestApp()`: Creates a test NestJS application with proper configuration
- `createTestUser()`: Creates a test user with a valid JWT token
- `cleanupTestData()`: Cleans up test data after tests

## JWT Authentication in Tests

To ensure JWT authentication works correctly in tests:

1. We retrieve the JWT secret from the ConfigService in the test setup
2. When creating test users, we pass this secret to sign the tokens
3. This ensures tokens are signed with the same secret that the JWT strategy uses for validation

```typescript
// Example setup in test file
beforeAll(async () => {
  const testContext = await createTestApp();
  app = testContext.app;
  prismaService = testContext.prismaService;
  jwtService = testContext.jwtService;
  configService = testContext.configService;

  // Get JWT secret from config
  const jwtSecret = configService.get<string>('JWT_SECRET');

  // Create test user with token
  const { user, accessToken } = await createTestUser(
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

  testUser = user;
  token = accessToken;
});
```

## Writing New Tests

When adding tests for a new feature:

1. Create a new file in the `test` directory named `your-feature.e2e-spec.ts`
2. Follow this pattern:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Express } from 'express';
import { ConfigService } from '@nestjs/config';
import { createTestApp, createTestUser, cleanupTestData } from './utils/test-helpers';

describe('YourFeature (e2e)', () => {
  let app: INestApplication<Express>;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let accessToken: string;

  beforeAll(async () => {
    // Set up test application
    const testContext = await createTestApp();
    app = testContext.app;
    prismaService = testContext.prismaService;
    jwtService = testContext.jwtService;
    configService = testContext.configService;

    // Get JWT secret
    const jwtSecret = configService.get<string>('JWT_SECRET');

    // Create test user with token if needed
    const { accessToken: token } = await createTestUser(
      prismaService,
      jwtService,
      undefined,
      jwtSecret,
    );
    accessToken = token;
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(prismaService);
    await app.close();
  });

  describe('/api/your-endpoint (METHOD)', () => {
    it('should do something', async () => {
      await request(app.getHttpServer())
        .get('/api/your-endpoint')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
```

## Testing Authentication Routes

When testing routes that need authentication:

1. Create a test user and get its access token
2. Include the token in the request header:

```typescript
await request(app.getHttpServer())
  .get('/api/protected-endpoint')
  .set('Authorization', `Bearer ${accessToken}`)
  .expect(200);
```

## Testing Public Routes

For public routes, omit the Authorization header:

```typescript
await request(app.getHttpServer()).get('/api/public-endpoint').expect(200);
```

## Running Tests

To run all e2e tests:

```bash
pnpm test:e2e
```

To run a specific test file:

```bash
pnpm test:e2e -- auth.e2e-spec.ts
```

## Mock Services

The test helpers automatically configure certain services with mock implementations:

- `GoogleCloudService`: Mocked to return a valid token for specified projects

If you need to add additional mock services, you can pass them as options to `createTestApp()`:

```typescript
const testContext = await createTestApp({
  yourService: mockYourService,
});
```

## Best Practices

1. Use descriptive test names
2. Test both success and failure cases
3. Clean up test data after tests
4. Keep tests isolated from each other
5. Use a fresh database for each test run
6. Always include the JWT secret when creating tokens for authentication tests

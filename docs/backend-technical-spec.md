# Technical Specification: Vertex AI Media Studio Backend

## Overview

This technical specification outlines the backend architecture for the Vertex AI Media Studio Wrapper application. The backend serves as a bridge between the frontend application and the Vertex AI Media Studio API, providing authentication, request handling, and result management.

## Architecture

The backend follows a clean, modular architecture based on NestJS best practices, using a domain-driven design approach.

### Core Technologies

- **Framework**: NestJS v11
- **ORM**: Prisma v6.5
- **Database**: PostgreSQL
- **Authentication**: JWT-based with refresh tokens
- **API Integration**: Google Cloud Vertex AI Media Studio

### Architecture Diagram

```
┌─────────────┐     ┌──────────────────────────────────────┐     ┌────────────────────┐
│   Frontend  │ ←→  │              NestJS API              │ ←→  │  Vertex AI Media   │
│             │     │                                      │     │   Studio API       │
└─────────────┘     └──────────────────────────────────────┘     └────────────────────┘
                     │                  │                │
                     ▼                  ▼                ▼
              ┌─────────────┐   ┌─────────────┐   ┌────────────┐
              │  Auth       │   │  Media      │   │ Project    │
              │  Service    │   │  Service    │   │ Service    │
              └─────────────┘   └─────────────┘   └────────────┘
                     │                  │                │
                     │                  │                │
                     ▼                  ▼                ▼
              ┌───────────────────────────────────────────────┐
              │               Prisma Service                  │
              └───────────────────────────────────────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │   PostgreSQL    │
                           └─────────────────┘
```

## Module Structure

The application is organized into distinct modules, each with a clear responsibility:

### Core Module

- Global exception filters
- Global interceptors for logging, response transformation
- Global validations

### Auth Module

- User registration and login
- JWT token generation and validation
- Refresh token management
- Password reset (optional for v1)

### User Module

- User profile management
- User settings
- Account management

### Project Module

- Google Cloud project management
- Project selection and storage
- Project access control

### Media Module

- Vertex AI Media Studio API integration
- Media generation requests
- Media type-specific controllers and services
- Parameter validation and transformation

### Shared Module

- Common utilities
- DTOs and entities
- Interfaces
- Reusable services

## Database Schema (Prisma)

```prisma
enum UserRole {
  ADMIN
  USER
}

model User {
  id            String             @id @default(uuid())
  email         String             @unique
  passwordHash  String
  mediaGenerations MediaGeneration[]
  firstName     String
  lastName      String
  role          UserRole           @default(USER)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  @@index([email])
  @@index([role])
}

model Project {
  id              String             @id @default(uuid())
  name            String
  description     String?
  googleProjectId String?
  mediaGenerations MediaGeneration[]
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
  @@index([name])
}

model MediaGeneration {
  id           String       @id @default(uuid())
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  project      Project      @relation(fields: [projectId], references: [id])
  projectId    String

  mediaType    MediaType
  prompt       String
  parameters   Json
  status       RequestStatus @default(PENDING)
  errorMessage String?
  results      MediaResult[]
  createdAt    DateTime     @default(now())

  @@index([userId])
  @@index([projectId])
  @@index([mediaType])
  @@index([createdAt])
}

model MediaResult {
  id                 String          @id @default(uuid())
  mediaGeneration    MediaGeneration @relation(fields: [mediaGenerationId], references: [id], onDelete: Cascade)
  mediaGenerationId  String
  resultUrl          String
  metadata           Json?
  createdAt          DateTime        @default(now())

  @@index([mediaGenerationId])
}

enum MediaType {
  IMAGE
  AUDIO
  MUSIC
  VIDEO
}

enum RequestStatus {
  PENDING
  PROCESSING
  SUCCEEDED
  FAILED
}
```

## API Endpoints

### Authentication

```
POST /api/auth/register           # Create new user account (USER role only)
POST /api/auth/login
POST /api/auth/forgot-password (optional)
POST /api/auth/reset-password (optional)
```

### User Management

```
GET /api/users/profile            # Get current user profile
PATCH /api/users/profile          # Update current user profile
GET /api/users                    # List all users (admin only)
GET /api/users/:id                # Get specific user (admin only)
PATCH /api/users/:id              # Update user details (admin only)
DELETE /api/users/:id             # Delete user (admin only)
```

### Project Management

```
GET /api/projects                 # List projects (all users)
POST /api/projects                # Create project (admin only)
GET /api/projects/:id             # Get project details (all users)
PATCH /api/projects/:id           # Update project (admin only)
DELETE /api/projects/:id          # Delete project (admin only)
```

### Media Generation

```
POST /api/media/image                # Generate image using the Imagen model
POST /api/media/video                # Generate video using the Veo model
POST /api/media/music                # Generate music using the Lyria model
POST /api/media/audio                # Generate speech using the Chirp model
GET /api/media/:id                   # Get details of a specific media generation
GET /api/media/history               # Get media generation history with filtering
```

## Authentication Flow

1. User registers or logs in via `/api/auth/register` or `/api/auth/login`
2. Backend validates credentials and returns JWT access token and refresh token
3. JWT token contains user ID and role information
4. Frontend includes JWT token in all subsequent API requests via Authorization header
5. Backend validates token and checks role permissions for protected routes
6. When access token expires, frontend uses refresh token to get a new access token
7. Backend validates refresh token, issues new access token

## Implementation Details

### Auth Guards

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

### Role Decorator

```typescript
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
```

### Seed Service

```typescript
@Injectable()
export class SeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async seedAdminUser(): Promise<void> {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      throw new Error('Admin credentials not configured');
    }

    const existingAdmin = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      await this.prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
        },
      });

      console.log('Admin user created successfully');
    }
  }
}
```

### Auth Service

```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user in database (always as USER role)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'USER', // Regular users can only be created with USER role
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Return tokens
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Validate user credentials
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Return tokens and user info
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  // ... existing methods ...
}
```

### Media Service

```typescript
@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vertexAiService: VertexAiService,
    private readonly googleCloudService: GoogleCloudService,
  ) {}

  async generateImage(userId: string, dto: ImageGenerationDto): Promise<MediaResponse> {
    // Create media request record
    // Call Vertex AI Media Studio API
    // Convert GCS URIs to signed URLs for browser access
    // Process result
    // Store result
    // Return result to user
  }

  async generateVideo(userId: string, dto: VideoGenerationDto): Promise<MediaResponse> {
    // Create media request record
    // Call Vertex AI Media Studio API for video generation
    // Convert GCS URIs to signed URLs for browser access
    // Process and store results
    // Return result to user
  }

  async generateMusic(userId: string, dto: MusicGenerationDto): Promise<MediaResponse> {
    // Create media request record
    // Call Vertex AI Media Studio API for music generation
    // Convert GCS URIs to signed URLs for browser access
    // Process and store results
    // Return result to user
  }

  async generateAudio(userId: string, dto: AudioGenerationDto): Promise<MediaResponse> {
    // Create media request record
    // Call Vertex AI Media Studio API for speech generation
    // Convert GCS URIs to signed URLs for browser access
    // Process and store results
    // Return result to user
  }

  async getMediaRequest(id: string, userId: string): Promise<MediaResponse> {
    // Get media request from database
    // Check if user has access
    // Convert any GCS URIs to signed URLs
    // Return media request with result
  }

  async getMediaHistory(
    userId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResponse<MediaResponse>> {
    // Get media requests history for user
    // Convert any GCS URIs to signed URLs
    // Paginate results
    // Return paginated history
  }

  /**
   * Convert GCS URIs to signed URLs in media results
   * @param results Array of MediaResult objects that may contain GCS URIs
   * @returns Array of MediaResult objects with signed URLs
   */
  async getSignedUrlsForResults(results: MediaResult[]): Promise<MediaResult[]> {
    // Check if resultUrl is a GCS URI
    // Generate signed URL for browser access
    // Store original GCS URI in metadata
    // Return updated results with signed URLs
  }
}
```

### Google Cloud Service

```typescript
@Injectable()
export class GoogleCloudService {
  constructor(private readonly configService: ConfigService) {}

  async authenticateToGCP(projectId: string): Promise<string> {
    // Get GCP credentials
    // Authenticate to GCP
    // Return access token
  }

  /**
   * Generate a signed URL from a Google Cloud Storage URI
   * @param gcsUri The Google Cloud Storage URI (gs://bucket-name/path/to/file)
   * @returns A signed URL that can be accessed by a browser
   */
  async createSignedUrl(gcsUri: string): Promise<string> {
    // Parse the GCS URI
    // Calculate expiration time
    // Generate a signed URL with proper permissions
    // Return a browser-accessible URL
  }
}
```

### Vertex AI Integration

```typescript
@Injectable()
export class VertexAiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async authenticateToGCP(projectId: string): Promise<string> {
    // Get GCP credentials
    // Authenticate to GCP
    // Return access token
  }

  async generateImage(params: ImageGenerationParams): Promise<GenerationResult> {
    // Call Vertex AI Media Studio API for image generation
    // Handle response
    // Return result
  }

  async generateVideo(params: VideoGenerationParams): Promise<GenerationResult> {
    // Call Vertex AI Media Studio API for video generation
    // Handle response
    // Return result
  }

  async generateMusic(params: MusicGenerationParams): Promise<GenerationResult> {
    // Call Vertex AI Media Studio API for music generation
    // Handle response
    // Return result
  }

  async generateSpeech(params: SpeechGenerationParams): Promise<GenerationResult> {
    // Call Vertex AI Media Studio API for speech generation
    // Handle response
    // Return result
  }

  private async callVertexAiApi<T>(
    endpoint: string,
    accessToken: string,
    payload: any,
  ): Promise<T> {
    // Generic method to call Vertex AI APIs
    // Handle authentication
    // Process response
    // Handle errors
    // Return typed result
  }
}
```

## Error Handling

The application implements a global exception filter to handle various error scenarios:

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        code = (exceptionResponse as any).code || code;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      // Handle Prisma specific errors
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
        code = 'RESOURCE_CONFLICT';
      }
    } else if (exception instanceof VertexAiApiError) {
      // Handle Vertex AI API specific errors
      status = exception.status || HttpStatus.BAD_GATEWAY;
      message = exception.message;
      code = exception.code || 'VERTEX_AI_ERROR';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      code,
    });
  }
}
```

## Validation

Request validation is handled using class-validator and class-transformer:

```typescript
// Example DTO for image generation
export class ImageGenerationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  prompt: string;

  @IsNumber()
  @IsOptional()
  @Min(256)
  @Max(1024)
  width: number = 512;

  @IsNumber()
  @IsOptional()
  @Min(256)
  @Max(1024)
  height: number = 512;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  steps: number = 30;

  @IsString()
  @IsOptional()
  style?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(30)
  seed?: number;
}
```

## Security Considerations

- All endpoints secured with JWT authentication
- Role-based authorization for admin-only endpoints
- Input validation on all endpoints
- Proper error handling to avoid leaking sensitive information
- Rate limiting to prevent abuse
- CORS configuration to restrict access to frontend
- Secure password hashing using bcrypt
- Environment variable management for sensitive data
- Admin credentials configured via environment variables
- Audit logging for security events

## Performance Optimization

- Database indexing for frequently queried fields
- Connection pooling for database connections
- Caching for frequently accessed data
- Streaming for large media file downloads
- Pagination for list endpoints
- Compression for API responses

## Deployment

The application will be deployed on Google Cloud Platform:

1. **Infrastructure as Code**: Terraform scripts for GCP resources
2. **CI/CD Pipeline**: GitHub Actions for automated testing and deployment
3. **Environment Configuration**:
   - Development
   - Staging
   - Production
4. **Monitoring and Logging**:
   - Cloud Logging
   - Cloud Monitoring
   - Error tracking

## Development Process

1. **Repository Structure**:

   - `src/`: NestJS application source code
   - `prisma/`: Prisma schema and migrations
   - `docs/`: Documentation
   - `test/`: Tests

2. **Coding Standards**:

   - TypeScript strict mode
   - ESLint for code quality
   - Prettier for code formatting
   - Husky for pre-commit hooks

3. **Testing Strategy**:

   - Unit tests for services
   - Integration tests for repositories
   - E2E tests for API endpoints
   - Test coverage requirements

4. **Development Workflow**:
   - Feature branch workflow
   - Pull request reviews
   - CI checks before merge

## Environmental Variables

```
# Application
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/vertex_media

# Authentication
JWT_SECRET=your-jwt-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=path-to-credentials.json
```

## Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/passport": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/swagger": "^11.0.0",
    "@prisma/client": "^6.5.0",
    "bcrypt": "^5.1.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.6.0",
    "@types/passport-jwt": "^4.0.0",
    "@types/supertest": "^6.0.0",
    "jest": "^29.5.0",
    "prisma": "^6.5.0",
    "source-map-support": "^0.5.21",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.0"
  }
}
```

## Asynchronous Media Generation

The generation of videos (and potentially other media types) using the Vertex AI Media Studio involves long-running operations that exceed typical HTTP request/response timeframes. To avoid browser timeouts and provide a better user experience, we implement an asynchronous processing architecture using:

1. **BullMQ**: For reliable job queuing and processing, including operation polling
2. **WebSockets**: For real-time notifications to frontend clients

### Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Client     │────►│   NestJS API     │────►│   BullMQ       │
│  Browser    │     │   Controllers    │     │   Init Queue   │
└─────────────┘     └──────────────────┘     └────────────────┘
       ▲                                            │
       │                                            ▼
       │                                     ┌────────────────┐
       │                                     │  Init Job      │
       │                                     │  Processor     │
       │                                     └────────────────┘
       │                                            │
       │                                            ▼
       │                                     ┌────────────────┐
       │                                     │  Vertex AI     │◄───┐
       │                                     │  Media API     │    │
       │                                     └────────────────┘    │
       │                                            │              │
       │                                            ▼              │
       │                                     ┌────────────────┐    │
       │                                     │   BullMQ       │    │
       │                                     │   Poll Queue   │    │
       │                                     └────────────────┘    │
       │                                            │              │
       │                                            ▼              │
       │                                     ┌────────────────┐    │
       │                                     │  Poll Job      │    │
       │                                     │  Processor     │────┘
       │                                     └────────────────┘
       │                                            │
       │                                            │
       └─────────────────────────────────────◄─────┘
                   WebSocket Events
```

### Implementation Components

#### 1. BullMQ Queue Setup

```typescript
// media-generation.queue.ts
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { VideoGenerationDto } from '../dto/video-generation.dto';

@Injectable()
export class MediaGenerationQueue {
  constructor(@InjectQueue('media-generation') private readonly mediaQueue: Queue) {}

  async addInitVideoJob(userId: string, dto: VideoGenerationDto): Promise<string> {
    const job = await this.mediaQueue.add(
      'init-video-generation',
      { userId, dto },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return job.id.toString();
  }

  async addPollOperationJob(
    mediaGenerationId: string,
    userId: string,
    operationName: string,
    attemptCount = 0,
  ): Promise<string> {
    const job = await this.mediaQueue.add(
      'poll-video-operation',
      {
        mediaGenerationId,
        userId,
        operationName,
        attemptCount,
      },
      {
        delay: 5000, // Wait 5 seconds before processing
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    return job.id.toString();
  }
}
```

#### 2. BullMQ Processor

```typescript
// media-generation.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { VertexAiService } from '../../shared/infrastructure/vertex-ai/vertex-ai.service';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { RequestStatus, MediaType } from '@prisma/client';
import { MediaGenerationGateway } from '../gateways/media-generation.gateway';
import { GoogleCloudService } from '../../shared/infrastructure/google-cloud/google-cloud.service';

@Processor('media-generation')
export class MediaGenerationProcessor {
  private readonly logger = new Logger(MediaGenerationProcessor.name);
  private readonly MAX_POLL_ATTEMPTS = 60; // Maximum polling attempts (5 minutes with 5s intervals)

  constructor(
    private readonly vertexAiService: VertexAiService,
    private readonly googleCloudService: GoogleCloudService,
    private readonly prisma: PrismaService,
    private readonly gateway: MediaGenerationGateway,
    private readonly mediaQueue: MediaGenerationQueue,
  ) {}

  @Process('init-video-generation')
  async processInitVideoGeneration(job: Job): Promise<void> {
    const { userId, dto } = job.data;

    try {
      // Update status to PROCESSING
      await this.prisma.mediaGeneration.update({
        where: { id: job.id.toString() },
        data: { status: RequestStatus.PROCESSING },
      });

      // Call Vertex AI to start the operation
      const result = await this.vertexAiService.initiateVideoGeneration({
        prompt: dto.prompt,
        sampleCount: dto.sampleCount || 1,
        durationSeconds: dto.durationSeconds,
      });

      // Store operation details
      await this.prisma.mediaGeneration.update({
        where: { id: job.id.toString() },
        data: {
          parameters: {
            ...dto,
            operationName: result.name, // Store operation name for polling
          },
        },
      });

      // Add a job to poll this operation
      await this.mediaQueue.addPollOperationJob(job.id.toString(), userId, result.name);

      this.logger.log(`Video generation initiated. Operation: ${result.name}`);
    } catch (error) {
      this.logger.error(`Video generation initiation failed: ${error.message}`);

      // Update the record with failure status
      await this.prisma.mediaGeneration.update({
        where: { id: job.id.toString() },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: error.message,
        },
      });

      // Notify client of failure via WebSocket
      this.gateway.notifyClient(userId, {
        mediaGenerationId: job.id.toString(),
        status: RequestStatus.FAILED,
        error: error.message,
      });

      throw error;
    }
  }

  @Process('poll-video-operation')
  async processPollVideoOperation(job: Job): Promise<void> {
    const { mediaGenerationId, userId, operationName, attemptCount } = job.data;

    try {
      // Check if we've reached the maximum attempts
      if (attemptCount >= this.MAX_POLL_ATTEMPTS) {
        throw new Error('Maximum polling attempts reached. Operation timed out.');
      }

      // Get operation status from Vertex AI
      const operationStatus = await this.googleCloudService.checkOperationStatus(operationName);

      if (!operationStatus.done) {
        // Operation not complete - requeue for another check
        this.logger.log(
          `Operation ${operationName} still in progress. Attempt: ${attemptCount + 1}`,
        );

        // Add back to queue with increased attempt count
        await this.mediaQueue.addPollOperationJob(
          mediaGenerationId,
          userId,
          operationName,
          attemptCount + 1,
        );
        return;
      }

      // Operation is complete
      if (operationStatus.error) {
        // Operation failed
        await this.handleFailedOperation(mediaGenerationId, userId, operationStatus.error);
      } else {
        // Operation succeeded
        await this.handleSuccessfulOperation(mediaGenerationId, userId, operationStatus.response);
      }
    } catch (error) {
      this.logger.error(`Error polling operation ${operationName}: ${error.message}`);

      // Update the record with failure status
      await this.prisma.mediaGeneration.update({
        where: { id: mediaGenerationId },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: error.message,
        },
      });

      // Notify client of failure via WebSocket
      this.gateway.notifyClient(userId, {
        mediaGenerationId,
        status: RequestStatus.FAILED,
        error: error.message,
      });
    }
  }

  private async handleSuccessfulOperation(generationId: string, userId: string, response: any) {
    // Extract results from the operation response
    const videos = response?.videos || [];
    const mediaResults = [];

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const gcsUri = video?.gcsUri || '';

      if (gcsUri) {
        try {
          // Store the raw GCS URI in the database
          const mediaResult = await this.prisma.mediaResult.create({
            data: {
              mediaGenerationId: generationId,
              resultUrl: gcsUri,
              metadata: {
                index: i,
                mimeType: video.mimeType || 'video/mp4',
              },
            },
          });
          mediaResults.push(mediaResult);
        } catch (error) {
          this.logger.error(`Failed to create media result for ${gcsUri}: ${error.message}`);
        }
      }
    }

    // Update generation status
    const updatedGeneration = await this.prisma.mediaGeneration.update({
      where: { id: generationId },
      data: { status: RequestStatus.SUCCEEDED },
      include: { results: true },
    });

    // Generate signed URLs for results
    const resultsWithSignedUrls = await Promise.all(
      updatedGeneration.results.map(async (result) => {
        const signedUrl = await this.googleCloudService.createSignedUrl(result.resultUrl);
        return { ...result, signedUrl };
      }),
    );

    // Notify client via WebSocket
    this.gateway.notifyClient(userId, {
      mediaGenerationId: generationId,
      status: RequestStatus.SUCCEEDED,
      results: resultsWithSignedUrls,
    });

    this.logger.log(`Video generation completed successfully for ${generationId}`);
  }

  private async handleFailedOperation(generationId: string, userId: string, error: any) {
    const errorMessage = error?.message || 'Unknown error';

    // Update the record with failure status
    await this.prisma.mediaGeneration.update({
      where: { id: generationId },
      data: {
        status: RequestStatus.FAILED,
        errorMessage: errorMessage,
      },
    });

    // Notify client via WebSocket
    this.gateway.notifyClient(userId, {
      mediaGenerationId: generationId,
      status: RequestStatus.FAILED,
      error: errorMessage,
    });

    this.logger.error(`Video generation failed for ${generationId}: ${errorMessage}`);
  }
}
```

#### 3. Vertex AI Service Updates

```typescript
// vertex-ai.service.ts (update)
@Injectable()
export class VertexAiService {
  // ... existing code ...

  /**
   * Initiate a video generation operation using the Veo model
   * @param params Parameters for video generation
   * @returns Operation response with operation name
   */
  async initiateVideoGeneration(params: VideoGenerationParams): Promise<{ name: string }> {
    this.logger.log(`Initiating video generation with prompt: ${params.prompt}`);
    return this.veoService.initiateVideoGeneration(params);
  }

  /**
   * Check the status of a video generation operation
   * @param operationName The name of the operation to check
   * @returns Operation status including done flag and response/error
   */
  async checkVideoOperationStatus(operationName: string): Promise<any> {
    this.logger.log(`Checking video operation status: ${operationName}`);
    return this.veoService.checkOperationStatus(operationName);
  }
}
```

#### 4. Google Cloud Service Updates

```typescript
// google-cloud.service.ts (update)
@Injectable()
export class GoogleCloudService {
  // ... existing code ...

  /**
   * Check the status of a Google Cloud operation
   * @param operationName Full operation name to check
   * @returns Operation status
   */
  async checkOperationStatus(operationName: string): Promise<any> {
    try {
      // Get access token for authentication
      const accessToken = await this.getAccessToken();

      // Extract location and project from operation name
      const matches = operationName.match(/projects\/(.+?)\/locations\/(.+?)\/publishers/);
      if (!matches || matches.length < 3) {
        throw new Error(`Invalid operation name format: ${operationName}`);
      }

      const projectId = matches[1];
      const location = matches[2];

      // Form API URL for operation status check
      const url = `https://${location}-aiplatform.googleapis.com/v1/${operationName}`;

      // Make request
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error checking operation status: ${error.message}`);
      throw new Error(`Failed to check operation status: ${error.message}`);
    }
  }
}
```

#### 5. WebSocket Gateway

```typescript
// media-generation.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: true })
export class MediaGenerationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MediaGenerationGateway.name);
  private clientUserMap = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      this.clientUserMap.set(client.id, userId);
      client.join(`user-${userId}`);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.clientUserMap.get(client.id);
    if (userId) {
      this.clientUserMap.delete(client.id);
      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    }
  }

  notifyClient(userId: string, data: any) {
    this.server.to(`user-${userId}`).emit('media-generation-update', data);
    this.logger.log(`Notified user ${userId} of media generation update`);
  }
}
```

#### 6. API Controller Updates

```typescript
// media.controller.ts
@Post('video')
@ApiOperation({ summary: 'Generate a video using Vertex AI Media Studio (async)' })
@ApiResponse({
  status: 202,
  description: 'Video generation request accepted',
  type: MediaResponseDto,
})
async generateVideo(
  @CurrentUser() user: User,
  @Body() videoDto: VideoGenerationDto,
): Promise<MediaResponseDto> {
  return this.mediaService.generateVideoAsync(user.id, videoDto);
}
```

#### 7. Media Service Updates

```typescript
// media.service.ts
async generateVideoAsync(userId: string, dto: VideoGenerationDto): Promise<MediaResponseDto> {
  // Validate project exists
  const project = await this.prisma.project.findUnique({
    where: { id: dto.projectId },
  });

  if (!project) {
    throw new BadRequestException('Project not found');
  }

  // Generate a job ID for BullMQ that will be used as the mediaGeneration ID
  const jobId = await this.mediaGenerationQueue.addInitVideoJob(userId, dto);

  // Create a record of the request with PENDING status
  const mediaGeneration = await this.prisma.mediaGeneration.create({
    data: {
      id: jobId, // Use job ID as the generation ID
      userId,
      projectId: dto.projectId,
      mediaType: MediaType.VIDEO,
      prompt: dto.prompt,
      parameters: {
        durationSeconds: dto.durationSeconds,
        aspectRatio: dto.aspectRatio,
        enhancePrompt: dto.enhancePrompt,
        sampleCount: dto.sampleCount,
        model: dto.model,
        seed: dto.seed,
      },
      status: RequestStatus.PENDING,
    },
  });

  return new MediaResponseDto(mediaGeneration);
}
```

### Client-Side Handling

1. The frontend makes a request to generate a video
2. The backend accepts the request (202 Accepted) and returns the generation ID
3. The frontend establishes a WebSocket connection
4. The backend initiates the video generation process and gets an operation name
5. The operation name is added to the BullMQ polling queue
6. The polling job processor checks the operation status:
   - If not complete, it re-queues itself with a delay
   - If complete, it processes the results
7. When the generation is complete or fails, the backend sends a WebSocket event to the frontend
8. The frontend updates the UI based on the event

### Additional Considerations

1. **Error Handling**: Comprehensive error handling at each stage of the process
2. **Retry Mechanisms**: BullMQ's built-in retry mechanism for failed jobs
3. **Monitoring**: Dashboard for queue monitoring and management
4. **Scaling**: Horizontal scaling of job processors for high load
5. **Database Indices**: Optimized indices for frequent query patterns
6. **Connection Management**: Proper WebSocket connection management
7. **Authentication**: JWT-based authentication for WebSocket connections
8. **Timeout Handling**: Maximum polling attempts to prevent infinite polling
9. **Job Persistence**: Non-removal of completed/failed jobs for auditing

This approach ensures that long-running operations like video generation don't block the main request/response cycle, providing better UX while maintaining reliability and scalability.

## First Development Iteration

For the first iteration, the development team should focus on:

1. Setting up the base NestJS application
2. Implementing the database schema with Prisma
3. Creating the Authentication module
4. Building a minimal Media module for image generation only
5. Setting up deployment pipeline

This will create a minimal viable product (MVP) that can demonstrate the core functionality of the Vertex AI Media Studio wrapper.

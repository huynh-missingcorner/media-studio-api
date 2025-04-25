# Development Roadmap: Vertex AI Media Studio Backend

This roadmap outlines a 4-day development plan for implementing the core backend functionality of the Vertex AI Media Studio Wrapper application.

## Day 1: Project Setup & Core Infrastructure

**Objective**: Set up the base NestJS application, Prisma, and implement core infrastructure.

### Tasks:

1. **Initialize NestJS Project**

   - [V] Create new NestJS project: `pnpx nest new media-studio-api`
   - [V] Setup project structure (core, shared, modules)

2. **Configure Development Environment**

   - [V] Set up ESLint, Prettier: `pnpx eslint --init` and add Prettier config
   - [V] Create `.env` file with environment variables
   - [V] Set up `ConfigModule` for environment variable management

3. **Setup Database & Prisma**

   - [V] Install Prisma: `pnpm add -D prisma`
   - [V] Initialize Prisma: `pnpx prisma init`
   - [V] Configure database connection in `.env`

4. **Define Prisma Schema**

   - [V] Implement User model
   - [V] Implement Project model
   - [V] Implement MediaGeneration model
   - [V] Define enums and relationships
   - [V] Update MediaGeneration model to support multiple results with MediaResult model
   - [V] Add UserRole enum and role field to User model
   - [V] Create migration for role-based schema changes

5. **Create Core Infrastructure**

   - [V] Implement global exception filter
   - [V] Set up logging interceptor
   - [V] Create validation pipe configuration

6. **Generate Prisma Client**

   - [V] Run `pnpx prisma generate`
   - [V] Run initial migration: `pnpx prisma migrate dev --name init`

7. **Create Base DTOs and Entities**
   - [V] Create base response classes
   - [V] Create pagination DTOs
   - [V] Set up base entity interfaces

### Files to Create:

- [V] `src/app.module.ts` - Main application module
- [V] `src/main.ts` - Application entry point
- [V] `src/shared/infrastructure/prisma/prisma.service.ts` - Prisma service
- [V] `src/shared/infrastructure/prisma/prisma.module.ts` - Prisma module
- [V] `prisma/schema.prisma` - Initial Prisma schema
- [V] `.env` - Environment variables
- [V] `.eslintrc.js` - ESLint configuration
- [V] `.prettierrc` - Prettier configuration
- [V] `src/core/filters/global-exception.filter.ts`
- [V] `src/core/interceptors/logging.interceptor.ts`
- [V] `src/config/validation/validation.config.ts` - Validation pipe configuration
- [V] `src/shared/dto/pagination.dto.ts`
- [V] `src/shared/dto/response.dto.ts`
- [V] `src/shared/interfaces/entity.interface.ts`

## Day 2: Authentication & User Management

**Objective**: Implement user authentication, authorization, and user management.

### Tasks:

1. **Setup Auth Module**

   - [V] Create auth module structure
   - [V] Implement JWT strategy
   - [V] Set up JWT guard
   - [V] Implement role-based authorization with RolesGuard

2. **Implement User Registration and Login**

   - [V] Create user service
   - [V] Implement password hashing with bcrypt
   - [V] Create auth controller with registration/login endpoints
   - [V] Add role field to User model
   - [V] Add role-based restrictions to user registration

3. **Implement JWT Token Management**

   - [V] Token generation
   - [V] Token validation
   - [V] Token refresh mechanism
   - [V] Include user role in JWT payload

4. **Create Auth Guards and Decorators**

   - [V] Auth guards
   - [V] Role-based guards
   - [V] Role decorator
   - [V] Current user decorator

5. **User Profile Management**

   - [V] User profile endpoints
   - [V] User settings management
   - [V] Admin-only user management endpoints

6. **Admin User Seeding**
   - [V] Create SeedService for database seeding
   - [V] Implement admin user seeding
   - [V] Add seed command to application startup

### Files to Create:

- [V] `src/modules/auth/auth.module.ts`
- [V] `src/modules/auth/auth.service.ts`
- [V] `src/modules/auth/auth.controller.ts`
- [V] `src/modules/auth/dto/register.dto.ts`
- [V] `src/modules/auth/dto/login.dto.ts`
- [V] `src/modules/auth/strategies/jwt.strategy.ts`
- [V] `src/modules/auth/guards/jwt-auth.guard.ts`
- [V] `src/modules/auth/guards/roles.guard.ts`
- [V] `src/modules/auth/decorators/roles.decorator.ts`
- [V] `src/modules/auth/decorators/current-user.decorator.ts`
- [V] `src/shared/infrastructure/seed/seed.service.ts`
- [V] `src/shared/infrastructure/seed/seed.module.ts`
- [V] `src/modules/user/user.module.ts`
- [V] `src/modules/user/user.service.ts`
- [V] `src/modules/user/user.controller.ts`
- [V] `src/modules/user/dto/profile.dto.ts`
- [ ] `src/modules/user/dto/admin-user.dto.ts`

## Day 3: Project Module & Media Generation Core

**Objective**: Implement project management, Google Cloud integration, and core media generation functionality.

### Tasks:

1. **Create Project Module**

   - [V] Implement project service
   - [V] Create project controller
   - [V] Set up project DTOs
   - [V] Add role-based authorization to project endpoints

2. **Google Cloud Authentication**

   - [V] Set up Google Cloud client
   - [V] Implement authentication with service account
   - [V] Create token management

3. **Project Selection**

   - [V] Implement project listing
   - [V] Create project selection functionality

4. **Create Media Module Structure**

   - [V] Set up media module
   - [V] Create base media service
   - [V] Implement media controllers

5. **Implement Image Generation**

   - [V] Create image generation DTOs
   - [V] Implement Vertex AI Media Studio API integration for images
   - [V] Handle image generation responses
   - [V] Update image generation to support multiple results with proper metadata

6. **Media Storage**
   - [V] Set up temporary storage for generated media
   - [V] Implement file serving functionality
   - [V] Implement support for storing multiple results per generation
   - [V] Add GCS signed URL generation for media files to make them accessible in browsers

### Files to Create:

- [V] `src/modules/project/project.module.ts`
- [V] `src/modules/project/project.service.ts`
- [V] `src/modules/project/project.controller.ts`
- [V] `src/modules/project/dto/project.dto.ts`
- [V] `src/shared/infrastructure/google-cloud/google-cloud.service.ts`
- [V] `src/shared/infrastructure/google-cloud/google-cloud.module.ts`
- [V] `src/modules/media/dto/audio-generation.dto.ts`
- [V] `src/modules/media/dto/music-generation.dto.ts`
- [V] `src/modules/media/dto/video-generation.dto.ts`
- [V] `src/modules/media/controllers/history.controller.ts`

## Day 4: Complete Media Module, Testing & Deployment

**Objective**: Implement all media types, testing, documentation, and prepare for deployment.

### Tasks:

1. **Implement Other Media Types**

   - [V] Add audio generation support
   - [V] Add music generation capability
   - [V] Implement video generation
   - [V] Refactor VertexAiService into a reusable service supporting all media types
     - [V] Split into model-specific services (ImagenService, VeoService, LyriaService, ChirpService)
     - [V] Create facade pattern with main VertexAiService
     - [V] Implement unit tests for each service
   - [V] Create model-specific type definitions for Imagen, Veo, Lyria, and Chirp models
   - [V] Implement appropriate error handling for each model
   - [V] Add unit tests for each media generation method

2. **Media History**

   - [V] Create history endpoints
   - [V] Implement pagination
   - [V] Add filtering capabilities
   - [V] Update history endpoints to handle multiple results per generation

3. **Media Download**

   - [V] Implement media download functionality
   - [V] Set up proper content types and headers

4. **API Documentation**

   - [V] Set up Swagger documentation
   - [V] Document all endpoints
   - [V] Create API examples

5. **Testing**

   - [V] Write unit tests for critical components
   - [ ] Create e2e tests for main workflows
   - [ ] Test error handling

6. **Deployment Preparation**
   - [V] Create Dockerfile
   - [ ] Set up CI/CD pipeline configuration
   - [ ] Prepare production environment variables
   - [V] Configure admin user credentials in environment

### Files to Create:

- [V] `src/main.ts` (update with Swagger)
- [V] `Dockerfile`
- [ ] `.github/workflows/ci.yml` (if using GitHub Actions)
- [V] `test/app.e2e-spec.ts` (update)
- [V] `test/auth.e2e-spec.ts`
- [V] `test/user.e2e-spec.ts`
- [V] `test/media.e2e-spec.ts`

## Integration Points & Dependencies

### Key Integration Points:

1. **Auth → User**: Authentication depends on user management
2. **Project → Google Cloud**: Project management relies on Google Cloud integration
3. **Media → Project**: Media generation requires a selected project
4. **Media → Vertex AI**: Media generation depends on Vertex AI API integration
5. **All Modules → Prisma**: All modules utilize the Prisma service for database access

### External Dependencies:

1. **Google Cloud API**: Required for project access and Vertex AI integration
2. **Vertex AI Media Studio API**: Essential for media generation capabilities
3. **PostgreSQL Database**: Required for data persistence

## Next Steps After MVP

After completing the 4-day MVP implementation, the following areas should be addressed:

1. **Enhanced Security**: Implement more robust security measures
2. **User Settings**: Add user preferences and settings
3. **Advanced Media Parameters**: Expand parameter options for media generation
4. **Admin Features**: Implement usage tracking and user management
5. **Performance Optimization**: Caching and query optimization
6. **Multiple Results Support**: Fully implement the MediaResult model to support multiple results per prompt
7. **Role Management**: Add more granular role-based permissions
8. **Enhanced Media Generation API**:
   - Support for more customization options for each media type
   - Batch generation capabilities
   - Support for combining multiple models (e.g., image + music)
   - Media transformation features (style transfer, upscaling, etc.)

## Multi-Media Types Implementation Plan

After completing the initial MVP functionality, the following tasks are required to fully implement the multi-media types generation support:

### Tasks:

1. **Enhance MediaController with Multi-Media Type Endpoints**

   - [V] Add video generation endpoint
   - [V] Add music generation endpoint
   - [V] Add audio generation endpoint
   - [ ] Update API documentation in Swagger for all endpoints
   - [ ] Create request-specific validation rules for each media type

2. **Extend MediaService Capabilities**

   - [V] Implement generateVideo method
   - [V] Implement generateMusic method
   - [V] Implement generateAudio method
   - [ ] Create type-specific error handling for each media type
   - [ ] Add specialized metadata extraction for different media types
   - [ ] Refactor common code patterns into reusable utility methods

3. **Update Vertex AI Integration**

   - [V] Enhance VertexAiService to support all media types
   - [ ] Optimize API calls for different model types
   - [ ] Improve error handling for each model type
   - [ ] Add detailed logging for each model integration

4. **Media Result Storage Improvements**

   - [ ] Extend MediaResult entity for type-specific metadata
   - [ ] Implement specialized handling for different media formats
   - [ ] Add content-type detection and validation
   - [ ] Create signed URL generation optimized by media type

5. **Frontend Integration**

   - [ ] Update frontend API clients for new endpoints
   - [ ] Create media-type specific UI components
   - [ ] Implement specialized preview components for each media type
   - [ ] Add format-specific download options

6. **Testing**

   - [ ] Create unit tests for each media type service
   - [ ] Implement integration tests for new endpoints
   - [ ] Add test fixtures for each media type
   - [ ] Test error handling for each model

7. **Documentation**

   - [V] Update technical documentation with multi-media support
   - [V] Create usage examples for each media type
   - [V] Update API documentation with new endpoints
   - [ ] Add troubleshooting guides for each media type

### Files to Update:

- [V] `src/modules/media/media.controller.ts` - Add new endpoints
- [V] `src/modules/media/media.service.ts` - Implement services for each media type
- [ ] `src/modules/media/dto/*-generation.dto.ts` - Enhance DTOs with additional validation
- [ ] `test/media.e2e-spec.ts` - Add tests for new endpoints
- [V] `docs/backend-technical-spec.md` - Update technical documentation
- [V] `src/shared/infrastructure/vertex-ai/*` - Enhance Vertex AI integration
  - [V] `src/shared/infrastructure/vertex-ai/vertex-ai.service.ts` - Refactored to use facade pattern
  - [V] `src/shared/infrastructure/vertex-ai/vertex-ai.service.spec.ts` - Updated tests
  - [V] `src/shared/infrastructure/vertex-ai/vertex-ai.module.ts` - Updated to register all services
  - [V] `src/shared/infrastructure/vertex-ai/services/imagen.service.ts` - Created new service
  - [V] `src/shared/infrastructure/vertex-ai/services/imagen.service.spec.ts` - Added tests
  - [V] `src/shared/infrastructure/vertex-ai/services/veo.service.ts` - Created new service
  - [V] `src/shared/infrastructure/vertex-ai/services/veo.service.spec.ts` - Added tests
  - [V] `src/shared/infrastructure/vertex-ai/services/lyria.service.ts` - Created new service
  - [V] `src/shared/infrastructure/vertex-ai/services/lyria.service.spec.ts` - Added tests
  - [V] `src/shared/infrastructure/vertex-ai/services/chirp.service.ts` - Created new service
  - [V] `src/shared/infrastructure/vertex-ai/services/chirp.service.spec.ts` - Added tests

## Asynchronous Media Generation Implementation Plan

After implementing the multi-media types functionality, we need to enhance the video generation process to handle long-running operations asynchronously. Vertex AI's Veo model requires a two-step process: initiate generation and then poll for completion, which exceeds typical HTTP request timeouts.

### Tasks:

1. **BullMQ Integration**

   - [V] Install BullMQ dependencies: `pnpm add @nestjs/bull bull`
   - [V] Create a Redis container for BullMQ: `docker-compose.yml` update
   - [V] Configure BullMQ module in NestJS
   - [V] Implement media generation queue for both initiating and polling operations
   - [V] Create initial video generation job processor
   - [V] Create operation polling job processor
   - [V] Set up job tracking and management
   - [V] Add appropriate error handling and retry mechanisms

2. **Vertex AI Integration Updates**

   - [V] Update VeoService to separate video generation into two operations: initiation and status checking
   - [V] Implement operation name parsing and validation
   - [V] Add proper error handling for long-running operations
   - [V] Create operation result extraction utilities for different response formats
   - [V] Update response type definitions to match Vertex AI API responses

3. **WebSocket Notification System**

   - [ ] Install WebSockets: `pnpm add @nestjs/websockets socket.io`
   - [ ] Create WebSocket gateway for media generation notifications
   - [ ] Implement authentication for WebSocket connections
   - [ ] Set up client-user mapping for targeted notifications
   - [ ] Create notification events for job status updates
   - [ ] Implement client connection and disconnection handling

4. **Update Media Module for Async Processing**

   - [V] Modify video generation controller to use async processing
   - [V] Update media service to queue initial video generation jobs
   - [V] Implement job status tracking in database
   - [V] Update MediaGeneration schema to store operation names
   - [V] Create endpoints for checking job status
   - [V] Modify response handling for async operations

5. **Google Cloud Operation Handling**

   - [V] Add operation status checking to GoogleCloudService
   - [V] Implement operation result extraction
   - [V] Handle operation errors and timeouts
   - [V] Add proper logging for operation tracking

6. **Testing and Monitoring**

   - [V] Add unit tests for queue and processors
   - [ ] Create integration tests for async workflows
   - [ ] Implement queue monitoring via Bull Dashboard
   - [ ] Set up logging and alerting for job failures
   - [ ] Test WebSocket connections and notifications

7. **Client Integration**

   - [ ] Update frontend to handle asynchronous responses
   - [ ] Implement WebSocket connection in frontend
   - [ ] Create UI for displaying job status
   - [ ] Add polling fallback for WebSocket failures
   - [ ] Implement error handling for async operations

### Files to Create/Update:

- [V] `src/shared/infrastructure/bull/bull.module.ts` - BullMQ module configuration
- [V] `src/modules/media/queues/media-generation.queue.ts` - Queue definition
- [V] `src/modules/media/processors/media-generation.processor.ts` - Job processors
- [V] `src/shared/infrastructure/vertex-ai/services/veo.service.ts` (update) - Add two-step operation handling
- [ ] `src/modules/media/gateways/media-generation.gateway.ts` - WebSocket gateway
- [V] `src/modules/media/media.service.ts` (update) - Add async methods
- [V] `src/modules/media/media.controller.ts` (update) - Update endpoints
- [V] `src/shared/infrastructure/google-cloud/google-cloud.service.ts` (update) - Add operation methods
- [V] `src/shared/infrastructure/vertex-ai/vertex-ai.service.ts` (update) - Separate initiation and status checking
- [V] `docker-compose.yml` (update) - Add Redis service for BullMQ

This implementation will achieve the following benefits:

1. **Prevent Request Timeouts**: By handling long-running operations asynchronously
2. **Improve User Experience**: Real-time updates via WebSockets
3. **Ensure Reliability**: Job persistence and retry mechanisms with BullMQ
4. **Scalability**: Decoupled job processing for better resource utilization
5. **Robustness**: Comprehensive error handling and monitoring

The implementation will follow best practices for asynchronous processing in NestJS and ensure a seamless experience for users generating videos through the Vertex AI Media Studio API.

## Text-to-Speech Integration and Cloud Storage

After implementing the asynchronous media generation functionality, we enhanced the ChirpService to better integrate with Google Cloud Text-to-Speech API and Google Cloud Storage for storing generated audio files.

### Tasks:

1. **Enhanced ChirpService Implementation**

   - [V] Fix type definitions for Google Cloud Text-to-Speech API
   - [V] Implement proper error handling with type safety
   - [V] Add comprehensive unit tests following TDD approach

2. **Google Cloud Storage Integration**

   - [V] Implement audio file storage in Google Cloud Storage
   - [V] Generate signed URLs for accessing stored audio files
   - [V] Create file path structure based on user and project IDs

3. **Unit Testing**

   - [V] Create mock implementations for TextToSpeechClient
   - [V] Create mock implementations for Storage
   - [V] Test successful speech synthesis and storage scenarios
   - [V] Test error handling cases

### Files Created/Updated:

- [V] `src/shared/infrastructure/vertex-ai/services/chirp.service.ts` - Enhanced with GCS integration
- [V] `src/shared/infrastructure/vertex-ai/services/chirp.service.spec.ts` - Comprehensive unit tests

## Text-to-Speech Integration Parameter Standardization

After successfully implementing the basic text-to-speech functionality, we standardized the interface between the services to use consistent parameter objects.

### Tasks:

1. **Interface Standardization**

   - [V] Update ChirpService to use SpeechGenerationParams interface
   - [V] Update VertexAiService to use the standardized interface
   - [V] Update MediaService to adapt to the new parameter structure
   - [V] Ensure compatibility with existing code

2. **Media Result Handling Improvements**

   - [V] Simplify audio result storage in MediaService
   - [V] Store audio URLs and file paths consistently
   - [V] Improve metadata handling for audio results

3. **Testing and Validation**

   - [V] Update all affected unit tests
   - [V] Ensure tests pass with the new parameter structure
   - [V] Verify error handling works correctly with updated interfaces
   - [V] Confirm audio generation and storage workflows function properly

### Files Updated:

- [V] `src/shared/infrastructure/vertex-ai/services/chirp.service.ts` - Updated parameter interface
- [V] `src/shared/infrastructure/vertex-ai/services/chirp.service.spec.ts` - Updated tests
- [V] `src/shared/infrastructure/vertex-ai/vertex-ai.service.ts` - Updated method signatures
- [V] `src/modules/media/media.service.ts` - Adapted to use new interface
- [V] `src/modules/media/media.service.spec.ts` - Updated tests

This implementation allows for:

1. **High-Quality Text-to-Speech**: Using Google's advanced text-to-speech API
2. **Secure Storage**: Audio files stored in Google Cloud Storage
3. **Controlled Access**: Generated signed URLs for secure, time-limited access
4. **Organization**: Files organized efficiently for easy management
5. **Error Resilience**: Comprehensive error handling for both synthesis and storage operations
6. **Parameter Consistency**: Standardized interface across all services
7. **Code Maintainability**: Improved structure and consistent patterns

This roadmap provides a structured approach to implementing the core functionality of the Vertex AI Media Studio wrapper backend in four days, focusing on creating a functional MVP that demonstrates the key capabilities described in the PRD.

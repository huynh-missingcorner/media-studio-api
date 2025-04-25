# Media Studio API

A NestJS-based API for media generation using Google Cloud Vertex AI and other AI technologies. This service provides a robust backend for generating different types of media content including images, audio, music, and video through AI models.

## Features

- **Authentication & Authorization**: Secure JWT-based authentication with role-based access control
- **Media Generation**: Generate various media types using AI models
  - Image generation
  - Audio generation
  - Music generation
  - Video generation
- **Project Management**: Create and manage projects for organizing media generations
- **User Management**: User registration, authentication, and role management
- **Asynchronous Processing**: Queue-based processing with Bull/Redis for handling media generation tasks
- **Google Cloud Integration**:
  - Google Cloud Storage for storing generated media
  - Vertex AI for accessing powerful AI models
  - Text-to-Speech capabilities
- **API Documentation**: OpenAPI/Swagger documentation
- **WebSocket Support**: Real-time updates on media generation status

## Tech Stack

- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Caching & Queues**: Redis with Bull
- **Message Broker**: RabbitMQ
- **AI Models**: Google Cloud Vertex AI
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker
- **Testing**: Jest

## Prerequisites

- Node.js (v18 or later)
- PNPM package manager
- Docker and Docker Compose
- Google Cloud Platform account with Vertex AI API enabled
- PostgreSQL
- Redis

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/media-studio-api.git
   cd media-studio-api
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration details.

4. Generate Prisma client:

   ```bash
   pnpm prisma generate
   ```

5. Run database migrations:
   ```bash
   pnpm prisma migrate dev
   ```

## Development

Start the development server:

```bash
pnpm start:dev
```

The API will be available at `http://localhost:3000` with documentation at `http://localhost:3000/api/docs`.

### Using Docker for Development

```bash
docker-compose -f docker-compose.dev.yml up
```

## Testing

```bash
# Unit tests
pnpm test

# Test coverage
pnpm test:cov

# E2E tests
pnpm test:e2e
```

## Production

### Using Docker

```bash
# Build and start production containers
docker-compose up -d
```

### Manual Deployment

1. Build the application:

   ```bash
   pnpm build
   ```

2. Start the production server:
   ```bash
   pnpm start:prod
   ```

## API Documentation

The API documentation is available at `/api/docs` when the server is running.

## Database Schema

The main entities in the system are:

- **User**: Represents system users with authentication details and roles
- **Project**: Containers for organizing media generations
- **MediaGeneration**: Records of media generation requests
- **MediaResult**: Results of successful media generations

## Environment Variables

| Variable                       | Description                                 | Default     |
| ------------------------------ | ------------------------------------------- | ----------- |
| PORT                           | The port number for the API server          | 3000        |
| NODE_ENV                       | Environment (development, production, test) | development |
| DATABASE_URL                   | PostgreSQL connection string                | -           |
| REDIS_URL                      | Redis connection string                     | -           |
| JWT_SECRET                     | Secret for signing JWT tokens               | -           |
| JWT_EXPIRES_IN                 | JWT token expiration period                 | 24h         |
| GOOGLE_CLOUD_PROJECT           | Google Cloud project ID                     | -           |
| GOOGLE_APPLICATION_CREDENTIALS | Path to Google Cloud credentials            | -           |
| CORS_ORIGIN                    | CORS allowed origins                        | \*          |

## Project Structure

```
media-studio-api/
├── src/
│   ├── config/          # Application configuration
│   ├── core/            # Core functionality (filters, interceptors)
│   ├── modules/         # Feature modules
│   │   ├── auth/        # Authentication and authorization
│   │   ├── media/       # Media generation features
│   │   ├── project/     # Project management
│   │   └── user/        # User management
│   ├── shared/          # Shared utilities and services
│   │   └── infrastructure/ # External service integrations
│   │       ├── bull/       # Queue management
│   │       ├── google-cloud/ # Google Cloud integrations
│   │       ├── prisma/      # Database access
│   │       ├── redis/       # Caching
│   │       └── vertex-ai/   # Vertex AI integration
│   ├── app.module.ts    # Main application module
│   └── main.ts          # Application entry point
├── prisma/              # Database schema and migrations
├── test/                # End-to-end tests
├── docker-compose.yml   # Production Docker configuration
└── docker-compose.dev.yml # Development Docker configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

## License

[Include your license information here]

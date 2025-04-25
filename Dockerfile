# Build Stage
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build application
RUN pnpm build

# Production Stage
FROM node:22-alpine

WORKDIR /usr/src/app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod

# Copy Prisma schema and generated client
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Copy built application
COPY --from=builder /usr/src/app/dist ./dist

# Create startup script
RUN echo '#!/bin/sh\n\
echo "Running database migrations..."\n\
pnpm prisma migrate deploy\n\
echo "Starting application..."\n\
exec pnpm start:prod\n\
' > /usr/src/app/docker-entrypoint.sh \
&& chmod +x /usr/src/app/docker-entrypoint.sh

# Expose port
EXPOSE 3000

# Set NODE_ENV
ENV NODE_ENV=production

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["/usr/src/app/docker-entrypoint.sh"]

FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

# 🔥 Remove husky from prepare
RUN sed -i '/"prepare": "husky",/d' package.json

# ✅ Install everything including devDependencies
RUN pnpm install --frozen-lockfile

COPY . .

# ✅ Generate Prisma Client
RUN pnpm prisma:generate

# ✅ Build the app
RUN pnpm build

# ✅ Prune devDependencies (Husky is already removed from scripts)
RUN pnpm prune --prod

# ---- Production stage
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

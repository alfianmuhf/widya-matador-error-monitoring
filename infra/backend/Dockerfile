# ==========================================
# Optimized Multi-Stage Backend Dockerfile
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY apps/error-service/package*.json ./
COPY apps/error-service/prisma.config.js ./
COPY apps/error-service/prisma ./prisma/
RUN npm ci
COPY apps/error-service/src ./src
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
ENV NODE_ENV=production

COPY apps/error-service/package*.json ./
COPY apps/error-service/prisma.config.js ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

USER node
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node src/server.js"]
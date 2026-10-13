# ==========================================
# Backend Dockerfile (apps/error-service)
# ==========================================
FROM node:22-alpine

WORKDIR /app

# Layer 1: Copy file env dari root menjadi .env di dalam container
COPY .env.backend.example .env

# Install library OS pendukung Prisma & Bcrypt di Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy package dependencies dan Prisma config
COPY apps/error-service/package*.json ./
COPY apps/error-service/prisma.config.js ./
RUN npm install

# Copy Prisma schema dan generate Prisma Client
COPY apps/error-service/prisma ./prisma/
RUN npx prisma generate

# Copy source code backend
COPY apps/error-service/src ./src/

# Expose port backend
EXPOSE 3000

# Reset database dari schema.prisma terbaru, jalankan seeder, lalu start server
CMD ["sh", "-c", "npx prisma db push --force-reset && node prisma/seed.js && node src/server.js"]

# ==========================================
# Backend Dockerfile (apps/error-service)
# ==========================================
FROM node:22-alpine

WORKDIR /app

# Environment variables (.env) di-inject dari luar container via docker-compose (env_file: ../../env-file/.env.backend)

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

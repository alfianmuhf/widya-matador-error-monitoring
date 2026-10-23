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

# Copy Prisma schema dan generate Prisma Client (menggunakan dummy URL saat build-time)
COPY apps/error-service/prisma ./prisma/
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" npx prisma generate

# Copy source code backend
COPY apps/error-service/src ./src/

# Expose port backend
EXPOSE 3000

# Terapkan migrasi yang tertunda (tidak pernah reset data), lalu start server.
# Seeder dijalankan manual: docker compose run --rm backend npm run seed
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]

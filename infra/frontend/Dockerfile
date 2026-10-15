# ==========================================
# Frontend Dockerfile (apps/interfaces)
# Pure Node.js (Tanpa Nginx di dalam container)
# ==========================================
FROM node:22-alpine

WORKDIR /app

# Argument dan Environment variable untuk Vite saat build-time (di-pass via docker-compose args)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy package dependencies dan install
COPY apps/interfaces/package*.json ./
RUN npm install

# Copy source code dan konfigurasi
COPY apps/interfaces/src ./src/
COPY apps/interfaces/index.html ./
COPY apps/interfaces/vite.config.js ./
COPY apps/interfaces/eslint.config.js ./

# Build production bundle
RUN npm run build

# Install web server Node.js ringan khusus SPA (Single Page Application)
RUN npm install -g serve

# Expose port internal container
EXPOSE 5173

# Jalankan web server di port 5173 (-s: SPA fallback agar refresh halaman tidak 404)
CMD ["serve", "-s", "dist", "-l", "5173"]

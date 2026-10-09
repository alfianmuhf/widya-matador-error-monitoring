# ==========================================
# Frontend Dockerfile (apps/interfaces)
# Pure Node.js (Tanpa Nginx di dalam container)
# ==========================================
FROM node:22-alpine

WORKDIR /app

# Layer 1: Copy file env dari root menjadi .env (dibaca Vite saat build-time)
COPY .env.frontend.example .env

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

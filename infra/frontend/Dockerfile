# ==========================================
# Optimized Multi-Stage Frontend Dockerfile
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY apps/interfaces/package*.json ./
RUN npm ci
COPY apps/interfaces/ ./
RUN npm run build

FROM nginx:1.27-alpine AS runner
RUN rm -rf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY infra/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
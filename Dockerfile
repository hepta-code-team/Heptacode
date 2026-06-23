FROM node:20-alpine AS backend-builder
WORKDIR /workspace/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend ./
COPY shared ../shared
RUN npm run build

FROM node:20-alpine AS frontend-builder
WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
COPY shared ../shared
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM node:20-alpine AS runtime
RUN apk add --no-cache nginx wget
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=backend-builder /workspace/backend/dist ./dist

COPY --from=frontend-builder /workspace/frontend/dist /usr/share/nginx/html
COPY docker/nginx.single.conf /etc/nginx/http.d/default.conf
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh \
    && mkdir -p /run/nginx \
    && chown -R appuser:appgroup /app /run/nginx /var/lib/nginx /var/log/nginx

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=127.0.0.1
ENV CORS_ORIGIN=http://localhost

USER appuser
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=10s \
  CMD wget -qO- http://127.0.0.1/api/health || exit 1
CMD ["/app/start.sh"]

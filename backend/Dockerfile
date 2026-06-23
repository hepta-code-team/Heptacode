FROM node:20-alpine AS builder
WORKDIR /workspace/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend ./
COPY shared ../shared
RUN npm run build

FROM node:20-alpine AS runtime
RUN apk add --no-cache wget
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /workspace/backend/dist ./dist
USER appuser
EXPOSE 3000
CMD ["node", "dist/backend/src/index.js"]

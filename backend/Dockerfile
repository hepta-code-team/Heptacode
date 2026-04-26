FROM node:20-alpine AS builder
WORKDIR /workspace
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /workspace
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
USER appuser
EXPOSE 3000
CMD ["node", "dist/index.js"]

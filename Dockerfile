# syntax=docker/dockerfile:1.7

FROM node:20-bullseye-slim AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:20-bullseye-slim AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

FROM frontend-deps AS frontend-builder
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend/ ./
RUN npm run build

FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY backend/ /app/backend/
COPY --from=backend-deps /app/backend/node_modules /app/backend/node_modules

COPY --from=frontend-builder /app/frontend/.next/standalone /app/frontend/
COPY --from=frontend-builder /app/frontend/.next/static /app/frontend/.next/static

COPY start-services.sh /app/start-services.sh
RUN chmod +x /app/start-services.sh

EXPOSE 3030
ENV PORT_BACKEND=5050
ENV PORT_FRONTEND=3030

CMD ["/app/start-services.sh"]

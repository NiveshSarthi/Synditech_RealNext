# --- Common Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Backend Service ---
FROM base AS backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production
CMD ["node", "server.js"]

# --- Frontend Builder ---
FROM base AS frontend-builder
COPY frontend/package*.json ./
RUN npm install
ARG NEXT_PUBLIC_API_URL
COPY frontend/ .
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

# --- Frontend Runner ---
FROM node:20-alpine AS frontend
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]

# Base stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Dependencies stage
FROM base AS deps
RUN npm install --frozen-lockfile

# Final runner stage
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-privileged user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure the app user owns the directories
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

ENV PORT 5000
ENV NODE_ENV production

CMD ["node", "server.js"]

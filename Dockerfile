# Stage 1: Build the React frontend
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy source code and build
COPY frontend/ .
# This will generate a 'out' directory due to output: 'export' in next.config.js
RUN npm run build


# Stage 2: Setup the Node.js backend and serve the frontend
FROM node:20-alpine AS runner

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./
RUN npm install --production

# Copy backend source code
COPY backend/ .

# Copy built frontend assets from builder stage to backend's public directory
COPY --from=builder /app/frontend/out ./public

# Expose the application port
EXPOSE 5001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Start the server
CMD ["node", "server.js"]

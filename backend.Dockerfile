FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
# Note: Using backend/ prefix because context is now project root
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend application code
COPY backend/ .

# Create a non-privileged user and set permissions
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs && \
    chown -R nodejs:nodejs /app

# Switch to non-privileged user
USER nodejs

# Expose the API port
EXPOSE 5000

# Environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"]

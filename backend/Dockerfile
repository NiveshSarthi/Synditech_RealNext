FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R node:node /app

# Use non-root user for security
USER node

# Expose port
EXPOSE 5000

# Start command
CMD ["npm", "start"]

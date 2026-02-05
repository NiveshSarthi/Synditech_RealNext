FROM node:18-alpine

WORKDIR /app

# Install dependencies
# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY --chown=node:node . .

# Use non-root user for security
USER node

# Expose port
EXPOSE 5000

# Start command
CMD ["npm", "start"]

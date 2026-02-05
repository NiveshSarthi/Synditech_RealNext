FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Force development environment for install to include devDependencies
RUN NODE_ENV=development npm ci

COPY . .

# Accept build arguments
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build

# Set production environment
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

EXPOSE 3000

# Use standard start command for reliability in single-stage
CMD ["npm", "start"]
